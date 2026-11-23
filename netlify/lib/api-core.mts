/*
 * Server side of the saved data. Kept apart from the Netlify function so it can be
 * tested with an in-memory store.
 *
 *   GET  /api/songs     -> { songs: Song[] }   the stored list; songs built into the app that the
 *                          store doesn't have yet (the first time: all of them) are added and saved
 *   PUT  /api/songs     -> replace the song list       (header x-admin-key = SONGS_ADMIN_KEY)
 *   GET  /api/family               -> { players, settings: { showGuest } }   (family calls need header x-family-code)
 *   PUT  /api/family               -> save { players: [{ id, name, avatar }], settings? }
 *   GET  /api/progress?player=<id> -> { stars, openAll }
 *   POST /api/progress?player=<id> -> merge and return progress (body { stars, openAll, replace? })
 *
 * The family code works like a login and players like profiles. A family's data is stored under
 * a SHA-256 hash of its code, so the code itself is never stored. The Guest player lives only in
 * the app and is never saved.
 */
import { createHash } from 'node:crypto';
import { parse, SONGS, type Song } from '../../src/lib/songs.ts';

export interface Store {
  get(key: string, opts: { type: 'json' }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export interface Progress { stars: Record<string, number[]>; openAll: boolean; }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const MIN_CODE = 6;
const MAX_PLAYERS = 8;
/** Everything for one family lives under a SHA-256 hash of its code. */
const familyKey = (code: string): string =>
  'family/' + createHash('sha256').update(code.trim().toLowerCase()).digest('hex');

export interface Player { id: string; name: string; avatar: string; }

/** Family settings. showGuest: offer the Guest player on "Who's playing?" (off by default for a family). */
export interface FamilySettings { showGuest: boolean; }
function cleanSettings(v: unknown): FamilySettings {
  return { showGuest: !!v && typeof v === 'object' && (v as { showGuest?: unknown }).showGuest === true };
}

/** null when the list is not acceptable; a cleaned copy otherwise. */
function cleanPlayers(v: unknown): Player[] | null {
  if (!Array.isArray(v) || v.length > MAX_PLAYERS) return null;
  const out: Player[] = [];
  for (const p of v) {
    if (!p || typeof p !== 'object') return null;
    const { id, name, avatar } = p as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[a-z0-9]{4,16}$/.test(id) || id === 'guest') return null;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 20) return null;
    if (typeof avatar !== 'string' || !avatar || avatar.length > 8) return null;
    if (out.some((o) => o.id === id)) return null;
    out.push({ id, name: name.trim(), avatar });
  }
  return out;
}

/** Keep only well-formed star lists: song id -> list of 0..3 per lesson. */
function cleanProgress(v: unknown): Progress {
  const out: Progress = { stars: {}, openAll: false };
  if (!v || typeof v !== 'object') return out;
  const o = v as { stars?: unknown; openAll?: unknown };
  out.openAll = o.openAll === true;
  if (o.stars && typeof o.stars === 'object') {
    for (const [id, list] of Object.entries(o.stars as Record<string, unknown>)) {
      if (!/^[a-z0-9-]{1,40}$/.test(id) || !Array.isArray(list)) continue;
      out.stars[id] = list.slice(0, 20).map((n) => (typeof n === 'number' && n >= 0 && n <= 3 ? Math.round(n) : 0));
    }
  }
  return out;
}

/** Two devices may save at once: keep the best stars from both. */
function merge(a: Progress, b: Progress): Progress {
  const stars: Record<string, number[]> = { ...a.stars };
  for (const [id, list] of Object.entries(b.stars)) {
    const old = stars[id] ?? [];
    const len = Math.max(old.length, list.length);
    stars[id] = Array.from({ length: len }, (_, i) => Math.max(old[i] ?? 0, list[i] ?? 0));
  }
  return { stars, openAll: a.openAll || b.openAll };
}

function validSongs(v: unknown): Song[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 200) return null;
  const fields = ['id', 'title', 'emoji', 'notes', 'place', 'friend', 'intro', 'done'] as const;
  for (const s of v) {
    if (!s || typeof s !== 'object') return null;
    for (const f of fields) if (typeof (s as Record<string, unknown>)[f] !== 'string') return null;
    if (typeof (s as Song).bpm !== 'number' || !/^[a-z0-9-]{1,40}$/.test((s as Song).id)) return null;
    try { parse((s as Song).notes); } catch { return null; }
  }
  return v as Song[];
}

export async function handle(req: Request, store: Store, adminKey: string | undefined): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');

  if (path === '/api/songs') {
    if (req.method === 'GET') {
      const stored = validSongs(await store.get('songs', { type: 'json' })) ?? [];
      const missing = SONGS.filter((b) => !stored.some((s) => s.id === b.id));
      const songs = [...stored, ...missing];
      if (missing.length) await store.setJSON('songs', songs);
      return json({ songs });
    }
    if (req.method === 'PUT') {
      if (!adminKey || req.headers.get('x-admin-key') !== adminKey) return json({ error: 'Not allowed' }, 403);
      const body = (await req.json().catch(() => null)) as { songs?: unknown } | null;
      const songs = validSongs(body?.songs);
      if (!songs) return json({ error: 'Songs are missing a field or have a note the app cannot read' }, 400);
      await store.setJSON('songs', songs);
      return json({ ok: true, count: songs.length });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  if (path === '/api/family' || path === '/api/progress') {
    const code = req.headers.get('x-family-code') ?? '';
    if (code.trim().length < MIN_CODE) return json({ error: `The family code needs at least ${MIN_CODE} characters` }, 400);
    const fam = familyKey(code);
    const players = cleanPlayers(await store.get(fam + '/players', { type: 'json' })) ?? [];

    if (path === '/api/family') {
      const settings = cleanSettings(await store.get(fam + '/settings', { type: 'json' }));
      if (req.method === 'GET') return json({ players, settings });
      if (req.method === 'PUT') {
        const body = (await req.json().catch(() => null)) as { players?: unknown; settings?: unknown } | null;
        const next = cleanPlayers(body?.players);
        if (!next) return json({ error: `Up to ${MAX_PLAYERS} players, each with a name and an avatar` }, 400);
        const nextSettings = body?.settings === undefined ? settings : cleanSettings(body.settings);
        await store.setJSON(fam + '/players', next);
        await store.setJSON(fam + '/settings', nextSettings);
        // A removed player's stars go with them.
        for (const p of players) if (!next.some((n) => n.id === p.id)) await store.delete(fam + '/progress/' + p.id);
        return json({ players: next, settings: nextSettings });
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    const player = new URL(req.url).searchParams.get('player') ?? '';
    if (!players.some((p) => p.id === player)) return json({ error: 'Unknown player' }, 404);
    const key = fam + '/progress/' + player;
    const saved = cleanProgress(await store.get(key, { type: 'json' }));
    if (req.method === 'GET') return json(saved);
    if (req.method === 'POST') {
      const body = (await req.json().catch(() => null)) as (Progress & { replace?: boolean }) | null;
      if (!body) return json({ error: 'Bad request' }, 400);
      const incoming = cleanProgress(body);
      const next = body.replace === true ? incoming : merge(saved, incoming);
      await store.setJSON(key, next);
      return json(next);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ error: 'Not found' }, 404);
}
