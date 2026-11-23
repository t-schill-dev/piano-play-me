import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { handle } from '../lib/api-core.mts';

// Songs and progress live in Netlify Blobs (store "piano-play"), not on the device.
export default async (req: Request): Promise<Response> =>
  handle(req, getStore({ name: 'piano-play', consistency: 'strong' }), process.env.SONGS_ADMIN_KEY);

export const config: Config = { path: ['/api/songs', '/api/family', '/api/family/move', '/api/progress'] };
