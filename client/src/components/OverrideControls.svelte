<script lang="ts">
  import { contentStore, uiStateStore } from '../stores';
  import { saveOverride } from '../lib/api';
  import { onDestroy } from 'svelte';

  let originalContent: object | null;
  let localContent = { title: '', body: '' };
  let debounceTimer: number;

  const contentUnsubscribe = contentStore.subscribe(value => {
    originalContent = value;
    if (value) {
      localContent = { ...value };
    }
  });

  const handleDebouncedInput = (field: 'title' | 'body', value: string) => {
    localContent[field] = value;
    
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const changes = { [field]: value };
      updateContent(changes);
    }, 500); // 500ms debounce
  };

  const handleTitleInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    handleDebouncedInput('title', target.value);
  }

  const handleBodyInput = (event: Event) => {
    const target = event.currentTarget as HTMLTextAreaElement;
    handleDebouncedInput('body', target.value);
  }

  const updateContent = async (changes: object) => {
    if (!originalContent) return;

    uiStateStore.set({ status: 'loading', message: 'Saving changes...' });
    try {
      const response = await saveOverride(originalContent, changes);
      if (response && response.data) {
        try {
          const { safePersistContent } = await import('../lib/persistHelper');
          const result = await safePersistContent(response.data.content);
          if (!result) {
            contentStore.set(response.data.content);
          }
        } catch (e) {
          // Fallback to local set if persist helper isn't available or fails
          contentStore.set(response.data.content);
          console.warn('OverrideControls: safePersistContent failed, falling back to local set', e && e.message);
        }
        uiStateStore.set({ status: 'success', message: 'Changes saved.' });
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (error) {
      const err = error as Error;
      uiStateStore.set({ status: 'error', message: `Failed to save: ${err.message}` });
    }
  };

  onDestroy(() => {
    contentUnsubscribe();
    window.clearTimeout(debounceTimer);
  });
</script>

{#if originalContent}
<div class="override-container">
  <h3>Override Content</h3>
  <div class="form-group">
    <label for="override-title">Title</label>
    <input
      id="override-title"
      type="text"
      bind:value={localContent.title}
      on:input={handleTitleInput}
    />
  </div>
  <div class="form-group">
    <label for="override-body">Body</label>
    <textarea
      id="override-body"
      rows="10"
      bind:value={localContent.body}
      on:input={handleBodyInput}
    ></textarea>
  </div>
</div>
{/if}

<style>
  .override-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  label {
    font-weight: bold;
  }
  input, textarea {
    width: 100%;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #ccc;
    font-family: inherit;
    font-size: 1rem;
  }
</style>
