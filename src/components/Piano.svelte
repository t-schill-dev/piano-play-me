<script lang="ts">
  import { colorOf, isBlack, midiLetter } from '../lib/pitch';

  interface Props { target?: number | null; heard?: number | null; ontap?: (midi: number) => void; }
  let { target = null, heard = null, ontap }: Props = $props();

  const LOW = 48, HIGH = 72; // C3 .. C5
  const WHITE_W = 60, WHITE_H = 300, BLACK_W = 36, BLACK_H = 188;

  const whites: { m: number; x: number }[] = [];
  const blacks: { m: number; x: number }[] = [];
  let x = 1;
  for (let m = LOW; m <= HIGH; m++) {
    if (isBlack(m)) blacks.push({ m, x: x - BLACK_W / 2 });
    else { whites.push({ m, x }); x += WHITE_W; }
  }
  const width = x + 1;

  function cls(m: number, black: boolean): string {
    return 'key ' + (black ? 'bk' : 'wk') + (m === target ? ' target' : '') + (m === heard ? ' heard' : '');
  }
</script>

<svg class="piano" viewBox="0 0 {width} {WHITE_H + 2}" role="group" aria-label="Piano keys from low C to high C">
  {#each whites as k (k.m)}
    <rect class={cls(k.m, false)} x={k.x} y="1" width={WHITE_W} height={WHITE_H} rx="6"
      role="button" tabindex="-1" aria-label={midiLetter(k.m)}
      onclick={() => ontap?.(k.m)} onkeydown={() => {}} />
    <circle class="kdot" cx={k.x + WHITE_W / 2} cy={WHITE_H - 26} r="19" fill={colorOf(k.m)} />
    <text class="lbl" x={k.x + WHITE_W / 2} y={WHITE_H - 18}>{midiLetter(k.m)}</text>
    {#if k.m === 60}
      <text class="midc" x={k.x + WHITE_W / 2} y={WHITE_H - 56}>middle</text>
    {/if}
  {/each}
  {#each blacks as k (k.m)}
    <rect class={cls(k.m, true)} x={k.x} y="1" width={BLACK_W} height={BLACK_H} rx="4"
      role="button" tabindex="-1" aria-label={midiLetter(k.m)}
      onclick={() => ontap?.(k.m)} onkeydown={() => {}} />
  {/each}
</svg>
