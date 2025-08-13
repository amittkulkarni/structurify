import * as vscode from 'vscode';
import { generateFlowchart } from '../services/flowchartService';
import { generateSequenceDiagram } from '../services/sequenceDiagramService';
import { generateClassDiagram } from '../services/classDiagramService';
import { generateErDiagram } from '../services/erDiagramService';
import { DiagramWebviewPanel } from '../webview/DiagramWebviewPanel';
import { ApiError, ParsingError, ValidationError } from '../services/groqService';
import { DiagramType } from '../services/common';

/**
 * A map that connects a diagram type to its generation service.
 */
const serviceMap = {
    [DiagramType.Flowchart]: generateFlowchart,
    [DiagramType.Sequence]: generateSequenceDiagram,
    [DiagramType.Class]: generateClassDiagram,
    [DiagramType.ER]: generateErDiagram,
};

/**
 * Generic command to generate a diagram based on the selected code and diagram type.
 * @param context The extension context.
 * @param type The type of diagram to generate.
 */
export async function generateDiagramCommand(
    context: vscode.ExtensionContext,
    type: DiagramType
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('Please select code to generate a diagram.');
        return;
    }

    const selectedCode = editor.document.getText(selection);

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${type}...`,
            cancellable: true,
        },
        async (progress, token) => {
            try {
                const generate = serviceMap[type];
                if (!generate) {
                    throw new Error(`Unsupported diagram type: ${type}`);
                }

                progress.report({ increment: 20, message: 'Analyzing code...' });
                const mermaidSyntax = await generate(selectedCode, token);

                if (token.isCancellationRequested) return;

                progress.report({ increment: 80, message: 'Rendering diagram...' });
                DiagramWebviewPanel.createOrShow(context.extensionUri, mermaidSyntax);
                
            } catch (error: unknown) {
                handleError(error);
            }
        }
    );
}

/**
 * Handles and displays errors that occur during diagram generation.
 * @param error The error object.
 */
function handleError(error: unknown) {
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
    } else if (error instanceof ParsingError || error instanceof ValidationError) {
        const message = error instanceof Error ? error.message : 'An unknown error occured.';
        vscode.window.showErrorMessage(`AI Response Error: ${message}`);
    } else if (error instanceof Error) {
        vscode.window.showErrorMessage(`An unexpected error occurred: ${error.message}`);
    } else {
        vscode.window.showErrorMessage('An unexpected and unknown error occurred.');
    }
}