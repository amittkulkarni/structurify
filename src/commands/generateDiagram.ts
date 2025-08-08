import * as vscode from 'vscode';
import { generateMermaidSyntax } from '../services/groqService';
import { DiagramWebviewPanel } from '../webview/DiagramWebviewPanel';

export async function generateDiagramCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('Please select a block of code to generate a diagram.');
        return;
    }

    const selectedCode = editor.document.getText(selection);

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Generating Logic Diagram...",
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ increment: 20, message: "Analyzing code with AI..." });
            const mermaidSyntax = await generateMermaidSyntax(selectedCode);

                        // --- DEBUGGING: Log the exact syntax received from the AI ---
            console.log("--- Mermaid Syntax from Groq ---");
            console.log(mermaidSyntax);
            console.log("---------------------------------");
            
            progress.report({ increment: 80, message: "Rendering diagram..." });
            
            if (mermaidSyntax) {
                 DiagramWebviewPanel.createOrShow(context.extensionUri, mermaidSyntax);
            } else {
                throw new Error("Failed to extract Mermaid syntax from the AI response.");
            }

        } catch (error: any) {
            console.error(error);
            const message = error.message.includes('API key') 
                ? 'Groq API key is missing or invalid. Please check your settings.'
                : `Failed to generate diagram: ${error.message}`;
            vscode.window.showErrorMessage(message);
        }
    });
}