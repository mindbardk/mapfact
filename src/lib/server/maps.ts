import { and, asc, desc, eq, inArray, max, ne, or } from 'drizzle-orm';
import { ZodError } from 'zod';
import { extFromMime, type ImageRef } from '$lib/image-url';
import { parseMapConfig, UnsupportedMapKindError, type MapConfig } from '$lib/map-config';
import type { Db } from './db';
import { categories, images, maps, type MapKind, type MapStatus } from './db/schema';
import { AppError } from './errors';

export type MapCard = {
	no: number;
	slug: string;
	title: string;
	category: { slug: string; name: string };
	publishedAt: Date;
	thumb: ImageRef | null;
};

export type MapPage = MapCard & {
	id: number;
	categoryId: number;
	status: MapStatus;
	dek: string;
	body: string;
	kind: MapKind;
	config: unknown;
	legendTitle: string | null;
	projectionLabel: string | null;
	centerLabel: string | null;
	sourceText: string | null;
	sourceUrl: string | null;
	altText: string;
	staticImage: ImageRef | null;
	fallbackImage: ImageRef | null;
	tags: string[];
	seoTitle: string | null;
	seoDescription: string | null;
	contentUpdatedAt: Date;
};

const publicStatus = or(eq(maps.status, 'published'), eq(maps.status, 'archived'));

async function loadImageRefs(db: Db, ids: (number | null)[]): Promise<Map<number, ImageRef>> {
	const wanted = [...new Set(ids.filter((id): id is number => id !== null))];
	if (wanted.length === 0) return new Map();
	const rows = await db
		.select({
			id: images.id,
			mime: images.mime,
			width: images.width,
			height: images.height,
			alt: images.alt
		})
		.from(images)
		.where(inArray(images.id, wanted));
	const refs = new Map<number, ImageRef>();
	for (const row of rows) {
		const ext = extFromMime(row.mime);
		if (ext) refs.set(row.id, { id: row.id, ext, width: row.width, height: row.height, alt: row.alt });
	}
	return refs;
}

const cardColumns = {
	no: maps.no,
	slug: maps.slug,
	title: maps.title,
	publishedAt: maps.publishedAt,
	fallbackImageId: maps.fallbackImageId,
	categorySlug: categories.slug,
	categoryName: categories.name
};

type CardRow = {
	no: number | null;
	slug: string;
	title: string;
	publishedAt: Date | null;
	fallbackImageId: number | null;
	categorySlug: string;
	categoryName: string;
};

async function toCards(db: Db, rows: CardRow[]): Promise<MapCard[]> {
	const refs = await loadImageRefs(db, rows.map((r) => r.fallbackImageId));
	return rows.map((r) => ({
		// Udgivne kort har altid no og published_at (sat af publishMap).
		no: r.no!,
		slug: r.slug,
		title: r.title,
		category: { slug: r.categorySlug, name: r.categoryName },
		publishedAt: r.publishedAt!,
		thumb: r.fallbackImageId === null ? null : (refs.get(r.fallbackImageId) ?? null)
	}));
}

/** Kortsiden: kun udgivne og arkiverede kort. Kladder giver null. */
export async function getPublicMap(db: Db, slug: string): Promise<MapPage | null> {
	const [row] = await db
		.select({ map: maps, categorySlug: categories.slug, categoryName: categories.name })
		.from(maps)
		.innerJoin(categories, eq(maps.categoryId, categories.id))
		.where(and(eq(maps.slug, slug), publicStatus));
	if (!row) return null;
	const m = row.map;
	const refs = await loadImageRefs(db, [m.staticImageId, m.fallbackImageId]);
	const ref = (id: number | null) => (id === null ? null : (refs.get(id) ?? null));
	return {
		id: m.id,
		no: m.no!,
		slug: m.slug,
		title: m.title,
		category: { slug: row.categorySlug, name: row.categoryName },
		categoryId: m.categoryId,
		publishedAt: m.publishedAt!,
		contentUpdatedAt: m.contentUpdatedAt ?? m.publishedAt!,
		thumb: ref(m.fallbackImageId),
		status: m.status,
		dek: m.dek,
		body: m.body,
		kind: m.kind,
		config: m.config,
		legendTitle: m.legendTitle,
		projectionLabel: m.projectionLabel,
		centerLabel: m.centerLabel,
		sourceText: m.sourceText,
		sourceUrl: m.sourceUrl,
		altText: m.altText,
		staticImage: ref(m.staticImageId),
		fallbackImage: ref(m.fallbackImageId),
		tags: m.tags,
		seoTitle: m.seoTitle,
		seoDescription: m.seoDescription
	};
}

function validateForPublish(map: typeof maps.$inferSelect): MapConfig {
	let config: MapConfig;
	try {
		config = parseMapConfig(map.kind, map.config);
	} catch (e) {
		if (e instanceof UnsupportedMapKindError) throw new AppError(422, e.message);
		if (e instanceof ZodError) throw new AppError(422, 'Invalid map config');
		throw e;
	}
	if (map.kind === 'static' && map.staticImageId === null) {
		throw new AppError(422, 'A static map needs an image before it can be published');
	}
	return config;
}

/**
 * Udgiver et kort. Første udgivelse tildeler det næste kortnummer og
 * published_at. Hver udgivelse flytter content_updated_at ("Updated …").
 */
export async function publishMap(db: Db, id: number, now: Date = new Date()): Promise<{ no: number }> {
	return db.transaction(async (tx) => {
		const [map] = await tx.select().from(maps).where(eq(maps.id, id)).for('update');
		if (!map) throw new AppError(404, 'Map not found');
		validateForPublish(map);
		let no = map.no;
		if (no === null) {
			const [{ highest }] = await tx.select({ highest: max(maps.no) }).from(maps);
			no = (highest ?? 0) + 1;
		}
		await tx
			.update(maps)
			.set({
				no,
				status: 'published',
				publishedAt: map.publishedAt ?? now,
				contentUpdatedAt: now
			})
			.where(eq(maps.id, id));
		return { no };
	});
}

function selectCards(db: Db) {
	return db.select(cardColumns).from(maps).innerJoin(categories, eq(maps.categoryId, categories.id));
}

/** "Next map": det nyeste andet kort i samme kategori, ellers det nyeste på tværs. */
export async function nextMap(
	db: Db,
	current: { id: number; categoryId: number }
): Promise<MapCard | null> {
	const others = and(eq(maps.status, 'published'), ne(maps.id, current.id));
	const newest = (where: typeof others) =>
		selectCards(db).where(where).orderBy(desc(maps.publishedAt)).limit(1);
	const [sameCategory] = await newest(and(others, eq(maps.categoryId, current.categoryId)));
	const row = sameCategory ?? (await newest(others))[0];
	if (!row) return null;
	const [card] = await toCards(db, [row]);
	return card;
}

export async function listPublishedMaps(db: Db, limit: number): Promise<MapCard[]> {
	const rows = await selectCards(db)
		.where(eq(maps.status, 'published'))
		.orderBy(desc(maps.publishedAt))
		.limit(limit);
	return toCards(db, rows);
}

export async function listCategories(db: Db): Promise<{ slug: string; name: string }[]> {
	return db
		.select({ slug: categories.slug, name: categories.name })
		.from(categories)
		.orderBy(asc(categories.sort));
}
