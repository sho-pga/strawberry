// Configuration for screenshot automation (moved to client/tools)
module.exports = {
  // Base URL for the frontend application (Vite dev server)
  baseUrl: "http://localhost:5173",

  // Viewport configurations
  viewport: { width: 1200, height: 800 },

  // Selectors used for interacting with the UI
  selectors: {
    promptInput: "textarea[data-testid='prompt-textarea']",
    generateButton: "button[data-testid='generate-button']",
    exportButton: "button[data-testid='export-button']",
    // Preview content is rendered with this test id
    previewWindow: "[data-testid='preview-content']",
    // Status banner class used in StatusDisplay.svelte
    statusDisplay: ".status-banner",
    smokeTestButton: "button[data-testid='smoke-button']",
    // OverrideControls renders container with this class
    overrideControls: ".override-container",
    // Load demo button
    loadDemoButton: "button[data-testid='load-demo']",
  },

  // Screenshot states configuration
  states: {
    initial: {
      name: "initial_state",
      // Ensure demo content is loaded so preview appears
      actions: [{ type: "click", selector: "button[data-testid='load-demo']" }],
      waitFor: ["[data-testid='preview-content']"],
      delay: 1500,
    },
    promptEntry: {
      name: "prompt_entry",
      // Load demo content first so export button is rendered, then click export
      actions: [
        { type: "click", selector: "button[data-testid='load-demo']" },
        { type: "click", selector: "button[data-testid='export-button']" },
      ],
      waitFor: [".progress-bar", ".progress"],
      delay: 1000,
    },
    generating: {
      name: "generating",
      description: "Content generation in progress",
      actions: [
        { type: "click", selector: "button[data-testid='generate-button']" },
      ],
      waitFor: [".loading-indicator"],
      delay: 1000,
    },
    preview: {
      name: "preview_display",
      description: "Content preview after generation",
      waitFor: ["[data-testid='preview-content']"],
      delay: 2000,
    },
    export: {
      name: "export_process",
      description: "Export process initiation",
      actions: [
        {
          type: "click",
          selector: "button[data-testid='export-button']",
        },
      ],
      waitFor: [".export-progress"],
      delay: 1000,
    },
    error: {
      name: "error_state",
      description: "Error state display",
      actions: [
        {
          type: "evaluate",
          script: `
            window.dispatchEvent(new CustomEvent('aether-error', { 
              detail: { message: 'Network error occurred during generation.' } 
            }));
          `,
        },
      ],
      waitFor: [".error-message"],
      delay: 1000,
    },
  },

  // Output configuration
  output: {
    directory: "../assets/screenshots",
    format: "png",
    quality: 100,
  },
};
