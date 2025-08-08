import * as vscode from 'vscode';

/**
 * A helper function to escape HTML special characters.
 * This prevents the Mermaid syntax from breaking the webview's HTML structure.
 * @param unsafe The raw string to sanitize.
 * @returns A sanitized string safe for embedding in HTML.
 */
function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export class DiagramWebviewPanel {
    public static currentPanel: DiagramWebviewPanel | undefined;
    public static readonly viewType = 'structurifyDiagram';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, mermaidSyntax: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DiagramWebviewPanel.currentPanel) {
            DiagramWebviewPanel.currentPanel._panel.reveal(column);
            DiagramWebviewPanel.currentPanel._update(mermaidSyntax);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DiagramWebviewPanel.viewType,
            'Structurify Diagram',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
            }
        );

        DiagramWebviewPanel.currentPanel = new DiagramWebviewPanel(panel, extensionUri, mermaidSyntax);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, mermaidSyntax: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update(mermaidSyntax);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        DiagramWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(mermaidSyntax: string) {
        this._panel.webview.html = this._getHtmlForWebview(mermaidSyntax);
    }

    private _getHtmlForWebview(mermaidSyntax: string): string {
        const webview = this._panel.webview;
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'main.js'));
        const mermaidCdnUri = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        const nonce = getNonce();
        const sanitizedSyntax = escapeHtml(mermaidSyntax);

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesUri}" rel="stylesheet">
                <title>Structurify Diagram</title>
            </head>
            <body>
                <pre class="mermaid">
${sanitizedSyntax}
                </pre>
                <script nonce="${nonce}" src="${mermaidCdnUri}"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}