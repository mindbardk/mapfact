import { defineConfig } from 'drizzle-kit';

// Samme regel som src/lib/server/db: PGlite, når PGLITE_DIR er sat, ellers
// Postgres. Migrationer kører mod session pooleren (DATABASE_URL_UNPOOLED),
// fordi transaction pooleren ikke tåler drizzle-kits sessionstilstand.
try {
	process.loadEnvFile();
} catch {
	// Ingen .env: miljøet leverer selv variablerne (Vercel).
}

const pgliteDir = process.env.PGLITE_DIR;
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!pgliteDir && !url) throw new Error('DATABASE_URL er ikke sat (se .env.example)');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	...(pgliteDir
		? { driver: 'pglite', dbCredentials: { url: pgliteDir } }
		: { dbCredentials: { url: url! } }),
	verbose: true,
	strict: true
});
