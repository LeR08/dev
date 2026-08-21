# Publishing to Google Play

Working notes for the store submission. Every answer below is derived from what the code
actually does, with the file that proves it — not from what the app is meant to do. If you
change the data layer, re-check this file against it.

Nothing here is legal advice, and none of it has been reviewed by a lawyer. See
[Open items](README.md#open-items-before-any-public-release).

## Before you start

| Item | Status |
|---|---|
| Play Console account (one-off 25 USD) | you have to create it |
| AAB build | `npx eas build --profile production --platform android` |
| Privacy policy at a public URL | **ready** — `npm run build:legal`, host `docs/`, give Play `<host>/privacy.html` |
| App icon 512×512 | **ready** — `store/icon-512.png` |
| Feature graphic 1024×500 | **ready** — `store/feature-graphic.png` |
| Phone screenshots (2–8) | **ready** — `store/screenshots/*.png`, 1080×2400 |
| Short description (80 chars) + full description (4000) | drafts below |
| Data safety form | answers below |
| Content rating questionnaire | notes below |

Regenerate the two graphics with `python scripts/build-store-graphics.py` after any change
to the artwork. The screenshots are captured from the running web build with a seeded history;
the script for that lives outside the repo, so retaking them means running the app and
capturing again.

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

**Do not** declare: location (the `Entry.location` field is a free-text label the user types,
not a device location reading — there is no location permission in `app.config.js`),
advertising ID (AdMob is removed — `src/ads/AdBanner.tsx` returns `null` and the dependency is
out of `package.json`), or analytics (there is none).

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

Three things need an account created outside this repo. Each is written so the app works
without it — nothing is broken while a value is blank, the feature is simply hidden.

### PayPal links

1. **paypal.com → Pay & Get Paid → Subscriptions → Create plan.** Set the amount (5 EUR/month
   to match the copy) and billing cycle. Publish the plan, then copy its **share link** — it
   looks like `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-XXXXXXXX`.
2. For the donation, either a **PayPal.me** link (`paypal.me/yourname`) or a Donate button link.
3. Put both into `eas.json`, in all three profiles:
   `EXPO_PUBLIC_PAYPAL_SUBSCRIBE_URL` and `EXPO_PUBLIC_PAYPAL_DONATE_URL`. Copy them into your
   local `.env` too if you want them in `npm start`.

### AdMob app id

The banner is disabled and the dependency is out of `package.json` — see the ads section of
the README for why. To turn it back on:

1. **admob.google.com** → sign in with the same Google account → **Apps → Add app**. Answer
   "no" to "is your app listed on a store?" until it is, then add it again afterwards to link
   the real listing.
2. Platform Android, name it TYA. AdMob issues an **App ID** shaped
   `ca-app-pub-################~##########` — note the tilde; the *ad unit* id uses a slash and
   is a different value.
3. **Ad units → Add ad unit → Banner.** That gives the unit id
   `ca-app-pub-################/##########`.
4. Send both ids over and the wiring is a small change: add
   `react-native-google-mobile-ads`, its config plugin entry with `androidAppId` in
   `app.config.js`, and make `src/ads/AdBanner.tsx` render a real `BannerAd` instead of `null`.

Two cautions worth taking seriously before spending that effort. The dependency was removed
because `play-services-ads` shipped Kotlin metadata newer than this project's toolchain
compiles against, failing the Android build; the library has moved on since, but that has not
been re-tested here, so **prove it on a `preview` build before it goes anywhere near
`production`**. And an ad network serves whatever the auction returns — in an app about
reducing drinking, that can be alcohol or gambling creative. AdMob's blocked-categories
controls exist; set them.

### Google Sign-In on Android

The client id in this repo's history belongs to the earlier build, keyed to a different
package and keystore — it cannot work here, which is why every profile now carries an empty
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

1. `set EAS_NO_VCS=1`, then `npx eas credentials` → Android → the `production` profile → read
   off the **SHA-1** of the keystore EAS holds.
2. Firebase console → Project settings → **Add app** → Android → package `com.tya.tracker`,
   paste that SHA-1.
3. Firebase generates an **Android OAuth client id**. Put it in all three `eas.json` profiles.

Until then the Google button stays hidden and email/password sign-in works normally.

## Notes on things that will trip you up

- **Play Billing vs PayPal.** Play's Payments policy requires Google Play Billing for digital
  content unlocked inside an app, which is what the supporter subscription does when it hides
  the banner. A donation that unlocks nothing is fine. There is an EEA carve-out following the
  DMA; check the terms in force for your account, because the sanction here is removal of the
  listing rather than a rejected update.
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
