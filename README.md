# Tally

A personal alcohol tracking app. Log what you drink, see what that adds up to over time,
and keep every byte of it on your own device.

Built as a personal test build: free, offline, no account, no ads, no analytics. Currently
**v1.2**, still explicitly in test mode — see [Open items](#open-items-before-any-public-release)
before this goes anywhere near a public store listing.

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
- **A personal profile** (sex, age, weight, height, spending baseline, why you're using the
  app) collected once, editable any time, and used only to drive the two features below —
  every field but "why" can be left blank.
- **A rough blood-alcohol estimate**, shown on the home screen only while it's actually
  informative (something logged recently, sex and weight on file), always with a plain-text
  "not a measurement" disclaimer and never a colour-coded warning.
- **A savings dashboard** comparing what you say you used to spend against what you've
  actually logged — reported as a plain number either way, saved or not.
- **Help & resources**, a dedicated tab: country-specific helplines, a few harm-reduction
  approaches, and a "when it might help to talk to someone" page. Every screen there carries
  a not-a-medical-device disclaimer.
- **In-app bug/suggestion tickets** — local-only for now, exportable to CSV alongside your
  data.
- **French and English**, fully translated and switchable independent of your phone's own
  language; four more languages scaffolded (see [Localization](#localization) below).
- **Full history**, searchable and filterable by date range, category or text, with editing
  and deletion of any past entry.
- **Optional personal goals** that draw a dashed line on a chart and do nothing else.
- **Export** to CSV or JSON whenever you want a backup.
- **Light, dark, or system theme**, with five accent colours.

## Running it

```bash
npm install
npm start          # Expo dev server — scan the QR code with Expo Go
npm run web        # run it in a browser as a PWA
npm test           # unit tests
npm run typecheck  # TypeScript
```

This is an **Expo SDK 57** project, so `npm start` needs **Expo Go 57.x** on the phone.
An older Expo Go answers with *"Project is incompatible with this version of Expo Go"* —
update it from the store, or grab the matching build directly from
<https://expo.dev/go?sdkVersion=57&platform=android&device=true>.

To install it as a real standalone app, with no Expo Go in the picture, build with EAS:

```bash
npx eas build --profile preview --platform android   # or ios
```

## How it is put together

```
app/                    Screens and routing (expo-router, file-based)
  (tabs)/               Today, History, Insights, Help, Settings
  log/                  Drink picker → details → confirm
  entry/[id]            Edit or delete a logged entry
  drinks/               Custom drink presets
  settings/             Units, goals, appearance, profile, language, legal, tickets, data
  savings.tsx            Savings deep-dive
  onboarding.tsx          First run, including the profile steps

src/
  domain/               Pure logic: alcohol maths, BAC, savings, dates, stats, search, profile
  db/                   Storage: the Store contract, SQLite and web implementations
  data/
    catalog.json          The bundled drink catalog
    legal/content.ts       CGU / mentions légales / privacy policy text (en, fr)
    resources/             Help-screen contacts, one JSON file per country
    harm-reduction/        Harm-reduction explainer copy (en, fr)
  i18n/                  Translation catalogs, provider, device-locale detection
  state/                 App-wide data provider
  theme/                 Palette, theme, provider
  components/            UI kit, charts, entry rows, profile fields, BAC card
  export/                CSV/JSON backup and sharing
```

### Decisions worth knowing about

**The maths lives outside the database.** `src/db` only stores and retrieves rows, narrowing
by date range — the one query an index helps with. Every total, bucket, streak, BAC estimate
and savings figure is a pure function in `src/domain`. That keeps the numbers testable without
a database, and means the two storage backends can never disagree about what your week
looked like.

**Entries carry a snapshot of the drink.** A logged entry stores its own name, category, ABV
and volume rather than pointing at a preset. Editing a drink preset — or deleting it — never
rewrites history.

**Storage is chosen per platform.** On iOS and Android it is SQLite (`expo-sqlite`, WAL mode,
transactional writes). In a browser it is a `localStorage`-backed store, because
`expo-sqlite`'s WASM build needs cross-origin isolation headers a static PWA host does not
set. Metro picks `src/db/index.ts` or `src/db/index.web.ts`; both satisfy the same `Store`
interface, and nothing above that layer knows which one is running. v1.2 added `Profile` and
`Ticket` to that same contract, so both backends implement them identically.

**The profile is local-only, on purpose.** Per the v1.2 spec, the profile is *identified* data
by product decision — it's treated as belonging to a real person, not anonymised — but it
still never leaves the device: no account, no server, no sync. A future account/sync system
(out of scope here) is expected to reuse the same `Profile` shape.

**The BAC estimate is the plain textbook Widmark formula** (sex + weight, standard `r` factors,
a flat elimination rate) — not an age-adjusted refinement. The more accurate age-aware formulas
need height too, and the spec explicitly keeps height out of the BAC calculation (stats only),
so extending the formula would have meant inventing an unverified constant. Better to under-promise
here than to fabricate false precision in a health-adjacent number. See `src/domain/bac.ts`.

**Currency, language and help-region live only in Settings.** The v1.2 spec's data model
lists `language`/`country`/`currency` on both `Profile` and a separate `SettingsExtras`
entity. They're kept in `Settings` alone instead — currency already lived there before v1.2 —
to avoid two copies of the same value that could quietly drift apart.

## Localization

- **French and English** are complete: every string introduced by v1.2 (profile, savings,
  help, tickets, legal, onboarding's persistent buttons, and the tab bar) is translated
  in both.
- **Spanish, German, Italian, Portuguese** are scaffolded — the translation keys exist and
  currently hold English text, and the language picker marks them "Beta" until someone
  translates them for real.
- **Screens that predate v1.2** (Today, History, Insights body copy, the drink picker, most
  of Settings' existing v1.1 rows) are still English-only. Translating those was out of scope
  for this pass — it's a mechanical retrofit across ~30 files, not a design decision, and
  doing it well deserves its own pass rather than being rushed alongside everything else in
  v1.2. What *is* translated is anything that would otherwise sit awkwardly next to newly
  translated content — the persistent tab bar and the onboarding flow's Continue/Skip
  buttons — so a French user never sees an obviously half-translated screen.
- On first launch, language and the Help tab's country default to the device's own locale
  when it's one Tally recognises, else fall back to English / general (`src/i18n/detectLocale.ts`).
  Both are changeable any time in Settings.

## Privacy

There is no server, no account and no telemetry. Data lives in a local database on the
device, and the only way anything leaves it is the export button — which you press. Settings
→ Data & privacy has a "delete all my data" option that wipes entries, custom drinks, your
profile, your tickets and settings, then restores the built-in catalog and returns you to
onboarding.

## Tests

167 tests over the parts where a bug would quietly corrupt your history or your trust in a
number: alcohol maths, the BAC formula, savings, local date handling across DST, aggregation
and streaks, search and filtering, the CSV/JSON export format, locale detection, translation
catalog parity across all six languages, and the full storage contract (SQLite and web).

```bash
npm test
```

## Open items before any public release

Carried over verbatim from the v1.2 spec — these are flagged there as needing a human, not
something this codebase can resolve on its own:

- **Clinical review.** The BAC formula and the harm-reduction / "when to seek help" content
  (`src/domain/bac.ts`, `src/data/harm-reduction/`) should be reviewed by a qualified
  addictologist or physician before anyone but you relies on them.
- **Legal review.** The Terms of Service, Legal Notice and Privacy Policy
  (`src/data/legal/content.ts`) are editable placeholder templates with `[bracketed]` fields
  for you to fill in — not reviewed by a lawyer, and jurisdiction-specific requirements aren't
  covered.
- **Verify the helpline contacts.** France's numbers came from the spec's own draft table;
  the US/UK ones are ones I'm confident are currently accurate; Canada intentionally points
  to "search for the current number" rather than asserting a specific text shortcode I
  couldn't verify. All of them can change — verify before anyone relies on them, and the Help
  screen says so.
- **Final app name per locale, and whether to add the optional onboarding questions** from
  spec §4.3 (none of those are built — they were explicitly flagged as proposals, not
  commitments).

## Not in this version

Ads, accounts, cloud sync, push notifications, real ticket transmission (tickets are
local-only; export is the only way they leave the device), and public store submission are
all deliberately out of scope. The code is layered so they can be added later without a
rewrite: storage sits behind one interface, and the domain logic has no idea a UI exists.
