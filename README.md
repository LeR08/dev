# The Smoke Trail

A directory of the licensed coffeeshops in Amsterdam: where they are, when they are open, and
what the city's own licence register says about them.

It is a **venue directory, not a menu archive**. There are no products, no prices, no strains and
no promotional copy anywhere in this repository — Dutch law (Opiumwet art. 3b) prohibits
advertising cannabis, and the whole project is built around that constraint.

> **Not legal advice.** The 18+ gate, the informational tone and the review feature should be
> reviewed by a Dutch lawyer before a public launch.

## What is built

| Milestone | Scope | State |
|-----------|-------|-------|
| M0 | Repo, CI, Supabase schema | done |
| M1 | ETL: Amsterdam licence register → snapshot, with validation and tests | done |
| M2 | Map, list, search, venue and neighbourhood pages | done |
| M3 | Three-tier opening-hours engine, open-now filters | done |
| M4 | OpenStreetMap enrichment, matching, pending-venue queue | done |
| M5 | Auth, reviews, reports, admin moderation | not started |
| M6 | i18n, a11y pass, perf budget, legal review | partial (English, Dutch, German and French; SEO, JSON-LD, 18+ gate, a11y done — legal review outstanding) |

## Running it

```bash
npm install
npm run dev          # http://localhost:3000 — redirects to /en
npm test             # unit + integration
npm run e2e          # Playwright, builds and serves first
npm run etl          # refresh data/venues.json from the live sources
npm run etl:dry      # same, without writing anything
```

No API keys and no database are needed to run the site. Copy `.env.example` to `.env.local` if you
want to point it at a Supabase project.

## How the data flows

```
Gemeente Amsterdam WFS ─┐
                        ├─→ match (§5.6) ─→ data/venues.json ─→ Next.js ISR pages
OpenStreetMap/Overpass ─┘                        ▲
                                                 └── committed to git, so the site
                                                     builds and serves with no database
```

* **Amsterdam** decides which venues exist, their official name, address and licence status.
* **OpenStreetMap** supplies websites, phone numbers, amenities and real opening hours.
* Unmatched OSM records land in `data/pending-venues.json` for human review; they are never
  published automatically.
* Manual corrections go in `data/overrides.json` keyed by `amsterdam_id` or `slug`, with an
  `override_fields` list. The ETL never overwrites them.

The nightly GitHub Action refreshes the snapshot and commits it. A run whose row count moves more
than 25% aborts and keeps the previous data, so a broken upstream response can never empty the
directory.

### Opening hours

Three tiers, in descending trust — each one shown in the UI with its source:

1. `community` — a verified correction.
2. `osm` — the venue's own `opening_hours` rule.
3. `licence` — derived from the permit, shown **only** with the qualifier *"these are the hours the
   licence permits — the actual closing time may be earlier"*. A permit typically says 07:00–01:00,
   which almost no venue actually trades.

If no tier has data the answer is `Hours unknown`. That is a legitimate state and is displayed as
such; the badge never guesses.

Rules are expanded into concrete weekly intervals **by the ETL**, not in the browser. That keeps
`opening_hours.js` out of the page bundle and, because the job runs nightly, public-holiday rules
land on the right day. Evaluation is always in `Europe/Amsterdam`, never the device timezone, and
a closing time earlier than its opening time means the next day.

## Languages

English, Dutch, German and French, on locale-prefixed routes (`/nl/coffeeshop/…`),
with `hreflang` on every page and a sitemap that pairs the four. The bare paths
redirect to English.

All copy lives in `src/i18n/dictionaries/`, one file per locale. English is the
canonical shape and the others are typed against it, so a missing or renamed key
is a compile error rather than a blank on the page. Entries are plain strings
with `{placeholder}` slots — never functions, so a server component can hand a
dictionary straight to a client component.

Nothing linguistic is hard-coded: weekday names, dates, number formatting and
plural rules all come from `Intl` for the active locale. Adding a fifth language
means adding one file and one entry in `LOCALES`.

## Adding another city

`src/etl/adapters/types.ts` defines the `CityAdapter` interface; `amsterdam.ts` is the only
implementation. A new municipality is a new adapter plus an entry in the `ADAPTERS` map in
`src/etl/run.ts` — the schema already carries a `city` column. Note that not every Dutch
municipality publishes an equivalent licence dataset.

## Layout

```
src/app/          routes: / · /coffeeshop/[slug] · /neighbourhood/[slug] · /about-data · /privacy
src/components/   UI, with the map behind a lazy import so the list is usable first
src/lib/          shared types (Zod), geo maths, the hours evaluator, data access
src/etl/          adapters, sources, matching, snapshot writer
supabase/         SQL migration with RLS policies, for the M5 write path
data/             the committed snapshot the site is built from
```

## Constraints that are deliberate

* No product, price or promotional content — anywhere.
* No Google Places or TripAdvisor data: their terms forbid it and the API is paid.
* No Mapbox or Google Maps: both require billing. Tiles come from OpenFreeMap, no key.
* No ad networks, no tracking cookies, no third-party analytics.
* Your coordinates never leave your device; distances are computed in the browser.
* Closed venues are marked closed, never deleted — "is this place still open?" deserves an answer.

## Attribution

Contains data from **Gemeente Amsterdam** (CC BY 4.0) · © **OpenStreetMap** contributors (ODbL) ·
tiles by **OpenFreeMap** / OpenMapTiles. These notices are shown on the map and on `/about-data`,
as both licences require.
