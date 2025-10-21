<!-- Preview.svelte -->
<script>
  import { onMount } from 'svelte';
  import { previewEndpoint } from '../lib/endpoints';

  export let content;
  let previewHtml = '';
  let loading = false;
  let error = null;

  async function loadPreview() {
    try {
      loading = true;
  try { if (import.meta.env && import.meta.env.DEV) console.log('Preview.svelte: loadPreview called, content=', content); } catch (e) {}
      const response = await previewEndpoint({ prompt: content });
  previewHtml = response.preview;
  try { if (import.meta.env && import.meta.env.DEV) console.log('Preview.svelte: received preview length=', previewHtml ? previewHtml.length : 0); } catch (e) {}
    } catch (e) {
      error = e.message;
      if (e.validationErrors) {
        error = `Validation Error: ${e.validationErrors.join(', ')}`;
      }
    } finally {
      loading = false;
    }
  }

  $: if (content) {
  try { if (import.meta.env && import.meta.env.DEV) console.log('Preview.svelte: reactive content changed, triggering loadPreview'); } catch (e) {}
  loadPreview();
  }

  onMount(() => {
    if (content) {
      loadPreview();
    }
  });
</script>

<div class="preview-container">
  {#if loading}
    <div class="loading" role="status">
      <div class="spinner"></div>
      <span>Loading preview...</span>
    </div>
  {:else if error}
    <div class="error" role="alert">
      <span class="error-icon">⚠️</span>
      <p>{error}</p>
      <button on:click={loadPreview}>Retry</button>
    </div>
  {:else}
    <div class="preview-content" data-testid="preview-content">
      {@html previewHtml}
    </div>
  {/if}
</div>

<style>
  .preview-container {
    width: 100%;
    min-height: 200px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    color: #721c24;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    padding: 1rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .error button {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .error button:hover {
    background-color: #c82333;
  }

  .preview-content {
    width: 100%;
    overflow-x: auto;
  }
</style>
