import * as vscode from 'vscode';
import { generateDiagramCommand } from './commands/generateDiagram';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "structurify" is now active!');

    // Register the command and push its disposable to the context
    const disposable = vscode.commands.registerCommand(
        'structurify.generateDiagram',
        () => generateDiagramCommand(context)
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}