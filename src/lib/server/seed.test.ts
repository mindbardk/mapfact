import { readFile } from 'node:fs/promises';
import { count } from 'drizzle-orm';
import { beforeAll, expect, test } from 'vitest';
import type { Db } from './db';
import { maps } from './db/schema';
import { createTestDb } from './db/testing';
import { getPublicMap } from './maps';
import { DEMO_MAP_SLUG, seedDemoContent } from './seed';

let db: Db;
beforeAll(async () => {
	db = await createTestDb();
});

test('seedDemoContent er idempotent og udgiver demo-kortet', async () => {
	const assets = { serialKillersPng: await readFile('scripts/seed-assets/serial-killers.png') };
	expect(await seedDemoContent(db, assets)).toEqual({ slug: DEMO_MAP_SLUG });
	await seedDemoContent(db, assets);

	const [{ n }] = await db.select({ n: count() }).from(maps);
	expect(n).toBe(1);
	const page = await getPublicMap(db, DEMO_MAP_SLUG);
	expect(page).toMatchObject({
		no: 1,
		status: 'published',
		kind: 'static',
		category: { slug: 'crime' },
		staticImage: { ext: 'webp' },
		fallbackImage: { ext: 'png' }
	});
	expect(page!.fallbackImage!.width).toBeLessThanOrEqual(1600);
	expect(page!.body).toContain(':::factbox');
});
