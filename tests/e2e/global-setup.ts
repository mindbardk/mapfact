import { mkdir, readFile, rm } from 'node:fs/promises';

/**
 * Frisk PGlite-database til e2e: nulstil datadir, kør migrationerne og seed
 * demo-kortet og kanttilfældene. Dev-serveren åbner samme datadir bagefter.
 */
export default async function globalSetup() {
	const dir = './.data/e2e';
	await rm(dir, { recursive: true, force: true });
	await mkdir('./.data', { recursive: true });
	process.env.PGLITE_DIR = dir;
	delete process.env.DATABASE_URL;

	const { getDb } = await import('../../src/lib/server/db/index.ts');
	const { migrate } = await import('drizzle-orm/pglite/migrator');
	const { seedDemoContent } = await import('../../src/lib/server/seed.ts');
	const { seedE2eFixtures } = await import('./fixtures.ts');

	const db = await getDb();
	await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: './drizzle' });
	await seedDemoContent(db, {
		serialKillersPng: await readFile('./scripts/seed-assets/serial-killers.png')
	});
	await seedE2eFixtures(db);
	// PGlite skal lukkes, før dev-serveren åbner samme datadir.
	await (db as unknown as { $client: { close(): Promise<void> } }).$client.close();
}
