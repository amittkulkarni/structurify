import * as vscode from 'vscode';
import Groq from 'groq-sdk';

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


/**
 * @param plan The structured flowchart plan from the AI.
 * @returns A valid Mermaid.js string.
 */
function buildMermaidSyntaxFromPlan(plan: FlowchartPlan): string {
    const lines: string[] = [];
    lines.push('graph TD');
    lines.push('    classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff,font-weight:bold;');
    lines.push('    classDef process fill:#3498db,stroke:#2980b9,color:#fff;');
    lines.push('    classDef decision fill:#e67e22,stroke:#d35400,color:#fff;');
    lines.push('    classDef data fill:#9b59b6,stroke:#8e44ad,color:#fff;');
    lines.push('');

    for (const node of plan.nodes) {
        let nodeSyntax: string;
        const label = `"${node.label}"`; 

        switch (node.type) {
            case 'startEnd':
                nodeSyntax = `${node.id}(${label}):::startEnd`;
                break;
            case 'decision':
                nodeSyntax = `${node.id}{${label}}:::decision`;
                break;
            case 'data':
                nodeSyntax = `${node.id}[/${label}/]:::data`;
                break;
            case 'process':
            default:
                nodeSyntax = `${node.id}[${label}]:::process`;
                break;
        }
        lines.push(`    ${nodeSyntax};`);
    }

    lines.push('');

    for (const edge of plan.edges) {
        if (edge.label) {
            lines.push(`    ${edge.from} -- ${edge.label} --> ${edge.to};`);
        } else {
            lines.push(`    ${edge.from} --> ${edge.to};`);
        }
    }

    return lines.join('\n');
}


export async function generateMermaidSyntax(code: string): Promise<string> {
    const configuration = vscode.workspace.getConfiguration('structurify.groq');
    const apiKey = configuration.get<string>('apiKey');

    if (!apiKey) {
        throw new Error('Groq API key not found. Please set it in the extension settings.');
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are a code analysis engine. Your only task is to analyze the user's code snippet and convert its logical flow into a JSON object.

- The JSON object must conform to this structure: { "nodes": [], "edges": [] }.
- Each node in the "nodes" array must have an "id" (e.g., "A", "B"), a "label" (a short description), and a "type".
- Node "type" must be one of: 'startEnd', 'process', 'decision', or 'data'.
- Each edge in the "edges" array must have a "from" and "to" property, linking two node IDs. Edges from a 'decision' node should include a "label" (e.g., "Yes", "No", "True", "False").

CRITICAL: Your entire response MUST be a single, valid JSON object inside a \`\`\`json code block. Do NOT add any explanations or other text.`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Code snippet to analyze:\n\`\`\`\n${code}\n\`\`\``, }
            ],
            model: "llama3-70b-8192",
            response_format: { type: "json_object" }, 
        });

        const responseContent = chatCompletion.choices[0]?.message?.content || "";
        
        console.log("--- Raw JSON from AI ---");
        console.log(responseContent);

        let plan: FlowchartPlan;
        try {
            plan = JSON.parse(responseContent);
        } catch (error) {
            console.error("Failed to parse JSON from AI response:", error);
            throw new Error('The AI returned malformed data. Please try again.');
        }
        
        const mermaidSyntax = buildMermaidSyntaxFromPlan(plan);
        
        console.log("--- Generated Mermaid Syntax ---");
        console.log(mermaidSyntax);

        return mermaidSyntax;

    } catch (error: any) {
        console.error("Groq API or Parsing Error:", error);
        throw new Error(`Failed to generate diagram: ${error.message}`);
    }
}