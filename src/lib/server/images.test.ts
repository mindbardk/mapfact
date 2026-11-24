import sharp from 'sharp';
import { beforeAll, expect, test } from 'vitest';
import type { Db } from './db';
import { createTestDb } from './db/testing';
import { AppError } from './errors';
import { getImage, storeImage } from './images';

let db: Db;
beforeAll(async () => {
	db = await createTestDb();
});

function png(width: number, height: number) {
	return sharp({ create: { width, height, channels: 3, background: '#E4E8E8' } })
		.png()
		.toBuffer();
}

test('storeImage skalerer til maks. 2400 px og gemmer WebP', async () => {
	const ref = await storeImage(db, await png(3000, 1500), { format: 'webp', alt: 'Test' });
	expect(ref).toMatchObject({ ext: 'webp', width: 2400, height: 1200, alt: 'Test' });
	const stored = await getImage(db, ref.id);
	expect(stored?.mime).toBe('image/webp');
	expect((await sharp(stored!.bytes).metadata()).format).toBe('webp');
});

test('storeImage forstørrer ikke små billeder og kan gemme PNG', async () => {
	const ref = await storeImage(db, await png(800, 400), { format: 'png' });
	expect(ref).toMatchObject({ ext: 'png', width: 800, height: 400, alt: '' });
	expect((await getImage(db, ref.id))?.mime).toBe('image/png');
});

test('storeImage respekterer maxSize', async () => {
	const ref = await storeImage(db, await png(2000, 1000), { format: 'png', maxSize: 1600 });
	expect(ref).toMatchObject({ width: 1600, height: 800 });
});

test('storeImage afviser bytes, der ikke er et billede, med AppError 400', async () => {
	const result = storeImage(db, Buffer.from('not an image'), { format: 'webp' });
	await expect(result).rejects.toBeInstanceOf(AppError);
	await expect(result).rejects.toMatchObject({ status: 400 });
});

test('getImage giver null for ukendt id', async () => {
	expect(await getImage(db, 999999)).toBeNull();
});
