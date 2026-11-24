import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { categories, maps } from './db/schema';
import { storeImage } from './images';
import { publishMap } from './maps';

export const DEMO_MAP_SLUG = 'serial-killers-of-the-world';

/** Pladsholderartikel til demo-kortet. Ingen tal: den viser byggeklodserne, ikke fakta. */
function demoArticle(figureSrc: string): string {
	return `Serial murder is rare, but it leaves a long trail in court records, newspapers and encyclopaedias. This map places every case in our dataset at the town or region where the killer was based, so you can see where such cases are recorded, and where they are not.

The pattern says as much about record-keeping as about crime. Countries with open courts, a free press and a habit of writing things down appear crowded. Large parts of the world appear almost empty, which more likely reflects missing records than an absence of crime.

:::factbox How to read this map
- Each circle is one person in the dataset, placed at their main area of activity.
- Circles that overlap are drawn on top of each other, so dense areas look darker.
- Cases with an unknown or uncertain location are left off the map but kept in the data.
:::

## Where the records come from

The underlying list was compiled from public encyclopaedia entries. Each entry names a person, a period of activity and, where known, a place. We have kept the wording of the periods as written, because many cases span years and are dated only roughly.

> The map shows where cases were documented. It does not show where people are safest.
>
> — Mapfact editors

![Point map of documented cases, densest in North America and Western Europe](${figureSrc} "The same map as above, shown as the original static image.")

## What is missing

Some entries could not be placed on a map at all, and a few carried coordinates that are clearly wrong. Those rows are still in the dataset so that nothing is silently dropped, and they will appear in the data table once the interactive version of this map is ready.`;
}

/**
 * Opretter demo-kortet "Serial killers of the world" som et statisk kort med
 * artikel og udgiver det. Idempotent på slug: findes kortet, sker der intet.
 */
export async function seedDemoContent(
	db: Db,
	assets: { serialKillersPng: Buffer }
): Promise<{ slug: string }> {
	const [existing] = await db.select({ id: maps.id }).from(maps).where(eq(maps.slug, DEMO_MAP_SLUG));
	if (existing) return { slug: DEMO_MAP_SLUG };

	const altText = 'Point map of the world, densest in the United States and Western Europe';
	const staticImage = await storeImage(db, assets.serialKillersPng, { format: 'webp', alt: altText });
	const fallbackImage = await storeImage(db, assets.serialKillersPng, {
		format: 'png',
		alt: altText,
		maxSize: 1600
	});
	const [crime] = await db.select().from(categories).where(eq(categories.slug, 'crime'));
	const [map] = await db
		.insert(maps)
		.values({
			slug: DEMO_MAP_SLUG,
			categoryId: crime.id,
			title: 'Serial killers of the world',
			dek: 'Where documented serial murder cases cluster, and what the empty areas really mean.',
			body: demoArticle(`/img/${fallbackImage.id}.png`),
			kind: 'static',
			altText,
			sourceText: 'Wikipedia',
			sourceUrl: 'https://en.wikipedia.org/wiki/List_of_serial_killers_by_number_of_victims',
			projectionLabel: 'Web Mercator',
			centerLabel: '20.0°N 0.0°E',
			staticImageId: staticImage.id,
			fallbackImageId: fallbackImage.id,
			tags: ['crime', 'world']
		})
		.returning({ id: maps.id });
	await publishMap(db, map.id);
	return { slug: DEMO_MAP_SLUG };
}
