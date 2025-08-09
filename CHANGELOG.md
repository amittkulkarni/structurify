# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-08-09

### Added

-   **Actionable Error Messages**: The error for a missing API key now includes an "Open Settings" button for a better user experience.
-   **Cancellable Operations**: Diagram generation can now be cancelled from the progress notification.
-   **Suggested Filename**: The "Export as SVG" dialog now suggests a default filename (`diagram.svg`).
-   **JSDoc Comments**: Added comprehensive documentation to the codebase for better maintainability.

### Changed

-   **Marketplace Presence**: Improved the `package.json` with keywords and links to enhance discoverability in the VS Code Marketplace.

---

## [1.0.2] - 2025-08-09

### Added
-   **Export via Context Menu**: Right-click on a diagram and select "Export as SVG" to save your flowchart.

### Fixed
-   **Removed Unreliable Export Button**: Removed the export button from the title bar, which would sometimes disappear. The new context menu is a more stable solution.

---

## [1.0.1] - 2025-08-08

### Added
-   Implemented a robust, code-based sanitizer to programmatically fix common AI syntax errors, guaranteeing a valid diagram output.
-   Added the foundation for the "Export to SVG/PNG" command.

### Changed
-   Switched the default AI model to `llama3-70b-8192` for vastly improved consistency and accuracy in flowchart generation.

### Fixed
-   Corrected a CSS alignment issue that could cause large diagrams to be cut off at the top of the view.

---

## [1.0.0] - 2025-08-07

### Added
-   Initial release of Structurify! 
-   Generate Mermaid.js diagrams from selected code.
-   AI-powered logic analysis using the Groq API.
-   Diagrams are displayed in a theme-aware VS Code webview panel.