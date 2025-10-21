import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  // Add compatibility mode for Svelte 5
  compilerOptions: {
    compatibility: {
      componentApi: 4, // Use Svelte 4 component API (numeric value)
    },
  },
};
