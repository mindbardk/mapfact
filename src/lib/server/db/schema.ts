import { sql } from 'drizzle-orm';
import {
	customType,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

/** Rå bytes. postgres-js og PGlite leverer Uint8Array/Buffer; vi normaliserer til Buffer. */
const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
	dataType: () => 'bytea',
	fromDriver: (value) => Buffer.from(value)
});

const id = () => integer('id').primaryKey().generatedAlwaysAsIdentity();
const timestamps = () => ({
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const mapStatus = pgEnum('map_status', ['draft', 'published', 'archived']);
export const mapKind = pgEnum('map_kind', ['svg', 'points', 'static']);
export type MapKind = (typeof mapKind.enumValues)[number];
export type MapStatus = (typeof mapStatus.enumValues)[number];

export const categories = pgTable('categories', {
	id: id(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	/** Kort intro på kategorisiden, så den ikke er tynd (SEO). */
	intro: text('intro').notNull().default(''),
	sort: integer('sort').notNull(),
	...timestamps()
});

export const images = pgTable('images', {
	id: id(),
	bytes: bytea('bytes').notNull(),
	mime: text('mime').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	alt: text('alt').notNull().default(''),
	caption: text('caption'),
	credit: text('credit'),
	...timestamps()
});

/** Kortet og artiklen er én række: det er siden. `dataset_id` kommer i fase 2. */
export const maps = pgTable(
	'maps',
	{
		id: id(),
		/** Kortnummeret "№ 0412". Tildeles ved første udgivelse. */
		no: integer('no').unique(),
		slug: text('slug').notNull().unique(),
		status: mapStatus('status').notNull().default('draft'),
		categoryId: integer('category_id')
			.notNull()
			.references(() => categories.id),
		title: text('title').notNull(),
		dek: text('dek').notNull(),
		body: text('body').notNull().default(''),
		kind: mapKind('kind').notNull(),
		basemap: text('basemap'),
		config: jsonb('config').notNull().default({}),
		legendTitle: text('legend_title'),
		projectionLabel: text('projection_label'),
		centerLabel: text('center_label'),
		sourceText: text('source_text'),
		sourceUrl: text('source_url'),
		altText: text('alt_text').notNull().default(''),
		staticImageId: integer('static_image_id').references(() => images.id),
		fallbackImageId: integer('fallback_image_id').references(() => images.id),
		ogImageId: integer('og_image_id').references(() => images.id),
		tags: text('tags')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		seoTitle: text('seo_title'),
		seoDescription: text('seo_description'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		contentUpdatedAt: timestamp('content_updated_at', { withTimezone: true }),
		...timestamps()
	},
	(t) => [index('maps_status_published_at_idx').on(t.status, t.publishedAt)]
);

export const adminUsers = pgTable('admin_users', {
	// Altid små bogstaver (normalizeEmail).
	email: text('email').primaryKey(),
	addedBy: text('added_by').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
