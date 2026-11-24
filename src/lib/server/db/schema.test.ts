import { beforeAll, expect, test } from 'vitest';
import type { Db } from './index';
import { categories, images, maps } from './schema';
import { createTestDb } from './testing';

let db: Db;
beforeAll(async () => {
	db = await createTestDb();
});

test('migrationen seeder de 11 kategorier i designets rækkefølge', async () => {
	const rows = await db.select().from(categories).orderBy(categories.sort);
	expect(rows.map((r) => r.name)).toEqual([
		'World', 'Politics', 'Economy', 'Climate', 'Health', 'Crime',
		'Science', 'Tech', 'Society', 'Sport', 'Culture'
	]);
	expect(rows[0].slug).toBe('world');
});

async function anyCategoryId() {
	const [row] = await db.select({ id: categories.id }).from(categories).limit(1);
	return row.id;
}

test('maps.slug er unik', async () => {
	const categoryId = await anyCategoryId();
	const base = { categoryId, title: 'T', dek: 'D', kind: 'static' as const };
	await db.insert(maps).values({ ...base, slug: 'same-slug' });
	await expect(db.insert(maps).values({ ...base, slug: 'same-slug' })).rejects.toThrow();
});

test('maps.no er unik', async () => {
	const categoryId = await anyCategoryId();
	const base = { categoryId, title: 'T', dek: 'D', kind: 'static' as const, no: 77 };
	await db.insert(maps).values({ ...base, slug: 'no-a' });
	await expect(db.insert(maps).values({ ...base, slug: 'no-b' })).rejects.toThrow();
});

test('bytea gemmer og returnerer de samme bytes', async () => {
	const bytes = Buffer.from([0, 1, 2, 255]);
	const [row] = await db
		.insert(images)
		.values({ bytes, mime: 'image/png', width: 1, height: 1 })
		.returning();
	expect(Buffer.isBuffer(row.bytes)).toBe(true);
	expect(Buffer.compare(row.bytes, bytes)).toBe(0);
});
