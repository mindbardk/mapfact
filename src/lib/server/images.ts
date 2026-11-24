import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { ImageExt, ImageRef } from '$lib/image-url';
import type { Db } from './db';
import { images } from './db/schema';
import { AppError } from './errors';

const DEFAULT_MAX_SIZE = 2400;

/**
 * Skalerer billedet ned (aldrig op) til maks. `maxSize` på den længste led,
 * koder det som WebP eller PNG og gemmer bytes i Postgres.
 */
export async function storeImage(
	db: Db,
	input: Buffer,
	opts: {
		format: ImageExt;
		alt?: string;
		caption?: string | null;
		credit?: string | null;
		maxSize?: number;
	}
): Promise<ImageRef> {
	const maxSize = opts.maxSize ?? DEFAULT_MAX_SIZE;
	const pipeline = sharp(input)
		.rotate()
		.resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true });
	const encoded = await (opts.format === 'webp'
		? pipeline.webp({ quality: 82 })
		: pipeline.png({ compressionLevel: 9 })
	)
		.toBuffer({ resolveWithObject: true })
		.catch(() => {
			throw new AppError(400, 'Not a valid image');
		});
	const alt = opts.alt ?? '';
	const [row] = await db
		.insert(images)
		.values({
			bytes: encoded.data,
			mime: `image/${opts.format}`,
			width: encoded.info.width,
			height: encoded.info.height,
			alt,
			caption: opts.caption ?? null,
			credit: opts.credit ?? null
		})
		.returning();
	return { id: row.id, ext: opts.format, width: encoded.info.width, height: encoded.info.height, alt };
}

export async function getImage(db: Db, id: number): Promise<{ bytes: Buffer; mime: string } | null> {
	const [row] = await db
		.select({ bytes: images.bytes, mime: images.mime })
		.from(images)
		.where(eq(images.id, id));
	return row ?? null;
}
