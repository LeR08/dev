# TYA

An alcohol tracking app. Log what you drink, see what that adds up to over time, and keep
control of every byte of it.

Every feature that tracks, charts or explains anything is free for everyone, and there is no
analytics and no ad-network advertising. The one paid thing is a supporter subscription that
hides the launch message and the support banner — nothing else — through Google Play Billing,
alongside a PayPal donation that unlocks nothing at all (see
[Freemium & ads](#freemium--ads)). Currently **v1.0**. Read [Open items](#open-items-before-any-public-release) before a public store
listing: some of what remains there needs a professional, not a commit.

The target is **Android on a real phone**. Web still builds and runs, but it is no longer what
the app is designed or tested against.

> Tally was this project's first identity, kept as a personal build. It is no longer built
> from this repo — an installed copy keeps working and keeps its data, but everything here is
> TYA now.

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
  average down. A 5-year preset sits alongside the honest "all time" one too, so a long enough
  run of real history reads as more than a string of individual weeks.
- **A daily goal comparison in Insights' Day view** — your weekly goal divided across 7 days,
  shown against today's own total with a small progress bar, so a weekly target has a
  same-day read on it too, not just a week-end one.
- **Alcohol-free streaks**, counted forwards and celebrated. Nothing in the app is coloured
  red, and no copy tells you a number is too high.
- **Sign-in on first launch**, then the profile screen (sex, age, weight, height, spending
  baseline, why you're using the app), so the whole "who are you" ask happens once, at the
  start, rather than being spread across the app. The account is a real one — Firebase
  Authentication, email/password or Google — and it is required; see
  [Accounts & cloud sync](#accounts--cloud-sync). Every profile field but "why" can be left
  blank, and all of it is editable any time in Settings → Profile.
- **A rough blood-alcohol estimate**, shown on the home screen only while it's actually
  informative (something logged recently, sex and weight on file), always with a plain-text
  "not a measurement" disclaimer and never a colour-coded warning.
- **A savings dashboard** comparing what you say you used to spend against what you've
  actually logged — reported as a plain number either way, saved or not.
- **Help & resources**, a dedicated tab: country-specific helplines and a "when it might help
  to talk to someone" page. Every screen there carries a not-a-medical-device disclaimer.
- **In-app bug/suggestion tickets** — local-only for now, exportable to CSV alongside your
  data.
- **An interactive first-run tutorial** (`app/tutorial.tsx`) — four swipeable slides shown
  once after onboarding, and replayable any time from Settings → Tutorial. Built to be done
  rather than read: the first slide's `+` button actually works, so the app's core gesture is
  learned by using it. Skippable throughout.
- **A supporter subscription** (Settings → Subscription) through Google Play Billing, which
  hides the launch message and the support banner and changes nothing else, plus a PayPal
  donation that unlocks nothing; see [Freemium & ads](#freemium--ads).
- **Eight languages** — the EU's major languages (French, Spanish, German, Italian,
  Portuguese) plus English, Chinese and Arabic — genuinely translated (not machine-filled
  placeholders) and switchable independent of your phone's own language, from a pill/card
  picker in Settings and a quick-access globe chip on the Today screen (see
  [Localization](#localization) below).
- **Full history**, searchable and filterable by date range, category or text, with editing
  and deletion of any past entry.
- **Optional personal goals** that draw a dashed line on a chart and do nothing else.
- **Export** to CSV or JSON whenever you want a backup.
- **Light, dark, or system theme**, with six accent colours (Indigo — vivid, not another green-on-cream app — is the default; Sage, Ocean, Plum, Amber and Clay are still there for anyone who prefers them), and Manrope as the app-wide typeface for a bit more character than the system default.
- **A savings hero on the very first screen** (Today), not tucked away in a sub-screen: the biggest, boldest number on the app is what's been saved since you started tracking, in a gold gradient card that also carries the actual case for small, consistent effort (why a modest amount of it goes a long way — financially, and for a health with no price tag). Tapping it opens the full Savings dashboard.
- **Small entrance animations** (fade + slight rise, staggered per card) on the screens that
  benefit most from them — Today, Insights, History's filter bar, Settings, Help, the
  language picker and onboarding — kept subtle and skippable-by-not-noticing rather than
  showy.

## Running it

```bash
npm install
npm test           # unit tests
npm run typecheck  # TypeScript
npm run web        # browser preview — handy for a quick look, not the target
```

### On a phone: the development-build workflow

**Expo Go doesn't work for this app** — Google sign-in runs through Google's native SDK, which
Expo Go does not bundle. Use a *development build*
instead: one APK, installed once, that then loads JavaScript from your machine, so day-to-day
edits show up in seconds without rebuilding.

Build it once (needs `npm install -g eas-cli` and `eas login` first):

```bash
npx eas build --profile development --platform android
```

Install the resulting APK on the phone, then from then on just:

```bash
npm start          # = expo start --dev-client
```

Open the app on the phone and it connects to that dev server — phone and computer have to be
on the same network. Edit a file, and the screen updates. You only need to build again when
something *native* changes: a new package with native code, or an edit to `app.config.js`'s
`plugins` / `android` / `ios` sections. Pure JavaScript and TypeScript changes never need one.

For a standalone APK that runs with no computer attached — the one to actually use or hand to
someone — build the `preview` profile instead:

```bash
npx eas build --profile preview --platform android
```

And for the Play Store, the `production` profile, which emits an **AAB** rather than an APK —
Play rejects an APK for a new app:

```bash
npx eas build --profile production --platform android
```

That profile sets `autoIncrement`, so each build raises the Android `versionCode` on its own —
Play refuses an upload that reuses one. It works because `eas.json` sets
`appVersionSource: "remote"`, which keeps the counter on EAS's side. The `local` setting cannot
work here: it makes EAS write the new value back into the config, and it cannot edit a dynamic
`app.config.js` — the same limitation that stops it writing `projectId` there. The
`versionCode` in `app.config.js` is only the seed for the first build.

> On a machine with no `git` installed — or with a broken one, which reports as
> `git found, but git --help exited with status undefined` — set `EAS_NO_VCS=1` before the
> EAS command (`set EAS_NO_VCS=1` on Windows, `EAS_NO_VCS=1` inline on macOS/Linux),
> otherwise the CLI aborts looking for a repository. EAS normally works out what to upload
> from git, so with no VCS that job falls to `.easignore` — it is what keeps `node_modules`,
> build output and the local `.env` off the build server. Anything that must not be uploaded
> belongs in `.easignore`, not only in `.gitignore`.

## How it is put together

```
app/                    Screens and routing (expo-router, file-based)
  (tabs)/               Today, History, Insights, Help, Settings
  log/                  Drink picker → details → confirm
  entry/[id]            Edit or delete a logged entry
  drinks/               Custom drink presets
  settings/             Units, goals, appearance, profile, language, legal, tickets, data,
                        subscription (pricing mock-up, no payments)
  savings.tsx            Savings deep-dive
  onboarding.tsx          First run (after the mandatory auth-gate): profile → done
  tutorial.tsx            Interactive four-slide walkthrough, once after onboarding

src/
  domain/               Pure logic: alcohol maths, BAC, savings, dates, stats, search, profile,
                        premium-status helper
  db/                   Storage: the Store contract, SQLite and web implementations
  data/
    catalog.json          The bundled drink catalog
    legal/content.ts       CGU / mentions légales / privacy policy text (all 8 languages)
    resources/             Help-screen contacts, one JSON file per country
    harm-reduction/        "When it might help to talk to someone" copy (all 8 languages)
  i18n/                  8 translation catalogs, provider, device-locale + currency detection,
                        catalog display-name overrides, intake/category label helpers
  ads/                   Banner placeholder (currently renders nothing — see Freemium & ads);
                        the launch message itself lives in components/ (below)
  state/                 App-wide data provider
  theme/                 Palette, theme, provider
  components/            UI kit, charts, entry rows, profile fields, BAC card, FadeInView,
                        SupportInterstitial (the anti-addiction launch message)
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

**The profile is identified data, on purpose.** Per the v1.2 spec the profile is treated as
belonging to a real person rather than anonymised. It used to be local-only too; since cloud
sync landed it is pushed to Firestore whole, name and email included — see
[Accounts & cloud sync](#accounts--cloud-sync) and the Data safety notes in
[PUBLISHING.md](PUBLISHING.md).

**Sign-in is real, and mandatory.** It began as a greeting — a name and optional email written
to the local `Profile` row, nothing created or verified. It is now Firebase Authentication,
and `app/_layout.tsx` gates the entire app behind it whenever a Firebase project is
configured. The local-only fallback survives for an unconfigured build, which is a development
convenience rather than a shipping mode.

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
  language the app could plausibly support," which would have meant either machine-translating
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
  device's own locale when it is one the app recognises, else fall back to English / general /
  EUR (`src/i18n/detectLocale.ts`). All three stay changeable any time in Settings.
- **Known gap: calendar dates still follow the device's system locale, not the in-app
  language.** `formatDate`/`formatLongDate`/`formatMonth`/`formatWeekdayShort` call
  `Intl.DateTimeFormat(undefined, …)`, which reads the OS locale rather than the app's own
  language setting — so a phone set to English showing the app in French will still see
  "Wed, Aug 5" instead of "mer. 5 août" in a few places (e.g. the custom start-date picker).
  Fixing it means threading the app's `language` through every date-formatting call site, the
  same pattern already used for `formatComparison`/`formatRelativeDay` — flagged here as the
  next piece of this same class of bug rather than fixed alongside everything else in this
  pass.

## Privacy

There is no telemetry. Every drink, entry, custom drink, profile field and ticket lives in a
local database on the device first — cloud sync (below) mirrors it to your own Firebase project,
it doesn't replace local storage. Settings → Data & privacy has a "delete all my data" option
that wipes entries, custom drinks, your profile, your tickets and settings on this device (it
does not delete the cloud account — see [Accounts & cloud sync](#accounts--cloud-sync) for that).

Account creation is mandatory (see [Accounts & cloud sync](#accounts--cloud-sync)) when a
Firebase project is configured — that's the one deliberate exception to "everything stays on
this device" beyond export, which you still control. It is now the *only* exception: with
payments removed, nothing else in the app sends anything anywhere.

## Freemium & ads

Every feature described above — logging, history, charts, insights, export, everything — is
free, full-stop, for every user. Nothing about tracking, insights or safety-relevant content
is ever paywalled.

**Removing the banner goes through Google Play Billing** — the only compliant route, since
Play's Payments policy requires it for digital content unlocked inside an app.
`src/payments/useSupporterSubscription.ts` drives it, and two choices there are worth knowing:

- **Play is the authority, not the purchase callback.** The entitlement comes from asking Play
  what subscriptions are active, so a replayed callback cannot grant access and a cancellation
  made elsewhere is picked up on the next refresh. `settings.subscription.status` follows that
  answer in both directions.
- **Restore is automatic, not a button.** Play requires a way to recover a subscription on a new
  device; running it on connect is a better one than a button nobody finds.

There is no server-side receipt verification, so a tampered device could fake the entitlement.
For an unlock worth one hidden banner that is an accepted trade — if it ever guards something
that matters, verification belongs on a backend.

The product id (`tya_supporter_monthly`) must match Play Console exactly and can never be
reused once created. The price shown in the app comes from Play, not from our own copy, so it
is correct in every currency and cannot drift from what is charged.

**Donations stay on PayPal.** A donation unlocks nothing, so it sits outside that policy. It
is a hosted PayPal page opened with `WebBrowser.openBrowserAsync` — no SDK, no card field in
the app, no secret key in this repo. The link comes from `EXPO_PUBLIC_PAYPAL_DONATE_URL`;
leave it blank and the card is hidden rather than broken.

**Ads — kept deliberately narrow and on-theme.** The literal ask was Google Ads on every
launch for free users; what's built instead, to keep this ethical for an app about drinking
habits:

- **The "ad" free users actually see on launch** (`src/components/SupportInterstitial.tsx`)
  is not sourced from an ad network at all — it's a short, immediately-skippable, self-authored
  message about support and addiction resources (not only alcohol), with a direct link to
  Help & Resources. Shown at most once per app launch, only to free-tier users. Because it's
  our own copy rather than arbitrary ad-network creative, its content can actually be held to
  "anti-addiction, non-judgmental" rather than whatever an ad auction happens to serve.
- **The AdMob banner** (`src/ads/AdBanner.tsx`) is one banner, on the supporter screen only —
  not on launch, not in the log, not in the statistics. It is also the only thing that starts
  the ads SDK: a user who never opens that screen never initialises it, and a supporter never
  sees the card that holds it. Consent runs first through Google's UMP flow, so no ad is
  requested until UMP says it may be, and `src/ads/AdPrivacyOptionsRow.tsx` puts the consent
  form back within reach in Settings where Google requires that. `AdBanner.web.tsx` shadows the
  native file so the web bundle never resolves the package at all.

  The real unit id arrives from `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`, set only in `eas.json`'s
  `production` profile; everything else falls back to Google's public test unit, because AdMob
  suspends accounts over impressions a publisher generates on their own app.

  This dependency was removed once before: `play-services-ads:25.4.0` ships Kotlin metadata at
  2.3.0, newer than the 2.0/2.1 compiler this project used, which failed
  `:react-native-google-mobile-ads:compileReleaseKotlin` on EAS Build. `expo-build-properties`
  now raises Kotlin to 2.3.0. That has not been compiled yet — see PUBLISHING.md.

Whether to monetize at all, and how, is a human decision this codebase deliberately no longer
pre-empts. Flagged again under [Open items](#open-items-before-any-public-release).

## The public legal pages

Google Play requires a privacy policy reachable at a public URL, outside the app. Rather than
paste the text into a web page — which diverges from the app the first time either is edited —
`scripts/build-legal-site.mjs` reads the same `src/data/legal/content.ts` the app renders and
emits static HTML from it:

```bash
npm run build:legal   # writes docs/{privacy,terms,notice,index}.html
```

Regenerate after **any** edit to `content.ts`, and commit the result; the pages are checked in
so a host can serve them directly. `docs/` is the folder GitHub Pages serves when you point it
at *Settings → Pages → Source: main, /docs* — any static host works just as well, since the
pages have no dependencies and make no external requests.

Each document is one page carrying all eight languages, so there is one canonical URL per
document rather than eight. A switcher picks the reader's language (defaulting to the browser's);
with JavaScript disabled every language simply renders in sequence, so the legal text is never
hidden behind a script that failed to run.

The URL to give Play is `<your-host>/privacy.html`. [PUBLISHING.md](PUBLISHING.md) carries the
rest of the store-submission work — the Data safety answers, each traced to the code that
justifies it, plus content-rating notes and listing drafts.

## Accounts & cloud sync

**Account creation is mandatory** — a deliberate product decision (business model depends on it,
see [Open items](#open-items-before-any-public-release)), not the original v1.2/v2.0 design.
`app/auth-gate.tsx` sits in front of everything else: `app/_layout.tsx`'s `Boot()` redirects
there before onboarding or the app itself whenever Firebase is configured and no account is
signed in, and won't let go until one is. The one exception is a build with **no Firebase
project configured at all** (`isFirebaseConfigured()` false, e.g. local dev with no `.env`) —
there's no account system to gate behind then, so it falls back to the previous local-only
behavior rather than locking the app out entirely. Once past the gate, everything below applies.

**Auth.** [Firebase Authentication](https://firebase.google.com/docs/auth) with email +
password (including the standard "forgot password" reset email) and Google sign-in. Web Google
sign-in uses `signInWithPopup` straight against your Firebase project — no extra setup once
Authentication's Google provider is enabled. Native (Android/iOS) has no popup API, so it goes
through `expo-auth-session`'s own browser-based OAuth flow instead
(`app/settings/account.tsx`'s `GoogleSignInNativeButton`), gated behind its own
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env var (see Setup below) — until that's set, the native
Google button shows a clear "not set up" state rather than a broken one. Apple sign-in is *not*
built yet — see [Open items](#open-items-before-any-public-release) for why (it needs a native
module and a paid Apple Developer Program enrollment this codebase can't invent, and per
Apple's App Store review guidelines it becomes *mandatory* the moment Google sign-in ships on
iOS — a real product/legal decision, not a default to make silently).

**Data store: Firestore, not Realtime Database.** Firestore's structured queries (filtering by
date range, by drink type) match how this app already reads its local data far better than
Realtime Database's plain key-value tree would. Layout, scoped by `uid` (`firestore.rules`
enforces that a user can only ever read/write their own data):

- `users/{uid}` — the profile fields, directly on the user document.
- `users/{uid}/entries/{id}` and `users/{uid}/drinks/{id}` — subcollections, one doc per entry
  / custom drink. Only *custom* drinks sync; the built-in catalog ships with the app on every
  device already.

Nothing new is collected for sync's sake — it's the same fields already stored locally, mirrored.

**Sync strategy** (`src/sync/syncEngine.ts`, `src/domain/sync.ts`):

- *Offline-first.* Every read/write still goes straight to SQLite/localStorage first, exactly
  as before; sync to Firestore happens opportunistically afterwards, queued in a local outbox
  (`src/sync/outbox.ts`) and pushed on a short debounce so a burst of edits doesn't fire a
  network call per keystroke.
- *Triggers.* App foreground, pull-to-refresh (`syncNow()` from `useApp()`), and — via the
  debounced outbox — shortly after any local write, whenever a signed-in account exists.
- *Conflict resolution.* Entries and custom drinks are treated as append-mostly and merged by
  id (`mergeById`): the newer copy of a given id wins by `updatedAt`, and nothing is dropped
  just because the whole dataset diverged. Deleting one is still instant locally; underneath,
  it writes a small tombstone to Firestore (`{ deleted: true }`) rather than a real delete, so
  a second device picks up the deletion on its next sync instead of the record silently
  reappearing. Profile fields use last-write-wins by timestamp (`mergeLatest`) — edits there
  are rare and low-stakes, unlike the log itself.
- *First sign-in.* Whatever's already on the device gets queued and uploaded as the starting
  cloud state — signing up never discards pre-existing local history.
- *Second device.* Signing in pulls the full existing cloud history down and merges it in
  before any new local write can diverge from it.

Real-time multi-device push updates are deliberately not built — eventual sync on
foreground/refresh is what's specified, not a live subscription to another session's edits.

**Account deletion.** Settings → Account & cloud sync → Delete account
(`src/sync/auth.ts`'s `deleteAccount`) re-authenticates, deletes every Firestore document under
that `uid` (`deleteAllUserData`, batched), then deletes the Firebase Auth user itself — a real
GDPR-style erasure, not just a sign-out. It does not touch this device's local data; that's
still what Settings → Data & privacy's "delete all my data" is for.

**Setup.** Ships with blank `EXPO_PUBLIC_FIREBASE_*` values (see `.env.example`) — with those
unset, `isFirebaseConfigured()` is `false` and the whole feature quietly steps aside: Account &
cloud sync shows a "not set up" message instead of a broken sign-in form, and the rest of the
app is completely unaffected. To turn it on:

1. Create a Firebase project, enable Authentication's Email/Password *and* Google providers.
2. **Create the Firestore database itself** — a Firebase project having Authentication enabled
   does not imply Firestore exists yet. Firebase Console → Firestore Database → Create database.
   As of Firestore's multi-database support, the console asks for a **Database ID**: leave it as
   `(default)` — the client SDK's `getFirestore(app)` (see `src/sync/firestoreInstance.ts`) only
   ever looks at the default database, so a custom-named one would be invisible to this app.
   Pick your region here too — for GDPR, an EU region/multi-region if your users are meaningfully
   in the EU.
3. Copy the web app config into `.env` as `EXPO_PUBLIC_FIREBASE_*`.
4. For native Google sign-in specifically, also copy the **Web client ID** from Authentication →
   Sign-in method → Google → "Web SDK configuration" into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Web
   Google sign-in needs none of this — only native does.
5. Publish `firestore.rules` (`firebase deploy --only firestore:rules`, or paste its contents
   into Firebase Console → Firestore Database → Rules → Publish) — **without this step the
   database is either wide open or fully locked**, whichever your project defaulted to, and
   either way sync will misbehave. Test it before trusting it: the Rules Playground in the
   console, or a real read/write attempt against another account's `uid` path, should both
   confirm access is denied.

Firebase's free Spark tier is almost certainly enough for testing; understand its Blaze pricing
before a public launch.

## Tests

203 tests over the parts where a bug would quietly corrupt your history or your trust in a
number: alcohol maths, the BAC formula, savings, poured-volume aggregation for the Insights
volume chart, local date handling across DST (including hour-granularity buckets for the
daily statistics view), aggregation and streaks, search and filtering, the CSV/JSON export
format (including CSV-formula-injection escaping), locale + currency detection, translation
catalog parity and non-placeholder checks across all eight languages, the translatable
comparison/relative-day templates in `src/domain/format.ts`, catalog display-name overrides,
the premium-status helper, and the full storage contract (SQLite and web, including the
profile schema's `name`/`email` migration).

```bash
npm test
```

### Dependency advisories

`npm audit` reports a set of high-severity findings that all trace back to a single
package, `image-size`, reached through `expo → @expo/metro → metro`. Two things about it:

- **Every published version is in the advisory range** (`<=2.0.2`, and 2.0.2 is the
  latest release). There is no fixed version to move to. `npm audit fix --force` "solves"
  it by downgrading Expo 57 → 53, a major-version downgrade that would break the app;
  that is not a fix and is deliberately not applied here.
- **It never reaches a phone.** Metro is the bundler — it runs on a developer machine or
  on the EAS build server and emits a JS bundle; Metro itself is not part of the shipped
  app. The advisory is a denial-of-service via an infinite loop when parsing a malformed
  ICNS/JXL/HEIF image, so triggering it would mean feeding a hostile image asset into
  your own build.

The one genuinely fixable finding, `nanoid` (<3.3.18, reached via `expo-router` and
`postcss`), is pinned to a safe patch release through `overrides` in `package.json`.
Re-check with `npm audit` after any Expo upgrade — once upstream publishes a patched
`image-size`, an Expo bump will pick it up and the remaining findings should clear.

## Open items before any public release

Carried over verbatim from the v1.2 spec — these are flagged there as needing a human, not
something this codebase can resolve on its own:

- **Clinical review.** The BAC formula and the "when to seek help" content
  (`src/domain/bac.ts`, `src/data/harm-reduction/`) should be reviewed by a qualified
  addictologist or physician before anyone but you relies on them.
- **Legal review.** The Terms of Service, Legal Notice and Privacy Policy
  (`src/data/legal/content.ts`) have their identity fields filled in (publisher, SIRET,
  address, director of publication) and now describe the app as it actually behaves: an
  account is required and cloud sync applies to every user, in all 8 languages. What they
  have *not* had is a lawyer's eyes — jurisdiction-specific requirements aren't covered, and
  the wording being accurate is not the same as it being sufficient.
- **Verify the helpline contacts.** France's numbers came from the spec's own draft table;
  the US/UK ones are ones I'm confident are currently accurate. China, Saudi Arabia and UAE
  (`src/data/resources/{cn,sa,ae}.json`) were researched against official sources — China's
  National Health Commission's 12356 line and Lifeline China's own published number; Saudi
  Arabia's MOH mental-health line; UAE's MOHAP national line and the Sakina line reported by
  Gulf News — written in each country's own language. Spain, Germany, Italy and Portugal
  (`src/data/resources/{es,de,it,pt}.json`, added this pass) came from official government/
  health-authority sources checked via live web search rather than memory — Spain's Ministerio
  de Sanidad 024 line (not alcohol-specific; Spain's addiction services are run per autonomous
  community, so the entry points at that rather than asserting one number); Germany's
  Sucht & Drogen Hotline and the free TelefonSeelsorge as a backup; Italy's Telefono Verde
  Alcol, run by the Istituto Superiore di Sanità; Portugal's Linha Vida (SICAD) and SNS 24.
  Canada was dropped rather than kept with an unverifiable placeholder. All of these can
  change, and none of this is a substitute for checking the source directly before anyone
  relies on it in an emergency; the Help screen says so.
- **Final app name per locale, and whether to add the optional onboarding questions** from
  spec §4.3 (none of those are built — they were explicitly flagged as proposals, not
  commitments).
- **Whether to monetize at all, and how.** All payment code was removed; Settings →
  Subscription is a visual mock-up only (see [Freemium & ads](#freemium--ads)). Choosing a
  provider, wiring a real checkout, and the business/tax registration that comes with charging
  people are all decisions a person has to make first.
- **Apple sign-in** (see [Accounts & cloud sync](#accounts--cloud-sync)) — email and Google
  sign-in are both real and functional today; Apple needs a paid Apple Developer Program
  enrollment and a native module that needs a custom dev client, not plain Expo Go, neither of
  which this codebase can invent on its own.
- **Provisioning the Firestore database itself on a given Firebase project.** Enabling
  Authentication does not create a Firestore database — that's a separate step (see [Accounts &
  cloud sync](#accounts--cloud-sync)'s Setup section), and skipping it makes every Firestore read
  or write fail with a "database (default) does not exist" error rather than a permissions error.
  Worth checking for explicitly before assuming sync is broken.
- **Legal/GDPR review of cloud sync specifically.** Storing personal, health-adjacent data
  (alcohol consumption) on a third-party server (Firebase/Google) for anyone who opts into an
  account is a real change in legal posture from a fully local-only app. The Privacy Policy
  (`src/data/legal/content.ts`) now discloses Firebase as a data processor and that sync is
  opt-in, but neither that language nor whether a formal Data Processing Agreement reference is
  required has had an actual legal review.
- **Firebase project setup itself** — creating the project, choosing a data-residency region,
  and understanding the Spark → Blaze pricing transition before any public launch. See
  [Accounts & cloud sync](#accounts--cloud-sync)'s Setup section.

## Not in this version

Accounts and cloud sync *are* now real (see [Accounts & cloud sync](#accounts--cloud-sync)) —
and mandatory whenever a Firebase project is configured, inert (falls back to local-only) only
when one isn't. Email and Google sign-in both work; Apple doesn't yet. Still out of scope:
social/sharing features between
accounts, real-time multi-device push updates (sync happens on foreground/refresh, not a live
subscription), push notifications, real ticket transmission (tickets are local-only; export is
the only way they leave the device), and public store submission. Payments are gone entirely —
Settings → Subscription is a visual preview with no checkout behind it (see
[Freemium & ads](#freemium--ads)). The code is layered so everything else can be added later
without a rewrite: storage sits behind one interface, and the domain logic has no idea a UI
exists.
