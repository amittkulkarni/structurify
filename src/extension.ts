import * as vscode from 'vscode';
import { generateDiagramCommand } from './commands/generateDiagram';
import { DiagramWebviewPanel } from './webview/DiagramWebviewPanel';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'structurify.generateDiagram',
            () => generateDiagramCommand(context)
        ),
        vscode.commands.registerCommand(
            'structurify.exportAsSvg',
            () => {
                if (DiagramWebviewPanel.currentPanel) {
                    DiagramWebviewPanel.currentPanel.exportAsSvg();
                }
            }
        )
    );
}

export function deactivate() {}