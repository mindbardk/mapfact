# Mapfact relaunch – CMS, datamodel og korttyper

Dato: 2026-11-24 · Status: godkendt

## 1. Hvad og hvorfor

Mapfact.com relanceres som et engelsksproget indholdssite, hvor **hver side er ét kort med en artikel under**. Kortene er produktet. De skal give trafik fra søgemaskiner gennem artikel og data, og de skal kunne købes til brug på andres sites: enkeltvis eller som abonnement, med kundens sprog og design. Annoncer i højtydende Google-formater er den anden indtægt.

Det gamle site (Kirby 2 + Leaflet + Carto) er dødt og forældet. Kirby koster licens, Carto-kontiene er slettet, og data er fra 2016. Vi starter forfra med samme stak som quizme.now, så kode og vaner kan genbruges.

Design: canvas "Mapfact relaunch" (https://claude.ai/artifact/WPkuUmPh1cpFdnxCuLfKeQ) og overleveringsdokumentet "Mapfact relaunch – designoverlevering" (https://claude.ai/artifact/5TRvcUUNodqzAYLi1yR3v4). Overleveringen er den bindende spec for tokens, komponenter, annoncepladser, tilstande og SEO-krav. Dette dokument gentager den ikke, men beskriver alt det, den ikke dækker: arkitektur, datamodel, korttyper, admin, embeds og salg.

## 2. Mål, ikke-mål, anti-mål

**Mål**
- Kortside, forside, kategorisider og embed som i designet, server-renderet og hurtige (LCP er kortets fallback-billede, CLS ≈ 0).
- Kort drives af data i en database. Et kort er en konfiguration: datasæt + korttype + basiskort + farveskala. Der er ingen tegneværktøjer.
- En kortscene, der kan vise flere korttyper: SVG-kort med landehighlight, punktkort på tiles og statisk billede. Kortenes præcise funktionalitet og filtre designes i en senere runde (se 7).
- Admin hvor Jesper skriver artikler med billeder, uploader datasæt (CSV) og sætter et kort op.
- SEO fra data: datatabeller i HTML, CSV-download, JSON-LD (Article + Dataset), OG-billede pr. kort, sitemap.
- Salg: tydelige "Use this map"-CTA'er, gratis embed med mærke og backlink, betalte embeds med kundens sprog, farver og uden mærke.
- Næsten gratis drift.

**Ikke-mål (v1)**
- WYSIWYG-kortredigering, lagvalg og stylingeditor.
- Online betaling (Stripe). Køb sker som henvendelse → Jesper opretter kunden manuelt i admin.
- Flere sprog på selve sitet. Kun kortets tekster oversættes, og kun til betalte embeds.
- Kundelogin/selvbetjening.
- Brancheside, kundecases, kontaktformular og serviceafsnit (designet fravælger dem).

**Anti-mål (gør det til en fiasko, selvom det virker)**
- Kortet afhænger af databasen ved hver visning, så en DB-pause eller -grænse tager sitet ned.
- Annoncer over, i eller oven på kortet.
- Kort, der kun findes som JavaScript: søgemaskiner skal se titel, alt-tekst, artikel og datatabel i HTML'en.
- Betalte tredjepartstjenester for at vise et kort (Mapbox-nøgle, Carto osv.).

## 3. Rammer

- Stak som quizme.now: SvelteKit 2, Svelte 5 runes, Tailwind 4, Drizzle ORM, zod, sharp, d3-geo, topojson, Vitest + Playwright, PGlite i e2e, Vercel (adapter-vercel, region fra1).
- Hosting: Vercel-teamet "mindbardk's projects" (Pro, aktivt), samme team som quizme. Pro er påkrævet, fordi sitet er kommercielt (annoncer og salg).
- Jespers Neon-konto er ved loftet → databasen er **ikke** Neon.
- Repo: github.com/mindbardk/mapfact (offentligt). Lokalt: `/Users/jesper/Projekter/mapfact`. Det gamle Kirby-site ligger i `/Users/jesper/Projekter/mapfact-old` og kører videre på mindbard, indtil relanceringen.
- Domænet mapfact.com flyttes til Vercel ved lancering.
- Eksisterende egne data: `/Users/jesper/Projekter/mapfact-old/data-arkiv/` (seriemordere 357 rækker, OL-data). De bruges som første rigtige kort.

## 4. Tilgange

| | Tilgang | Fordele | Ulemper |
|---|---|---|---|
| **A (valgt)** | Vercel + Supabase Postgres, SSR med CDN-cache som quizme | Samme mønster og kode som quizme. Offentlige sider caches på CDN og rammer sjældent DB. Betalte embeds kan tjekke nøgler på serveren | Supabase free pauser efter 7 dages inaktivitet → dagligt cron-ping. 500 MB DB-grænse |
| B | Alt prerenderes statisk og uploades til mindbard | Billigst, hurtigst, ingen DB på den offentlige vej | Betalte embeds med kundetilpasning kræver en server alligevel. Hver udgivelse = build + upload. Mindbards PG 13 uden PostGIS |
| C | SvelteKit adapter-node på mindbard (cPanel) | Én server | Usikkert om cPanel kører Node. Mere drift, ingen CDN |

**Valg: A.** Min beslutning, da Jesper bad om quizmes stak (som kører på Vercel) og gav et GitHub-repo. B falder på betalte embeds, og C på drift. Supabase er valgt frem for en anden Postgres-vært, fordi den har en gratis plan med almindelig Postgres og en tabeleditor, som Jesper kan bruge til hurtige datarettelser. Gratisplanen har ingen automatisk backup, så et ugentligt `pg_dump` via GitHub Actions til en privat placering er en del af drift (bygherrens valg af mål).

## 5. Arkitektur

```
Browser ──► Vercel CDN (cache, tag "public-pages") ──► SvelteKit (fra1) ──► Supabase Postgres (eu-central-1)
                                                    │
Admin (/admin, Google-login) ── skriver ──► DB ── purge af cache-tag
Vercel cron (dagligt) ── ping ──► DB  (holder Supabase vågen)
```

- **Offentlige sider** (`/`, `/maps/<slug>`, `/category/<slug>`, `/embed/<no>`, `/data/<slug>.csv`, billeder) server-renderes og caches på Vercels CDN med `Cache-Control: s-maxage=…, stale-while-revalidate` og cache-tag. Admin-skrivninger purger tagget. Kopiér `src/lib/server/public-cache.ts` fra quizme.
- **Kortdata til klienten** leveres som en del af sidens load-data (små datasæt) eller som et cachet JSON-endpoint `/maps/<slug>/data.json` (store datasæt, f.eks. > 2.000 rækker). Grænsen er bygherrens valg.
- **DB-forbindelse**: Drizzle over `postgres` (postgres-js) mod Supabases pooler (transaction mode, `prepare: false`). PGlite i e2e som i quizme (`PGLITE_DIR`).
- **Billeder** gemmes som `bytea` i Postgres og serveres fra `/img/<id>.<ext>` med `Cache-Control: public, max-age=31536000, immutable` (quizmes mønster med covers). Min beslutning: én tjeneste mindre. Hvis DB nærmer sig 400 MB, flyttes de til Supabase Storage, og `images`-tabellen beholder metadata.
- **Ingen PostGIS.** Regioner refereres med id'er fra de genererede SVG-kort (`CTRY-NOR`, `US-TX`). Punkter er `lat`/`lon`-kolonner. Geometri, der ikke passer i de to, gemmes som GeoJSON i `jsonb`.

## 6. Datamodel

Tabeller (Drizzle-schema). `id` er `serial`/`uuid` efter bygherrens valg. Alle har `created_at`/`updated_at`.

### Indhold

**`categories`**: `slug` (unik), `name`, `sort`. Seedes med designets 11: World, Politics, Economy, Climate, Health, Crime, Science, Tech, Society, Sport, Culture.

**`maps`**: kortet og artiklen er én række (1:1). Det er siden.
| Felt | Type | Bemærkning |
|---|---|---|
| `no` | int, unik | Kortnummeret "№ 0412". Tildeles ved første udgivelse, løbende |
| `slug` | text, unik | URL `/maps/<slug>` |
| `status` | enum `draft`/`published`/`archived` | Arkiverede vises, men ikke i lister |
| `category_id` | fk | |
| `title`, `dek` | text | H1 (≤ ca. 90 tegn) og underrubrik |
| `body` | text | Artiklen som Markdown med få direktiver (se 9) |
| `kind` | enum `svg`/`points`/`static` | Korttype (se 7) |
| `basemap` | text | SVG: kort-id fra kortkataloget (`world`, `europe`, `us-states`, …). Points: tile-stil-id |
| `dataset_id` | fk null | Null for statiske kort |
| `config` | jsonb (zod-valideret) | Korttype-specifik: værdikolonne, skala, farver, trin, enhed, tooltip-felter, periodekolonne, standardperiode, visning (center/zoom/bounds), clustering |
| `legend_title` | text | |
| `projection_label`, `center_label` | text | Metadata i værktøjslinjen. `center_label` beregnes, men kan overskrives |
| `source_text`, `source_url` | text | |
| `alt_text` | text | Beskriver mønstret, ikke kun emnet |
| `static_image_id` | fk images null | Kortet selv for `kind=static` |
| `fallback_image_id` | fk images | PNG, der vises først (LCP), og som bruges som fallback ved fejl |
| `og_image_id` | fk images | 1200 × 630 |
| `tags` | text[] | |
| `seo_title`, `seo_description` | text null | Fallback til title/dek |
| `published_at`, `content_updated_at` | timestamptz | "Updated …" og `dateModified` |

**`datasets`**: genbrugelige på tværs af kort (OL-medaljer kan drive flere kort).
| Felt | Type | Bemærkning |
|---|---|---|
| `slug`, `title`, `description` | text | |
| `source_text`, `source_url`, `license` | text | Til Dataset-JSON-LD og kreditering |
| `geo_kind` | enum `region`/`point` | Hvordan rækker placeres |
| `region_set` | text null | Hvilket SVG-kort region-id'erne hører til |
| `columns` | jsonb | `[{key, label, type: number/text/url/image/date, unit?}]` |
| `has_period` | bool | Om rækkerne har en periode (tidsskyderen) |

**`dataset_rows`**
| Felt | Type | Bemærkning |
|---|---|---|
| `dataset_id` | fk | |
| `region_id` | text null | `CTRY-ITA`, `US-TX` |
| `lat`, `lon` | double null | |
| `period` | int null | År. Tidsskyderen vises kun, når datasættet har perioder |
| `name` | text | Visningsnavn (land, person, by) |
| `values` | jsonb | `{key: value}` efter `columns` |
| `geometry` | jsonb null | Kun hvis hverken region eller punkt passer |

Indeks: `(dataset_id, period)`, `(dataset_id, region_id)`.

**`images`**: `bytes` bytea, `mime`, `width`, `height`, `alt`, `caption`, `credit`. Upload via sharp (skaler til maks. 2400 px, WebP + original PNG til kort-fallbacks). Kopiér og tilpas quizmes `image-upload.ts`.

**`redirects`**: `from_path` (unik), `to_path`, `status` (301). Fyldes med gamle URL'er (`/examples/<slug>`, `/maps/<kategori>/<slug>`). Opslag i `hooks.server.ts`, når en rute giver 404.

### Salg og embeds

**`customers`**: `name`, `contact_email`, `plan` (`single`/`subscription`), `status` (`active`/`paused`/`ended`), `notes`.

**`embed_licenses`**: én nøgle pr. kunde og omfang.
| Felt | Type | Bemærkning |
|---|---|---|
| `customer_id` | fk | |
| `key` | text, unik | Ugættelig token i embed-URL'en |
| `map_id` | fk null | Null = alle kort (abonnement) |
| `allowed_domains` | text[] | Tjekkes mod `Referer`/`Sec-Fetch-Site` (blød kontrol) |
| `locale` | text null | Oversættelse, der skal vises |
| `theme` | jsonb | Farver (ink, accent, baggrund, hav), font-familie (fra en lukket liste), logo-image-id, `hide_branding` |
| `valid_until` | date null | |

**`map_translations`**: `map_id`, `locale`, og oversatte felter: `title`, `dek`, `legend_title`, `column_labels` (jsonb), `region_names` (jsonb, valgfri). Kun til embeds.

**`leads`**: henvendelser fra CTA'erne. `map_id` null, `kind` (`embed`/`licence`/`data`/`white_label`/`plans`), `name`, `email`, `organisation`, `message`, `created_at`. Giver også e-mail til Jesper (Resend eller lignende, bygherrens valg).

### Admin

**`admin_users`**: som quizme (`email`, `role`). Google-login + HMAC-cookie kopieres fra quizme (`admin-session.ts`, `google-oauth.ts`, `admin-users.ts`, `csrf.ts`).

## 7. Korttyper – ramme nu, funktionalitet senere

Kortscenen i designet er en pladsholder. Hvad hvert kort præcist kan (tooltip, tidsskyder, lag, PNG/Share-knapper og flere typer **filtrering**), designes i en separat runde, når CMS'et står. Denne version leverer kun rammen, som de senere korttyper og filtre skal sættes ind i:

- **`MapStage.svelte`**: kortscenen med designets mål, `--sea`-flade, beskæringsmærker, fuld skærm, fallback-billede og fejltilstand. Den vælger en renderer ud fra `maps.kind` og loader den dynamisk. Renderer-interfacet holdes minimalt (`mount`, `destroy`, `zoomIn/zoomOut/reset`) og udvides i kortrunden.
- **Tre renderers i en første, enkel udgave**, så hele kæden fra data til kort kan testes:
  - `svg`: quizmes SVG-basiskort med regioner farvet efter én værdikolonne i trin. `SvgMap.svelte` afledes af quizmes `MapView.svelte`.
  - `points`: MapLibre GL JS + OpenFreeMap-tiles (gratis, ingen nøgle) med punkter fra lat/lon.
  - `static`: billede.
- **Signaturforklaring, tooltip, tidsskyder og filtre** er ikke med i første omgang. Datamodellen er dog klar til dem: `maps.config` er fri jsonb bag et zod-skema, der kan udvides pr. type. `datasets.columns` kan markeres `filterable`, og `period` findes på rækkerne.

**Basiskort**: kopiér quizmes `scripts/build-maps.ts` (Natural Earth 5.1.2, us-atlas, d3-geo, topojson-simplify) og de genererede moduler `world`, `europe`, `us-states`, `germany-states`, `catalog.ts`, `types.ts`, `index.ts` og `viewport.ts`. Quiz-specifikke filer (`generate-*-questions`, `map-quiz-questions`) kopieres ikke.

**Fallback- og OG-billeder**: uploades i admin i v1. Automatisk generering (sharp-render af SVG-kort, Playwright-screenshot af punktkort) hører til kortrunden.

**Hydrering**: kortscenen server-renderes med fallback-billedet (preload, LCP). SVG-modulet eller MapLibre importeres dynamisk efter LCP og erstatter billedet. Fejler det, bliver billedet stående ("The map could not load" + "Try again" kun uden fallback).

**Tilgængelighed og SEO for data**: under kortet ligger en `<details>`/"Show as table" med datasættets rækker for den viste periode, som rigtig HTML-tabel i server-HTML'en. Ved > 500 rækker vises de første 500 og et link til CSV.

## 8. Ruter

| Rute | Indhold | Cache |
|---|---|---|
| `/` | Forside: seneste kort, "Latest maps" med kategorichips, "Most viewed this week", salgsboks | CDN, purge ved udgivelse |
| `/maps/<slug>` | Kortside (designets primære template) | CDN |
| `/maps/<slug>/data.json` | Kortdata til klienten (kun store datasæt) | CDN |
| `/data/<slug>.csv` | Datasæt som CSV (UTF-8 med BOM) | CDN |
| `/category/<slug>` | Forsidens gitter, filtreret. Paginering `?page=` | CDN |
| `/embed/<no>` | Embed-side (se 10). `noindex`, canonical til kortsiden | CDN, varierer på `key` |
| `/plans` | Planer og priser med CTA'er → lead-formular. Ikke tegnet; bygges med designets komponenter | CDN |
| `/img/<id>.<ext>` | Billeder | immutable |
| `/sitemap.xml`, `/robots.txt` | | CDN |
| `/admin/**` | Admin | ingen cache |
| `/api/cron/keepalive` | Dagligt DB-ping (vercel.json cron) | – |

"Most viewed this week" kræver visningstal. Min beslutning: Cloudflare Web Analytics som i quizme (`cloudflare-analytics.ts`, `traffic-sync.ts`). mapfact.com har allerede DNS hos Cloudflare, og scriptet sætter ingen cookies, så det kræver ikke samtykke. En daglig cron gemmer tallene i en `map_views_daily`-tabel (`map_id`, `date`, `views`), og brug dem også i admin. Indtil der er data, sorteres listen efter nyeste.

Gamle URL'er (`/examples/<slug>`, `/maps/<kategori>/<slug>`) går via `redirects`. Hvor der ikke findes et nyt kort, går de til forsiden med 301.

## 9. Admin

Kopiér quizmes admin-skal (layout, login, brugere) og byg disse sider:

1. **Kort** (liste + redigering): metadata, kategori, korttype, basiskort, datasæt, `config`-felter som almindelige formularfelter (vælg kolonne, skala, farvetrin fra forudindstillede skalaer som "heat", "blues", "diverging"), live-forhåndsvisning af kortscenen, upload af fallback/OG/statisk billede, udgiv/afpublicér. Kortnummer tildeles ved første udgivelse.
2. **Artikel**: Markdown-editor (textarea + forhåndsvisning side om side) med billedupload, der indsætter `![alt](/img/<id>.webp "caption")`. Direktiver til designets byggeklodser:
   - `:::factbox Titel` … `:::` → faktaboks
   - `> citat` + `— kilde` → designets citat
   - billede med titel → figur med beskæringsmærker og "№ 0412-B"-suffiks (tildelt i rækkefølge)
   - annonce-pladsen indsættes automatisk efter ca. en tredjedel af afsnittene (desktop) og efter andet afsnit (mobil). Der er intet direktiv til den
   Min beslutning: Markdown frem for en WYSIWYG-editor, fordi det er hurtigt at bygge, giver ren HTML og passer til, at Jesper og Claude skriver tekster sammen.
3. **Datasæt**: upload CSV → kolonnetyper gættes og kan rettes → geokobling: vælg kolonne med landenavn/ISO-kode/region-id (matches mod basiskortets regionsnavne og ISO A3; umatchede rækker vises til manuel rettelse) eller lat/lon-kolonner → valgfri periodekolonne. Gen-upload erstatter rækkerne. Rækker kan rettes enkeltvis.
4. **Kunder og licenser**: opret kunde, opret embed-licens (kort eller alle, domæner, sprog, tema, udløb), kopiér embed-kode. Oversættelser af et kort redigeres under kortet.
5. **Henvendelser**: liste over leads.
6. **Trafik**: visninger pr. kort (fra `map_views_daily`).

Hver skrivning purger CDN-tagget.

## 10. Embeds og salg

- **Gratis embed** (alle kort): `<iframe src="https://mapfact.com/embed/<no>">`. Viser kortscenen med signaturforklaring, kildelinje og et fast "mapfact"-mærke, der linker til kortsiden (backlink → SEO). Ingen annoncer. Ingen artikel.
- **Betalt embed**: `…/embed/<no>?key=<key>`. Serveren slår licensen op. Gyldig → kundens tema (CSS-variabler på embed-roden), oversatte tekster (`map_translations` for `locale`, fallback engelsk) og intet mærke, hvis `hide_branding`. Ugyldig/udløbet → gratis version (aldrig en fejlside på kundens site).
- Embed-siden sender en `postMessage` med sin højde, og et lille valgfrit script (`/embed.js`) gør iframen responsiv.
- Bekræftet af Jesper: gratis embed med kreditering. Salget ligger i tilpasning (sprog, design, intet mærke), licens til billedet, data/API og white label.
- **CTA'er** fra designet ("Use this map"-blokken, "Maps for your site" i headeren, salgsboksen på forsiden) fører til en lead-formular (modal eller `/plans#contact`), der gemmer en `leads`-række og sender en e-mail. Priser vises som `[PRICE]`, indtil forretningsplanen er klar, og ligger i én konfigurationsfil.
- **Licensbillede** (PNG/SVG i høj opløsning) leveres manuelt efter henvendelse i v1.
- **API** er ikke med i v1. CSV-download er gratis.

## 11. Annoncer

Følg designets annonceplan (otte pladser, fast højde, lazy load, ingen annoncer i/over kortet eller i fuld skærm). Implementering:
- `AdSlot.svelte` med format-prop, reserveret `min-height`, label "ADVERTISEMENT", lazy load med IntersectionObserver og collapse uden layout-hop, hvis pladsen forbliver tom.
- Google AdSense med manuelle pladser (ingen Auto ads) og Googles egen CMP ("Privacy & messaging") til samtykke. Min beslutning: AdSense først, Ad Manager senere, hvis trafikken kræver det.
- Annoncescriptet indlæses først efter LCP. Embeds og admin har aldrig annoncer.
- Annonce-id'er ligger i miljøvariabler. Uden dem vises de grå pladsholdere i dev.

## 12. SEO

Som designoverleveringen beskriver. Derudover:
- `sitemap.xml` med alle udgivne kort og kategorier, `lastmod` = `content_updated_at`.
- JSON-LD `Article` (image = OG-PNG) og `Dataset` (name, description, license, creator, distribution = CSV-URL, spatialCoverage) pr. kort.
- Datatabel i HTML (se 7) og CSV-download.
- Canonical på alle sider. Embeds er `noindex`.
- Kategorisider har en kort intro-tekst (redigerbar i `categories`), så de ikke er tynde.

## 13. Genbrug fra quizme.now

Kopieres og tilpasses (ingen delt pakke; min beslutning, da projekterne skal kunne udvikle sig hver for sig):

| Fra quizme | Til mapfact |
|---|---|
| `src/lib/maps/{types,index,catalog,viewport}.ts` + genererede kortmoduler + `scripts/build-maps.ts` | Basiskort til SVG-kort |
| `src/lib/components/MapView.svelte`, `MapZoomControls.svelte` | Grundlag for `SvgMap.svelte` (fyld pr. region i stedet for én highlight) |
| `src/lib/server/image-upload.ts`, cover-serveringen | Billedupload og `/img/<id>` |
| `admin-session.ts`, `google-oauth.ts`, `admin-users.ts`, `csrf.ts`, admin-layout | Admin-login |
| `public-cache.ts` | CDN-cache + purge |
| `sitemap.ts`, `src/routes/robots.txt` | SEO |
| `src/routes/embed/*` | Mønster for embed-siden |
| `cloudflare-analytics.ts`, `traffic-sync.ts` | "Most viewed" og trafik i admin |
| DB-opsætning med PGlite til e2e, Playwright-config | Test |
| `vercel.json` (fra1, crons) | Drift |

Byttes ud: `@neondatabase/serverless` → `postgres` (postgres-js) + `drizzle-orm/postgres-js`.

## 14. Første indhold

Importer fra `/Users/jesper/Projekter/mapfact-old/data-arkiv/` som de første datasæt og kort (artikler skrives på ny):
- `seriemordere/serialkillers.csv` → punktkort "Serial killers of the world".
- `sport/olympicmedals_pr_land.csv` → SVG-kort på `world`. Data bruger IOC-koder og historiske lande (Sovjetunionen, Østtyskland, Tjekkoslovakiet, Australasia, "Mixed team"): de vises i datatabellen, men ikke på kortet.
- `sport/olympicgold_*.csv` → punktkort.

Et seed-script (`npm run db:seed`) opretter kategorier, en admin-bruger og disse datasæt, så dev og e2e har rigtige data.

## 15. Rækkefølge

Hver fase ender med noget, der kører på en Vercel-preview.

1. **Skelet**: SvelteKit + Tailwind med designets tokens og fonte, Drizzle + Supabase + PGlite-test, layout (header, footer), kortside med statisk kort og Markdown-artikel fra seed-data, admin-login.
2. **Data og SVG-kort**: CSV-import med geokobling og importrapport i admin, basiskort kopieret, enkel `SvgMap`, datatabel og CSV-download.
3. **Punktkort**: enkel MapLibre + OpenFreeMap-renderer.
4. **Forside, kategorisider, SEO**: sitemap, JSON-LD, OG, redirects, CSV-download, keepalive-cron.
5. **Embeds og salg**: `/embed/<no>`, kunder, licenser, oversættelser, leads, `/plans`.
6. **Annoncer**: `AdSlot`, AdSense, CMP.
7. **Kortrunden** (eget design): signaturforklaring, tooltip, tidsskyder, filtre, PNG/Share, automatiske fallback-/OG-billeder.
8. **Lancering**: domæne til Vercel, redirects fra gamle URL'er, det gamle site arkiveres.

## 16. Overladt til bygherren

Beslutninger, jeg har truffet (kan ændres):
- **Logik i servermoduler, ikke i formularer.** CSV-import, geokobling, config-validering og udgivelse ligger i `src/lib/server/*`, så de også kan kaldes fra scripts. v1 har et CLI-script (`npm run map:create`) som quizmes `create-quiz.ts`, så Claude kan oprette kort fra kode. MCP-adgang som i quizme kommer senere.
- **Rodede data**: importen kobler på landenavn, ISO A3 og IOC-kode. Rækker uden match og ugyldige koordinater (f.eks. lat 694 i seriemorderdata) gemmes, men vises ikke på kortet, og importrapporten viser dem. Perioder som "1977 to 1993" gemmes som tekst. Den første indholdsrunde har ingen tidsskyder.

Bygherrens egne valg:

- Præcis cache-levetid og grænsen for, hvornår kortdata går i et separat JSON-endpoint.
- Markdown-bibliotek (markdown-it eller marked) og direktivsyntaks i detaljer.
- E-mailtjeneste til leads.
- Hvilke forudindstillede farveskalaer der følger med (mindst "heat" fra designet, en blå sekventiel og en divergerende; alle skal kunne skelnes på lysstyrke).
- Tests: Vitest for config-validering, skalaer, CSV-import og licensopslag. Playwright for kortsiden (tre korttyper), embed med og uden nøgle og admin-flowet.

## 17. Åbne punkter (Jespers)

- Priser (`[PRICE]`) og vilkår for gratis embed (må det bruges kommercielt?).
- Design af `/plans`, kategoriside, søgning og arkiv er ikke tegnet. Kategoriside og `/plans` bygges med eksisterende komponenter. Søgning er ikke med i v1.
