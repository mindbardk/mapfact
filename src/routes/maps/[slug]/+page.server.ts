import { error } from '@sveltejs/kit';
import { readingMinutes, renderArticle } from '$lib/server/article';
import { getDb } from '$lib/server/db';
import { getPublicMap, nextMap } from '$lib/server/maps';
import { cachePublicPage } from '$lib/server/public-cache';
import type { PageServerLoad } from './$types';

/** Slugs er små bogstaver, tal og bindestreger. Alt andet er 404 uden et databasekald. */
const SLUG = /^[a-z0-9-]{1,200}$/;

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	if (!SLUG.test(params.slug)) error(404, 'Map not found');
	const db = await getDb();
	const map = await getPublicMap(db, params.slug);
	if (!map) error(404, 'Map not found');
	const article = renderArticle(map.body, { mapNo: map.no });
	const next = await nextMap(db, map);
	cachePublicPage(setHeaders);
	return {
		map,
		articleHtml: article.html,
		readingMinutes: readingMinutes(article.wordCount),
		next
	};
};
