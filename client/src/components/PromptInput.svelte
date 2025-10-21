<script>
  import { promptStore, contentStore, previewStore, uiStateStore } from '../stores';
  import { submitPrompt, exportToPdf } from '../lib/api';
  import { generateAndPreview } from '../lib/flows';
  import { tick } from 'svelte';

  // Local reactive bindings to stores (use $store where appropriate in template)
  let generateFlash = false;
  let isGenerating = false;
  let isPreviewing = false;


  // Primary generate handler (used by Generate button)
  async function handleGenerateNow() {
    // read value from store
    let prompt;
    try {
      prompt = $promptStore;
    } catch (e) {
      prompt = '';
    }
    if (!prompt || !prompt.trim()) {
      uiStateStore.set({ status: 'error', message: 'Prompt cannot be empty.' });
      return;
    }

  console.debug('[DEV] handleGenerateNow invoked, prompt=', $promptStore);
  isGenerating = true;
    generateFlash = true;
    try {
      await generateAndPreview(prompt);
      uiStateStore.set({ status: 'success', message: 'Content generated (server).' });
    } catch (err) {
      uiStateStore.set({ status: 'error', message: err && err.message ? err.message : 'Server generation failed' });
    } finally {
      isGenerating = false;
      setTimeout(() => (generateFlash = false), 250);
    }
  }

  // Preview-now handler (keeps current behaviour but centralises preview updates)
  async function handlePreviewNow() {
    const current = $contentStore;
    console.debug('[DEV] handlePreviewNow invoked, currentContent=', current);
    if (!current) {
      uiStateStore.set({ status: 'error', message: 'No content to preview. Generate content first.' });
      return;
    }
    isPreviewing = true;
    try {
      uiStateStore.set({ status: 'loading', message: 'Loading preview...' });
      const api = await import('../lib/api');
      const html = await api.loadPreview(current);
      previewStore.set(html);
      uiStateStore.set({ status: 'success', message: 'Preview updated' });
    } catch (err) {
      uiStateStore.set({ status: 'error', message: err && err.message ? err.message : 'Preview failed' });
    } finally {
      isPreviewing = false;
    }
  }

  // Load demo content (persist if possible)
  import { safePersistContent } from '../lib/persistHelper';

  async function loadDemo() {
    const demo = {
      title: 'Summer Poems — Demo',
      body: '<div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer1.svg);background-size:cover;background-position:center;"><h1>Summer Poem 1</h1><p>By Unknown</p><pre>Roses are red\\nViolets are blue\\nSummer breeze carries you</pre></div><div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer2.svg);background-size:cover;background-position:center;"><h1>Summer Poem 2</h1><p>By Unknown</p><pre>Sun on the sand\\nWaves lap the shore\\nA page on each</pre></div>'
    };
  console.debug('[DEV] loadDemo invoked');
  promptStore.set('Load demo: two short summer poems, one per page');
    // Persist demo in background and fall back to local set if it fails
    const persisted = await safePersistContent(demo);
    if (!persisted) {
      contentStore.set(demo);
    }
    uiStateStore.set({ status: 'loading', message: 'Loading demo preview...' });
    await handlePreviewNow();
  }

    // DEV-only runtime diagnostics: submit a test prompt and show raw responses
    async function runRuntimeDiag() {
      const testPrompt = 'Runtime diag test\\nThis is a diagnostic body';
      uiStateStore.set({ status: 'loading', message: 'Running runtime diagnostics...' });
      try {
        const api = await import('../lib/api');
          console.debug('[DEV] runRuntimeDiag: submitting prompt');
          const resp = await api.submitPrompt(testPrompt);
        // show raw response in dev-status area
        try {
          const txt = JSON.stringify(resp, null, 2);
          // write directly to the dev-status textarea via contentStore dev area
          promptStore.set(testPrompt);
          console.debug('[DEV] runRuntimeDiag: server resp=', resp);
          contentStore.set((resp && resp.data && resp.data.content) || resp.content || null);
          // attempt to load preview HTML for the returned content
          const content = (resp && resp.data && resp.data.content) || resp.content || null;
          if (content) {
            try {
              const html = await api.loadPreview(content);
              // expose preview snippet to dev textarea
              uiStateStore.set({ status: 'success', message: `Diag OK — preview ${String(html).slice(0,200)}` });
              // also set previewStore for immediate rendering
              const { previewStore } = await import('../stores');
              previewStore.set(html);
            } catch (e) {
              uiStateStore.set({ status: 'error', message: `Preview diag failed: ${e && e.message}` });
            }
          } else {
            uiStateStore.set({ status: 'error', message: 'Diag: server returned no content' });
          }
        } catch (e) {
          uiStateStore.set({ status: 'error', message: 'Diag: failed to stringify response' });
        }
      } catch (err) {
        uiStateStore.set({ status: 'error', message: err && err.message ? err.message : 'Runtime diag failed' });
      }
    }

  // Simple smoke test helper
  async function runSmokeTest() {
    const current = $contentStore;
    if (!current) {
      uiStateStore.set({ status: 'error', message: 'No content to run smoke test. Load or generate content first.' });
      return;
    }
    uiStateStore.set({ status: 'loading', message: 'Running smoke test (preview → export)...' });
    try {
      await handlePreviewNow();
      await exportToPdf(current);
      uiStateStore.set({ status: 'success', message: 'Smoke test succeeded — PDF downloaded.' });
    } catch (err) {
      uiStateStore.set({ status: 'error', message: err && err.message ? err.message : 'Smoke test failed' });
    }
  }
