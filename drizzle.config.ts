import { defineConfig } from 'drizzle-kit';
import { resolveDbTarget } from './src/lib/server/db/target.ts';

// Samme regel som src/lib/server/db: PGlite, når PGLITE_DIR er sat, ellers
// Postgres. Migrationer kører mod session pooleren (DATABASE_URL_UNPOOLED),
// fordi transaction pooleren ikke tåler drizzle-kits sessionstilstand.
try {
	process.loadEnvFile();
} catch {
	// Ingen .env: miljøet leverer selv variablerne (Vercel).
}

const target = resolveDbTarget(
	{ ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
	true
);

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	...(target.kind === 'pglite'
		? { driver: 'pglite', dbCredentials: { url: target.dir } }
		: { dbCredentials: { url: target.url } }),
	verbose: true,
	strict: true
});
