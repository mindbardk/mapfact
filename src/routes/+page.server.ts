import { getDb } from '$lib/server/db';
import { listPublishedMaps } from '$lib/server/maps';
import { cachePublicPage } from '$lib/server/public-cache';
import type { PageServerLoad } from './$types';

// Midlertidig forside: en liste over udgivne kort. Den rigtige forside kommer i fase 4.
export const load: PageServerLoad = async ({ setHeaders }) => {
	const maps = await listPublishedMaps(await getDb(), 20);
	cachePublicPage(setHeaders);
	return { maps };
};
