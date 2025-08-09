(function () {
    const vscode = acquireVsCodeApi();

    mermaid.initialize({
        startOnLoad: true,
        theme: 'base',
        flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis',
        }
    });

    window.addEventListener('message', async event => {
        const message = event.data;
        if (message.command === 'exportAsSvg') {
            const diagramContainer = document.getElementById('diagram-container');
            const svgElement = diagramContainer.querySelector('.mermaid > svg');

            if (!svgElement) {
                return;
            }

            svgElement.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background');

            const svgData = new XMLSerializer().serializeToString(svgElement);
            vscode.postMessage({
                command: 'saveFile',
                data: svgData,
                format: 'svg'
            });
            
            svgElement.style.backgroundColor = '';
        }
    });
}());