# Mapfact fase 1 – Skelet: implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Et kørende SvelteKit-site på en Vercel-preview med designets tokens, header og footer, en server-renderet kortside (statisk kort + Markdown-artikel fra seed-data), billeder fra Postgres og Google-login til admin.

**Architecture:** SvelteKit 2 på Vercel (fra1) med Drizzle mod Supabase Postgres via postgres-js (transaction pooler). Lokalt og i test kører databasen som PGlite. Offentlige sider caches på Vercels CDN med cache-tag, så en visning sjældent rammer databasen. Kortscenen server-renderes med fallback-billedet som LCP og skifter derefter til en dynamisk indlæst renderer bag et lille interface, som fase 2 og 3 udvider med SVG- og punktkort.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind 4, Drizzle ORM 0.45 + drizzle-kit 0.31, postgres (postgres-js) 3, @electric-sql/pglite 0.5, zod 4, sharp 0.35, markdown-it 14 + markdown-it-container 4, @vercel/functions 3, Vitest 4, Playwright, adapter-vercel 6.

**Spec:** `docs/superpowers/specs/2026-11-24-mapfact-cms-design.md` (fase 1 i afsnit 15) og designoverleveringen "Mapfact relaunch – designoverlevering" (https://claude.ai/artifact/5TRvcUUNodqzAYLi1yR3v4). Overleveringen er bindende for tokens, mål og komponenter. Læs dens afsnit "Design tokens", "Sidetemplates", "Komponenter" og "Interaktion, tilstande og edge cases" før opgave 7–9.

**Kilde til kopiering:** `QUIZME=/Users/jesper/Projekter/quizme.now`. Når en opgave siger "kopiér fra quizme", menes den fil derfra. Ret derefter som beskrevet, og fjern alt, der importerer quiz-moduler.

**Uden for denne plan (egne planer senere):** datasæt og CSV-import, SVG-kort og basiskort (fase 2), punktkort (fase 3), forside, kategorisider, sitemap, JSON-LD, OG, redirects og ugentlig `pg_dump` (fase 4), embeds, salg og leads (fase 5), annoncer (fase 6), kortrunden (fase 7) og lancering (fase 8). Kortredigering i admin hører til fase 2, hvor datasæt kommer til. I fase 1 opretter seed-scriptet indholdet.

**Afvigelse fra specens rækkefølge:** keepalive-cronen er flyttet fra fase 4 til fase 1. Supabase free pauser efter 7 dages inaktivitet, og databasen findes fra fase 1.

## Global Constraints

- Sitets UI-tekst er engelsk. Kodekommentarer, CLAUDE.md og commitbeskeder er på dansk. Commit-emner har formen `Område: beskrivelse` (som i quizme).
- Før hvert commit: `npm run check && npm run test:unit` skal være grønne. `npm run test:e2e` og `npm run build` køres i de opgaver, der siger det, og altid i sidste opgave.
- Servermoduler tager `db: Db` som første parameter. Kun ruter og scripts kalder `getDb()`.
- Skemaændringer laves med `npm run db:generate`, og migrationsfilerne committes. Data, som appen ikke kan køre uden (de 11 kategorier), indsættes i en migration med `ON CONFLICT DO NOTHING`.
- Postgres-forbindelsen bruger `prepare: false` (Supabase transaction pooler).
- Ingen PostGIS og ingen betalte korttjenester eller nøgler.
- Farver: `--ink #121416`, `--paper #F4F5F3`, `--surface #FFFFFF`, `--sea #E4E8E8`, `--accent #2A33D6`, `--muted #5B6166`, `--body #1E2226`, `--sub #3B4045`, `--line #D9DCDA`, `--dark-muted #AEB4B8`, `--ad-bg #E9EBE9`.
- Radius 0 overalt, ingen skygger. Strukturstreger er 2 px ink, skillelinjer 1 px `--line`.
- Fonte fra Google Fonts med præcis denne URL: `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap`. Overskrifter bruger Archivo 800 med `font-stretch: 75%`.
- Sidemargen 40 px på desktop og 16 px på mobil, indhold maks. 1440 px. Breakpoints er ≤ 1100 px og ≤ 640 px. Alle sider skal virke ned til 360 px bredde.
- Klikflader er mindst 44 × 44 px. Synligt fokus er en 2 px `--accent`-outline med 2 px offset. Respektér `prefers-reduced-motion`.
- Kortnummer vises som `№ 0412`: mindst 4 cifre med foranstillede nuller.
- Én H1 pr. side, og den er kortets titel. Interne links er rigtige `<a href>`.
- Hovedelementer på offentlige sider har stabile `data-ref="navn"`-attributter (bruges af tests, ikke til styling).
- Site-origin til canonical-URL'er er konstanten `SITE_ORIGIN = 'https://mapfact.com'` i `src/lib/site.ts`.

## Review Focus

1. **Ukendt slug eller kladde:** `/maps/<slug>` giver 404 for et ukendt slug og for en kladde. Arkiverede kort vises. Testes i opgave 8.
2. **Markdown med rå HTML:** `<script>` eller `<img onerror>` i en artikel skal escapes og ikke køre. Testes i opgave 6.
3. **Forkerte billed-URL'er:** `/img/abc.webp`, `/img/0.webp`, `/img/5.gif` og en `.png`-URL til et WebP-billede giver 404, aldrig 500 og aldrig de forkerte bytes. Testes i opgave 4.
4. **Kort uden fallback-billede, hvor kortbilledet fejler:** kortscenen viser "The map could not load" og "Try again", og artiklen vises stadig. Testes i opgave 9.
5. **360 px bredde:** kortsiden må ikke få vandret scroll ved 360 px. Det gælder også en titel på ca. 90 tegn, og H1 skaleres ned over 90 tegn. Testes i opgave 8.

---

### Task 1: Projektskelet og værktøjer

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore`, `.npmrc`, `.env.example`, `CLAUDE.md`
- Create: `src/app.html`, `src/app.d.ts`, `src/routes/+page.svelte` (midlertidig), `src/lib/site.ts`, `src/lib/server/env-stub.ts`
- Test: `src/lib/site.test.ts`

**Interfaces:**
- Produces: `SITE_ORIGIN: 'https://mapfact.com'`, `SITE_NAME: 'Mapfact'` i `src/lib/site.ts`. npm-scripts: `dev`, `build`, `vercel-build`, `check`, `test`, `test:unit`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`.

- [ ] **Step 1: Opret `package.json`** med `"name": "mapfact"`, `"type": "module"` og `"engines": { "node": ">=22" }`. Scripts som quizme, men uden quiz-, avatar-, flag- og `db:refresh`-scripts. `vercel-build` er `drizzle-kit migrate && vite build`. Dependencies: `@vercel/functions`, `drizzle-orm`, `postgres` (^3.4), `sharp`, `zod`, `markdown-it` (^14), `markdown-it-container` (^4). DevDependencies: kit, svelte, vite, vitest, adapter-vercel, vite-plugin-svelte, tailwindcss, @tailwindcss/vite, @electric-sql/pglite, drizzle-kit, @playwright/test, svelte-check, typescript, tsx, @types/node, @types/markdown-it og @types/markdown-it-container. Brug quizmes versioner, hvor pakken findes der. Kør `npm install`.

- [ ] **Step 2: Kopiér og tilpas konfiguration fra quizme.**
  - `vite.config.ts`: fjern `allowedHosts`, `workflowPlugin` og `csrf.trustedOrigins`. Kits egen CSRF-kontrol er nok, fordi der ikke er MCP.
  - `vitest.config.ts` og `tsconfig.json`: uændrede.
  - `src/lib/server/env-stub.ts`: uændret.
  - `.npmrc`: uændret.
  - `vercel.json`: `{"regions":["fra1"]}` alene. Cronen kommer i opgave 11.
  - `.gitignore`: tilføj `.data/`, `.env`, `.vercel`, `test-results/` og `.DS_Store`.

- [ ] **Step 3: Opret `playwright.config.ts`** som kopi af quizme med `PORT=5174`. Eksportér `E2E_SESSION_SECRET='e2e-session-secret'`, `E2E_OWNER_EMAIL='owner@e2e.test'`, `E2E_API_TOKEN='e2e-api-token'` og `E2E_CRON_SECRET='e2e-cron-secret'`. `webServer.env` sætter `PGLITE_DIR='./.data/e2e'`, `SESSION_SECRET`, `ADMIN_OWNER_EMAILS`, `ADMIN_API_TOKEN` og `CRON_SECRET` til disse værdier. `globalSetup` er `./tests/e2e/global-setup.ts` og oprettes i opgave 5.

- [ ] **Step 4: Opret `.env.example` og `CLAUDE.md`.**
  - `.env.example` (danske kommentarer): `PGLITE_DIR=.data/dev` (lokal udvikling), `DATABASE_URL` (Supabase transaction pooler, port 6543), `DATABASE_URL_UNPOOLED` (session pooler, port 5432, kun migrationer), `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_OWNER_EMAILS`, `ADMIN_LOGIN_ORIGIN`, `ADMIN_PASSWORD`, `ADMIN_API_TOKEN`, `CRON_SECRET`.
  - `CLAUDE.md`: projektets konventioner i ≤ 25 linjer. Brug Global Constraints ovenfor. Tilføj, at PGlite er single-process (stop dev-serveren før `db:migrate`/`db:seed` lokalt), og at der henvises til spec og designoverlevering.

- [ ] **Step 5: Skriv `src/lib/site.test.ts`**

```ts
import { expect, test } from 'vitest';
import { SITE_NAME, SITE_ORIGIN } from './site';

test('site-konstanter', () => {
	expect(SITE_ORIGIN).toBe('https://mapfact.com');
	expect(SITE_NAME).toBe('Mapfact');
});
```

- [ ] **Step 6: Kør testen.** Kør `npm run test:unit`. Den skal fejle, fordi `./site` ikke findes. Opret derefter `src/lib/site.ts`, `src/app.html` (`lang="en"`, `data-sveltekit-preload-data="hover"`, ingen favicons endnu), `src/app.d.ts` (tom `Locals`, udfyldes i opgave 10) og en `+page.svelte` med "Mapfact". Kør `npm run test:unit`: PASS.

- [ ] **Step 7: Verificér.** Kør `npm run check` og `npm run build`. Begge skal gennemføres uden fejl.

- [ ] **Step 8: Commit**

```bash
git add -A ':!.DS_Store' && git commit -m "Skelet: SvelteKit-projekt med Vercel-, Vitest- og Playwright-opsætning"
```

---

### Task 2: Database, skema og testdatabase

**Files:**
- Create: `src/lib/server/db/index.ts`, `src/lib/server/db/schema.ts`, `src/lib/server/db/testing.ts`, `drizzle.config.ts`
- Create: `drizzle/0000_*.sql` (genereret) og `drizzle/0001_categories.sql` (custom migration)
- Test: `src/lib/server/db/schema.test.ts`

**Interfaces:**
- Produces:
  - `type Db = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>` og `getDb(): Promise<Db>` (lazy, memoiseret).
  - `createTestDb(): Promise<Db>`: PGlite i hukommelsen med alle migrationer fra `./drizzle` kørt, så kategorierne findes.
  - Tabeller `categories`, `maps`, `images` og `adminUsers` samt enums `mapStatus` (`draft`/`published`/`archived`) og `mapKind` (`svg`/`points`/`static`).
  - Typen `MapKind`.

- [ ] **Step 1: Skriv den fejlende test i `schema.test.ts`.**

```ts
let db: Db;
beforeAll(async () => { db = await createTestDb(); });

test('migrationen seeder de 11 kategorier i designets rækkefølge', async () => {
	const rows = await db.select().from(categories).orderBy(categories.sort);
	expect(rows.map((r) => r.name)).toEqual(['World', 'Politics', 'Economy', 'Climate', 'Health', 'Crime', 'Science', 'Tech', 'Society', 'Sport', 'Culture']);
	expect(rows[0].slug).toBe('world');
});

test('maps.slug og maps.no er unikke', async () => { /* indsæt to kort med samme slug → afvises; samme no → afvises */ });

test('bytea gemmer og returnerer de samme bytes', async () => {
	const bytes = Buffer.from([0, 1, 2, 255]);
	const [row] = await db.insert(images).values({ bytes, mime: 'image/png', width: 1, height: 1 }).returning();
	expect(Buffer.compare(row.bytes, bytes)).toBe(0);
});
```

- [ ] **Step 2: Kør testen.** Kør `npm run test:unit -- src/lib/server/db`. Den skal fejle, fordi modulerne mangler.

- [ ] **Step 3: Skriv `schema.ts`.** Alle tabeller har `id: integer().primaryKey().generatedAlwaysAsIdentity()` samt `created_at` og `updated_at` (`timestamptz`, `defaultNow`, `updated_at` med `$onUpdate(() => new Date())`).
  - `categories`: `slug` (unik), `name`, `intro` (text, default `''`) og `sort` (int).
  - `images`: `bytes` som customType bytea med `fromDriver: (v) => Buffer.from(v)`, `mime` (text), `width`, `height`, `alt` (default `''`), samt `caption` og `credit` (nullable).
  - `maps`: alle felter fra spec afsnit 6 undtagen `dataset_id`, som kommer i fase 2. `no` er int unik og nullable. `status` har default `draft`. `category_id` er en not-null fk. `body` har default `''`. `config` er jsonb med default `{}`. `alt_text` har default `''`. Billed-fk'erne er nullable. `tags` er `text[]` med default `{}`.
  - `adminUsers`: kopieres uændret fra quizmes schema.
  - Indeks: `maps(status, published_at)`.

- [ ] **Step 4: Skriv `db/index.ts`** som quizmes, men med `drizzle-orm/postgres-js` og `postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })` i stedet for neon-http. PGlite-valget (`PGLITE_DIR`, aldrig i prod-build) er uændret. Fejl, hvis ingen af variablerne er sat.

- [ ] **Step 5: Skriv `drizzle.config.ts` og migrationerne.** Kopiér quizmes `drizzle.config.ts`, men brug `DATABASE_URL_UNPOOLED ?? DATABASE_URL` som url uden PGlite. Kør `npm run db:generate` med `PGLITE_DIR=.data/dev`. Opret derefter `0001_categories` med `npx drizzle-kit generate --custom --name=categories` og indsæt de 11 kategorier (`slug` = navnet med små bogstaver, `sort` 1–11) med `ON CONFLICT (slug) DO NOTHING`.

- [ ] **Step 6: Skriv `testing.ts`.** `createTestDb()` opretter `new PGlite()` og `drizzle(client, { schema })` og kører `migrate(db, { migrationsFolder: './drizzle' })` fra `drizzle-orm/pglite/migrator`. Migrationer frem for `pushSchema` er bevidst, så seed-data i migrationer også findes i tests.

- [ ] **Step 7: Kør testen.** Kør `npm run test:unit -- src/lib/server/db`: PASS.

- [ ] **Step 8: Verificér lokal udvikling.** Kør `cp .env.example .env`, `npm run db:migrate` og derefter `npm run dev`. Siden skal starte uden fejl.

- [ ] **Step 9: Commit:** `DB: Drizzle-skema, postgres-js/PGlite og kategori-migration`

---

### Task 3: Fejl og API-hjælpere

**Files:**
- Create: `src/lib/server/errors.ts`, `src/lib/server/api.ts`
- Test: `src/lib/server/api.test.ts`

**Interfaces:**
- Produces: `class AppError extends Error { constructor(status: number, message: string) }` og `handle(...)`/`handleLoad(...)` med samme overloads som quizmes `api.ts`. `AppError` mappes til JSON `{ error: message }` med status.

- [ ] **Step 1: Kopiér `errors.ts`, `api.ts` og `api.test.ts` fra quizme.** Omdøb `QuizError` til `AppError` overalt. Fjern alt, der importerer quiz-moduler.
- [ ] **Step 2: Kør testen.** Kør `npm run test:unit -- src/lib/server/api`: PASS.
- [ ] **Step 3: Commit:** `Server: AppError og handle-hjælpere fra quizme`

(Lille opgave, men opgave 4 og 10 bygger på den. Den kan slås sammen med opgave 4, hvis reviewer ønsker det.)

---

### Task 4: Billeder i Postgres og `/img/<id>.<ext>`

**Files:**
- Create: `src/lib/image-url.ts` (klient-sikker), `src/lib/server/images.ts`, `src/routes/img/[file]/+server.ts`
- Test: `src/lib/image-url.test.ts`, `src/lib/server/images.test.ts`

**Interfaces:**
- Consumes: `Db` og `images` (opgave 2), `AppError` (opgave 3).
- Produces:
  - `type ImageExt = 'webp' | 'png'`
  - `type ImageRef = { id: number; ext: ImageExt; width: number; height: number; alt: string }`
  - `imageUrl(ref: Pick<ImageRef, 'id' | 'ext'>): string`, som giver `/img/<id>.<ext>`
  - `parseImageFile(file: string): { id: number; ext: ImageExt } | null`
  - `storeImage(db, input: Buffer, opts: { format: ImageExt; alt?: string; caption?: string | null; credit?: string | null; maxSize?: number }): Promise<ImageRef>`
  - `getImage(db, id: number): Promise<{ bytes: Buffer; mime: string } | null>`

- [ ] **Step 1: Skriv de fejlende tests.**

```ts
// image-url.test.ts
test.each([
	['12.webp', { id: 12, ext: 'webp' }],
	['3.png', { id: 3, ext: 'png' }],
	['abc.webp', null], ['0.webp', null], ['5.gif', null], ['5.webp.png', null], ['05.png', null], ['', null]
])('parseImageFile(%s)', (file, expected) => expect(parseImageFile(file)).toEqual(expected));

test('imageUrl', () => expect(imageUrl({ id: 7, ext: 'png' })).toBe('/img/7.png'));

// images.test.ts (createTestDb i beforeAll; testbilleder laves med sharp({ create: … }))
test('storeImage skalerer til maks. 2400 px og gemmer WebP', async () => {
	const input = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#E4E8E8' } }).png().toBuffer();
	const ref = await storeImage(db, input, { format: 'webp', alt: 'Test' });
	expect(ref).toMatchObject({ ext: 'webp', width: 2400, height: 1200, alt: 'Test' });
	expect((await getImage(db, ref.id))?.mime).toBe('image/webp');
});
test('storeImage forstørrer ikke små billeder og kan gemme PNG', /* 800×400 → 800×400, mime image/png */);
test('storeImage afviser bytes, der ikke er et billede, med AppError 400', /* Buffer.from('not an image') */);
test('getImage giver null for ukendt id', /* getImage(db, 999999) */);
```

- [ ] **Step 2: Kør testene.** Kør `npm run test:unit -- src/lib/image-url src/lib/server/images`. De skal fejle.
- [ ] **Step 3: Implementér `image-url.ts`.** Regex: `^([1-9]\d{0,9})\.(webp|png)$`.
- [ ] **Step 4: Implementér `images.ts`.** Brug `sharp(input).rotate().resize({ width: maxSize ?? 2400, height: maxSize ?? 2400, fit: 'inside', withoutEnlargement: true })` og derefter `.webp({ quality: 82 })` eller `.png({ compressionLevel: 9 })`. Mål fra `toBuffer({ resolveWithObject: true })`. Fejl fra sharp bliver til `AppError(400, 'Not a valid image')`.
- [ ] **Step 5: Implementér `/img/[file]/+server.ts`.** Kæden er `parseImageFile` → `getImage` → tjek, at `mime === 'image/' + ext`. Alle fejl i kæden giver `error(404)`. Svaret har headers `content-type: <mime>`, `cache-control: public, max-age=31536000, immutable` og `x-content-type-options: nosniff`.
- [ ] **Step 6: Kør testene.** Kør `npm run test:unit`: PASS. Route-404'erne testes e2e i opgave 8.
- [ ] **Step 7: Commit:** `Billeder: lagring i Postgres via sharp og /img-route`

---

### Task 5: Kortdomænet og seed-data

**Files:**
- Create: `src/lib/map-no.ts`, `src/lib/map-config.ts`, `src/lib/server/maps.ts`, `src/lib/server/seed.ts`, `scripts/seed.ts`, `scripts/seed-assets/serial-killers.png`
- Create: `tests/e2e/global-setup.ts`, `tests/e2e/fixtures.ts`
- Test: `src/lib/map-no.test.ts`, `src/lib/server/maps.test.ts`, `src/lib/server/seed.test.ts`

**Interfaces:**
- Consumes: `Db`, tabellerne, `storeImage`, `ImageRef` og `AppError`.
- Produces:
  - `formatMapNo(no: number, suffix?: string): string`. Eksempler: `formatMapNo(412)` giver `'№ 0412'`, `formatMapNo(412, 'B')` giver `'№ 0412-B'`, `formatMapNo(12345)` giver `'№ 12345'`.
  - `parseMapConfig(kind: MapKind, value: unknown): MapConfig`. `static` er `z.object({}).strict()`. `svg` og `points` kaster `AppError(422, 'Map kind not supported yet')`, indtil fase 2 og 3 tilføjer deres skemaer.
  - `type MapCard = { no: number; slug: string; title: string; category: { slug: string; name: string }; publishedAt: Date; thumb: ImageRef | null }`
  - `type MapPage = MapCard & { id; categoryId: number; status; dek; body; kind: MapKind; config; legendTitle; projectionLabel; centerLabel; sourceText; sourceUrl; altText; staticImage: ImageRef | null; fallbackImage: ImageRef | null; tags: string[]; seoTitle; seoDescription; contentUpdatedAt: Date }`
  - `getPublicMap(db, slug: string): Promise<MapPage | null>`: kun `published` og `archived`.
  - `publishMap(db, id: number, now?: Date): Promise<{ no: number }>`
  - `nextMap(db, current: { id: number; categoryId: number }): Promise<MapCard | null>`
  - `listPublishedMaps(db, limit: number): Promise<MapCard[]>`
  - `listCategories(db): Promise<{ slug: string; name: string }[]>`
  - `seedDemoContent(db, assets: { serialKillersPng: Buffer }): Promise<{ slug: string }>`: idempotent på slug.
  - `DEMO_MAP_SLUG = 'serial-killers-of-the-world'`
  - e2e-fixtures: `seedE2eFixtures(db)`, der kører efter `seedDemoContent` (demo-kortet er nr. 1) og udgiver i denne rækkefølge: `E2E_ARCHIVED_SLUG='archived-map'` (nr. 2, derefter sat til `archived`), `E2E_NO_FALLBACK_SLUG='no-fallback-map'` (nr. 3, kun `static_image_id`) og `E2E_LONG_TITLE_SLUG='long-title-map'` (nr. 4, titel på præcis 90 tegn). Derudover oprettes `E2E_DRAFT_SLUG='draft-map'`, som aldrig udgives.
  - Admin-brugeren seedes ikke: ejere kommer fra `ADMIN_OWNER_EMAILS` som i quizme, og `admin_users` rummer kun hjælpere, der tilføjes senere.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `map-no.test.ts`: de tre eksempler ovenfor plus `formatMapNo(1)`, som giver `'№ 0001'`.
  - `maps.test.ts`:
    - `publishMap` på en kladde giver `no = 1`, og det næste kort får `no = 2`.
    - Genudgivelse beholder `no` og `published_at`, men flytter `content_updated_at`.
    - Et statisk kort uden `static_image_id` afvises med `AppError` 422.
    - `getPublicMap` returnerer null for en kladde og for et ukendt slug og returnerer arkiverede kort.
    - `nextMap` foretrækker det nyeste andet kort i samme kategori, falder tilbage til det nyeste på tværs og giver null, når kortet er det eneste.
  - `seed.test.ts`: `seedDemoContent` to gange giver ét kort. Kortet er udgivet med `no = 1`, kategori `crime`, `kind = 'static'`, et WebP `staticImage` og et PNG `fallbackImage`.
- [ ] **Step 2: Kør testene.** Kør `npm run test:unit`. De skal fejle.
- [ ] **Step 3: Implementér `map-no.ts`, `map-config.ts` og `maps.ts`.** `publishMap` beregner `no` som `coalesce(max(no), 0) + 1` og kører i `db.transaction` (postgres-js og PGlite understøtter begge transaktioner). `nextMap` sorterer på `published_at desc` blandt `published`.
- [ ] **Step 4: Kopiér seed-billedet og skriv `seed.ts`.** Kopiér `/Users/jesper/Projekter/mapfact-old/content/examples/20210526-serial-killers/serialkillers.png` til `scripts/seed-assets/serial-killers.png`. `seedDemoContent` gemmer billedet to gange med `storeImage`: som WebP til `static_image_id` og som PNG med maks. 1600 px til `fallback_image_id`. Derefter indsætter den kortet og kalder `publishMap`. Felter:
  - titel "Serial killers of the world"
  - en dek på én sætning
  - `alt_text` beskriver mønstret, f.eks. "Point map of the world, densest in the United States and Western Europe"
  - `source_text` "Wikipedia" og `source_url` til Wikipedias liste over seriemordere
  - `projection_label` "Web Mercator" og `center_label` "20.0°N 0.0°E"
  - en engelsk artikel på ca. 300 ord, der bruger én `## H2`, én `:::factbox How to read this map` … `:::`, ét citat med `— kilde` og én figur `![alt](/img/<fallback-id>.png "caption")`

  Artiklen er pladsholdertekst. Skriv den neutralt og uden opdigtede tal.
- [ ] **Step 5: Skriv `scripts/seed.ts` og e2e-opsætningen.**
  - `scripts/seed.ts`: top-level await `getDb()` → `seedDemoContent` → `process.exit(0)`.
  - `tests/e2e/global-setup.ts`: som quizmes. Den nulstiller `./.data/e2e`, sætter `PGLITE_DIR`, sletter `DATABASE_URL`, kører migrationer med `migrate()` (ikke `pushSchema`) og kalder `seedDemoContent` og `seedE2eFixtures`.
- [ ] **Step 6: Kør testene.** Kør `npm run test:unit`: PASS. Kør `npm run db:seed` lokalt med dev-serveren stoppet: kortet oprettes, og en kørsel mere ændrer intet.
- [ ] **Step 7: Commit:** `Kort: domænefunktioner, kortnummer og seed med demo-kort`

---

### Task 6: Artikel-Markdown med direktiver

**Files:**
- Create: `src/lib/server/article.ts`
- Test: `src/lib/server/article.test.ts`

**Interfaces:**
- Consumes: `formatMapNo`.
- Produces: `renderArticle(markdown: string, opts: { mapNo: number | null }): { html: string; wordCount: number }` og `readingMinutes(wordCount: number): number` (`max(1, round(wordCount / 230))`).

HTML-kontrakten. Opgave 8 styler disse klasser, så de skal være præcis sådan:
- Faktaboks: `:::factbox Title` … `:::` → `<aside class="factbox"><p class="factbox-label">Title</p>…indhold…</aside>`
- Citat: et `>`-citat, hvis sidste afsnit begynder med `— `, bliver til `<figure class="pullquote"><blockquote><p>…</p></blockquote><figcaption>kilde</figcaption></figure>`. Andre citater forbliver `<blockquote>`.
- Figur: et afsnit, der kun indeholder ét billede med titel, bliver til `<figure class="article-figure"><div class="crop-marks"><img src alt loading="lazy" decoding="async"></div><figcaption><span>caption</span><span class="figure-no">№ 0412-B</span></figcaption></figure>`. Suffikser tildeles i rækkefølge B, C, D …, fordi selve kortet er A. Uden `mapNo` udelades `figure-no`.
- `#` i Markdown renderes som `<h2>`, så siden kun har én H1.
- markdown-it med `html: false`, `linkify: false` og `typographer: true`.

- [ ] **Step 1: Skriv de fejlende tests.** Én test pr. punkt i kontrakten, hvor HTML-strukturen assertes med `toContain`. Derudover:

```ts
test('rå HTML escapes', () => {
	const { html } = renderArticle('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', { mapNo: 1 });
	expect(html).not.toContain('<script');
	expect(html).not.toContain('<img src=x');
	expect(html).toContain('&lt;script&gt;');
});
test('figurer nummereres B, C', () => {
	const md = '![a](/img/1.png "One")\n\n![b](/img/2.png "Two")';
	const { html } = renderArticle(md, { mapNo: 412 });
	expect(html.indexOf('№ 0412-B')).toBeLessThan(html.indexOf('№ 0412-C'));
});
test('wordCount tæller ord i teksten, ikke i markup', () => expect(renderArticle('Hello **big** world', { mapNo: 1 }).wordCount).toBe(3));
test('readingMinutes', () => { expect(readingMinutes(0)).toBe(1); expect(readingMinutes(690)).toBe(3); });
```

- [ ] **Step 2: Kør testene.** Kør `npm run test:unit -- src/lib/server/article`. De skal fejle.
- [ ] **Step 3: Implementér.**
  - Faktaboksen er `markdown-it-container` med navnet `factbox`.
  - Citat og figur laves som core-regler, der omskriver token-strømmen efter parsing. De skal ikke laves som regex på HTML.
  - Figur-tælleren nulstilles pr. kald.
- [ ] **Step 4: Kør testene.** Kør `npm run test:unit`: PASS.
- [ ] **Step 5: Commit:** `Artikel: Markdown med faktaboks, citat og nummererede figurer`

---

### Task 7: Tokens, fonte, signaturkomponenter, header og footer

**Files:**
- Create: `src/routes/layout.css`, `src/routes/+layout.svelte`, `src/routes/+layout.server.ts`
- Create: `src/lib/components/Logo.svelte`, `CategoryTab.svelte`, `MapNo.svelte`, `SiteHeader.svelte`, `SiteFooter.svelte`
- Modify: `src/app.html` (preconnect og stylesheet til Google Fonts)
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `listCategories`, `formatMapNo`, `SITE_NAME`.
- Produces:
  - Layout-data `{ categories: { slug: string; name: string }[] }`.
  - Tailwind-tokens `bg-ink`, `text-accent`, `bg-sea` osv. fra `@theme` (`--color-ink` …).
  - Fontklasser `font-display` (Archivo), `font-serif` (Source Serif 4) og `font-mono` (IBM Plex Mono).
  - CSS-klasserne `.crop-marks` (fire L-hjørner med `--crop-size`, default 16 px og 12 px ≤ 640 px) og `.display` (Archivo 800, `font-stretch: 75%`).
  - Komponenterne `<Logo tone="light|dark" />`, `<CategoryTab name href? />` og `<MapNo no suffix? />`.

- [ ] **Step 1: Skriv `layout.spec.ts`.**
  - Headeren (`data-ref="site-header"`) har 11 kategorilinks til `/category/<slug>` i rækkefølgen World … Culture.
  - Headerens knap "Maps for your site" linker til `/plans`.
  - Footeren (`data-ref="site-footer"`) har alle 11 kategorier.
  - Ved viewport 360 × 800 er kategorinavigationen skjult, og en knap med `aria-label="Menu"` og `aria-expanded="false"` er synlig. Klik sætter `aria-expanded="true"` og viser kategorierne.
  - `<body>` har computed `background-color` `rgb(244, 245, 243)` (paper).

  Testen kører mod `/` (pladsholderen fra opgave 1). Den aktive kategori på kortsiden assertes i opgave 8's `map-page.spec.ts`.

- [ ] **Step 2: Kør testen.** Kør `npm run test:e2e -- layout`. Den skal fejle.

- [ ] **Step 3: Skriv `layout.css`.**
  - `@import 'tailwindcss'`, `@source '../lib'` og `@source '../routes'`.
  - `@theme` med alle farvetokens og de tre fontfamilier, hver med system-fallback.
  - `@layer base`:
    - `body` på paper og ink
    - fokusstil: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`
    - links i accent, hover ink
    - `prefers-reduced-motion` slår `scroll-behavior` og transitions fra
  - `@layer components`:
    - `.crop-marks` lavet med baggrunds-gradienter på ét element (ingen ekstra markup), så Markdown-figurer kan bruge klassen
    - `.display`
    - artikelklasserne fra opgave 6 (`.factbox`, `.pullquote`, `.article-figure`, `.figure-no`) styles efter designoverleveringen

- [ ] **Step 4: Byg komponenterne efter overleveringens komponenttabel.** Header er 64 px (56 px ≤ 640 px) med 2 px ink-streg under. Menuen ≤ 640 px er en `<button>` med `aria-expanded`. Footeren er ink med gradnet (`rgba(255,255,255,0.06)`, 48 px), logo, én linje tekst og kategorier i 4 kolonner. Søgeknappen udelades, fordi søgning ikke er med i v1. `+layout.server.ts` returnerer `listCategories(await getDb())`. Den aktive kategori kommer fra `page.data.map?.category.slug` (sættes i opgave 8).

- [ ] **Step 5: Kør testen.** Kør `npm run test:e2e -- layout`: PASS. Kør `npm run check`.

- [ ] **Step 6: Visuel kontrol.** Tag et screenshot af headeren og footeren ved 1440 og 390 px og sammenlign med canvasset "Mapfact relaunch". Ret afvigelser i mål, streger og typografi.

- [ ] **Step 7: Commit:** `Layout: designtokens, fonte, logo, header og footer`

---

### Task 8: Kortsiden `/maps/<slug>`

**Files:**
- Create: `src/routes/maps/[slug]/+page.server.ts`, `src/routes/maps/[slug]/+page.svelte`, `src/lib/server/public-cache.ts`, `src/lib/components/MapStage.svelte`, `src/lib/components/MapToolbar.svelte`, `src/lib/components/MapCardNext.svelte`
- Modify: `src/routes/+page.svelte` og `src/routes/+page.server.ts` (midlertidig liste over udgivne kort; forsiden kommer i fase 4)
- Test: `tests/e2e/map-page.spec.ts`, `src/lib/server/public-cache.test.ts`

**Interfaces:**
- Consumes: `getPublicMap`, `nextMap`, `listPublishedMaps`, `renderArticle`, `readingMinutes`, `imageUrl`, `formatMapNo`, `SITE_ORIGIN` og komponenterne fra opgave 7.
- Produces:
  - Page-data `{ map: MapPage; articleHtml: string; readingMinutes: number; next: MapCard | null }`.
  - `publicCacheHeaders(now?)`, `cachePublicPage(setHeaders)` og `PUBLIC_CACHE_TAG = 'public-pages'`, kopieret fra quizme. `isPublicContentWrite` og `purgePublicPages` kommer først i fase 2 sammen med admin-skrivninger.
  - `<MapStage map={…} />`, hvor `map: Pick<MapPage, 'no' | 'kind' | 'title' | 'altText' | 'staticImage' | 'fallbackImage'>`. I denne opgave viser den kun det server-renderede billede. Opgave 9 gør den interaktiv.

- [ ] **Step 1: Skriv `map-page.spec.ts`.** Kortsiden for `DEMO_MAP_SLUG`:
  - Svaret er 200 med headeren `vercel-cache-tag: public-pages`.
  - Der er præcis én `h1`, og den er "Serial killers of the world".
  - Kategorifanen viser "CRIME" og linker til `/category/crime`. Headerens Crime-link har `aria-current="page"`.
  - Kortnummeret viser "№ 0001".
  - `[data-ref="map-stage"] img` har `alt` lig med kortets `alt_text`, `fetchpriority="high"` og en `src` der matcher `/img/\d+\.png`. Der er et `<link rel="preload" as="image">` med samme href i head.
  - Værktøjslinjen (`data-ref="map-toolbar"`) indeholder "№ 0001 · 20.0°N 0.0°E · Web Mercator" og et link "Wikipedia".
  - Artiklen (`data-ref="article"`) indeholder `aside.factbox`, `figure.pullquote` og `figure.article-figure` med "№ 0001-B". Bylinen viser "min read".
  - `<link rel="canonical">` er `https://mapfact.com/maps/serial-killers-of-the-world`, og `<title>` slutter på "| Mapfact".

  Kanttilfælde (Review Focus 1, 3 og 5):
  - `E2E_DRAFT_SLUG` og `/maps/does-not-exist` giver 404.
  - `E2E_ARCHIVED_SLUG` giver 200.
  - `/img/abc.webp`, `/img/0.webp` og `/img/5.gif` giver 404. Det samme gør en `.png`-URL til kortets WebP-id.
  - Ved 360 × 800 er `document.documentElement.scrollWidth <= 360` på demo-kortet og på `E2E_LONG_TITLE_SLUG`.
  - H1 er 68 px på desktop. Titler over 90 tegn får klassen `title-long` (56 px), og testen tjekker, at 90 tegn ikke får den.
  - Kortscenen er synlig uden scroll ved 1440 × 900 (`boundingBox().y < 900`), også med lang titel.

- [ ] **Step 2: Kør testen.** Kør `npm run test:e2e -- map-page`. Den skal fejle.

- [ ] **Step 3: Kopiér `public-cache.ts` og `public-cache.test.ts` fra quizme.** Behold kun `PUBLIC_CACHE_TAG`, `secondsToMidnightUtc`, `publicCacheHeaders` og `cachePublicPage` og de tilhørende tests. Fjern importen fra `./admin`.

- [ ] **Step 4: Skriv `+page.server.ts`.** Kæden er `getPublicMap`, så 404 via `error(404)`, så `renderArticle(map.body, { mapNo: map.no })`, `nextMap` og `cachePublicPage(setHeaders)`.

- [ ] **Step 5: Skriv `+page.svelte` efter overleveringens "Kortside – desktop" og "Kortside – mobil".** Elementerne kommer i denne rækkefølge:
  1. Titelblok (`data-ref="title-block"`): kategorifane, `MapNo`, "Updated <dato>", H1 maks. 1040 px og dek til højre maks. 380 px.
  2. `MapStage` (`id="map"`): 720 px høj (500 px ≤ 640 px), `--sea`, 2 px ink-streg over og under og crop-marks 20 px inde.
  3. `MapToolbar` med kun metadata. Knapperne Share, PNG, Embed og Data kommer i senere faser.
  4. Artikelgitter `220px | minmax(0,680px) | 300px` med 56 px mellemrum:
     - Venstre: byline "Mapfact · N min read".
     - Midt: artiklen, hvor HTML'en sættes med `{@html}` (sikker, fordi `html: false` i opgave 6).
     - Højre: `MapCardNext`, en mørk kortboks, eller ingenting.
  5. Sidespalterne skjules ≤ 1100 px.

  `<svelte:head>`: title `${seoTitle ?? title} | Mapfact`, description `seoDescription ?? dek`, canonical og preload af fallback-billedet (eller det statiske billede, hvis der ikke er et fallback).

- [ ] **Step 6: Skriv den midlertidige `/`.** Den viser H1 "Mapfact" og en liste med `listPublishedMaps(db, 20)` som links og bruger `cachePublicPage`.

- [ ] **Step 7: Kør testene.** Kør `npm run test:e2e` og `npm run test:unit`: alt PASS. Kør `npm run check`.

- [ ] **Step 8: Visuel kontrol.** Tag et screenshot af kortsiden ved 1440 × 900 og 390 × 844 og sammenlign med artboards "Kortside – desktop" og "Kortside – mobil". Ret afvigelser.

- [ ] **Step 9: Commit:** `Kortside: titelblok, kortscene, værktøjslinje og artikel med CDN-cache`

---

### Task 9: Interaktiv kortscene med renderer-interface

**Files:**
- Create: `src/lib/map-stage/renderer.ts`, `src/lib/map-stage/static-renderer.ts`, `src/lib/map-stage/zoom.ts`
- Modify: `src/lib/components/MapStage.svelte`
- Test: `src/lib/map-stage/zoom.test.ts`, `tests/e2e/map-stage.spec.ts`

**Interfaces:**
- Consumes: `MapKind`, `ImageRef` og `imageUrl`.
- Produces (fase 2 og 3 tilføjer `svg` og `points` her):

```ts
export type StageMap = { no: number; kind: MapKind; title: string; altText: string; staticImage: ImageRef | null };
export interface MapRenderer {
	mount(el: HTMLElement): Promise<void>; // afviser, hvis kortet ikke kan vises
	destroy(): void;
	zoomIn(): void;
	zoomOut(): void;
	reset(): void;
}
export type RendererFactory = (map: StageMap) => MapRenderer;
export function loadRenderer(kind: MapKind): Promise<RendererFactory>; // dynamisk import; svg/points afviser indtil videre
```

- `zoom.ts` (ren logik): `ZOOM_STEPS = [1, 1.5, 2.25, 3.375]`, `nextZoom(z, dir: 1 | -1): number` (låst til trinene) og `clampPan(pan: {x,y}, zoom: number, box: {w,h}): {x,y}`, så billedet aldrig trækkes ud af scenen.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `zoom.test.ts`:
    - `nextZoom(1, 1)` giver 1.5, og `nextZoom(3.375, 1)` giver 3.375.
    - `nextZoom(1, -1)` giver 1.
    - `clampPan({x: 9999, y: 0}, 1.5, {w: 1000, h: 500})` giver x = 250, altså `(zoom - 1) * w / 2`.
    - Ved zoom 1 er pan altid {0, 0}.
  - `map-stage.spec.ts` (Review Focus 4):
    - Demo-kortet viser værktøjsknapperne med `aria-label` "Zoom in", "Zoom out", "Reset view" og "Full screen", hver 44 × 44 px.
    - Klik på "Zoom in" giver `[data-ref="map-static"]` en `transform`, der indeholder `scale(1.5)`. "Reset view" sætter den tilbage til `scale(1)`.
    - Fuld skærm sætter `document.fullscreenElement` til scenen, og Escape lukker. Testen springes over med `test.skip`, hvis browseren ikke understøtter fullscreen headless.
    - Med `page.route('**/img/**', r => r.abort())` på `E2E_NO_FALLBACK_SLUG` viser scenen "The map could not load" og en knap "Try again". Artiklen er stadig synlig. Efter `page.unroute` og klik på "Try again" vises kortet.
    - Med `page.route('**/img/*.webp', r => r.abort())` på demo-kortet (fallback er PNG, kortbilledet er WebP) er der ingen fejltekst, og fallback-billedet (`.png`) bliver stående synligt.
    - Server-HTML'en for `E2E_NO_FALLBACK_SLUG` (hentet med `request.get`) indeholder "Loading map № 0003…". Den asserter ikke på den flygtige klienttilstand.
- [ ] **Step 2: Kør testene.** Kør `npm run test:unit -- src/lib/map-stage` og `npm run test:e2e -- map-stage`. De skal fejle.
- [ ] **Step 3: Implementér `zoom.ts`, `renderer.ts` og `static-renderer.ts`.**
  - Den statiske renderer opretter `<img data-ref="map-static">` med `object-fit: cover` og venter på `decode()`. Fejler den, afviser `mount`.
  - Zoom og pan sker med CSS-transform. Pan sker med pointer events og `clampPan`.
  - Lag-knappen findes ikke for statiske kort.
- [ ] **Step 4: Udvid `MapStage.svelte`.**
  - SSR-markup er uændret fra opgave 8.
  - I `onMount` kaldes `loadRenderer(kind)` og derefter `mount` i et lag over billedet. Ved succes skjules det server-renderede billede.
  - Ved fejl beholdes billedet. Uden fallback vises fejltilstanden med "Try again".
  - Værktøjer: lodret stak øverst til højre, 36 px inde. Knapperne er hvide med 1 px ink-ramme, og hover og aktiv giver ink-baggrund med hvidt ikon. Ikonerne er stregikoner på 24 px.
  - Fuld skærm bruger `requestFullscreen()` på scenen.
  - `destroy()` kaldes i cleanup.
- [ ] **Step 5: Kør testene.** Kør `npm run test:unit` og `npm run test:e2e`: alt PASS.
- [ ] **Step 6: Commit:** `Kortscene: renderer-interface, statisk renderer med zoom, fuld skærm og fejltilstand`

---

### Task 10: Admin-login og admin-skal

**Files:**
- Copy and adapt from quizme:
  - `src/lib/server/admin-session.ts`, `google-oauth.ts`, `admin-users.ts`, `admin.ts`, `login-errors.ts` og deres `*.test.ts`
  - `src/lib/admin-hint.ts`
  - `src/hooks.server.ts`
  - `src/routes/admin/+layout.server.ts`, `+layout.svelte`, `+page.server.ts`, `+page.svelte`
  - `src/routes/admin/login/**` (siden, `google`, `google/callback`, `handoff`)
  - `src/routes/api/admin/logout/+server.ts`
  - `tests/e2e/admin-auth.ts`
- Create: `src/lib/server/admin-maps.ts`, `tests/e2e/admin.spec.ts`
- Modify: `src/app.d.ts` (`Locals.admin: AdminIdentity | null`)
- Test: de kopierede unit-tests, `src/lib/server/admin-maps.test.ts` og `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `Db`, `adminUsers`, `AppError` og `handle`.
- Produces:
  - `authenticateAdmin(cookies, authorization, loadDb, now?)`, `isProtectedApiPath(path)` og `isCronAuthorized(authorization: string | null): boolean` (bruges i opgave 11).
  - `type AdminRole = 'owner' | 'helper'`.
  - Cookie-navnene `mapfact_admin`, `mapfact_admin_hint` og `mapfact_oauth`.
  - `listAdminMaps(db): Promise<{ id; no: number | null; slug; title; status; category: string; updatedAt: Date }[]>`, sorteret med nyeste `updated_at` først.

Tilpasninger ved kopieringen:
- `QuizError` bliver `AppError`.
- Fjern rollen `creator`, `CREATOR_TOKEN_LOGIN`, `QUIZ_CREATOR_API_TOKEN`, `isCreatorRequest`, `setLoginNext` og `takeLoginNext` (efter login går man altid til `/admin`). Fjern også csrf-tjekket i hooks og `withAiScope`.
- `isAllowedReturnOrigin` tillader `https://mapfact.com`, `https://www.mapfact.com`, origins der matcher `^https://mapfact-[a-z0-9-]+-mindbardks-projects\.vercel\.app$` og `http://127.0.0.1:5173`. Opdatér testene tilsvarende.
- `hooks.server.ts` beholder kun trin 2 og 4 fra quizme (admin-autentificering, 401/403 på `/api/admin/*`). Purge-trinnet kommer i fase 2.
- Admin-layoutet indlæser ingen quiz-tællere. Menuen har kun "Maps". Login-siden har titlen "Mapfact admin".

- [ ] **Step 1: Kopiér modulerne og deres unit-tests og tilpas dem som beskrevet.** Kør `npm run test:unit`. Testene af `isAllowedReturnOrigin` skal fejle, indtil listen er rettet. Ret den, og kør igen: PASS.
- [ ] **Step 2: Skriv `admin-maps.test.ts`.** Med seed-data giver `listAdminMaps` alle kort inklusive kladder, nyeste først, med kategorinavn. Kør testen: den fejler. Implementér `listAdminMaps`, og kør igen: PASS.
- [ ] **Step 3: Skriv `admin.spec.ts`.**
  - `/admin` uden cookie giver redirect til `/admin/login`, og siden viser "Mapfact admin".
  - Med `adminCookie` (cookien `mapfact_admin`) viser `/admin` en tabel med demo-kortet og kladden "draft-map" med status "draft".
  - `POST /api/admin/logout` fjerner cookien, og `/admin` går igen til login.
  - `GET /api/admin/anything` uden auth giver 401 JSON.
  - `/admin` og login-siden har ikke headeren `vercel-cache-tag`.
- [ ] **Step 4: Kopiér og tilpas routes og layout.** Kør `npm run test:e2e`: PASS. Kør `npm run check`.
- [ ] **Step 5: Commit:** `Admin: Google-login, HMAC-session og kortliste`

---

### Task 11: Keepalive-cron, Supabase og Vercel-preview

**Files:**
- Create: `src/routes/api/cron/keepalive/+server.ts`, `tests/e2e/cron.spec.ts`
- Modify: `vercel.json` (`/api/cron/*` ligger uden for `/api/admin`, så hooks skal ikke ændres)

**Interfaces:**
- Consumes: `isCronAuthorized` og `getDb`.

- [ ] **Step 1: Skriv `cron.spec.ts`.** `GET /api/cron/keepalive` uden header giver 401. Med `Authorization: Bearer e2e-cron-secret` giver den 200 og `{ ok: true }`. Kør testen: den fejler.
- [ ] **Step 2: Implementér routen.** Den kalder `isCronAuthorized` og afviser med 401, ellers kører den ``(await getDb()).execute(sql`select 1`)`` og returnerer `json({ ok: true })` med `cache-control: no-store`. Tilføj `"crons": [{ "path": "/api/cron/keepalive", "schedule": "0 6 * * *" }]` til `vercel.json`. Kør `npm run test:e2e -- cron`: PASS.
- [ ] **Step 3: Commit:** `Drift: dagligt keepalive-ping til databasen`
- [ ] **Step 4: Opsætning hos tjenesterne (Jesper, med hjælp; kræver login og hemmeligheder).**
  - Opret Supabase-projektet "mapfact" i region eu-central-1 (Frankfurt) på free-planen. Notér transaction pooler-URL (port 6543) og session pooler-URL (port 5432).
  - Tilføj `https://<preview-origin>/admin/login/google/callback` til et Google OAuth-klient-id. quizmes klient kan genbruges, hvis den har plads til flere redirect-URI'er.
  - `vercel link` til teamet "mindbardk's projects" med projektnavnet `mapfact`. Forbind GitHub-repoet `mindbardk/mapfact`.
  - Sæt env-variabler for Preview og Production med `vercel env add`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET` (`openssl rand -hex 32`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_OWNER_EMAILS`, `ADMIN_LOGIN_ORIGIN` og `CRON_SECRET`.
- [ ] **Step 5: Seed Supabase.** Kør `DATABASE_URL=<session pooler-url> npx drizzle-kit migrate` og derefter `DATABASE_URL=<session pooler-url> npm run db:seed`. Forventet: demo-kortet oprettes.
- [ ] **Step 6: Fuld verifikation.** Kør `npm run check && npm test && npm run build`. Alt skal være grønt.
- [ ] **Step 7: Push og preview.** Kør `git push -u origin main`. Brug en feature-branch, hvis Jesper foretrækker det. Vent på Vercel-builden.
- [ ] **Step 8: Verificér previewen.**
  - `/maps/serial-killers-of-the-world` giver 200. Et andet kald har `x-vercel-cache: HIT` eller `STALE`.
  - Kortet og artiklen vises.
  - `/admin` sender til login, og Google-login virker med Jespers konto.
  - `curl -H "Authorization: Bearer $CRON_SECRET" <preview>/api/cron/keepalive` giver `{"ok":true}`.
  - Tag screenshots af kortsiden (desktop og mobil) som dokumentation til Jesper.
