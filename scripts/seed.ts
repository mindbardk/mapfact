// Opretter demo-indholdet i databasen, som DATABASE_URL/PGLITE_DIR peger på.
// Idempotent. Lokalt med PGlite: stop dev-serveren først (single-process).
import { readFile } from 'node:fs/promises';
import { getDb } from '../src/lib/server/db/index.ts';
import { seedDemoContent } from '../src/lib/server/seed.ts';

const db = await getDb();
const { slug } = await seedDemoContent(db, {
	serialKillersPng: await readFile(new URL('./seed-assets/serial-killers.png', import.meta.url))
});
console.log(`Demo-kort klar: /maps/${slug}`);
process.exit(0);
