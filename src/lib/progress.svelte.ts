/*
 * Adventure progress (stars per lesson, per song) for the player who is playing right now.
 * Stars are saved online in Netlify Blobs through /api/progress, never on the device.
 * The Guest player (and anyone playing before a family code is set) starts fresh and is not saved.
 */
import { SONGS, lessonCount, type Song } from './songs';

export interface Saved { stars: Record<string, number[]>; openAll: boolean; }
export type SaveStatus = 'none' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';

export const emptyProgress = (): Saved => ({ stars: {}, openAll: false });

export function hasStars(s: Saved): boolean {
  return Object.values(s.stars).some((l) => l.some((n) => n > 0));
}

export function mergeProgress(a: Saved, b: Saved): Saved {
  const stars = { ...a.stars };
  for (const [id, list] of Object.entries(b.stars)) {
    const old = stars[id] ?? [];
    stars[id] = Array.from({ length: Math.max(old.length, list.length) }, (_, i) => Math.max(old[i] ?? 0, list[i] ?? 0));
  }
  return { stars, openAll: a.openAll || b.openAll };
}

/** True when `a` already holds every star in `b`. */
function covers(a: Saved, b: Saved): boolean {
  if (b.openAll && !a.openAll) return false;
  return Object.entries(b.stars).every(([id, list]) => list.every((n, i) => n <= (a.stars[id]?.[i] ?? 0)));
}

/** Calls the saved-data API. Throws with `status` set when the server answered with an error. */
export async function api<T>(method: string, path: string, code: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-family-code': code },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error || 'Saving failed'), { status: res.status });
  return data as T;
}

class Progress {
  data = $state<Saved>(emptyProgress());
  status = $state<SaveStatus>('none');
  problem = $state('');
  private code = '';
  private player = '';
  private gen = 0; // bumps on every player switch, so late answers for the old player are ignored
  private dirty = false;
  private replace = false;
  private retry: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('online', () => { if (this.dirty) void this.push(); });
  }

  get saving(): boolean { return !!this.code && !!this.player && this.player !== 'guest'; }

  /**
   * Switch to a player's stars. `carry` holds stars earned elsewhere (for example, saved on the
   * device by an older version) that should be added to this player. Resolves true once saved.
   */
  async use(code: string, player: string, carry?: Saved): Promise<boolean> {
    const gen = ++this.gen;
    clearTimeout(this.retry);
    this.code = code; this.player = player;
    this.data = emptyProgress(); this.dirty = false; this.replace = false; this.problem = '';
    if (!this.saving) { this.status = 'none'; return false; }
    this.status = 'loading';
    try {
      const server = await api<Saved>('GET', this.url(), code);
      if (gen !== this.gen) return false;
      this.data = mergeProgress(server, this.data); // keep anything earned while loading
      if (carry && hasStars(carry)) { this.data = mergeProgress(this.data, carry); this.dirty = true; }
      if (this.dirty) return this.push();
      this.status = 'saved';
      return true;
    } catch (e) {
      if (gen === this.gen) this.failed(e);
      return false;
    }
  }

  private url(): string { return '/api/progress?player=' + encodeURIComponent(this.player); }

  private async push(): Promise<boolean> {
    if (!this.saving) return false;
    const gen = this.gen;
    clearTimeout(this.retry);
    this.status = 'saving';
    const sent = $state.snapshot(this.data);
    const replace = this.replace;
    try {
      const merged = await api<Saved>('POST', this.url(), this.code, { ...sent, replace });
      if (gen !== this.gen) return false;
      this.data = mergeProgress(merged, this.data); // keep anything earned while saving
      this.replace = false;
      this.dirty = !covers(merged, this.data);
      this.status = 'saved'; this.problem = '';
      if (this.dirty) return this.push();
      return true;
    } catch (e) {
      if (gen !== this.gen) return false;
      this.failed(e);
      if ((this.status as SaveStatus) === 'offline') this.retry = setTimeout(() => void this.push(), 30000);
      return false;
    }
  }

  private failed(e: unknown): void {
    const status = (e as { status?: number }).status;
    if (status == null) { this.status = 'offline'; this.problem = 'No internet right now. Stars will be saved when it is back.'; }
    else { this.status = 'error'; this.problem = (e as Error).message; }
  }

  private changed(): void { this.dirty = true; void this.push(); }

  starsOf(songId: string, lesson: number): number {
    return this.data.stars[songId]?.[lesson] ?? 0;
  }

  record(songId: string, lesson: number, stars: number): void {
    const list = [...(this.data.stars[songId] ?? [])];
    list[lesson] = Math.max(list[lesson] ?? 0, stars);
    this.data.stars = { ...this.data.stars, [songId]: list };
    this.changed();
  }

  songDone(song: Song): boolean {
    return this.starsOf(song.id, lessonCount(song) - 1) > 0;
  }

  songUnlocked(index: number): boolean {
    return index === 0 || this.data.openAll || this.songDone(SONGS[index - 1]);
  }

  lessonUnlocked(songId: string, lesson: number): boolean {
    return lesson === 0 || this.data.openAll || this.starsOf(songId, lesson - 1) > 0;
  }

  totalStars(): number {
    return Object.values(this.data.stars).flat().reduce((a, b) => a + (b || 0), 0);
  }

  openAll(): void { this.data.openAll = true; this.changed(); }
  reset(): void { this.data = emptyProgress(); this.replace = true; this.changed(); }
}

export const progress = new Progress();
