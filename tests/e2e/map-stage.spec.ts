import { expect, test } from '@playwright/test';
import { DEMO_MAP_SLUG } from '../../src/lib/server/seed.ts';
import { E2E_NO_FALLBACK_SLUG } from './fixtures.ts';

const DEMO = `/maps/${DEMO_MAP_SLUG}`;
const NO_FALLBACK = `/maps/${E2E_NO_FALLBACK_SLUG}`;

test('værktøjerne er 44 × 44-knapper med labels', async ({ page }) => {
	await page.goto(DEMO);
	const stage = page.locator('[data-ref="map-stage"]');
	for (const name of ['Zoom in', 'Zoom out', 'Reset view', 'Full screen']) {
		const box = await stage.getByRole('button', { name }).boundingBox();
		expect(box, name).toMatchObject({ width: 44, height: 44 });
	}
});

test('zoom og nulstil ændrer kortbilledets transform', async ({ page }) => {
	await page.goto(DEMO);
	const stage = page.locator('[data-ref="map-stage"]');
	const map = stage.locator('[data-ref="map-static"]');
	await expect(map).toBeVisible();
	await expect(stage.locator('[data-ref="map-fallback"]')).toBeHidden();
	await stage.getByRole('button', { name: 'Zoom in' }).click();
	await expect(map).toHaveAttribute('style', /scale\(1\.5\)/);
	await stage.getByRole('button', { name: 'Reset view' }).click();
	await expect(map).toHaveAttribute('style', /scale\(1\)/);
});

test('fuld skærm åbner og lukker med knappen', async ({ page }) => {
	await page.goto(DEMO);
	const stage = page.locator('[data-ref="map-stage"]');
	await expect(stage.locator('[data-ref="map-static"]')).toBeVisible();
	const supported = await page.evaluate(() => document.fullscreenEnabled);
	test.skip(!supported, 'Fullscreen understøttes ikke headless');
	await stage.getByRole('button', { name: 'Full screen' }).click();
	await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('map');
	// Escape håndteres af browseren selv og kan ikke sendes headless; knappen lukker også.
	await stage.getByRole('button', { name: 'Full screen' }).click();
	await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test('uden fallback viser en fejl "Try again", og artiklen står stadig', async ({ page }) => {
	await page.route('**/img/**', (route) => route.abort());
	await page.goto(NO_FALLBACK);
	const stage = page.locator('[data-ref="map-stage"]');
	await expect(stage).toContainText('The map could not load');
	await expect(page.locator('[data-ref="article"]')).toBeVisible();

	await page.unroute('**/img/**');
	await stage.getByRole('button', { name: 'Try again' }).click();
	await expect(stage.locator('[data-ref="map-static"]')).toBeVisible();
	await expect(stage).not.toContainText('The map could not load');
});

test('med fallback bliver billedet stående, når kortet fejler', async ({ page }) => {
	await page.route('**/img/*.webp', (route) => route.abort());
	await page.goto(DEMO);
	const stage = page.locator('[data-ref="map-stage"]');
	await expect(stage.locator('[data-ref="map-fallback"]')).toBeVisible();
	// Giv rendereren tid til at fejle, og tjek at der ingen fejltekst kom.
	await page.waitForTimeout(500);
	await expect(stage).not.toContainText('could not load');
	await expect(stage.locator('[data-ref="map-fallback"]')).toBeVisible();
});

test('server-HTML viser en loading-tekst, når der intet fallback er', async ({ request }) => {
	const html = await (await request.get(NO_FALLBACK)).text();
	expect(html).toContain('Loading map № 0003…');
});
