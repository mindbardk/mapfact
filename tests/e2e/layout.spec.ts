import { expect, test } from '@playwright/test';

const CATEGORIES = ['World', 'Politics', 'Economy', 'Climate', 'Health', 'Crime', 'Science', 'Tech', 'Society', 'Sport', 'Culture'];

test('headeren har de 11 kategorier i designets rækkefølge og en salgsknap', async ({ page }) => {
	await page.goto('/');
	const header = page.locator('[data-ref="site-header"]');
	const links = header.locator('nav[aria-label="Categories"] a');
	await expect(links).toHaveText(CATEGORIES);
	await expect(links.first()).toHaveAttribute('href', '/category/world');
	await expect(header.getByRole('link', { name: 'Maps for your site' })).toHaveAttribute('href', '/plans');
	await expect(header.getByRole('link', { name: 'Mapfact home' })).toHaveAttribute('href', '/');
});

test('footeren har alle kategorier', async ({ page }) => {
	await page.goto('/');
	const footer = page.locator('[data-ref="site-footer"]');
	for (const name of CATEGORIES) {
		await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute(
			'href',
			`/category/${name.toLowerCase()}`
		);
	}
});

test('siden bruger paper-baggrunden', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 245, 243)');
});

test.describe('mobil (360 px)', () => {
	test.use({ viewport: { width: 360, height: 800 } });

	test('kategorierne ligger bag en menuknap', async ({ page }) => {
		await page.goto('/');
		const header = page.locator('[data-ref="site-header"]');
		const nav = header.locator('nav[aria-label="Categories"]');
		const menu = header.getByRole('button', { name: 'Menu' });
		await expect(nav).toBeHidden();
		await expect(menu).toHaveAttribute('aria-expanded', 'false');
		await menu.click();
		await expect(menu).toHaveAttribute('aria-expanded', 'true');
		await expect(nav).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Crime' })).toBeVisible();
	});

	test('ingen vandret scroll', async ({ page }) => {
		await page.goto('/');
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	});
});
