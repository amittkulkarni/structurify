import * as vscode from 'vscode';
import {
    generateMermaidSyntax,
    ApiError,
    ParsingError,
    ValidationError,
} from '../services/groqService';
import { DiagramWebviewPanel } from '../webview/DiagramWebviewPanel';

export async function generateDiagramCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage(
            'Please select a block of code to generate a diagram.'
        );
        return;
    }

    const selectedCode = editor.document.getText(selection);

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Logic Diagram...',
            cancellable: false,
        },
        async (progress) => {
            try {
                progress.report({
                    increment: 20,
                    message: 'Analyzing code with AI...',
                });
                const mermaidSyntax = await generateMermaidSyntax(selectedCode);

                progress.report({
                    increment: 80,
                    message: 'Rendering diagram...',
                });

                DiagramWebviewPanel.createOrShow(
                    context.extensionUri,
                    mermaidSyntax
                );
            } catch (error: any) {
                console.error(error);
                if (error instanceof ApiError) {
                    vscode.window.showErrorMessage(error.message);
                } else if (
                    error instanceof ParsingError ||
                    error instanceof ValidationError
                ) {
                    vscode.window.showErrorMessage(
                        `AI Response Error: ${error.message}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `An unexpected error occurred: ${error.message}`
                    );
                }
            }
        }
    );
}