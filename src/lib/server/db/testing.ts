import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { Db } from './index';

/**
 * Frisk in-memory database med alle migrationer fra ./drizzle kørt. Migrationer
 * frem for pushSchema, så data fra migrationer (kategorierne) også findes i
 * tests, og så testskemaet er præcis det, produktionen får.
 * Kald én gang pr. testfil (beforeAll).
 */
export async function createTestDb(): Promise<Db> {
	const db = drizzle(new PGlite(), { schema });
	await migrate(db, { migrationsFolder: './drizzle' });
	return db;
}
