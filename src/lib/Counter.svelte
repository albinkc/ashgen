<script>
  let count = $state(0)
  let isPublic = $state(false)
  const increment = () => {
    count += 1
  }
</script>

<label class="flex items-center gap-2 mb-2">
  <input type="checkbox" bind:checked={isPublic} />
  <span>Mark relationship as public</span>
</label>

<button onclick={increment}>
  count is {count}
</button>
