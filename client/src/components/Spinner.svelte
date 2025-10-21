<script>
  export let size = 20;
  export let ariaLabel = 'Loading';
</script>

<div class="spinner" role="status" aria-label={ariaLabel} aria-live="polite" style="width: {size}px; height: {size}px"></div>

<style>
  .spinner {
    width: var(--size, 20px);
    height: var(--size, 20px);
    border: 3px solid rgba(255,255,255,0.2);
    border-top: 3px solid rgba(255,255,255,0.9);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
