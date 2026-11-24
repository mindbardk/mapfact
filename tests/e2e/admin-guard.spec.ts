import { expect, test } from '@playwright/test';

// Review C1: guarden skal matche den dekodede sti, som SvelteKit router på.
test('procent-kodet admin-API-sti kræver stadig login', async ({ request }) => {
	expect((await request.post('/api/%61dmin/logout')).status()).toBe(401);
	expect((await request.get('/api/%61dmin/anything')).status()).toBe(401);
});

// Review C2: admin-sidernes load-data må ikke kunne hentes uden login,
// heller ikke når klienten beder SvelteKit springe layoutet over.
test('admin-data kan ikke hentes uden login via __data.json', async ({ request }) => {
	for (const path of [
		'/admin/__data.json?x-sveltekit-invalidated=001',
		'/%61dmin/__data.json?x-sveltekit-invalidated=001',
		'/admin/__data.json'
	]) {
		const response = await request.get(path, { maxRedirects: 0 });
		const body = await response.text();
		expect(body, path).not.toContain('A draft map');
		expect(body, path).toContain('/admin/login');
	}
});

test('admin-sider uden login sender til login', async ({ request }) => {
	const response = await request.get('/%61dmin', { maxRedirects: 0 });
	expect(response.status()).toBe(303);
	expect(response.headers()['location']).toBe('/admin/login');
});
