(function () {
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default', // The theme can be 'default', 'dark', 'forest', 'neutral'
        theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true
        }
    });
}());