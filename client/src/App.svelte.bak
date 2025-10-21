<script>
  import PromptInput from './components/PromptInput.svelte';
  import PreviewWindow from './components/PreviewWindow.svelte';
  import OverrideControls from './components/OverrideControls.svelte';
  import ExportButton from './components/ExportButton.svelte';
  import StatusDisplay from './components/StatusDisplay.svelte';
</script>

<main>
  <header>
    <h1>AetherPress</h1>
  </header>

  <div class="container">
    <div class="left-panel">
      <PromptInput />
      <OverrideControls />
      <ExportButton />
    </div>
    <div class="right-panel">
      <PreviewWindow />
    </div>
  </div>
</main>

<StatusDisplay />

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    text-align: center;
    padding: 1em;
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 2rem;
  }

  .container {
    display: flex;
    gap: 2rem;
  }

  .left-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .right-panel {
    flex: 2;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 1rem;
    min-height: 500px;
  }

  @media (max-width: 768px) {
    .container {
      flex-direction: column;
    }
  }
</style>
