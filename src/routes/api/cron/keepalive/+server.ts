import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { isCronAuthorized } from '$lib/server/admin';
import { getDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** Dagligt ping fra Vercel Cron, så Supabase free ikke pauser databasen efter 7 dages ro. */
export const GET: RequestHandler = async ({ request }) => {
	if (!isCronAuthorized(request.headers.get('authorization'))) {
		return json({ error: 'Not authorized' }, { status: 401 });
	}
	await (await getDb()).execute(sql`select 1`);
	return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};
