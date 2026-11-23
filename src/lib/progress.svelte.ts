/*
 * Adventure progress (stars per lesson, per song), saved online in Netlify Blobs through
 * /api/progress. Nothing about progress is kept on the device: only the family code is
 * remembered, so this iPad knows whose stars to load. Without a code, stars last until the
 * page is closed.
 */
import { SONGS, lessonCount, type Song } from './songs';

const CODE_KEY = 'pianoPlay.familyCode';
const OLD_KEY = 'pianoPlay.progress.v1'; // where older versions kept progress on the device
const MIN_CODE = 6;

export interface Saved { stars: Record<string, number[]>; openAll: boolean; }
export type SaveStatus = 'none' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';

const empty = (): Saved => ({ stars: {}, openAll: false });

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string | null): void {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* ignore */ }
}
function oldDeviceProgress(): Saved | null {
  const raw = readLocal(OLD_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Saved>;
    return { stars: v.stars ?? {}, openAll: !!v.openAll };
  } catch { return null; }
}
function hasStars(s: Saved): boolean {
  return Object.values(s.stars).some((l) => l.some((n) => n > 0));
}

/** True when `a` already holds every star in `b`. */
function covers(a: Saved, b: Saved): boolean {
  if (b.openAll && !a.openAll) return false;
  return Object.entries(b.stars).every(([id, list]) => list.every((n, i) => n <= (a.stars[id]?.[i] ?? 0)));
}

async function request(method: string, code: string, body?: unknown): Promise<Saved> {
  const res = await fetch('/api/progress', {
    method,
    headers: { 'content-type': 'application/json', 'x-family-code': code },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error || 'Saving failed'), { status: res.status });
  return data as Saved;
}

class Progress {
  data = $state<Saved>(oldDeviceProgress() ?? empty());
  code = $state(readLocal(CODE_KEY) ?? '');
  status = $state<SaveStatus>('none');
  problem = $state('');
  private dirty = false;
  private replace = false;
  private retry: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('online', () => { if (this.dirty) void this.push(); });
    if (this.code) void this.load();
  }

  /** Turn on online saving with a family code (typed once by a grown-up on each device). */
  async connect(code: string): Promise<boolean> {
    code = code.trim();
    if (code.length < MIN_CODE) { this.problem = `Please use at least ${MIN_CODE} letters or numbers.`; return false; }
    this.code = code;
    writeLocal(CODE_KEY, code);
    // Stars earned before saving was on are added, not lost.
    if (hasStars(this.data)) this.dirty = true;
    return this.load();
  }

  /** Stop saving on this device. The stars stay online under the code. */
  disconnect(): void {
    this.code = ''; writeLocal(CODE_KEY, null);
    this.data = empty(); this.status = 'none'; this.problem = ''; this.dirty = false;
    clearTimeout(this.retry);
  }

  private async load(): Promise<boolean> {
    this.status = 'loading'; this.problem = '';
    try {
      const server = await request('GET', this.code);
      const local = this.data;
      this.data = server;
      // Move progress from older app versions (kept on the device) online once, then forget it here.
      const old = oldDeviceProgress();
      if (old && hasStars(old)) { this.data = this.mergeInto(this.data, old); this.dirty = true; }
      if (this.dirty) { this.data = this.mergeInto(this.data, local); await this.push(); }
      else this.status = 'saved';
      if (this.status === 'saved') writeLocal(OLD_KEY, null);
      return true;
    } catch (e) {
      return this.failed(e);
    }
  }

  private mergeInto(a: Saved, b: Saved): Saved {
    const stars = { ...a.stars };
    for (const [id, list] of Object.entries(b.stars)) {
      const old = stars[id] ?? [];
      stars[id] = Array.from({ length: Math.max(old.length, list.length) }, (_, i) => Math.max(old[i] ?? 0, list[i] ?? 0));
    }
    return { stars, openAll: a.openAll || b.openAll };
  }

  private async push(): Promise<void> {
    if (!this.code) return;
    clearTimeout(this.retry);
    this.status = 'saving';
    const sent = $state.snapshot(this.data);
    const replace = this.replace;
    try {
      const merged = await request('POST', this.code, { ...sent, replace });
      // Keep anything earned while the save was on its way.
      this.data = this.mergeInto(merged, this.data);
      this.replace = false;
      this.dirty = !covers(merged, this.data);
      this.status = 'saved'; this.problem = '';
      if (this.dirty) void this.push();
    } catch (e) {
      this.failed(e);
      if ((this.status as SaveStatus) === 'offline') this.retry = setTimeout(() => void this.push(), 30000);
    }
  }

  private failed(e: unknown): false {
    const status = (e as { status?: number }).status;
    if (status == null) { this.status = 'offline'; this.problem = 'No internet right now. Stars will be saved when it is back.'; }
    else { this.status = 'error'; this.problem = (e as Error).message; }
    return false;
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
  reset(): void { this.data = empty(); this.replace = true; this.changed(); }
}

export const progress = new Progress();
