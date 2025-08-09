import * as vscode from 'vscode';
import Groq from 'groq-sdk';

/**
 * Custom error for issues related to the Groq API (e.g., invalid key, network issues).
 */
export class ApiError extends Error {}

/**
 * Custom error for issues related to parsing the AI's JSON response.
 */
export class ParsingError extends Error {}

/**
 * Custom error for when the AI's JSON response has an invalid or unexpected structure.
 */
export class ValidationError extends Error {}

/**
 * Defines the structure for a single node in the flowchart.
 */
interface FlowchartNode {
    id: string;
    label: string;
    type: 'startEnd' | 'process' | 'decision' | 'data';
}

/**
 * Defines the structure for a single edge connecting two nodes.
 */
interface FlowchartEdge {
    from: string;
    to: string;
    label?: string;
}

/**
 * Defines the overall structure of the flowchart plan returned by the AI.
 */
interface FlowchartPlan {
    nodes: FlowchartNode[];
    edges: FlowchartEdge[];
}

/**
 * Validates the structure of the JSON plan returned by the AI.
 * Throws a ValidationError if the structure is incorrect.
 * @param plan The parsed JSON object from the AI response.
 */
function validateFlowchartPlan(plan: any): asserts plan is FlowchartPlan {
    if (!plan || typeof plan !== 'object') {
        throw new ValidationError('The AI response is not a valid object.');
    }
    if (!Array.isArray(plan.nodes) || !Array.isArray(plan.edges)) {
        throw new ValidationError(
            'The AI response is missing "nodes" or "edges" arrays.'
        );
    }

    for (const node of plan.nodes) {
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

    for (const edge of plan.edges) {
        if (typeof edge.from !== 'string' || typeof edge.to !== 'string') {
            throw new ValidationError(
                'An invalid edge was found in the AI response.'
            );
        }
    }
}

/**
 * Converts a validated flowchart plan into Mermaid.js syntax.
 * @param plan The validated flowchart plan object.
 * @returns A string containing the full Mermaid.js syntax for the diagram.
 */
function buildMermaidSyntaxFromPlan(plan: FlowchartPlan): string {
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

/**
 * Generates Mermaid syntax for a flowchart from a given code snippet using the Groq API.
 * @param code The string of code to analyze.
 * @param cancellationToken A token to signal if the operation should be cancelled.
 * @returns A promise that resolves to the Mermaid diagram syntax as a string.
 * @throws {ApiError} If there's an issue with the Groq API key or connection.
 * @throws {ParsingError} If the AI returns a response that is not valid JSON.
 * @throws {ValidationError} If the AI response has an invalid structure.
 */
export async function generateMermaidSyntax(
    code: string,
    cancellationToken?: vscode.CancellationToken
): Promise<string> {
    const configuration = vscode.workspace.getConfiguration('structurify.groq');
    const apiKey = configuration.get<string>('apiKey');

    if (!apiKey) {
        throw new ApiError(
            'Groq API key not found. Please set it in the extension settings.'
        );
    }

    const groq = new Groq({ apiKey });

    // prettier-ignore
    const systemPrompt = `You are a code analysis engine. Your only task is to analyze the user's code snippet and convert its logical flow into a JSON object.

- The JSON object must conform to this structure: { "nodes": [], "edges": [] }.
- Each node in the "nodes" array must have an "id" (e.g., "A", "B"), a "label" (a short description), and a "type".
- Node "type" must be one of: 'startEnd', 'process', 'decision', or 'data'.
- Each edge in the "edges" array must have a "from" and "to" property, linking two node IDs. Edges from a 'decision' node should include a "label" (e.g., "Yes", "No", "True", "False").

CRITICAL: Your entire response MUST be a single, valid JSON object. Do NOT add any explanations, markdown formatting, or other text.`;

    try {
        const abortController = new AbortController();
        cancellationToken?.onCancellationRequested(() => {
            abortController.abort();
        });

        const chatCompletion = await groq.chat.completions.create(
            {
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: `Code snippet to analyze:\n\`\`\`\n${code}\n\`\`\``,
                    },
                ],
                model: 'llama3-70b-8192',
                response_format: { type: 'json_object' },
            },
            { signal: abortController.signal }
        );

        const responseContent = chatCompletion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new ParsingError('The AI returned an empty response.');
        }

        const plan = JSON.parse(responseContent);
        validateFlowchartPlan(plan);

        return buildMermaidSyntaxFromPlan(plan);
    } catch (error: any) {
        console.error('Structurify Error:', error);
        if (error.name === 'AbortError') {
            console.log('Groq API request was cancelled by the user.');
            return '';
        }
        if (error instanceof Groq.APIError) {
            throw new ApiError(`Groq API Error: ${error.message}`);
        }
        if (error instanceof SyntaxError) {
            throw new ParsingError(
                'The AI returned malformed JSON. Please try again.'
            );
        }
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new Error(`Failed to generate diagram: ${error.message}`);
    }
}
