<script>
  export let mode = 'default';
  export let label = 'Basic Prompt → Book';
  export let isActive = true;
  export let canRevert = false;

  import { modeStore } from '../stores/modeStore';

  function handleClick() {
    if (canRevert) {
      modeStore.revertToDefault();
    }
  }
</script>

<div class="mode-indicator {mode}" class:active={isActive} on:click={handleClick}>
  <span>{label}</span>
</div>

<style>
  .mode-indicator {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin: 0.5rem 0;
    padding: 0.75rem;
    font-size: 0.9rem;
    color: #666;
    transition: background-color 0.2s ease;
    text-align: center;
  }

  .mode-indicator.default {
    background: #fafafa;
    border-style: dashed;
  }

  .mode-indicator:hover {
    background: #f0f0f0;
    cursor: default;
  }

  .mode-indicator.active:not(.default):hover {
    cursor: pointer;
  }
</style>