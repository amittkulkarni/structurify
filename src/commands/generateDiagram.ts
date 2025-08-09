import * as vscode from 'vscode';
import {
    generateMermaidSyntax,
    ApiError,
    ParsingError,
    ValidationError,
} from '../services/groqService';
import { DiagramWebviewPanel } from '../webview/DiagramWebviewPanel';

/**
 * Command to generate a logic diagram from the selected code in the active editor.
 * @param context The extension context for creating the webview panel.
 */
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
            cancellable: true,
        },
        async (progress, token) => {
            try {
                progress.report({
                    increment: 20,
                    message: 'Analyzing code with AI...',
                });
                const mermaidSyntax = await generateMermaidSyntax(
                    selectedCode,
                    token
                );

                if (token.isCancellationRequested) {
                    console.log('Diagram generation was cancelled.');
                    return;
                }

                progress.report({
                    increment: 80,
                    message: 'Rendering diagram...',
                });

                DiagramWebviewPanel.createOrShow(
                    context.extensionUri,
                    mermaidSyntax
                );
            } catch (error: unknown) {
                console.error(error);
                if (error instanceof ApiError) {
                    vscode.window
                        .showErrorMessage(error.message, 'Open Settings')
                        .then((selection) => {
                            if (selection === 'Open Settings') {
                                vscode.commands.executeCommand(
                                    'workbench.action.openSettings',
                                    'structurify.groq.apiKey'
                                );
                            }
                        });
                } else if (
                    error instanceof ParsingError ||
                    error instanceof ValidationError
                ) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'An unknown error occured.';
                    vscode.window.showErrorMessage(
                        `AI Response Error: ${message}`
                    );
                } else if (error instanceof Error) {
                    vscode.window.showErrorMessage(
                        `An unexpected error occurred: ${error.message}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        'An unexpected and unknown error occured.'
                    );
                }
            }
        }
    );
}
