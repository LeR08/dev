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

## Notes on things that will trip you up

- **Firebase pricing.** Spark (free) has hard daily Firestore quotas. A public launch on Spark
  will start failing reads once you are past a small number of users; Blaze is pay-as-you-go
  and needs a billing account. Decide before launch, not after users hit a broken sync.
- **Data residency.** Whichever region the Firestore database was created in is where the data
  lives, permanently — it cannot be moved afterwards. Check it matches what the privacy policy
  claims before anyone but you has an account.
- **The two apps share one backend.** Tally and TYA sign into the same Firebase project, so an
  account works on both and shows the same data. If they are ever published as two separate
  store listings, that relationship has to be disclosed, or separated first.
