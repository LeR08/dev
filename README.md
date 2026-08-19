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
* **The venues' own websites** supply social accounts, and answer whether the site is still up.
* **A third-party directory** fills what is still missing — chiefly phone numbers and the name a
  venue trades under, which the register often does not carry.
* Unmatched OSM records land in `data/pending-venues.json` for human review; they are never
  published automatically.
* Manual corrections go in `data/overrides.json`. See below.

The nightly GitHub Action refreshes the snapshot and commits it. A run whose row count moves more
than 25% aborts and keeps the previous data, so a broken upstream response can never empty the
directory.

### Source precedence, and crediting it

A field is written by the highest-precedence source that has it, and never
overwritten by a lower one. The order is: manual correction, then the city, then
OpenStreetMap, then the venue's own website, then the third-party directory.

Every venue carries a `sources` map recording which source each field came from,
and a page that shows a field taken from somebody else says so beside the value
rather than burying it in a footer. Only facts are taken from the third-party
directory — never its written descriptions, which are promotional copy about
products, and never its images.

> Attribution is not the whole legal question. The Dutch *Databankenwet* protects
> substantial extraction from a database regardless of credit. Individual facts
> are not protected and this takes a small subset of one city, but have the
> lawyer confirm it along with L1, L2 and the review feature.

### Correcting something by hand

`data/overrides.json` is the escape hatch, and it outranks every source. Copy
`data/overrides.example.json` over it and edit. Key each entry by the venue's
`amsterdam_id` or by its `slug` — both resolve — and name the fields exactly as
they appear in `data/venues.json`:

```json
{
  "the-bulldog": {
    "phone": "+31 20 625 6278",
    "aliases": ["The Bulldog Ex-Policestation"]
  }
}
```

A field named here is *pinned*. Every automated pass skips it: the licence
import, the OpenStreetMap merge, the directory fill, the socials read. The venue
page credits it as a manual correction rather than to a source that did not
supply it. Nothing you write here is ever silently replaced, which is the point
— it is the one place where your judgement beats the pipeline's.

Pass `override_fields` only to pin a field to the value it already has.

### The licence end date is a renewal calendar

152 of 158 coffeeshop licences end on the first of a month, and no licence in the
dataset has been expired for more than four months. A lapsed date with the status
still `Verleend` means a renewal the city has not published yet, not a closure —
filtering it out deletes operating venues. A granted licence therefore stays live
for `RENEWAL_GRACE_DAYS` (180) past its end date, flagged in the UI; beyond that
it becomes `closed`.

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
