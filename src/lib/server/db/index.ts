import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { resolveDbTarget } from './target';

/**
 * Fælles basistype for postgres-js og PGlite. En union af de to driver-typer
 * gør overloads som `.returning({...})` og `transaction()` uforenelige for TS.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Supabase via DATABASE_URL (transaction pooler) på Vercel. Lokalt og i e2e
// bruges PGlite via PGLITE_DIR. Er begge eller ingen sat, fejler første query
// højlydt (se target.ts).
// Initialiseres lazy ved første query: SvelteKits build-analyse importerer
// servermoduler, og PGlite tåler ikke at blive åbnet af to processer.
let dbPromise: Promise<Db> | null = null;

// Vite erstatter `import.meta.env.PROD` med `true` i prod-buildet, så grenen
// med PGlite fjernes og pakken ikke spores med i Vercel-bundlen. Under ren
// Node (Playwrights global-setup, tsx-scripts) er `import.meta.env` udefineret.
const pgliteAllowed = typeof import.meta.env === 'undefined' || !import.meta.env.PROD;

async function createDb(): Promise<Db> {
	const target = resolveDbTarget(process.env, pgliteAllowed);
	// `pgliteAllowed &&` står her, så Vite kan fjerne grenen og PGlite-importen i prod-buildet.
	if (pgliteAllowed && target.kind === 'pglite') {
		const { drizzle } = await import('drizzle-orm/pglite');
		return drizzle(target.dir, { schema }) as unknown as Db;
	}
	const [{ drizzle }, { default: postgres }] = await Promise.all([
		import('drizzle-orm/postgres-js'),
		import('postgres')
	]);
	// prepare: false er påkrævet bag Supabases transaction pooler. Vercel Fluid
	// compute kører flere kald i samme instans, så puljen har plads til nogle få
	// samtidige forbindelser; pooleren selv holder det samlede antal nede.
	const client = postgres(target.url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
	return drizzle(client, { schema }) as unknown as Db;
}

export function getDb(): Promise<Db> {
	return (dbPromise ??= createDb());
}

export { schema };
