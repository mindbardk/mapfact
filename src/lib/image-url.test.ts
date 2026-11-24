import { expect, test } from 'vitest';
import { imageUrl, parseImageFile } from './image-url';

test.each([
	['12.webp', { id: 12, ext: 'webp' }],
	['3.png', { id: 3, ext: 'png' }],
	['abc.webp', null],
	['0.webp', null],
	['5.gif', null],
	['5.webp.png', null],
	['05.png', null],
	['', null],
	['2147483647.png', { id: 2147483647, ext: 'png' }],
	['2147483648.png', null]
])('parseImageFile(%s)', (file, expected) => {
	expect(parseImageFile(file)).toEqual(expected);
});

test('imageUrl', () => {
	expect(imageUrl({ id: 7, ext: 'png' })).toBe('/img/7.png');
});
