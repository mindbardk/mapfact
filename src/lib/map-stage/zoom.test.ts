import { expect, test } from 'vitest';
import { clampPan, nextZoom, ZOOM_STEPS } from './zoom';

test('zoomtrinene', () => {
	expect(ZOOM_STEPS).toEqual([1, 1.5, 2.25, 3.375]);
});

test('nextZoom går et trin op og ned og stopper ved enderne', () => {
	expect(nextZoom(1, 1)).toBe(1.5);
	expect(nextZoom(2.25, 1)).toBe(3.375);
	expect(nextZoom(3.375, 1)).toBe(3.375);
	expect(nextZoom(1.5, -1)).toBe(1);
	expect(nextZoom(1, -1)).toBe(1);
});

test('nextZoom låser en værdi mellem trin til nærmeste trin i retningen', () => {
	expect(nextZoom(1.2, 1)).toBe(1.5);
	expect(nextZoom(1.2, -1)).toBe(1);
});

test('clampPan holder billedet inden for scenen', () => {
	expect(clampPan({ x: 9999, y: 0 }, 1.5, { w: 1000, h: 500 })).toEqual({ x: 250, y: 0 });
	expect(clampPan({ x: -9999, y: -9999 }, 1.5, { w: 1000, h: 500 })).toEqual({ x: -250, y: -125 });
	expect(clampPan({ x: 10, y: -20 }, 1.5, { w: 1000, h: 500 })).toEqual({ x: 10, y: -20 });
});

test('ved zoom 1 er pan altid 0', () => {
	expect(clampPan({ x: 50, y: 50 }, 1, { w: 1000, h: 500 })).toEqual({ x: 0, y: 0 });
});
