import { listAdminMaps } from '$lib/server/admin-maps';
import { getDb } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { maps: await listAdminMaps(await getDb()) };
};
