import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

// Supabase via DATABASE_URL (transaction pooler) på Vercel. Lokalt og i e2e
// bruges PGlite, når PGLITE_DIR er sat; den vinder over DATABASE_URL, så en
// testkørsel aldrig kan ramme Supabase. Der er ingen stille fallback: mangler
// begge, fejler første query højlydt.
// Initialiseres lazy ved første query: SvelteKits build-analyse importerer
// servermoduler, og PGlite tåler ikke at blive åbnet af to processer.
let dbPromise: Promise<Db> | null = null;

// Vite erstatter `import.meta.env.PROD` med `true` i prod-buildet, så grenen
// med PGlite fjernes og pakken ikke spores med i Vercel-bundlen. Under ren
// Node (Playwrights global-setup, tsx-scripts) er `import.meta.env` udefineret.
const pgliteAllowed = typeof import.meta.env === 'undefined' || !import.meta.env.PROD;

async function createDb(): Promise<Db> {
	if (pgliteAllowed && process.env.PGLITE_DIR) {
		const { drizzle } = await import('drizzle-orm/pglite');
		return drizzle(process.env.PGLITE_DIR, { schema });
	}
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set and PGLITE_DIR is not set (see .env.example)');
	}
	const [{ drizzle }, { default: postgres }] = await Promise.all([
		import('drizzle-orm/postgres-js'),
		import('postgres')
	]);
	// prepare: false er påkrævet bag Supabases transaction pooler.
	// max: 1, fordi hver serverless-instans kun behandler ét kald ad gangen.
	return drizzle(postgres(databaseUrl, { prepare: false, max: 1 }), { schema });
}

export function getDb(): Promise<Db> {
	return (dbPromise ??= createDb());
}

export { schema };
