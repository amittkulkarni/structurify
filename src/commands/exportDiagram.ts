import * as vscode from 'vscode';
import { DiagramWebviewPanel } from '../webview/DiagramWebviewPanel';

export async function exportDiagramCommand() {
    if (DiagramWebviewPanel.currentPanel) {
        DiagramWebviewPanel.currentPanel.exportDiagram();
    } else {
        vscode.window.showInformationMessage('No active Structurify diagram to export.');
    }
}