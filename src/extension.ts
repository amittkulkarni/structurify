import * as vscode from 'vscode';
import { generateDiagramCommand } from './commands/generateDiagram';
import { DiagramWebviewPanel } from './webview/DiagramWebviewPanel';
import { DiagramType } from './services/common';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('structurify.generateFlowchart', () =>
            generateDiagramCommand(context, DiagramType.Flowchart)
        ),
        vscode.commands.registerCommand(
            'structurify.generateSequenceDiagram',
            () => generateDiagramCommand(context, DiagramType.Sequence)
        ),
        vscode.commands.registerCommand(
            'structurify.generateClassDiagram',
            () => generateDiagramCommand(context, DiagramType.Class)
        ),
        vscode.commands.registerCommand('structurify.generateErDiagram', () =>
            generateDiagramCommand(context, DiagramType.ER)
        ),
        vscode.commands.registerCommand('structurify.exportAsSvg', () => {
            if (DiagramWebviewPanel.currentPanel) {
                DiagramWebviewPanel.currentPanel.exportAsSvg();
            }
        })
    );
}

export function deactivate() {}