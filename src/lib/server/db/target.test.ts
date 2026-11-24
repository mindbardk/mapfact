import { expect, test } from 'vitest';
import { resolveDbTarget } from './target';

test('PGlite, når kun PGLITE_DIR er sat', () => {
	expect(resolveDbTarget({ PGLITE_DIR: '.data/dev', DATABASE_URL: '' }, true)).toEqual({
		kind: 'pglite',
		dir: '.data/dev'
	});
});

test('Postgres, når kun DATABASE_URL er sat', () => {
	expect(resolveDbTarget({ DATABASE_URL: 'postgres://x' }, true)).toEqual({ kind: 'postgres', url: 'postgres://x' });
});

test('PGLITE_DIR ignoreres, hvor PGlite ikke er tilladt (prod-build)', () => {
	expect(resolveDbTarget({ PGLITE_DIR: '.data/dev', DATABASE_URL: 'postgres://x' }, false)).toEqual({
		kind: 'postgres',
		url: 'postgres://x'
	});
});

// Review I4: `DATABASE_URL=<supabase> npm run db:seed` med PGLITE_DIR i .env
// må ikke stille skrive til den lokale PGlite.
test('fejler, når både PGLITE_DIR og DATABASE_URL er sat', () => {
	expect(() => resolveDbTarget({ PGLITE_DIR: '.data/dev', DATABASE_URL: 'postgres://x' }, true)).toThrow(
		/Both PGLITE_DIR and DATABASE_URL/
	);
});

test('fejler, når ingen af dem er sat', () => {
	expect(() => resolveDbTarget({}, true)).toThrow(/DATABASE_URL is not set/);
});
