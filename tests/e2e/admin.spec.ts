import { expect, test } from '@playwright/test';
import { adminCookie } from './admin-auth.ts';

test('uden login sendes /admin til login-siden', async ({ page }) => {
	const response = await page.goto('/admin');
	await expect(page).toHaveURL(/\/admin\/login$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapfact admin');
	expect(response?.headers()['vercel-cache-tag']).toBeUndefined();
});

test.describe('som ejer', () => {
	test.beforeEach(async ({ context, baseURL }) => {
		await context.addCookies([{ name: 'mapfact_admin', value: adminCookie, url: baseURL! }]);
	});

	test('/admin viser alle kort inkl. kladder og caches ikke', async ({ page }) => {
		const response = await page.goto('/admin');
		expect(response?.headers()['vercel-cache-tag']).toBeUndefined();
		const table = page.locator('[data-ref="admin-maps"]');
		await expect(table).toContainText('Serial killers of the world');
		const draft = table.locator('tr', { hasText: 'A draft map' });
		await expect(draft).toContainText('draft');
	});

	test('log ud fjerner sessionen', async ({ page }) => {
		await page.goto('/admin');
		await page.getByRole('button', { name: 'Log out' }).click();
		await expect(page).toHaveURL(/\/admin\/login$/);
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/login$/);
	});
});

test('admin-API uden login giver 401 JSON', async ({ request }) => {
	const response = await request.get('/api/admin/anything');
	expect(response.status()).toBe(401);
	expect(await response.json()).toEqual({ error: 'Not authorized' });
});
