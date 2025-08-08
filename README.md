# Structurify

![Structurify Icon](https://raw.githubusercontent.com/amittkulkarni/structurify/master/assets/structurify.png)

Instantly generate Mermaid.js flowchart diagrams from your code using the power of AI. Simply select a function or a block of code, right-click, and watch the logic come to life.

<p align="center">
 <img src="https://img.shields.io/visual-studio-marketplace/v/structurify.structurify?style=for-the-badge&label=Marketplace&color=blue" alt="Version">
 <img src="https://img.shields.io/visual-studio-marketplace/i/structurify.structurify?style=for-the-badge&label=Installs&color=green" alt="Installs">
 <img src="https://img.shields.io/github/license/amittkulkarni/structurify?style=for-the-badge" alt="License">
</p>

---

## Features

-   **Code-to-Diagram**: Select any block of code (e.g., a function, a loop, a conditional block) and generate a flowchart diagram.
-   **AI-Powered**: Uses the high-speed Groq API with the Llama 3 model to analyze code logic.
-   **Seamless Integration**: The generated diagram appears in a new VS Code Webview panel, right inside your editor.
-   **Mermaid.js**: Leverages the popular Mermaid.js library for clean and clear diagram rendering.
-   **Theme Aware**: The diagram view is styled to match your current VS Code theme (light, dark, or high contrast).



---

## Requirements

You must have a **Groq API Key** to use this extension. The service is very fast and has a generous free tier.

1.  Go to [GroqCloud](https://console.groq.com/keys) to get your free API key.
2.  Open VS Code Settings (`Ctrl/Cmd + ,`).
3.  Search for "structurify".
4.  Enter your API key in the `Structurify: Groq > Api Key` field.

---

## How to Use

1.  Open a code file in VS Code.
2.  **Select a block of code** you want to visualize.
3.  **Right-click** on the selected code.
4.  Click on **"Generate Logic Diagram"** from the context menu.
5.  A new panel will open with the generated flowchart.

---

## Extension Settings

This extension contributes the following settings:

-   `structurify.groq.apiKey`: Your API key for the Groq service.

---

**Enjoy visualizing your code!**
