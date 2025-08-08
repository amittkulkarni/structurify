(function () {
    mermaid.initialize({
        startOnLoad: true,
        theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true
        }
    });
}());