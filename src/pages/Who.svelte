<script lang="ts">
  import { family, GUEST, MAX_PLAYERS, avatarColor } from '../lib/family.svelte';
  import PlayerForm from '../components/PlayerForm.svelte';

  let adding = $state(false);
  let loggingIn = $state(false);
  let codeInput = $state('');

  async function add(name: string, avatar: string): Promise<void> {
    if (await family.addPlayer(name, avatar)) adding = false;
  }
  async function login(): Promise<void> {
    if (await family.connect(codeInput)) { loggingIn = false; codeInput = ''; }
  }
</script>

<div class="who">
  <div class="hello"><div class="big">Who's playing?</div></div>

  {#if adding}
    <div class="stage">
      <h2 class="center">New player</h2>
      <PlayerForm label="Add player" onsave={add} oncancel={() => (adding = false)} />
      {#if family.problem}<p class="err">{family.problem}</p>{/if}
    </div>
  {:else}
    <div class="players">
      {#each family.players as p (p.id)}
        <button class="player" onclick={() => family.choose(p)}>
          <span class="face" style="background: {avatarColor(p)}">{p.avatar}</span>
          <b>{p.name}</b>
        </button>
      {/each}
      {#if !family.code || family.showGuest}
        <button class="player" onclick={() => family.choose(GUEST)}>
          <span class="face" style="background: {avatarColor(GUEST)}">{GUEST.avatar}</span>
          <b>Guest</b><small>Just trying it out</small>
        </button>
      {/if}
      {#if family.code && family.status === 'ready' && family.players.length < MAX_PLAYERS}
        <button class="player add" onclick={() => (adding = true)}>
          <span class="face">＋</span><b>Add player</b>
        </button>
      {/if}
    </div>

    {#if family.status === 'loading'}
      <p class="muted center">Loading players…</p>
    {:else if family.code && (family.status === 'offline' || family.status === 'error')}
      <p class="muted center">{family.problem} <button class="pill" onclick={() => family.load()}>Try again</button></p>
    {:else if !family.code}
      {#if loggingIn}
        <form class="row center" style="margin-top:14px" onsubmit={(e) => { e.preventDefault(); void login(); }}>
          <input class="pill" bind:value={codeInput} placeholder="Family code" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Family code" />
          <button class="pill go" type="submit">Log in</button>
          <button class="pill" type="button" onclick={() => (loggingIn = false)}>Cancel</button>
        </form>
        <p class="muted small center">New family? Make up a code (at least 6 letters or numbers) and keep it private like a password.
          Type the same code on every device to share players and stars.</p>
        {#if family.problem}<p class="err">{family.problem}</p>{/if}
      {:else}
        <p class="center" style="margin-top:14px"><button class="pill" onclick={() => (loggingIn = true)}>🔑 Grown-ups: family login</button></p>
      {/if}
    {/if}
  {/if}
</div>
