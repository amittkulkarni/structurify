import * as vscode from 'vscode';
import { generateDiagramCommand } from './commands/generateDiagram';
import { DiagramWebviewPanel } from './webview/DiagramWebviewPanel';

/**
 * This method is called when your extension is activated.
 * It initializes the commands that are defined in the package.json file.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('structurify.generateDiagram', () =>
            generateDiagramCommand(context)
        ),
        vscode.commands.registerCommand('structurify.exportAsSvg', () => {
            if (DiagramWebviewPanel.currentPanel) {
                DiagramWebviewPanel.currentPanel.exportAsSvg();
            }
        })
    );
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate() {}