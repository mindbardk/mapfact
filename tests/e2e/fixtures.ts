import { eq } from 'drizzle-orm';
import type { Db } from '../../src/lib/server/db/index.ts';
import { categories, maps } from '../../src/lib/server/db/schema.ts';
import { publishMap } from '../../src/lib/server/maps.ts';
import { DEMO_MAP_SLUG } from '../../src/lib/server/seed.ts';

export const E2E_ARCHIVED_SLUG = 'archived-map';
export const E2E_NO_FALLBACK_SLUG = 'no-fallback-map';
export const E2E_LONG_TITLE_SLUG = 'long-title-map';
export const E2E_DRAFT_SLUG = 'draft-map';
/** Præcis 90 tegn: grænsen, hvor H1 endnu ikke skaleres ned. */
export const E2E_LONG_TITLE =
	'How far the average commuter travels to work in every European region, ranked by distance.';

/**
 * Ekstra kort til kanttilfælde. Kører efter seedDemoContent (demo-kortet er nr. 1)
 * og udgiver i fast rækkefølge: archived (nr. 2), no-fallback (nr. 3), long-title (nr. 4).
 */
export async function seedE2eFixtures(db: Db): Promise<void> {
	const [demo] = await db.select().from(maps).where(eq(maps.slug, DEMO_MAP_SLUG));
	const [world] = await db.select().from(categories).where(eq(categories.slug, 'world'));
	const base = {
		categoryId: world.id,
		dek: 'A test map.',
		body: 'A short article.',
		kind: 'static' as const,
		altText: 'Test map',
		staticImageId: demo.staticImageId,
		fallbackImageId: demo.fallbackImageId
	};
	const insert = async (values: Partial<typeof maps.$inferInsert> & { slug: string; title: string }) => {
		const [row] = await db.insert(maps).values({ ...base, ...values }).returning({ id: maps.id });
		return row.id;
	};

	const archived = await insert({ slug: E2E_ARCHIVED_SLUG, title: 'An archived map' });
	await publishMap(db, archived);
	await db.update(maps).set({ status: 'archived' }).where(eq(maps.id, archived));

	await publishMap(
		db,
		await insert({ slug: E2E_NO_FALLBACK_SLUG, title: 'A map without fallback', fallbackImageId: null })
	);
	await publishMap(db, await insert({ slug: E2E_LONG_TITLE_SLUG, title: E2E_LONG_TITLE }));
	await insert({ slug: E2E_DRAFT_SLUG, title: 'A draft map' });
}
