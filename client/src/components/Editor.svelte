<!-- Editor.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  export let content = '';
  export let label = 'Content';
  export let minLength = 10;
  export let maxLength = 1000;
  export let rows = 5;
  
  let touched = false;
  let error = null;
  const dispatch = createEventDispatcher();

  function validate(value) {
    if (!value || value.length < minLength) {
      return `${label} must be at least ${minLength} characters`;
    }
    if (value.length > maxLength) {
      return `${label} must not exceed ${maxLength} characters`;
    }
    return null;
  }

  function handleInput(event) {
    content = event.target.value;
    error = validate(content);
    touched = true;
    
    dispatch('input', {
      content,
      isValid: !error,
      error
    });
  }

  function handleBlur() {
    touched = true;
    error = validate(content);
  }
</script>

<div class="editor-container">
  <label>
    <span class="label">{label}</span>
    <textarea
      {rows}
      value={content}
      on:input={handleInput}
      on:blur={handleBlur}
      class:error={touched && error}
      placeholder="Enter your content here..."
    ></textarea>
  </label>
  
  {#if touched && error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
  
  <div class="character-count" class:warning={content.length > maxLength * 0.9}>
    {content.length} / {maxLength} characters
  </div>
</div>

<style>
  .editor-container {
    width: 100%;
  }

  .label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
    font-size: inherit;
    resize: vertical;
  }

  textarea.error {
    border-color: #dc3545;
  }

  .error-message {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .character-count {
    text-align: right;
    font-size: 0.875rem;
    color: #6c757d;
    margin-top: 0.25rem;
  }

  .warning {
    color: #ffc107;
  }
</style>
