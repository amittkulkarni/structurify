import * as vscode from 'vscode';
import Groq from 'groq-sdk';

export async function generateMermaidSyntax(code: string): Promise<string> {
    const configuration = vscode.workspace.getConfiguration('structurify.groq');
    const apiKey = configuration.get<string>('apiKey');

    if (!apiKey) {
        throw new Error('Groq API key not found. Please set it in the extension settings.');
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert software analyst. Your task is to convert a given code snippet into a Mermaid.js flowchart syntax ('graph TD').
- Analyze the logical flow of the code: function calls, conditional branches (if/else), and loops (for/while).
- Represent each logical step as a node in the flowchart.
- Use clear and concise labels for nodes.
- CRITICAL RULE: The text for each node MUST be enclosed in double quotes. For example, instead of 'A[Node Text]', you MUST write 'A["Node Text"]'. This is mandatory to handle special characters.
- Do NOT include any explanations, only the raw Mermaid syntax inside a single \`\`\`mermaid code block.

---
GOOD EXAMPLE OF OUTPUT:
\`\`\`mermaid
graph TD
    A["Start Process()"]
    B["Is data valid?"]
    C{"Decision Point"}
    A --> B
    B --> C
\`\`\`

BAD EXAMPLE (Do NOT do this):
\`\`\`mermaid
graph TD
    A[Start Process()]
    B[Is data valid?]
    C{Decision Point}
    A --> B
    B --> C
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