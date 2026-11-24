import { describe, expect, it, vi } from 'vitest';
import { cachePublicPage, PUBLIC_CACHE_TAG, publicCacheHeaders, secondsToMidnightUtc } from './public-cache';

describe('public-cache', () => {
	it("cacher på CDN'et under tagget, men aldrig i browseren", () => {
		const setHeaders = vi.fn();
		cachePublicPage(setHeaders);
		const headers = setHeaders.mock.calls[0][0];
		expect(headers['cache-control']).toContain('max-age=0');
		expect(headers['vercel-cdn-cache-control']).toMatch(/max-age=\d+/);
		expect(headers['vercel-cache-tag']).toBe(PUBLIC_CACHE_TAG);
		expect(PUBLIC_CACHE_TAG).toBe('public-pages');
	});

	it("cacher på CDN'et til næste midnat UTC", () => {
		expect(secondsToMidnightUtc(new Date('2026-11-24T23:00:00Z'))).toBe(3600);
		expect(secondsToMidnightUtc(new Date('2026-11-24T00:00:00Z'))).toBe(86400);
		expect(secondsToMidnightUtc(new Date('2026-11-30T23:59:59.500Z'))).toBe(1);
		expect(publicCacheHeaders(new Date('2026-11-24T12:00:00Z'))['vercel-cdn-cache-control']).toBe(
			'max-age=43200, stale-while-revalidate=86400'
		);
	});
});
