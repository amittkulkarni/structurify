import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Manages the webview panel that displays the Mermaid diagram.
 */
export class DiagramWebviewPanel {
    public static currentPanel: DiagramWebviewPanel | undefined;
    public static readonly viewType = 'structurifyDiagram';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Creates or shows a new webview panel.
     * @param extensionUri The URI of the extension's root directory.
     * @param mermaidSyntax The Mermaid syntax to render in the panel.
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        mermaidSyntax: string
    ) {
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
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src', 'webview'),
                ],
            }
        );

        DiagramWebviewPanel.currentPanel = new DiagramWebviewPanel(
            panel,
            extensionUri,
            mermaidSyntax
        );
    }

    /**
     * Sends a message to the webview to trigger the SVG export process.
     */
    public async exportAsSvg() {
        this._panel.webview.postMessage({
            command: 'exportAsSvg',
        });
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        mermaidSyntax: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update(mermaidSyntax);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'saveFile':
                        this.saveFile(message.data);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Handles the process of saving the exported diagram data to a file.
     * @param data The file content as a string (SVG data).
     */
    private async saveFile(data: string) {
        let defaultUri;
        if (
            vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
            defaultUri = vscode.Uri.joinPath(workspaceUri, 'diagram.svg');
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: { Images: ['svg'] },
            saveLabel: 'Export Diagram',
        });

        if (uri) {
            try {
                const buffer: Buffer = Buffer.from(data, 'utf-8');
                await vscode.workspace.fs.writeFile(uri, buffer);
                vscode.window.showInformationMessage(
                    `Successfully exported diagram to ${path.basename(
                        uri.fsPath
                    )}`
                );
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to save file: ${err}`);
            }
        }
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

    /**
     * Updates the content of the webview panel.
     * @param mermaidSyntax The new Mermaid syntax to render.
     */
    private _update(mermaidSyntax: string) {
        this._panel.webview.html = this._getHtmlForWebview(mermaidSyntax);
    }

    /**
     * Generates the HTML content for the webview panel.
     * @param mermaidSyntax The Mermaid syntax to be embedded in the HTML.
     * @returns A string containing the full HTML document.
     */
    private _getHtmlForWebview(mermaidSyntax: string): string {
        const webview = this._panel.webview;
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._extensionUri,
                'src',
                'webview',
                'style.css'
            )
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'main.js')
        );
        const mermaidCdnUri =
            'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        const nonce = getNonce();
        
        // **THE FIX**: Removed the incorrect escaping of the mermaidSyntax.
        // The Mermaid library expects the raw syntax.
        
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
                <div id="diagram-container">
                    <div class="mermaid">${mermaidSyntax}</div>
                </div>
                <script nonce="${nonce}" src="${mermaidCdnUri}"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

/**
 * Generates a random string to be used as a nonce for Content Security Policy.
 * @returns A 32-character random string.
 */
function getNonce() {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
