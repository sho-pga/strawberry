<!-- Export.svelte -->
<s      clearInterval(progressInterval);
      progress = 100;

      // Create download link  import { onMount } from 'svelte';
  import { exportToPdf } from '../lib/endpoints';

  export let content;
  export let filename = 'export.pdf';

  let loading = false;
  let error = null;
  let progress = 0;

  async function handleExport() {
    try {
      loading = true;
      error = null;
      progress = 0;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        if (progress < 90) {
          progress += 10;
        }
      }, 500);

      const blob = await exportToPdf(content);
      
      clearInterval(progressInterval);
      progress = 100;

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
      progress = 0;
    }
  }
</script>

<div class="export-container">
  <button
    on:click={handleExport}
    disabled={loading}
    class:loading
  >
    {#if loading}
      <div class="progress-bar">
        <div class="progress" style="width: {progress}%"></div>
      </div>
      Exporting... ({progress}%)
    {:else}
      Export to PDF
    {/if}
  </button>

  {#if error}
    <div class="error" role="alert">
      <span class="error-icon">⚠️</span>
      <p>{error}</p>
    </div>
  {/if}
</div>

<style>
  .export-container {
    margin: 1rem 0;
  }

  button {
    position: relative;
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    overflow: hidden;
  }

  button:hover:not(:disabled) {
    background-color: #0056b3;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.2);
  }

  .progress {
    height: 100%;
    background-color: rgba(255, 255, 255, 0.8);
    transition: width 0.3s ease;
  }

  .error {
    margin-top: 1rem;
    padding: 0.75rem;
    color: #721c24;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
