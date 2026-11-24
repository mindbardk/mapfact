import { getDb } from '$lib/server/db';
import { listCategories } from '$lib/server/maps';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return { categories: await listCategories(await getDb()) };
};
