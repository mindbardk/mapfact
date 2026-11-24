import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { beforeEach, expect, test } from 'vitest';
import type { Db } from './db';
import { categories, maps } from './db/schema';
import { createTestDb } from './db/testing';
import { AppError } from './errors';
import { storeImage } from './images';
import { getPublicMap, listCategories, listPublishedMaps, nextMap, publishMap } from './maps';

let db: Db;
let imageId: number;
beforeEach(async () => {
	db = await createTestDb();
	const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } })
		.png()
		.toBuffer();
	imageId = (await storeImage(db, png, { format: 'webp' })).id;
});

async function categoryId(slug: string) {
	const [row] = await db.select().from(categories).where(eq(categories.slug, slug));
	return row.id;
}

async function draft(slug: string, category = 'crime', withImage = true) {
	const [row] = await db
		.insert(maps)
		.values({
			slug,
			title: `Title ${slug}`,
			dek: 'Dek',
			kind: 'static',
			categoryId: await categoryId(category),
			staticImageId: withImage ? imageId : null
		})
		.returning();
	return row;
}

test('publishMap tildeler løbende kortnumre fra 1', async () => {
	const a = await draft('a');
	const b = await draft('b');
	expect(await publishMap(db, a.id)).toEqual({ no: 1 });
	expect(await publishMap(db, b.id)).toEqual({ no: 2 });
});

test('genudgivelse beholder no og published_at, men flytter content_updated_at', async () => {
	const a = await draft('a');
	await publishMap(db, a.id, new Date('2026-01-01T00:00:00Z'));
	expect(await publishMap(db, a.id, new Date('2026-02-01T00:00:00Z'))).toEqual({ no: 1 });
	const [row] = await db.select().from(maps).where(eq(maps.id, a.id));
	expect(row.publishedAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
	expect(row.contentUpdatedAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
	expect(row.status).toBe('published');
});

test('et statisk kort uden billede kan ikke udgives', async () => {
	const a = await draft('a', 'crime', false);
	const result = publishMap(db, a.id);
	await expect(result).rejects.toBeInstanceOf(AppError);
	await expect(result).rejects.toMatchObject({ status: 422 });
});

test('getPublicMap skjuler kladder og ukendte slugs, men viser arkiverede kort', async () => {
	await draft('hidden');
	const archived = await draft('old');
	await publishMap(db, archived.id);
	await db.update(maps).set({ status: 'archived' }).where(eq(maps.id, archived.id));

	expect(await getPublicMap(db, 'hidden')).toBeNull();
	expect(await getPublicMap(db, 'nope')).toBeNull();
	const page = await getPublicMap(db, 'old');
	expect(page).toMatchObject({
		no: 1,
		slug: 'old',
		status: 'archived',
		category: { slug: 'crime', name: 'Crime' },
		staticImage: { id: imageId, ext: 'webp', width: 20, height: 10 },
		fallbackImage: null
	});
});

test('nextMap foretrækker samme kategori, falder tilbage til alle og giver null for det eneste kort', async () => {
	const only = await draft('only');
	await publishMap(db, only.id, new Date('2026-01-01T00:00:00Z'));
	expect(await nextMap(db, only)).toBeNull();

	const sport = await draft('sport-map', 'sport');
	await publishMap(db, sport.id, new Date('2026-01-02T00:00:00Z'));
	expect((await nextMap(db, only))?.slug).toBe('sport-map');

	const crime = await draft('crime-map');
	await publishMap(db, crime.id, new Date('2026-01-03T00:00:00Z'));
	const sportNewer = await draft('sport-newer', 'sport');
	await publishMap(db, sportNewer.id, new Date('2026-01-04T00:00:00Z'));
	expect((await nextMap(db, only))?.slug).toBe('crime-map');
});

test('listPublishedMaps giver nyeste først og kun udgivne', async () => {
	const a = await draft('a');
	const b = await draft('b');
	await draft('c');
	await publishMap(db, a.id, new Date('2026-01-01T00:00:00Z'));
	await publishMap(db, b.id, new Date('2026-01-02T00:00:00Z'));
	const cards = await listPublishedMaps(db, 10);
	expect(cards.map((c) => c.slug)).toEqual(['b', 'a']);
	expect(cards[0]).toMatchObject({ no: 2, category: { slug: 'crime' }, thumb: null });
});

test('listCategories følger sort', async () => {
	const cats = await listCategories(db);
	expect(cats).toHaveLength(11);
	expect(cats[0]).toEqual({ slug: 'world', name: 'World' });
});
