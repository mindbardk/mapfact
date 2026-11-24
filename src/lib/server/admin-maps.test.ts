import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { beforeAll, expect, test } from 'vitest';
import { listAdminMaps } from './admin-maps';
import type { Db } from './db';
import { categories, maps } from './db/schema';
import { createTestDb } from './db/testing';
import { DEMO_MAP_SLUG, seedDemoContent } from './seed';

let db: Db;
beforeAll(async () => {
	db = await createTestDb();
	await seedDemoContent(db, { serialKillersPng: await readFile('scripts/seed-assets/serial-killers.png') });
	const [sport] = await db.select().from(categories).where(eq(categories.slug, 'sport'));
	await db.insert(maps).values({
		slug: 'draft-map',
		title: 'A draft map',
		dek: 'Dek',
		kind: 'static',
		categoryId: sport.id,
		updatedAt: new Date('2099-01-01T00:00:00Z')
	});
});

test('listAdminMaps viser alle kort inkl. kladder, senest ændrede først', async () => {
	const rows = await listAdminMaps(db);
	expect(rows.map((r) => r.slug)).toEqual(['draft-map', DEMO_MAP_SLUG]);
	expect(rows[0]).toMatchObject({ no: null, status: 'draft', category: 'Sport', title: 'A draft map' });
	expect(rows[1]).toMatchObject({ no: 1, status: 'published', category: 'Crime' });
	expect(rows[1].updatedAt).toBeInstanceOf(Date);
});
