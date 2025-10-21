<script lang="ts">
  import { uiStateStore } from '../stores';
  import { fade } from 'svelte/transition';
  import { onMount, tick } from 'svelte';

  let uiState: { status: string; message: string };
  let autoDismissTimeout: NodeJS.Timeout | null = null;
  uiStateStore.subscribe(value => {
    uiState = value;
    // Dev telemetry: surface uiState to console for debugging in browsers
    // and show a minimal visible indicator for Opera where the banner may not show.
    // Remove these logs in production.
    try {
      // eslint-disable-next-line no-console
      console.debug('[DEV] uiState update:', value);
    } catch (e) {}
  });

  // Auto-dismiss success/error after 3s
  $: if (uiState && (uiState.status === 'success' || uiState.status === 'error')) {
    if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
    autoDismissTimeout = setTimeout(async () => {
      uiStateStore.set({ status: 'idle', message: '' });
      await tick();
      autoDismissTimeout = null;
    }, 3000);
  }

  onMount(() => {
    return () => {
      if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
    };
  });
</script>

{#if uiState.status === 'loading' || uiState.status === 'error' || uiState.status === 'success'}
  <div
    role="status"
    aria-live={uiState.status === 'loading' ? 'polite' : 'assertive'}
    class="status-banner"
    class:loading={uiState.status === 'loading'}
    class:error={uiState.status === 'error'}
    class:success={uiState.status === 'success'}
    transition:fade
  >
    {#if uiState.status === 'loading'}
      <div class="spinner" aria-label="Loading"></div>
    {/if}
    <p class="status-message">{uiState.message}</p>
    <div class="actions">
      <button
        class="dismiss"
        aria-label="Dismiss status"
        on:click={() => uiStateStore.set({ status: 'idle', message: '' })}
        data-testid="dismiss-status"
      >
        Dismiss
      </button>
    </div>
  </div>
{/if}

<!-- Dev-only visible indicator to confirm uiState updates in browsers where the banner might be hidden -->
{#if import.meta.env.VITE_DEV_UI === 'true'}
  <div class="dev-ui-state" aria-hidden="true">DEV UI STATE: {uiState.status} {uiState.message}</div>
{/if}

<style>
  .status-banner {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem 2.5rem;
    border-radius: 10px;
    color: #fff;
    z-index: 1000;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
    font-weight: 600;
    font-size: 1.15rem;
    letter-spacing: 0.02em;
    opacity: 0.98;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .loading {
    background-color: #3498db;
    border: 2px solid #217dbb;
  }
  .error {
    background-color: #e74c3c;
    border: 2px solid #c0392b;
  }
  .success {
    background-color: #27ae60;
    border: 2px solid #219150;
  }
  .status-message {
    flex: 1;
    font-size: 1.2rem;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 4px solid #fff;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 1rem;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .actions {
    margin-left: 1rem;
  }
  .dismiss {
    background: none;
    border: none;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .dismiss:hover {
    background: rgba(255,255,255,0.12);
  }
</style>
