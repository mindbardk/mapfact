import { expect, test } from '@playwright/test';
import { DEMO_MAP_SLUG } from '../../src/lib/server/seed.ts';
import {
	E2E_ARCHIVED_SLUG,
	E2E_DRAFT_SLUG,
	E2E_LONG_TITLE_SLUG
} from './fixtures.ts';

const DEMO = `/maps/${DEMO_MAP_SLUG}`;

test('kortsiden er cachet på CDN og har titel, kategori og nummer', async ({ page }) => {
	const response = await page.goto(DEMO);
	expect(response?.status()).toBe(200);
	expect(response?.headers()['vercel-cache-tag']).toBe('public-pages');

	await expect(page.locator('h1')).toHaveCount(1);
	await expect(page.locator('h1')).toHaveText('Serial killers of the world');
	const block = page.locator('[data-ref="title-block"]');
	const tab = block.getByRole('link', { name: 'Crime' });
	await expect(tab).toHaveAttribute('href', '/category/crime');
	await expect(tab).toHaveCSS('text-transform', 'uppercase');
	await expect(block).toContainText('№ 0001');
	await expect(block).toContainText('Updated');
	await expect(
		page.locator('[data-ref="site-header"] nav[aria-label="Categories"] a[aria-current="page"]')
	).toHaveText('Crime');
});

test('kortscenen server-renderer fallback-billedet som LCP', async ({ page }) => {
	await page.goto(DEMO);
	const img = page.locator('[data-ref="map-stage"] img[data-ref="map-fallback"]');
	await expect(img).toHaveAttribute(
		'alt',
		'Point map of the world, densest in the United States and Western Europe'
	);
	await expect(img).toHaveAttribute('fetchpriority', 'high');
	const src = await img.getAttribute('src');
	expect(src).toMatch(/^\/img\/\d+\.png$/);
	await expect(page.locator(`head link[rel="preload"][as="image"][href="${src}"]`)).toHaveCount(1);
	await expect(page.locator('[data-ref="map-stage"]')).toHaveAttribute('id', 'map');
});

test('værktøjslinjen viser nummer, koordinat, projektion og kilde', async ({ page }) => {
	await page.goto(DEMO);
	const toolbar = page.locator('[data-ref="map-toolbar"]');
	await expect(toolbar).toContainText('№ 0001 · 20.0°N 0.0°E · Web Mercator');
	await expect(toolbar.getByRole('link', { name: 'Wikipedia' })).toHaveAttribute(
		'href',
		/wikipedia\.org/
	);
});

test('artiklen har faktaboks, citat, figur og byline', async ({ page }) => {
	await page.goto(DEMO);
	const article = page.locator('[data-ref="article"]');
	await expect(article.locator('aside.factbox')).toHaveCount(1);
	await expect(article.locator('figure.pullquote')).toHaveCount(1);
	await expect(article.locator('figure.article-figure')).toContainText('№ 0001-B');
	await expect(page.locator('[data-ref="byline"]')).toContainText('min read');
});

test('head har canonical, titel og beskrivelse', async ({ page }) => {
	await page.goto(DEMO);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://mapfact.com/maps/serial-killers-of-the-world'
	);
	await expect(page).toHaveTitle(/\| Mapfact$/);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /documented/);
});

test('"Next map" linker til et andet udgivet kort', async ({ page }) => {
	await page.goto(DEMO);
	const next = page.locator('[data-ref="next-map"]');
	await expect(next.getByRole('link')).toHaveAttribute('href', /^\/maps\/(?!serial-killers)/);
});

test('kladder og ukendte slugs giver 404, arkiverede kort vises', async ({ request }) => {
	expect((await request.get(`/maps/${E2E_DRAFT_SLUG}`)).status()).toBe(404);
	expect((await request.get('/maps/does-not-exist')).status()).toBe(404);
	expect((await request.get(`/maps/${E2E_ARCHIVED_SLUG}`)).status()).toBe(200);
});

test('forkerte billed-URL\'er giver 404', async ({ page, request }) => {
	for (const path of ['/img/abc.webp', '/img/0.webp', '/img/5.gif']) {
		expect((await request.get(path)).status(), path).toBe(404);
	}
	await page.goto(DEMO);
	const src = await page.locator('[data-ref="map-fallback"]').getAttribute('src');
	expect((await request.get(src!)).headers()['cache-control']).toContain('immutable');
	expect((await request.get(src!.replace('.png', '.webp'))).status()).toBe(404);
});

test('kortsiden er synlig uden scroll ved 1440 × 900, også med lang titel', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	for (const slug of [DEMO_MAP_SLUG, E2E_LONG_TITLE_SLUG]) {
		await page.goto(`/maps/${slug}`);
		const box = await page.locator('[data-ref="map-stage"]').boundingBox();
		expect(box!.y, slug).toBeLessThan(900);
	}
	await page.goto(DEMO);
	await expect(page.locator('h1')).toHaveCSS('font-size', '68px');
});

test('H1 skaleres først ned over 90 tegn', async ({ page }) => {
	await page.goto(`/maps/${E2E_LONG_TITLE_SLUG}`);
	await expect(page.locator('h1')).not.toHaveClass(/title-long/);
});

test.describe('mobil (360 px)', () => {
	test.use({ viewport: { width: 360, height: 800 } });

	test('ingen vandret scroll', async ({ page }) => {
		for (const slug of [DEMO_MAP_SLUG, E2E_LONG_TITLE_SLUG]) {
			await page.goto(`/maps/${slug}`);
			expect(await page.evaluate(() => document.documentElement.scrollWidth), slug).toBeLessThanOrEqual(360);
		}
	});
});
