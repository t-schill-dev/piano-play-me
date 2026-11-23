<script lang="ts">
  import { AVATARS } from '../lib/family.svelte';

  interface Props {
    name?: string; avatar?: string; label?: string;
    onsave: (name: string, avatar: string) => void; oncancel?: () => void;
  }
  let { name = '', avatar = AVATARS[0], label = 'Save', onsave, oncancel }: Props = $props();
  // Local copies the form edits; they start from the props.
  // svelte-ignore state_referenced_locally
  let n = $state(name);
  // svelte-ignore state_referenced_locally
  let a = $state(avatar);
</script>

<form class="player-form" onsubmit={(e) => { e.preventDefault(); if (n.trim()) onsave(n, a); }}>
  <input class="pill" bind:value={n} maxlength="20" placeholder="Name" autocomplete="off" aria-label="Player name" />
  <div class="avatar-pick" role="radiogroup" aria-label="Pick an avatar">
    {#each AVATARS as av (av)}
      <button type="button" class="av" class:on={a === av} role="radio" aria-checked={a === av} onclick={() => (a = av)}>{av}</button>
    {/each}
  </div>
  <div class="row">
    <button class="pill go" type="submit" disabled={!n.trim()}>{label}</button>
    {#if oncancel}<button class="pill" type="button" onclick={oncancel}>Cancel</button>{/if}
  </div>
</form>
