import { error } from '@sveltejs/kit';
import { parseImageFile } from '$lib/image-url';
import { getDb } from '$lib/server/db';
import { getImage } from '$lib/server/images';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = parseImageFile(params.file);
	if (!file) error(404, 'Not found');
	const image = await getImage(await getDb(), file.id);
	// Udvidelsen skal passe til det gemte format, så samme id ikke findes under to URL'er.
	if (!image || image.mime !== `image/${file.ext}`) error(404, 'Not found');
	return new Response(new Uint8Array(image.bytes), {
		headers: {
			'content-type': image.mime,
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};