</script>

<!-- Template: use $store where reactivity is required -->
<div class="prompt-container">
  <label for="prompt-textarea">Prompt</label>
  <textarea
    id="prompt-textarea"
    data-testid="prompt-textarea"
    bind:value={$promptStore}
    rows="6"
    placeholder="e.g., A noir detective story set in a city of robots."
    disabled={$uiStateStore.status === 'loading'}
  ></textarea>

  <div class="controls-row">
    <!-- Developer helper buttons removed: only Generate and Preview remain -->

    <button
      data-testid="generate-button"
      on:click={handleGenerateNow}
      disabled={$uiStateStore.status === 'loading' || isGenerating || isPreviewing}
      aria-busy={isGenerating}
      aria-disabled={$uiStateStore.status === 'loading' || isPreviewing}
      aria-live="polite"
      title={$uiStateStore.status === 'loading' || isGenerating ? 'Generating... please wait' : 'Generate content from prompt'}
      class:flash={generateFlash}
    >
      {#if isGenerating}
        <span class="spinner" aria-hidden="true"></span>
  <span class="visually-hidden">Generating...</span>
      {:else}
        Generate
      {/if}
    </button>

    <button data-testid="preview-button" on:click={handlePreviewNow} disabled={$uiStateStore.status === 'loading' || isGenerating || isPreviewing}>
      {#if isPreviewing}
        Previewing...
      {:else}
        Preview
      {/if}
    </button>

    <button data-testid="smoke-button" style="display:none" aria-hidden="true" title="Run preview→export smoke test (developer helper - hidden)" on:click={runSmokeTest} disabled={$uiStateStore.status === 'loading' || isGenerating || isPreviewing}>
      Run smoke test
    </button>
  </div>

  {#if $uiStateStore.status === 'error'}
    <p class="error-message">{$uiStateStore.message}</p>
  {/if}

  {#if import.meta.env.DEV}
    <div class="dev-status">
      <label for="dev-status-textarea">Dev status</label>
      <textarea id="dev-status-textarea" readonly rows="4">{JSON.stringify({ status: $uiStateStore.status, message: $uiStateStore.message, previewLength: $previewStore ? $previewStore.length : 0 }, null, 2)}</textarea>
    </div>
  {/if}
</div>

<style>
  .prompt-container { display: flex; flex-direction: column; gap: 0.75rem; text-align: left; }
  .controls-row { display:flex; gap:0.5rem; align-items:center }
  /* Developer helper button styles removed */
  label { font-weight: bold; }
  textarea { width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 1rem; }
  button { padding: 0.75rem; border-radius: 4px; border: none; background-color: #2c3e50; color: white; cursor: pointer; font-size: 1rem; transition: background-color 0.2s; }
  button:hover { background-color: #3a506b; }
  button:disabled { background-color: #ccc; cursor: not-allowed; }
  .spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 0.5rem; vertical-align: middle; }
  .visually-hidden { position: absolute; left: -9999px; top: auto; width: 1px; height: 1px; overflow: hidden; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-message { color: #e74c3c; margin-top: 0.5rem; }
  button.flash { background-color: #c0392b !important; box-shadow: 0 0 0 4px rgba(192,57,43,0.12); transform: scale(1.03); }
  .dev-status { margin-top: 0.75rem }
  .dev-status textarea { width: 100%; font-family: monospace; font-size: 0.9rem; background:#f4f6f8; border: 1px dashed #ccc; padding:0.5rem }
</style>
<!-- (duplicate markup/styles removed) -->
        Previewing...
