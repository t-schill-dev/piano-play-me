/*
 * Server side of the saved data. Kept apart from the Netlify function so it can be
 * tested with an in-memory store.
 *
 *   GET  /api/songs     -> { songs: Song[] }   the stored list; songs built into the app that the
 *                          store doesn't have yet (the first time: all of them) are added and saved
 *   PUT  /api/songs     -> replace the song list       (header x-admin-key = SONGS_ADMIN_KEY)
 *   GET  /api/progress  -> { stars, openAll }          (header x-family-code)
 *   POST /api/progress  -> merge and return progress   (header x-family-code; body { stars, openAll, replace? })
 *
 * Progress is stored under a SHA-256 hash of the family code, so the code itself is never stored.
 */
import { createHash } from 'node:crypto';
import { parse, SONGS, type Song } from '../../src/lib/songs.ts';

export interface Store {
  get(key: string, opts: { type: 'json' }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<unknown>;
}

export interface Progress { stars: Record<string, number[]>; openAll: boolean; }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const MIN_CODE = 6;
const progressKey = (code: string): string =>
  'progress/' + createHash('sha256').update(code.trim().toLowerCase()).digest('hex');

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

  if (path === '/api/progress') {
    const code = req.headers.get('x-family-code') ?? '';
    if (code.trim().length < MIN_CODE) return json({ error: `The family code needs at least ${MIN_CODE} characters` }, 400);
    const key = progressKey(code);
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
