import * as vscode from 'vscode';

export class DiagramWebviewPanel {
    public static currentPanel: DiagramWebviewPanel | undefined;
    public static readonly viewType = 'structurify';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, mermaidSyntax: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (DiagramWebviewPanel.currentPanel) {
            DiagramWebviewPanel.currentPanel._panel.reveal(column);
            DiagramWebviewPanel.currentPanel._update(mermaidSyntax);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            DiagramWebviewPanel.viewType,
            'Code Logic Diagram',
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

        // Set the webview's initial html content
        this._update(mermaidSyntax);

        // Listen for when the panel is disposed
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
        const mermaidCdnUri = '[https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js](https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js)';

        // Use a nonce to allow only specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesUri}" rel="stylesheet">
                <title>Code Logic Diagram</title>
            </head>
            <body>
                <pre class="mermaid">
                    ${mermaidSyntax}
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