# Tally

A personal alcohol tracking app. Log what you drink, see what that adds up to over time,
and keep every byte of it on your own device.

Built as a personal test build: free, offline, no account, no analytics. All logging,
history, charts and insights are free for everyone, always. A small backend (`server/`) now
exists purely to run a freemium subscription through real Stripe/PayPal checkouts — see
[Freemium, payments & ads](#freemium-payments--ads). Currently **v1.4**, still explicitly in
test mode — see [Open items](#open-items-before-any-public-release) before this goes anywhere
near a public store listing.

## What it does

- **Log a drink in one tap.** The home screen keeps your usual drinks one tap away and logs
  them instantly, with an Undo. Anything else takes three taps: *Log a drink → pick it →
  Add to log*.
- **A catalog of 115 drinks** across beers, wines, spirits, cocktails, ciders, aperitifs and
  liqueurs, each with a sensible default strength and serving size. Search understands
  aliases and accents, so `demi`, `pinte` and `rose` all find what you mean.
- **Your own presets.** Add custom drinks (name, ABV, default volume, default price) and
  reuse them; they sort to the top of the picker.
- **Charts that stay calm — and now legible.** Intake and spending by day, week, month or
  year, each with a labelled Y-axis; a category breakdown; a calendar of drinking and
  alcohol-free days; comparisons against the equivalent previous window, including
  hour-by-hour for today. The intake chart itself plots actual poured volume (centilitres,
  or your chosen unit) rather than an abstract "standard drinks" count, since a concrete
  number on the axis was asked for over an abstract one.
- **A custom start date for History's filter**, alongside the day/month/year presets — pick
  exactly which day a window starts on so early, barely-tracked days don't quietly drag an
  average down.
- **A daily goal comparison in Insights' Day view** — your weekly goal divided across 7 days,
  shown against today's own total with a small progress bar, so a weekly target has a
  same-day read on it too, not just a week-end one.
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
  approaches, a "when it might help to talk to someone" page, and a non-medical/complementary
  section (sophrology, hypnotherapy, mindfulness) that says plainly that none of them are
  medical treatments and evidence for most is limited. Every screen there carries a
  not-a-medical-device disclaimer.
- **In-app bug/suggestion tickets** — local-only for now, exportable to CSV alongside your
  data.
- **A real freemium subscription** (Settings → Subscription) — Stripe or PayPal checkout,
  opened in the system browser, backed by the minimal server in `server/`. Free stays free for
  every feature above; premium only removes the launch message and the small support banner
  described below. See [Freemium, payments & ads](#freemium-payments--ads).
- **A local admin preview** (Settings → Admin) — a one-screen dashboard of *this device's own*
  data (entry/drink/ticket counts, this device's subscription state, catalog-translation
  coverage). Still local-only; see the same section below.
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

The app itself needs nothing extra to run — subscribing is the only screen that talks to
anything external. To try that locally: `cd server && npm install && cp .env.example .env`
(see `server/README.md`), run it, and copy this repo's own `.env.example` to `.env` pointing
`EXPO_PUBLIC_BACKEND_URL` at it. The real AdMob banner (test ad unit id) only shows up inside
a dev client / EAS build — see [Freemium, payments & ads](#freemium-payments--ads) — Expo Go
can't load native ad SDKs, so it just shows nothing there.

## How it is put together

```
app/                    Screens and routing (expo-router, file-based)
  (tabs)/               Today, History, Insights, Help, Settings
  log/                  Drink picker → details → confirm
  entry/[id]            Edit or delete a logged entry
  drinks/               Custom drink presets
  settings/             Units, goals, appearance, profile, language, legal, tickets, data,
                        subscription (real Stripe/PayPal via server/), admin (local preview)
  savings.tsx            Savings deep-dive
  onboarding.tsx          First run: local sign-in → profile → done

src/
  domain/               Pure logic: alcohol maths, BAC, savings, dates, stats, search, profile,
                        subscription (device id + status helpers)
  db/                   Storage: the Store contract, SQLite and web implementations
  data/
    catalog.json          The bundled drink catalog
    legal/content.ts       CGU / mentions légales / privacy policy text (en, fr)
    resources/             Help-screen contacts, one JSON file per country
    harm-reduction/        Harm-reduction + non-medical-approaches copy (en, fr)
  i18n/                  8 translation catalogs, provider, device-locale + currency detection,
                        catalog display-name overrides, intake/category label helpers
  payments/              Client for server/'s API — checkout/approval URLs, status polling
  ads/                   AdMob test ad unit ids + banner (native only, degrades to nothing
                        elsewhere); the launch message itself lives in components/ (below)
  state/                 App-wide data provider
  theme/                 Palette, theme, provider
  components/            UI kit, charts, entry rows, profile fields, BAC card, FadeInView,
                        SupportInterstitial (the anti-addiction launch message)
  export/                CSV/JSON backup and sharing

server/                 Minimal backend: holds Stripe/PayPal secret keys, tracks subscription
                        status. See server/README.md.
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
- **What's translated**: every screen in the app — the tab bar, onboarding/sign-in, the
  profile screen, Today, History (including the "Today"/"Yesterday" section headers and the
  per-entry "N drinks" wording, which used to be hardcoded English coming from
  `formatIntake`/`formatRelativeDay` regardless of language — a real, user-reported bug fixed
  in this pass), Insights (all four Day/Week/Month/Year views, the comparison sentences
  against the previous window, the category breakdown), Settings and all of its subscreens
  (Units, Personal goals, Appearance, Default prices, Data & privacy), the drink picker, the
  log/edit-entry form, My drinks, savings, Help & resources, tickets, and legal documents.
  Currency names and drink category names (Beer, Wine, Spirit, …) are translated too, since
  they show up throughout the app. Also new this pass: the ~18 catalog entries whose name
  mixed an English serving-size word into an otherwise plain drink name — "Lager (small)",
  "Red wine (glass)" — now have a translated display name too
  (`src/i18n/catalogNames.ts`, keyed by the catalog's stable id so a future rename doesn't
  break it), since that's what was actually flagged as an ambiguity: a stray English word
  sitting inside otherwise-localized text. The other ~97 catalog entries (Absinthe, Baijiu,
  Prosecco, Mezcal, …) are international drink/spirit names already correct as-is in most of
  these languages, and are left alone rather than inventing a "translation" for a proper
  noun. A logged entry snapshots whichever name it showed at the time, same as every other
  field, so switching languages later never rewrites past entries.
- **How this was retrofitted**: a handful of domain formatting functions
  (`formatComparison`, `formatChange`, `formatRelativeDay`, `formatDateTime` in
  `src/domain/format.ts`) used to hardcode English words like "vs", "Nothing logged in the",
  "Today" — invisible to a per-screen translation pass because the English never appeared as
  a string literal in the screen itself, only inside the shared formatter. They now take
  optional translated templates/labels (defaulting to the original English so their unit
  tests keep working unchanged) and every call site passes translated ones. If a screen looks
  translated but a shared card or row under it still shows English, that's the pattern to
  check for.
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
- **Known gap: calendar dates still follow the device's system locale, not the in-app
  language.** `formatDate`/`formatLongDate`/`formatMonth`/`formatWeekdayShort` call
  `Intl.DateTimeFormat(undefined, …)`, which reads the OS locale rather than Tally's own
  language setting — so a phone set to English showing the app in French will still see
  "Wed, Aug 5" instead of "mer. 5 août" in a few places (e.g. the custom start-date picker).
  Fixing it means threading the app's `language` through every date-formatting call site, the
  same pattern already used for `formatComparison`/`formatRelativeDay` — flagged here as the
  next piece of this same class of bug rather than fixed alongside everything else in this
  pass.

## Privacy

There is no account and no telemetry. Every drink, entry, custom drink, profile field and
ticket lives in a local database on the device, and the only way any of *that* leaves it is
the export button — which you press. Settings → Data & privacy has a "delete all my data"
option that wipes entries, custom drinks, your profile, your tickets and settings, then
restores the built-in catalog and returns you to onboarding.

The one exception is the payments backend in `server/` (see
[Freemium, payments & ads](#freemium-payments--ads)): if you choose to subscribe, this
device's random subscription id and payment status are sent to it — nothing else about you.
Skip Subscription entirely and nothing changes: no server is contacted anywhere else in the
app.

## Freemium, payments & ads

Every feature described above — logging, history, charts, insights, export, everything — is
free, full-stop, for every user. The only thing a subscription changes is removing two small,
non-blocking things free users see. Nothing about tracking, insights or safety-relevant
content is ever paywalled.

**Payments.** Client apps can never safely hold a Stripe or PayPal *secret* key — anything
shipped to a phone can be extracted — so a minimal backend (`server/`) exists purely to hold
those keys and answer "is this device subscribed?". The app never talks to Stripe/PayPal
directly:

1. Settings → Subscription asks `server/` for a Stripe Checkout or PayPal approval URL and
   opens it in the system browser. This app never sees a card number.
2. Stripe/PayPal confirm payment to `server/` via webhook, which updates that device's status.
3. The app polls `server/` for status (on this screen, and whenever it returns to the
   foreground) and reflects it locally.

`server/` ships with **placeholder env vars only** — see `server/.env.example` and
`server/README.md` for how to fill in your own real Stripe/PayPal keys (test mode to start)
and deploy it. Until it's configured and running somewhere reachable, the subscribe buttons
fail with a clear "payments aren't set up yet" message rather than silently pretending to
work.

**Ads — kept deliberately narrow and on-theme.** The literal ask was Google Ads on every
launch for free users; what's built instead, to keep this ethical for an app about drinking
habits:

- **The "ad" free users actually see on launch** (`src/components/SupportInterstitial.tsx`)
  is not sourced from an ad network at all — it's a short, immediately-skippable, self-authored
  message about support and addiction resources (not only alcohol), with a direct link to
  Help & Resources. Shown at most once per app launch, only to free-tier users. Because it's
  our own copy rather than arbitrary ad-network creative, its content can actually be held to
  "anti-addiction, non-judgmental" rather than whatever an ad auction happens to serve.
- **A real AdMob banner** (`src/ads/`, Settings → Subscription) uses Google's own public
  **test** ad unit ids (`src/ads/testAdUnitIds.ts`) — no AdMob account exists yet, and these
  are the official placeholder ids meant for exactly that. It only renders on iOS/Android
  inside a build that actually links `react-native-google-mobile-ads` (a dev client or a real
  build — **not plain Expo Go**, which can't load native ad SDKs); everywhere else, including
  the web build, it quietly renders nothing rather than crashing. Swap in your own ad unit ids
  (and the `androidAppId`/`iosAppId` in `app.json`) once you create an AdMob account.

**Admin** (`app/settings/admin.tsx`) stays a read-only, local-only dashboard of *this device's
own* data — entry/drink/ticket counts, this device's subscription state, catalog-translation
coverage. It is not connected to any other device or user; there's still no multi-user backend
behind it, only the narrow payments one above.

What's still a human decision, not something this codebase can resolve on its own: actually
creating the Stripe/PayPal/AdMob accounts, switching from test to live keys, and the
business/tax registration that comes with charging real money. Flagged again under
[Open items](#open-items-before-any-public-release).

## Tests

203 tests over the parts where a bug would quietly corrupt your history or your trust in a
number: alcohol maths, the BAC formula, savings, poured-volume aggregation for the Insights
volume chart, local date handling across DST (including hour-granularity buckets for the
daily statistics view), aggregation and streaks, search and filtering, the CSV/JSON export
format (including CSV-formula-injection escaping), locale + currency detection, translation
catalog parity and non-placeholder checks across all eight languages, the translatable
comparison/relative-day templates in `src/domain/format.ts`, catalog display-name overrides,
the device-id generator and subscription status helpers, and the full storage contract
(SQLite and web, including the profile schema's `name`/`email` migration).

Server-side (`server/`) has no automated tests yet — it was smoke-tested manually (health
check, subscription lookup, and both Stripe/PayPal endpoints correctly rejecting the
placeholder keys in `.env.example`) rather than covered by an automated suite.

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
- **Creating the actual Stripe/PayPal/AdMob accounts and going live.** Stripe/PayPal
  integration and the AdMob banner are wired up for real (see
  [Freemium, payments & ads](#freemium-payments--ads)) but ship with placeholder test-mode
  keys — filling in real keys, switching to live mode, and the business/tax registration that
  comes with actually charging people all need a person, not code.
- **Deploying `server/` somewhere reachable**, with real webhook URLs configured in the
  Stripe/PayPal dashboards — see `server/README.md`.
- **Designing a real admin backend**, if the admin preview needs to manage more than this one
  device — a server, authentication, and a real multi-user data model, none of which exist
  yet. (The narrow payments backend in `server/` intentionally doesn't do any of this — it
  only ever answers "is this one device subscribed?".)
- **Non-medical approaches content review.** The new sophrology/hypnotherapy/mindfulness
  section (`src/data/harm-reduction/content.ts`) makes a point of not overstating evidence,
  but like the rest of that file it's written by this codebase, not a clinician — same
  "needs a qualified review" flag as the harm-reduction and seek-help content above.

## Not in this version

Real accounts, cloud sync, push notifications, real ticket transmission (tickets are
local-only; export is the only way they leave the device), and public store submission are
all deliberately out of scope. Payments and ads *are* now real (test-mode keys and test ad
unit ids — see [Freemium, payments & ads](#freemium-payments--ads)), which is the one
deliberate exception to "everything stays on this device"; the admin screen is still a
local-only preview with no real backend behind it. The code is layered so everything else
can be added later without a rewrite: storage sits behind one interface, and the domain logic
has no idea a UI exists.
