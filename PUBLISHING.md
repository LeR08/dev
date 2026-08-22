# Publishing to Google Play

Working notes for the store submission. Every answer below is derived from what the code
actually does, with the file that proves it — not from what the app is meant to do. If you
change the data layer, re-check this file against it.

Nothing here is legal advice, and none of it has been reviewed by a lawyer. See
[Open items](README.md#open-items-before-any-public-release).

## The order to do this in

Most of what is left depends on something else being done first. This is the sequence that
avoids dead ends; the detail for each step is further down this file.

### Phase 1 — get *something* onto Play

Nothing about billing can be tested until the app exists on your Play account, so this phase
unblocks the rest.

| # | Step | Who | Blocks |
|---|---|---|---|
| 1 | ~~Create the Play Console account~~ | you | **done** |
| 2 | ~~Google Sign-In~~ | you, then me | **done** — native SDK, verified |
| 3 | **Firestore region + Spark/Blaze decision** | you | permanent, see below |
| 4 | ~~Build the AAB~~ | you | **done**, versionCode 2 |
| 5 | ~~Create the app in Play Console, upload to Internal testing, roll out~~ | you | **done** |
| 5b | ~~Play App Signing SHA-1 into Firebase~~ | you | **done**, both fingerprints registered |

Phase 1 is complete. The build on Play predates the native sign-in SDK, so it still carries the
broken flow — rather than rebuild twice, the next production build should carry Billing as
well.

Step 1 is the only unavoidable wait, so start it before anything else. Step 2 fits neatly
inside that wait.

Everything the listing needs is already in the repo: the store text drafts below, `store/` for
the graphics, and `https://ler08.github.io/dev/privacy.html` for the privacy policy. The Data
safety and content-rating answers are further down.

### Phase 2 — Billing

| # | Step | Who |
|---|---|---|
| 6 | ~~Wire react-native-iap, purchase and restore~~ | me | **done** |
| 7 | **Build `production` and upload to Internal testing** — Play only offers subscription creation once a build declares the billing permission | you |
| 8 | Create the subscription `tya_supporter_monthly` **and its base plan**, both activated | you |
| 9 | Add yourself under **Setup → License testing** | you |
| 10 | Install **from Play** and test the purchase | you |

The order is the reverse of what it looks like: the code ships first, because the Play Console
subscription screen stays empty until an uploaded build carries the billing permission. The
product id is fixed in `src/payments/billing.ts` and does not need the product to exist yet.

### Phase 3 — AdMob

| # | Step | Who |
|---|---|---|
| 10 | AdMob account → App ID + banner unit id | **done** |
| 11 | Re-add the dependency and render a real banner, with UMP consent | **done** |
| 12 | AdMob → **Blocking controls**: block the alcohol and gambling categories | you |
| 13 | Prove it on a build — this is the one that broke the Android build before | both |
| 14 | Data safety form: declare the advertising ID rows (see below) | you |

### Phase 4 — before opening to the public

None of these block a closed test, all of them block a public listing.

| # | Step | Who |
|---|---|---|
| 14 | Translate the store listing into the other seven languages | you |
| 15 | **Legal review** of the Terms, Notice and Privacy Policy | a lawyer |
| 16 | **Clinical review** of the BAC formula and the help content | a physician |
| 17 | Re-verify the helpline numbers | you |

## Where each piece stands

| Item | Status |
|---|---|
| Play Console account | **done** — organisation account, verified |
| Privacy policy at a public URL | **done** — https://ler08.github.io/dev/privacy.html |
| Account deletion URL | **done** — https://ler08.github.io/dev/delete-account.html |
| App icon 512×512 | **done** — `store/icon-512.png` |
| Feature graphic 1024×500 | **done** — `store/feature-graphic.png` |
| Phone screenshots | **done** — `store/screenshots/*.png`, 1080×2400 |
| Store listing text | English drafted below; seven translations to do |
| Data safety answers | worked out below; to enter in the console |
| Content rating | notes below; questionnaire to fill |
| AAB build | **done** — first build produced, versionCode 2 |
| Google Sign-In (Android) | **done** — native SDK, verified working on a `preview` build |
| Play Billing | **wired** (`tya_supporter_monthly`); needs the product created in Play, then a build to test |
| AdMob | **wired** — real banner behind UMP consent; ids in `app.config.js` and `eas.json`; never built yet |
| PayPal donation | `EXPO_PUBLIC_PAYPAL_DONATE_URL` empty — card hidden |

Regenerate the two graphics with `python scripts/build-store-graphics.py` after any change to
the artwork. The screenshots come from the running web build with a seeded history.

## Data safety form

Play asks, per data type: is it **collected** (leaves the device), **shared** (goes to a third
party), is it **required**, and why. The short version for this app: an account is mandatory
(`app/_layout.tsx` gates the app behind sign-in), and once signed in the drink log, custom
drinks and the whole profile document are pushed to Firestore
(`src/sync/firestore.ts`, `pushOps`). So everything below is collected, none of it is optional
at the "you can use the app without it" level.

### Data types to declare as collected

| Play category | Data type | Collected | Shared | Required | Purpose | Where in the code |
|---|---|---|---|---|---|---|
| Personal info | Name | Yes | No | No (can be left blank) | App functionality | `Profile.name`, `src/domain/types.ts` |
| Personal info | Email address | Yes | No | Yes | App functionality, Account management | Firebase Auth; `Profile.email` pre-filled at onboarding (`app/onboarding.tsx`) |
| Health and fitness | Health info | Yes | No | No | App functionality | `Profile.sex/age/weightKg/heightCm` feed the BAC estimate (`src/domain/bac.ts`); the drink log itself is health-adjacent |
| App activity | Other user-generated content | Yes | No | Yes | App functionality | `Entry` records — what, when, how much, optional note and location (`src/domain/types.ts`) |
| App info & performance | — | No | — | — | — | no crash or diagnostics SDK is installed |

### Data types the ad banner adds

These are not ours — they are what the Google Mobile Ads SDK collects on its own once
`AdBanner` mounts (`src/ads/AdBanner.tsx`). Google publishes the disclosure guidance for AdMob
publishers; re-read the current version of that page before submitting, because the list moves.

| Play category | Data type | Collected | Shared | Required | Purpose | Why |
|---|---|---|---|---|---|---|
| Device or other IDs | Device or other IDs | Yes | Yes | Yes | Advertising or marketing | the advertising identifier, sent to Google to select and measure the banner |
| Location | Approximate location | Yes | Yes | Yes | Advertising or marketing | derived from the IP address by Google, not from a device sensor — the app still requests no location permission |
| App activity | App interactions | Yes | Yes | Yes | Advertising or marketing | ad impressions and taps, measured by Google |

Declared as **required** rather than optional on purpose. The UMP consent form does let people
in the EEA and the UK decline, but everywhere else `gatherConsent` resolves with no form and no
choice, and "optional" in this form means optional for everyone.

**Do not** declare: precise location (the `Entry.location` field is a free-text label the user
types, not a device location reading — there is no location permission in `app.config.js`),
audio or photos (the picker only ever calls `launchImageLibraryAsync`, and `app.config.js`
blocks RECORD_AUDIO and CAMERA outright, so the merged manifest carries neither), or analytics
(there is none).

### The security questions

- **Is all user data encrypted in transit?** Yes. All traffic is Firebase SDK calls over HTTPS.
- **Can users request that their data be deleted?** Yes. Settings → Account & cloud sync has a
  "delete my account" option that deletes the Firebase user and its Firestore documents
  (`deleteAllUserData`, `src/sync/firestore.ts`), and Settings → Data & privacy wipes the device
  (`clearAllData`, `src/state/AppProvider.tsx`).
- **Is data collection required to use the app?** Yes, since an account is mandatory. Answer
  honestly here; Play cross-checks it against the sign-in wall a reviewer will hit immediately.
- **Has your app been independently validated against a security standard?** No.

## Content rating questionnaire

The app is an alcohol *tracking* tool, not a promotional one, but the questionnaire asks about
references to alcohol regardless — answer yes and describe it plainly. Expect the "references
to alcohol" question to place the rating at a teen level rather than everyone. Relevant facts:
no purchase of alcohol, no promotion, no imagery of drinking, and a Help & Resources tab
carrying addiction helplines (`src/data/resources/`).

Play also has an explicit policy on apps dealing with alcohol — read it before submitting
rather than after a rejection.

## Store listing drafts

English, to be translated into the app's other seven languages before publishing. The app
itself already ships in all eight (`src/i18n/locales/`), so shipping a single-language listing
would undersell it.

**Title (30 chars):** `TYA — Track Your Alcohol`

**Short description (80 chars):**
`Log what you drink, see what it adds up to. No judgement, no red warnings.`

**Full description:**

```
Log a drink in one tap. See what it adds up to over a week, a month, a year.

TYA records what you drink and turns it into something you can actually read: intake
and spending over time, a category breakdown, alcohol-free streaks, and what you have
saved compared to what you used to spend.

WHAT IT DOES
• One-tap logging for your usual drinks, with undo
• A catalog of 115 drinks, plus your own presets
• Charts by day, week, month or year, with labelled axes
• Alcohol-free day tracking and streaks
• A savings figure comparing your old spending baseline to what you actually log
• A rough blood-alcohol estimate, shown only when it is informative
• Export everything to CSV or JSON whenever you want
• Help & resources: addiction helplines for your country

WHAT IT DOES NOT DO
Nothing in the app is coloured red. No copy tells you a number is too high. There are
no streak-breaking guilt messages. It records, it adds up, and it leaves the judgement
to you.

Every feature is free. There are no ads from an ad network, and no payments of any kind.

PRIVACY
Your data is stored on your device and in your own account, and is never shared with
other users, sold, or used for advertising. You can delete your account and everything
in it from inside the app, at any time.

NOT A MEDICAL DEVICE
The blood-alcohol estimate and the resources content are not medical advice, not a
diagnosis, and not a substitute for professional care. Never use the estimate to decide
whether to drive.
```

## What is still waiting on you

Each of these needs an account or a product created outside this repo. The app is written so
that a blank value hides its feature rather than breaking, so none of them blocks a build.

### Google Play Billing — removing the banner

This is the only compliant way to sell the ad-free unlock, and it has a sequencing trap:
**you cannot test Billing until the app is already on Play.** The library talks to the Play
Store app, which only recognises a package that exists on the account, signed with the key
Play expects. So the order is fixed:

**Step 1 — get a build onto Play first, with no billing code in it.**

```bash
set EAS_NO_VCS=1
npx eas build --profile production --platform android
```

Upload that AAB to **Testing → Internal testing** in Play Console and roll it out. It does not
need to be public, or reviewed, or complete. It needs to exist.

**Step 2 — create the subscription product.**

Play Console → **Monetise → Products → Subscriptions → Create subscription**.

- **Product ID**: `tya_supporter_monthly`. Choose carefully — it is permanent and cannot be
  reused even after deletion. Send it to me; the code has to match it exactly.
- **Name / description**: what the subscriber gets. Keep it to hiding the launch message and
  the banner, since that is all it does.
- Then add a **base plan**: `monthly`, auto-renewing, billing period P1M, and set the price for
  each region you sell in. A subscription with no active base plan is invisible to the app,
  which is the usual reason a product "does not exist" at runtime.
- Activate both the subscription and the base plan.

**Step 3 — make yourself a tester who is not charged.**

Play Console → **Setup → License testing** → add your Google account. License testers get test
purchases: real flow, real dialogs, no money, and renewals compressed to minutes so you can
watch a cycle. Your account must also be on the internal testing track's tester list, and you
must install the app *from Play* — a sideloaded APK will not see the products.

**Step 4 — send me the product ID and I wire it.** That is `react-native-iap` plus its config
plugin, a purchase flow, and — importantly — a **restore** path, because Play requires a way to
recover an existing subscription on a new device. The entitlement will set
`subscription.status`, the field that already gates the interstitial and the banner.

One warning worth taking seriously: `react-native-iap` is a native dependency, so it can only
be proven on a real Android build. It goes into a `preview` build and is verified there before
it is allowed near `production`.

### AdMob — the banner

Wired. `ca-app-pub-2344459617810838~7959046290` sits in `app.config.js` (it goes into the
manifest, and it is public by design); the banner unit `.../6454392933` is injected as
`EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID` from `eas.json`'s `production` profile only, so development
and preview builds fall back to Google's public test unit — AdMob closes accounts over
impressions a publisher generates on their own app.

That fallback does not protect the internal-testing builds, which come off the `production`
profile and therefore carry the real unit. **Do not tap the banner on those.**

Two things still on you:

1. **Blocking controls** in AdMob: block the alcohol and gambling categories. An auction serves
   whatever wins, and this is an app about drinking less. Nothing in the code can do this.
2. The Data safety rows above.

The build risk is real and untested. AdMob was pulled out of this project once because
`play-services-ads` 25.4.0 ships Kotlin metadata at 2.3.0 and a 2.0/2.1 compiler refuses to read
metadata newer than itself — `:react-native-google-mobile-ads:compileReleaseKotlin` failed on
EAS. The fix here raises Kotlin to 2.3.0 through `expo-build-properties`, which Expo supports
explicitly (`expo-modules-autolinking` maps 2.3.0+ to its latest KSP). Upgrading the ads library
would not have helped: 16.5.0 still pins 25.4.0, and it reads that version from its own
`package.json` rather than from any Gradle property, so it cannot be overridden from here.

Nobody has compiled this. If the Android build fails on a Kotlin task, that is where to look.

### PayPal donation link

Donations unlock nothing, so they sit outside Play's Payments policy and can stay on PayPal.

1. A **PayPal.me** link (`paypal.me/yourname`), or a Donate button link.
2. Put it in `eas.json`, in all three profiles, as `EXPO_PUBLIC_PAYPAL_DONATE_URL`, and in your
   local `.env` if you want it during `npm start`.

### Google Sign-In on Android

The client id in this repo's history belongs to the earlier build, keyed to a different package
and keystore — it cannot work here, which is why every profile carries an empty
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

1. `set EAS_NO_VCS=1`, then `npx eas credentials` → Android → the `production` profile → read
   off the **SHA-1** of the keystore EAS holds.
2. Firebase console → Project settings → **Add app** → Android → package `com.tya.tracker`,
   paste that SHA-1.
3. Firebase generates an **Android OAuth client id**. Put it in all three `eas.json` profiles.

Until then the Google button stays hidden and email/password sign-in works normally.

## Notes on things that will trip you up

- **Billing cannot be tested before the app is on Play.** The library talks to the Play Store
  app, which only knows packages that exist on the account. Budget for an internal-testing
  upload *before* any purchase code can be exercised — see the Billing steps above.
- **A subscription product ID is permanent.** It cannot be reused after deletion, so pick it
  once. Same for the base plan: a subscription without an active base plan is invisible at
  runtime, and looks exactly like a missing product.
- **Firebase pricing.** Spark (free) has hard daily Firestore quotas. A public launch on Spark
  will start failing reads once you are past a small number of users; Blaze is pay-as-you-go
  and needs a billing account. Decide before launch, not after users hit a broken sync.
- **Data residency.** Whichever region the Firestore database was created in is where the data
  lives, permanently — it cannot be moved afterwards. Check it matches what the privacy policy
  claims before anyone but you has an account.
- **Tally shares this Firebase project.** The earlier build is no longer produced from this
  repo, but any copy still installed signs into the same project and reads the same data. That
  only matters if it is ever distributed to anyone else; for a personal install it is
  invisible.
- **Google Sign-In is not wired for TYA yet.** It needs its own Android OAuth client, keyed to
  TYA's package and keystore — the one in the repo's history belongs to Tally and will not
  work here. Email/password sign-in works today; the Google button stays hidden until
  `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is filled in for the `production` profile.
