/*
 * Family login and players, like profiles in a streaming app.
 * - The family code is the login. A grown-up types it once per device; it is the only thing
 *   this app keeps on the device.
 * - Players (name + animal avatar) live online under that code. Each has their own stars.
 * - Guest is always there, needs no code, starts fresh each time and is never saved.
 */
import { api, emptyProgress, hasStars, progress, type Saved } from './progress.svelte';

export interface Player { id: string; name: string; avatar: string; }

export const GUEST: Player = { id: 'guest', name: 'Guest', avatar: '👋' };
export const AVATARS = ['🐶', '🐱', '🦊', '🐻', '🐼', '🐰', '🦁', '🐸', '🐵', '🦄', '🐧', '🐢', '🐙', '🦖'];
const COLORS = ['#fde2d8', '#fdecc8', '#fbf1bd', '#dff0d3', '#d6eaf5', '#e6defa', '#f8dcea'];
export const avatarColor = (p: Player): string =>
  p.id === 'guest' ? '#e3ebf4' : COLORS[Math.abs([...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % COLORS.length];

export const MIN_CODE = 6;
export const MAX_PLAYERS = 8;
const CODE_KEY = 'pianoPlay.familyCode';
const OLD_KEY = 'pianoPlay.progress.v1'; // where older versions kept stars on the device

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
    return { ...emptyProgress(), stars: v.stars ?? {}, openAll: !!v.openAll };
  } catch { return null; }
}
function newId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4);
}

type FamilyStatus = 'none' | 'loading' | 'ready' | 'offline' | 'error';

class Family {
  code = $state(readLocal(CODE_KEY) ?? '');
  players = $state<Player[]>([]);
  /** Offer Guest on "Who's playing?" while logged in. Off by default; Guest always shows when logged out. */
  showGuest = $state(false);
  /** Who is playing right now. null shows the "Who's playing?" screen. */
  current = $state<Player | null>(null);
  status = $state<FamilyStatus>('none');
  problem = $state('');
  /** A friendly note for the "Who's playing?" screen, for example after the code was changed. */
  notice = $state('');

  constructor() {
    if (this.code) void this.load();
  }

  async load(): Promise<boolean> {
    if (!this.code) return false;
    this.status = 'loading'; this.problem = '';
    try {
      const r = await api<{ exists?: boolean; players: Player[]; settings?: { showGuest?: boolean } }>('GET', '/api/family', this.code);
      if (r.exists === false) {
        // The code was changed or the family removed on another device: log out here.
        this.disconnect();
        this.notice = 'This device was logged out because the family code changed. Please log in with the new code.';
        return false;
      }
      this.players = r.players;
      this.showGuest = r.settings?.showGuest === true;
      this.status = 'ready';
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  /**
   * Log in on this device with a family code. Resolves 'missing' when no family uses the code,
   * so the screen can ask whether to create one (a typo should never start an empty family).
   */
  async connect(code: string): Promise<'ok' | 'missing' | 'failed'> {
    code = code.trim();
    this.problem = ''; this.notice = '';
    if (code.length < MIN_CODE) { this.problem = `Please use at least ${MIN_CODE} letters or numbers.`; return 'failed'; }
    try {
      const r = await api<{ exists?: boolean }>('GET', '/api/family', code);
      if (r.exists === false) return 'missing';
    } catch (e) {
      this.fail(e); this.status = 'none';
      return 'failed';
    }
    this.code = code;
    writeLocal(CODE_KEY, code);
    return (await this.load()) ? 'ok' : 'failed';
  }

  /** Start a new family with this code (after the grown-up confirmed it in the popup). */
  async create(code: string): Promise<boolean> {
    code = code.trim();
    try {
      await api('PUT', '/api/family', code, { players: [], settings: { showGuest: false }, create: true });
    } catch (e) {
      this.fail(e); this.status = 'none';
      return false;
    }
    this.code = code;
    writeLocal(CODE_KEY, code);
    return this.load();
  }

  /** Move players, settings and stars to a new family code, then log out on this device. */
  async changeCode(newCode: string): Promise<boolean> {
    newCode = newCode.trim();
    if (newCode.length < MIN_CODE) { this.problem = `Please use at least ${MIN_CODE} letters or numbers.`; return false; }
    try {
      await api('POST', '/api/family/move', this.code, { newCode });
    } catch (e) {
      this.problem = (e as { status?: number }).status == null ? 'No internet right now. Try again in a moment.' : (e as Error).message;
      return false;
    }
    this.disconnect();
    this.notice = 'Family code changed. All players and stars are safe. Log in with the new code.';
    return true;
  }

  /** Log out on this device. Players and stars stay online under the code. */
  disconnect(): void {
    this.code = ''; writeLocal(CODE_KEY, null);
    this.players = []; this.showGuest = false; this.status = 'none'; this.problem = ''; this.notice = '';
    this.choose(null);
  }

  choose(p: Player | null): void {
    this.current = p;
    void progress.use(this.code, p ? p.id : 'guest');
  }

  /** True when `typed` is this device's family code. Grown-ups type it to confirm erasing things. */
  checkCode(typed: string): boolean {
    return !!this.code && typed.trim().toLowerCase() === this.code.trim().toLowerCase();
  }

  async setShowGuest(show: boolean): Promise<boolean> {
    return this.save(this.players, show);
  }

  private async save(next: Player[], showGuest = this.showGuest): Promise<boolean> {
    try {
      const r = await api<{ players: Player[]; settings?: { showGuest?: boolean } }>('PUT', '/api/family', this.code, { players: next, settings: { showGuest } });
      this.players = r.players; this.showGuest = r.settings?.showGuest === true; this.status = 'ready'; this.problem = '';
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  async addPlayer(name: string, avatar: string): Promise<Player | null> {
    name = name.trim();
    if (!this.code || !name || this.players.length >= MAX_PLAYERS) return null;
    const p: Player = { id: newId(), name: name.slice(0, 20), avatar };
    const first = this.players.length === 0;
    if (!(await this.save([...this.players, p]))) return null;
    // The first player takes over any stars an older version kept on this device.
    const old = first ? oldDeviceProgress() : null;
    this.current = p;
    const saved = await progress.use(this.code, p.id, old && hasStars(old) ? old : undefined);
    if (old && saved) writeLocal(OLD_KEY, null);
    return p;
  }

  async updatePlayer(id: string, name: string, avatar: string): Promise<boolean> {
    name = name.trim();
    if (!name) return false;
    const ok = await this.save(this.players.map((p) => (p.id === id ? { ...p, name: name.slice(0, 20), avatar } : p)));
    if (ok && this.current?.id === id) this.current = this.players.find((p) => p.id === id) ?? null;
    return ok;
  }

  /** Removes the player and their stars. */
  async removePlayer(id: string): Promise<boolean> {
    const ok = await this.save(this.players.filter((p) => p.id !== id));
    if (ok && this.current?.id === id) this.choose(null);
    return ok;
  }

  private fail(e: unknown): void {
    const status = (e as { status?: number }).status;
    if (status == null) { this.status = 'offline'; this.problem = 'No internet right now. Try again in a moment.'; }
    else { this.status = 'error'; this.problem = (e as Error).message; }
  }
}

export const family = new Family();
