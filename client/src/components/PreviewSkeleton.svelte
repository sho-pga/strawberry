<script>
  export let lines = 5;
</script>

<div class="skeleton" aria-hidden="true">
  <div class="skeleton-title"></div>
  {#each Array(lines) as _, i}
    <div class="skeleton-line" style="width: {80 - (i * 6)}%"></div>
  {/each}
</div>

<style>
  .skeleton { padding: 1.5rem; display:flex; flex-direction:column; gap:0.6rem }
  .skeleton-title { height: 22px; width: 40%; background: linear-gradient(90deg,#eee,#f5f5f5,#eee); border-radius:4px }
  .skeleton-line { height: 12px; border-radius: 4px; background: linear-gradient(90deg,#eee,#f7f7f7,#eee) }
</style>
