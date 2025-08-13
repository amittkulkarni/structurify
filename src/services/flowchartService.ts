import * as vscode from 'vscode';
import { callGroqApi, ValidationError } from './groqService';

// Interfaces specific to Flowcharts
interface FlowchartNode {
    id: string;
    label: string;
    type: 'startEnd' | 'process' | 'decision' | 'data';
}
interface FlowchartEdge {
    from: string;
    to: string;
    label?: string;
}
interface FlowchartPlan {
    nodes: FlowchartNode[];
    edges: FlowchartEdge[];
}

function sanitizeAndFilterPlan(plan: any): FlowchartPlan {
    if (!plan || !Array.isArray(plan.nodes) || !Array.isArray(plan.edges)) {
        return { nodes: [], edges: [] };
    }

    const idMap = new Map<string, string>();
    let counter = 0;

    const sanitizedNodes: FlowchartNode[] = [];
    plan.nodes.forEach((node: any) => {
        if (!node || typeof node.id !== 'string') return;
        const originalId = node.id.trim();
        let sanitizedId = originalId.replace(/[^a-zA-Z0-9_]/g, '');
        if (!sanitizedId) {
            sanitizedId = `node_${counter++}`;
        }
        idMap.set(originalId, sanitizedId);
        node.id = sanitizedId;

        if (typeof node.label !== 'string' || !node.label.trim()) {
            node.label = originalId || node.id;
        }
        if (typeof node.type === 'string') {
            const lowerType = node.type.toLowerCase().trim();
            if (lowerType === 'start' || lowerType === 'end') {
                node.type = 'startEnd';
            }
        }
        if (node.id && node.label && ['startEnd', 'process', 'decision', 'data'].includes(node.type)) {
            sanitizedNodes.push(node);
        }
    });

    const validNodeIds = new Set(sanitizedNodes.map(n => n.id));
    const sanitizedEdges: FlowchartEdge[] = [];
    plan.edges.forEach((edge: any) => {
        if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string') return;
        const originalFrom = edge.from.trim();
        const originalTo = edge.to.trim();
        const finalFrom = idMap.get(originalFrom) || originalFrom.replace(/[^a-zA-Z0-9_]/g, '');
        const finalTo = idMap.get(originalTo) || originalTo.replace(/[^a-zA-Z0-9_]/g, '');
        if (finalFrom && finalTo && validNodeIds.has(finalFrom) && validNodeIds.has(finalTo)) {
            sanitizedEdges.push({ ...edge, from: finalFrom, to: finalTo });
        }
    });

    return { nodes: sanitizedNodes, edges: sanitizedEdges };
}

function buildMermaidSyntax(plan: FlowchartPlan): string {
    const lines: string[] = [];
    lines.push('graph TD');
    lines.push('    classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff,font-weight:bold;');
    lines.push('    classDef process fill:#3498db,stroke:#2980b9,color:#fff;');
    lines.push('    classDef decision fill:#e67e22,stroke:#d35400,color:#fff;');
    lines.push('    classDef data fill:#9b59b6,stroke:#8e44ad,color:#fff;');
    lines.push('');

    if (plan.nodes.length === 0) {
        lines.push('    error["Could not generate a valid diagram from the code."]');
        return lines.join('\n');
    }

    for (const node of plan.nodes) {
        let nodeSyntax: string;
        const label = node.label.replace(/"/g, '&quot;');
        switch (node.type) {
            case 'startEnd':
                nodeSyntax = `${node.id}(["${label}"]):::startEnd`;
                break;
            case 'decision':
                nodeSyntax = `${node.id}{"${label}"}:::decision`;
                break;
            case 'data':
                nodeSyntax = `${node.id}[/"${label}"/]:::data`;
                break;
            case 'process':
            default:
                nodeSyntax = `${node.id}["${label}"]:::process`;
                break;
        }
        // **THE FIX**: Removed leading spaces from the pushed lines.
        lines.push(`    ${nodeSyntax};`);
    }

    lines.push('');

    for (const edge of plan.edges) {
        if (edge.label) {
            const label = edge.label.replace(/"/g, '&quot;');
            lines.push(`    ${edge.from} -- "${label}" --> ${edge.to};`);
        } else {
            lines.push(`    ${edge.from} --> ${edge.to};`);
        }
    }

    // Using trim() on each line to remove any accidental whitespace.
    return lines.map(line => line.trim()).join('\n');
}

export async function generateFlowchart(
    code: string,
    token: vscode.CancellationToken
): Promise<string> {
    const systemPrompt = `You are an expert in code analysis. Your task is to convert the user's code into a JSON object representing a flowchart.
- The JSON must have "nodes" and "edges".
- Node "id" MUST be a unique, single word (e.g., "process1", "check_user"). It cannot contain spaces.
- Node "type" MUST be one of: 'startEnd', 'process', 'decision', or 'data'.
- Edges from a 'decision' node must have a "label".
CRITICAL: Your entire response MUST be a single, valid JSON object and nothing else.`;
    
    try {
        const json = await callGroqApi(code, systemPrompt, token);
        const plan = JSON.parse(json);
        const sanitizedPlan = sanitizeAndFilterPlan(plan);
        return buildMermaidSyntax(sanitizedPlan);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof SyntaxError) {
            return 'graph TD\n    error["AI response was malformed and could not be repaired."];';
        }
        throw error;
    }
}
