import * as vscode from 'vscode';
import Groq from 'groq-sdk';

export async function generateMermaidSyntax(code: string): Promise<string> {
    const configuration = vscode.workspace.getConfiguration('structurify.groq');
    const apiKey = configuration.get<string>('apiKey');

    if (!apiKey) {
        throw new Error('Groq API key not found. Please set it in the extension settings.');
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert software designer. Your task is to convert a given code snippet into a visually appealing and easy-to-read Mermaid.js flowchart.

- LAYOUT: Use a top-to-down layout (\`graph TD\`).
- NODE SHAPES: Use different shapes for different kinds of operations:
  - Use a stadium shape for the start and end nodes: \`A(["Start/End"])\`
  - Use a rhombus for conditional branches (if/else): \`B{"Is condition true?"}\`
  - Use a simple rectangle for all other process steps: \`C["Do something"]\`
- STYLING: You MUST assign a style class to every node. Use the following class definitions:
  - \`classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff\`
  - \`classDef process fill:#3498db,stroke:#2980b9,color:#fff\`
  - \`classDef decision fill:#e67e22,stroke:#d35400,color:#fff\`
- CLASS ASSIGNMENT: Apply the classes to nodes using the \`:::\` syntax. For example: \`A(["Start"]):::startEnd\` or \`B{"Check condition"}:::decision\`.
- CRITICAL RULE: The text for each node MUST be enclosed in double quotes.
- OUTPUT: Provide ONLY the raw Mermaid syntax inside a single \`\`\`mermaid code block. Do not include any explanations.

---
GOOD EXAMPLE OF OUTPUT:
\`\`\`mermaid
graph TD
    classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff
    classDef process fill:#3498db,stroke:#2980b9,color:#fff
    classDef decision fill:#e67e22,stroke:#d35400,color:#fff

    A(["Start"]):::startEnd --> B["Process Data"]:::process
    B --> C{"Is data valid?"}:::decision
    C -- Yes --> D["Save Data"]:::process
    C -- No --> E["Log Error"]:::process
    D --> F(["End"]):::startEnd
    E --> F
\`\`\`
---`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Code snippet:\n\`\`\`\n${code}\n\`\`\``,
                }
            ],
            model: "llama3-8b-8192",
        });

        const responseContent = chatCompletion.choices[0]?.message?.content || "";
        
        const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/;
        const match = responseContent.match(mermaidRegex);

        if (match && match[1]) {
            return match[1].trim();
        } else {
            if (responseContent.trim().startsWith('graph')) {
                return responseContent.trim();
            }
            throw new Error('Could not parse Mermaid syntax from AI response.');
        }

    } catch (error: any) {
        console.error("Groq API Error:", error);
        throw new Error(`Groq API request failed: ${error.message}`);
    }
}