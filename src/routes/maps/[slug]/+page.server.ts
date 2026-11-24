import { error } from '@sveltejs/kit';
import { readingMinutes, renderArticle } from '$lib/server/article';
import { getDb } from '$lib/server/db';
import { getPublicMap, nextMap } from '$lib/server/maps';
import { cachePublicPage } from '$lib/server/public-cache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
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
