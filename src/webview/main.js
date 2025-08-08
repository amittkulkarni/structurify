(function () {
    const vscode = acquireVsCodeApi();

    mermaid.initialize({
        startOnLoad: true,
        theme: 'base',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
        }
    });

    window.addEventListener('message', async event => {
        const message = event.data;
        if (message.command === 'export') {
            const diagramContainer = document.getElementById('diagram-container');
            const svgElement = diagramContainer.querySelector('svg');

            if (!svgElement) {
                return;
            }

            svgElement.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background');

            if (message.format === 'svg') {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                vscode.postMessage({
                    command: 'saveFile',
                    data: svgData,
                    format: 'svg'
                });
            } else if (message.format === 'png') {
                const canvas = document.getElementById('export-canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to match SVG
                canvas.width = svgElement.width.baseVal.value * 2; // Render at 2x for better quality
                canvas.height = svgElement.height.baseVal.value * 2;
                
                const svgData = new XMLSerializer().serializeToString(svgElement);
                
                const v = await Canvg.from(ctx, svgData, {
                    scaleWidth: canvas.width,
                    scaleHeight: canvas.height,
                });
                await v.render();
                
                const pngDataUrl = canvas.toDataURL('image/png');
                vscode.postMessage({
                    command: 'saveFile',
                    data: pngDataUrl,
                    format: 'png'
                });
            }
            
            svgElement.style.backgroundColor = '';
        }
    });
}());