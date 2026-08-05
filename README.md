# Tally

A personal alcohol tracking app. Log what you drink, see what that adds up to over time,
and keep every byte of it on your own device.

Built for one person's own use: free, offline, no account, no ads, no analytics.

## What it does

- **Log a drink in one tap.** The home screen keeps your usual drinks one tap away and logs
  them instantly, with an Undo. Anything else takes three taps: *Log a drink → pick it →
  Add to log*.
- **A catalog of 115 drinks** across beers, wines, spirits, cocktails, ciders, aperitifs and
  liqueurs, each with a sensible default strength and serving size. Search understands
  aliases and accents, so `demi`, `pinte` and `rose` all find what you mean.
- **Your own presets.** Add custom drinks (name, ABV, default volume, default price) and
  reuse them; they sort to the top of the picker.
- **Charts that stay calm.** Intake and spending over a week, a month or a year; a category
  breakdown; a calendar of drinking and alcohol-free days; week-on-week comparisons.
- **Alcohol-free streaks**, counted forwards and celebrated. Nothing in the app is coloured
  red, and no copy tells you a number is too high.
- **Full history**, searchable and filterable by date range, category or text, with editing
  and deletion of any past entry.
- **Optional personal goals** that draw a dashed line on a chart and do nothing else.
- **Export** to CSV or JSON whenever you want a backup.
- **Light and dark themes** with five accent colours.

## Running it

```bash
npm install
npm start          # Expo dev server — scan the QR code with Expo Go
npm run web        # run it in a browser as a PWA
npm test           # unit tests
npm run typecheck  # TypeScript
```

To install it on a phone as a real app, build with EAS:

```bash
npx eas build --profile preview --platform android   # or ios
```

## How it is put together

```
app/                    Screens and routing (expo-router, file-based)
  (tabs)/               Today, History, Insights, Settings
  log/                  Drink picker → details → confirm
  entry/[id]            Edit or delete a logged entry
  drinks/               Custom drink presets
  settings/             Units, goals, appearance, prices, data & privacy
  onboarding.tsx        First run

src/
  domain/               Pure logic: alcohol maths, dates, statistics, search, formatting
  db/                   Storage: the Store contract, SQLite and web implementations
  data/catalog.json     The bundled drink catalog
  state/                App-wide data provider
  theme/                Palette, theme, provider
  components/           UI kit, charts, entry rows
  export/               CSV/JSON backup and sharing
```

### Three decisions worth knowing about

**The maths lives outside the database.** `src/db` only stores and retrieves rows, narrowing
by date range — the one query an index helps with. Every total, bucket, streak and average is
a pure function in `src/domain/stats.ts`. That keeps the numbers testable without a database,
and means the two storage backends can never disagree about what your week looked like.

**Entries carry a snapshot of the drink.** A logged entry stores its own name, category, ABV
and volume rather than pointing at a preset. Editing a drink preset — or deleting it — never
rewrites history.

**Storage is chosen per platform.** On iOS and Android it is SQLite (`expo-sqlite`, WAL mode,
transactional writes). In a browser it is a `localStorage`-backed store, because
`expo-sqlite`'s WASM build needs cross-origin isolation headers a static PWA host does not
set. Metro picks `src/db/index.ts` or `src/db/index.web.ts`; both satisfy the same `Store`
interface, and nothing above that layer knows which one is running.

## Privacy

There is no server, no account and no telemetry. Data lives in a local database on the
device, and the only way anything leaves it is the export button — which you press. Settings
has a "delete all my data" option that wipes entries, custom drinks and settings, then
restores the built-in catalog so the app still works.

## Tests

104 tests over the parts where a bug would quietly corrupt your history: alcohol maths, local
date handling across DST, aggregation and streaks, search and filtering, the CSV/JSON export
format, and the full storage contract.

```bash
npm test
```

## Not in this version

Ads, accounts, cloud sync, notifications and sharing are all deliberately out of scope. The
code is layered so they can be added later without a rewrite: storage sits behind one
interface, and the domain logic has no idea a UI exists.
