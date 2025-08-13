import * as vscode from 'vscode';
import Groq from 'groq-sdk';

// Custom errors remain the same
export class ApiError extends Error {}
export class ParsingError extends Error {}
export class ValidationError extends Error {}

/**
 * Calls the Groq API with a specific system prompt and user code.
 * @param code The user's selected code.
 * @param systemPrompt The system prompt tailored for a specific diagram type.
 * @param cancellationToken A token to handle user cancellation.
 * @returns A promise that resolves to the raw JSON string from the AI.
 */
export async function callGroqApi(
    code: string,
    systemPrompt: string,
    cancellationToken: vscode.CancellationToken
): Promise<string> {
    const config = vscode.workspace.getConfiguration('structurify');
    const apiKey = config.get<string>('groq.apiKey');
    const model = config.get<string>('ai.model', 'llama3-70b-8192');

    if (!apiKey) {
        throw new ApiError('Groq API key not found. Please set it in the extension settings.');
    }

    const groq = new Groq({ apiKey });

    try {
        const abortController = new AbortController();
        cancellationToken.onCancellationRequested(() => abortController.abort());

        const chatCompletion = await groq.chat.completions.create(
            {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze this code:\n\`\`\`\n${code}\n\`\`\`` },
                ],
                model: model,
                response_format: { type: 'json_object' },
            },
            { signal: abortController.signal }
        );

        const responseContent = chatCompletion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new ParsingError('The AI returned an empty response.');
        }
        return responseContent;

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return ''; // Gracefully handle cancellation
        }
        if (error instanceof Groq.APIError) {
            throw new ApiError(`Groq API Error: ${error.message}`);
        }
        if (error instanceof SyntaxError) {
            throw new ParsingError('The AI returned malformed JSON.');
        }
        if (error instanceof Error) {
            throw new Error(`Failed to generate diagram: ${error.message}`);
        }
        throw new Error('An unknown error occurred.');
    }
}
