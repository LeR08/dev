# Tally

A personal alcohol tracking app. Log what you drink, see what that adds up to over time,
and keep every byte of it on your own device.

Built as a personal test build: free, offline, no account, no ads, no analytics. Currently
**v1.3**, still explicitly in test mode — see [Open items](#open-items-before-any-public-release)
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
- **Charts that stay calm.** Intake and spending by day, week, month or year; a category
  breakdown; a calendar of drinking and alcohol-free days; comparisons against the equivalent
  previous window, including hour-by-hour for today.
- **Alcohol-free streaks**, counted forwards and celebrated. Nothing in the app is coloured
  red, and no copy tells you a number is too high.
- **A quick local sign-in on first launch** (name, optional email — never sent anywhere, just
  how the app greets you) followed straight by the profile screen (sex, age, weight, height,
  spending baseline, why you're using the app), so the whole "who are you" ask happens once,
  at the start, rather than being spread across the app. Every field but "why" can be left
  blank, and all of it is editable any time in Settings → Profile.
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
- **Eight languages** — the EU's major languages (French, Spanish, German, Italian,
  Portuguese) plus English, Chinese and Arabic — genuinely translated (not machine-filled
  placeholders) and switchable independent of your phone's own language, from a pill/card
  picker in Settings and a quick-access globe chip on the Today screen (see
  [Localization](#localization) below).
- **Full history**, searchable and filterable by date range, category or text, with editing
  and deletion of any past entry.
- **Optional personal goals** that draw a dashed line on a chart and do nothing else.
- **Export** to CSV or JSON whenever you want a backup.
- **Light, dark, or system theme**, with five accent colours.
- **Small entrance animations** (fade + slight rise, staggered per card) on the screens that
  benefit most from them — Today, Insights, History's filter bar, Settings, Help, the
  language picker and onboarding — kept subtle and skippable-by-not-noticing rather than
  showy.

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
  onboarding.tsx          First run: local sign-in → profile → done

src/
  domain/               Pure logic: alcohol maths, BAC, savings, dates, stats, search, profile
  db/                   Storage: the Store contract, SQLite and web implementations
  data/
    catalog.json          The bundled drink catalog
    legal/content.ts       CGU / mentions légales / privacy policy text (en, fr)
    resources/             Help-screen contacts, one JSON file per country
    harm-reduction/        Harm-reduction explainer copy (en, fr)
  i18n/                  8 translation catalogs, provider, device-locale + currency detection
  state/                 App-wide data provider
  theme/                 Palette, theme, provider
  components/            UI kit, charts, entry rows, profile fields, BAC card, FadeInView
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

**"Sign in" is a greeting, not an account system.** The first-run flow now opens with a name
(and optional email) step before the profile screen — this reads like a sign-in, which is
what was asked for a test build, but nothing is created, verified, or sent anywhere. The
name/email are just two more fields on the same local-only `Profile` row, and skipping them
entirely leaves the app exactly as anonymous as before. If a real account system is ever
wanted, this screen is where it would plug in — right now it deliberately does nothing more
than it says on the tin.

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

- **Eight languages, genuinely translated**: English, French, Spanish, German, Italian,
  Portuguese, Chinese (Simplified) and Arabic. The v1.2 release shipped Spanish/German/
  Italian/Portuguese as English placeholders marked "Beta" — those have all been rewritten
  as real translations, and the "Beta" labelling is gone. Chinese and Arabic are new in this
  pass. `src/i18n/__tests__/i18n.test.ts` asserts the exact eight-language set and spot-checks
  that every non-English catalog actually differs from English on a representative sample of
  keys, so a future accidental placeholder would fail the test suite rather than ship quietly.
- **What's translated**: the tab bar, onboarding/sign-in, the profile screen, Today's home
  screen (including the encouragement copy in `src/domain/encouragement.ts`, which used to be
  hardcoded English regardless of language — a real bug fixed in this pass), Insights' Day/
  Week/Month/Year picker and the new Day-view labels, savings, Help & resources, tickets, and
  legal documents.
- **Screens that still predate this pass** (History's list/section copy, Insights' chart
  captions and comparison text, the drink picker, most of Settings' v1.1 rows) remain
  English-only. That's the same disclosed scope boundary as v1.2: translating the remaining
  ~20 files is a mechanical retrofit, not a design decision, and deserves its own pass rather
  than being rushed in alongside everything else here.
- **Language picker**: a card grid in Settings → Language, plus a small globe pill
  (`src/components/ui/LanguagePill.tsx`) in the Today screen's header for a one-tap switch
  without leaving the home screen.
- **Why these eight**: European languages plus Chinese and Arabic, as asked — not "every
  language Tally could plausibly support," which would have meant either machine-translating
  (reintroducing the exact placeholder problem being fixed) or fabricating help-resource
  contacts for countries nobody verified. Scoping to eight kept every string and every
  helpline number genuinely checked.
- **Arabic is right-to-left at the text level only.** React Native shapes and lays out Arabic
  text correctly on its own (`src/i18n/index.ts` exports `isRtl()`), but this pass did not
  mirror screen layouts (icon positions, tab order, card alignment) for RTL — that is a much
  larger, cross-cutting change than a translation pass, and is called out here rather than
  silently shipped as "RTL support."
- **Pluralization is deliberately simplified** to an English-style one/other split
  (`xxxOne`/`xxxOther` keys) across all eight languages, not full CLDR plural categories.
  This under-serves Arabic in particular, which has six grammatical plural forms — a known,
  disclosed simplification rather than an oversight.
- On first launch, language, the Help tab's country, and now currency all default from the
  device's own locale when it's one Tally recognises, else fall back to English / general /
  EUR (`src/i18n/detectLocale.ts`). All three stay changeable any time in Settings.

## Privacy

There is no server, no account and no telemetry. Data lives in a local database on the
device, and the only way anything leaves it is the export button — which you press. Settings
→ Data & privacy has a "delete all my data" option that wipes entries, custom drinks, your
profile, your tickets and settings, then restores the built-in catalog and returns you to
onboarding.

## Tests

191 tests over the parts where a bug would quietly corrupt your history or your trust in a
number: alcohol maths, the BAC formula, savings, local date handling across DST (now including
hour-granularity buckets for the daily statistics view), aggregation and streaks, search and
filtering, the CSV/JSON export format, locale + currency detection, translation catalog parity
and non-placeholder checks across all eight languages, and the full storage contract (SQLite
and web, including the profile schema's `name`/`email` migration).

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
  couldn't verify. China, Saudi Arabia and UAE (`src/data/resources/{cn,sa,ae}.json`, added
  this pass) were researched against official sources — China's National Health Commission's
  12356 line and Lifeline China's own published number; Saudi Arabia's MOH mental-health line;
  UAE's MOHAP national line and the Sakina line reported by Gulf News — written in each
  country's own language. All of them can change, and none of this is a substitute for
  checking the source directly before anyone relies on it in an emergency; the Help screen
  says so.
- **Final app name per locale, and whether to add the optional onboarding questions** from
  spec §4.3 (none of those are built — they were explicitly flagged as proposals, not
  commitments).

## Not in this version

Ads, accounts, cloud sync, push notifications, real ticket transmission (tickets are
local-only; export is the only way they leave the device), and public store submission are
all deliberately out of scope. The code is layered so they can be added later without a
rewrite: storage sits behind one interface, and the domain logic has no idea a UI exists.
