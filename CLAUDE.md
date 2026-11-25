# Mapfact

Engelsksproget site, hvor hver side er ét kort med en artikel under. Kort kan embeddes og købes.

- Spec: `docs/superpowers/specs/2026-11-24-mapfact-cms-design.md`. Planer: `docs/superpowers/plans/`.
- Design (bindende for tokens, mål og komponenter): "Mapfact relaunch – designoverlevering" (https://claude.ai/artifact/5TRvcUUNodqzAYLi1yR3v4) og canvasset "Mapfact relaunch" (https://claude.ai/artifact/WPkuUmPh1cpFdnxCuLfKeQ).
- Stak: SvelteKit 2, Svelte 5 runes, Tailwind 4, Drizzle (postgres-js mod Supabase, PGlite lokalt og i test), Vercel dub1 (samme AWS-region som Supabase, eu-west-1).

## Konventioner

- UI-tekst er engelsk. Kommentarer, CLAUDE.md og commits er på dansk. Commit-emner: `Område: beskrivelse`.
- Før commit: `npm run check && npm run test:unit`. Før push også `npm run test:e2e` og `npm run build`.
- Servermoduler tager `db: Db` som første parameter. Kun ruter og scripts kalder `getDb()`.
- Skemaændringer: `npm run db:generate`, commit migrationen. Data, appen ikke kan køre uden, indsættes i en migration med `ON CONFLICT DO NOTHING`.
- Postgres-forbindelsen bruger `prepare: false` (Supabase transaction pooler).
- Lokal udvikling: `cp .env.example .env`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`. PGlite er single-process: stop dev-serveren før migrate/seed.
- Offentlige sider caches på Vercels CDN (tag `public-pages`). Admin-skrivninger purger tagget.
- Hovedelementer på offentlige sider har stabile `data-ref`-attributter til tests, ikke til styling.
- Ingen PostGIS, ingen betalte korttjenester. Radius 0, ingen skygger. Alle sider skal virke ned til 360 px.
- Genstart dev-serveren, hvis nye Tailwind-klasser ikke slår igennem.
