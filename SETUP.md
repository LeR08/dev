# TYA — every console value, in one place

Written because the same identifiers were being re-derived from screenshots and chat history
several times a day. Nothing here is secret: every value below either ships inside the APK or
appears on the public store listing. The keystore and its passwords are the only secrets, and
they are not in this repository — see [Keystore](#keystore).

`PUBLISHING.md` says what still has to be *decided* and *filled in*. This file says what the
values *are*.

## Identifiers

| What | Value |
|---|---|
| Android package | `com.tya.tracker` |
| App name / version | TYA / 1.0.0 |
| EAS owner | `ler08s-team` (the organisation, not the personal account) |
| EAS project id | `9b767876-5eec-4875-b368-b1d4b5d6bfe4` |
| Firebase project | `track-ton-alcool` |
| Firebase Android app id | `1:485426562011:android:3d39c62ccb3eb591281dfe` |
| Google **web** client id | `485426562011-io7l045vmdcs3203pe0frhot8bs9foso.apps.googleusercontent.com` |
| AdMob publisher | `pub-2344459617810838` |
| AdMob app id | `ca-app-pub-2344459617810838~7959046290` (tilde) |
| AdMob banner unit | `ca-app-pub-2344459617810838/6454392933` (slash) |
| Play subscription | `tya_supporter_monthly`, base plan `monthly`, €5.99/month |
| Publisher | LaSolutionDigital — SIRET 93866525400018 |
| Contact | romainlambert@lasolutiondigital.com |

Only the **web** client id is read by the app (`GoogleSignin.configure({ webClientId })`); the
SDK needs it to return an `idToken`, which is what Firebase consumes. The Android OAuth client
must exist and carry the right fingerprints, but its id is never passed to anything — it was
removed from `eas.json` after sitting there unread for weeks.

## The two SHA-1 fingerprints

Both must be registered on the Firebase Android app. They sign different things, and having
only one is why Google sign-in worked on `preview` builds and failed from Play.

| Key | SHA-1 | Signs |
|---|---|---|
| Upload | `0A:87:A5:BE:9F:DE:64:DE:D1:FB:CD:DB:08:0B:78:F7:C4:2D:6E:74` | `preview` builds installed directly |
| Play app signing | `5D:B9:54:E8:9C:A8:B2:48:09:3C:9C:6B:82:CD:0A:3B:65:5E:AA:1E` | everything installed from Play |

The upload key is yours. The app signing key is Google's, held on their servers: Play strips
your signature from an uploaded AAB and re-signs with it. That separation is why losing the
upload key is recoverable — Google can issue a new one without breaking updates for existing
users.

## Keystore

Downloaded via `eas credentials` → Keystore → Download existing keystore, and stored **outside
this repository**, with its three passwords noted alongside. `*.jks` and `credentials.json` are
both gitignored.

Without that file you can never publish an update to TYA again. Not even Google can recover it.

## Public pages

Generated from `src/data/legal/content.ts` by `npm run build:legal`, served by GitHub Pages
from `docs/`. Each page carries all eight languages; without JavaScript they render in
sequence, so a reviewer in any language finds readable text.

| Page | URL | Required by |
|---|---|---|
| Privacy policy | https://ler08.github.io/dev/privacy.html | Play — App content |
| Account deletion | https://ler08.github.io/dev/delete-account.html | Play — Data safety |
| Terms | https://ler08.github.io/dev/terms.html | — |
| Legal notice | https://ler08.github.io/dev/notice.html | French law |

Never edit `docs/*.html` by hand. Edit `content.ts` and regenerate, or the app and the web
pages drift apart.

## Building

```
set EAS_NO_VCS=1
eas build --platform android --profile production
```

`EAS_NO_VCS=1` is needed on every new terminal window: this machine has no working git, so EAS
falls back to `.easignore` to decide what to upload.

versionCode is owned by EAS (`appVersionSource: "remote"`), not by `app.config.js`. Check
`eas build:version:get --platform android` before building, and check the version code on
expo.dev before downloading — every artifact is called `application-<uuid>.aab` and nothing in
the filename says which build it is. Uploading the wrong one is how a rejected upload and a
wasted afternoon happened once already.

## What each console still owes

| Console | Outstanding |
|---|---|
| Google Cloud | OAuth consent screen must be **In production**, not Testing — in Testing, only listed test users can sign in |
| Firebase | Google provider enabled, support email set |
| Play | Data safety, category + contact details, store listing |
| AdMob | app linked to a store listing, then blocking controls (alcohol, gambling) and the GDPR message |

AdMob is the one that cannot be pulled forward: it will not let a GDPR message be created until
the app is linked to a store listing, and an app in internal testing is not publicly findable.
Everything ad-related therefore waits for an open test or a public release.
