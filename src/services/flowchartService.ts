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

function validatePlan(plan: unknown): asserts plan is FlowchartPlan {
    if (!plan || typeof plan !== 'object') {
        throw new ValidationError('The AI response is not a valid object.');
    }

    const p = plan as Partial<FlowchartPlan>;

    if (!Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
        throw new ValidationError(
            'The AI response is missing "nodes" or "edges" arrays.'
        );
    }

    for (const node of p.nodes) {
        if (
            typeof node.id !== 'string' ||
            typeof node.label !== 'string' ||
            !['startEnd', 'process', 'decision', 'data'].includes(node.type)
        ) {
            throw new ValidationError(
                'An invalid node was found in the AI response.'
            );
        }
    }

    for (const edge of p.edges) {
        if (typeof edge.from !== 'string' || typeof edge.to !== 'string') {
            throw new ValidationError(
                'An invalid edge was found in the AI response.'
            );
        }
    }
}


function buildMermaidSyntax(plan: FlowchartPlan): string {
    const lines: string[] = [];
    lines.push('graph TD');
    lines.push(
        '    classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff,font-weight:bold;'
    );
    lines.push('    classDef process fill:#3498db,stroke:#2980b9,color:#fff;');
    lines.push('    classDef decision fill:#e67e22,stroke:#d35400,color:#fff;');
    lines.push('    classDef data fill:#9b59b6,stroke:#8e44ad,color:#fff;');
    lines.push('');

    for (const node of plan.nodes) {
        let nodeSyntax: string;

        switch (node.type) {
            case 'startEnd':
                nodeSyntax = `${node.id}(["${node.label}"]):::startEnd`;
                break;
            case 'decision':
                nodeSyntax = `${node.id}{"${node.label}"}:::decision`;
                break;
            case 'data':
                nodeSyntax = `${node.id}[/"${node.label}"/]:::data`;
                break;
            case 'process':
            default:
                nodeSyntax = `${node.id}["${node.label}"]:::process`;
                break;
        }
        lines.push(`    ${nodeSyntax};`);
    }

    lines.push('');

    for (const edge of plan.edges) {
        if (edge.label) {
            lines.push(`    ${edge.from} -- "${edge.label}" --> ${edge.to};`);
        } else {
            lines.push(`    ${edge.from} --> ${edge.to};`);
        }
    }

    return lines.join('\n');
}


export async function generateFlowchart(
    code: string,
    token: vscode.CancellationToken
): Promise<string> {
    const systemPrompt = `You are an expert in code analysis. Your task is to convert the user's code into a JSON object representing a flowchart.

- The JSON must have "nodes" and "edges".
- Node "type" must be one of: 'startEnd', 'process', 'decision', or 'data'.
- Edges from a 'decision' node must have a "label".

CRITICAL: Your entire response MUST be a single, valid JSON object and nothing else.`;

    const json = await callGroqApi(code, systemPrompt, token);
    const plan = JSON.parse(json);
    validatePlan(plan);
    return buildMermaidSyntax(plan);
}
