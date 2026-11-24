import { expect, test } from 'vitest';
import { SITE_NAME, SITE_ORIGIN } from './site';

test('site-konstanter', () => {
	expect(SITE_ORIGIN).toBe('https://mapfact.com');
	expect(SITE_NAME).toBe('Mapfact');
});
