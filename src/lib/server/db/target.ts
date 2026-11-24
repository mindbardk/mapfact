export type DbTarget = { kind: 'pglite'; dir: string } | { kind: 'postgres'; url: string };

/**
 * Hvilken database appen, scripts og drizzle-kit bruger. PGlite (lokalt og i
 * test) eller Postgres (Supabase). Er begge sat, fejler den højlydt i stedet
 * for stille at vælge den ene: ellers kunne `DATABASE_URL=… npm run db:seed`
 * skrive til den lokale PGlite fra .env.
 */
export function resolveDbTarget(
	env: Record<string, string | undefined>,
	pgliteAllowed: boolean
): DbTarget {
	const dir = pgliteAllowed ? env.PGLITE_DIR?.trim() : undefined;
	const url = env.DATABASE_URL?.trim();
	if (dir && url) {
		throw new Error(
			'Both PGLITE_DIR and DATABASE_URL are set. Unset one of them (e.g. `PGLITE_DIR= npm run db:seed`).'
		);
	}
	if (dir) return { kind: 'pglite', dir };
	if (url) return { kind: 'postgres', url };
	throw new Error('DATABASE_URL is not set and PGLITE_DIR is not set (see .env.example)');
}
