import * as vscode from 'vscode';
import { generateDiagramCommand } from './commands/generateDiagram';
import { exportDiagramCommand } from './commands/exportDiagram';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "structurify" is now active!');

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'structurify.generateDiagram',
            () => generateDiagramCommand(context)
        ),
        vscode.commands.registerCommand(
            'structurify.exportDiagram',
            () => exportDiagramCommand()
        )
    );
}

export function deactivate() {}