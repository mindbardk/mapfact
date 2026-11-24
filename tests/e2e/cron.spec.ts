import { expect, test } from '@playwright/test';
import { E2E_CRON_SECRET } from '../../playwright.config.ts';

test('keepalive kræver CRON_SECRET', async ({ request }) => {
	expect((await request.get('/api/cron/keepalive')).status()).toBe(401);
	expect(
		(await request.get('/api/cron/keepalive', { headers: { authorization: 'Bearer wrong' } })).status()
	).toBe(401);
});

test('keepalive pinger databasen', async ({ request }) => {
	const response = await request.get('/api/cron/keepalive', {
		headers: { authorization: `Bearer ${E2E_CRON_SECRET}` }
	});
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ ok: true });
	expect(response.headers()['cache-control']).toBe('no-store');
});
