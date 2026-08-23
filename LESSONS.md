# What this project cost, and what to do differently next time

Written after a day lost to a Google Sign-In failure whose cause was one unregistered
certificate fingerprint. The point is not that day — it is that most of it was avoidable, and
the avoidable parts follow patterns worth carrying to the next project.

## Diagnosis

**A generic error message is a bill you pay later.** Every failure from Google's SDK reached
the screen as "an error occurred, check your connection". That sentence sent the search at the
network — the one part that was working — and hid a numeric status code the SDK had been
returning all along. Once the code appeared on screen, the cause was found in one round. Catch
blocks that flatten every failure into one string are cheap to write and expensive to own:
surface the code, always, even in production. It is also the only thing that makes a user's bug
report actionable.

**Run the experiment that halves the problem before theorising.** Hours went into console
archaeology — OAuth clients, consent screens, provider settings — each check confirming
something was fine. Fifteen minutes on a `preview` APK, installed directly instead of through
the store, eliminated the code, the client id, the SDK and the backend in one shot and left
exactly one variable. Ask early: what single test changes my answer whichever way it goes?

**When a fix "should" work and doesn't, check whether it reached its target.** Raising Kotlin
project-wide to fix an AdMob compile error looked right and was applied — the build log said
`kotlin: 2.3.0`. It never touched the module in question, which resolves its own compiler, and
it broke a different module by handing it a standard library it could not read. The log had
said so plainly. Read what the tool reports, not what the change was supposed to do.

**Three wrong hypotheses in a row means the search space is wrong, not the reasoning.** Each
one was plausible and each was checked properly. The answer was in a column of a table nobody
had scrolled to, under a heading that had nothing to do with authentication.

## Google Play

**Play re-signs everything you upload.** The certificate on a user's device is Google's, not
yours. Anything that validates a signature — Google Sign-In first among them — must know the
Play fingerprints, not just the upload key. A build that works when installed directly proves
nothing about the same build installed from the store.

**Collect every fingerprint the console offers.** This app is in Play's quantum-safe signing
beta, so its Signature d'application page shows a classic key *and* a post-quantum key, side by
side, each with its own SHA-1. Registering the one that looked right cost a day. Copy them all,
including anything under "previous app signing keys".

**The platforms impose an order; map it instead of fighting it.** App access has to be declared
before target audience. Play only offers subscription creation once an uploaded build declares
the billing permission, so code ships before the product exists. AdMob will not let a consent
message be created until the app is linked to a store listing, which needs a public release —
so ads cannot be tested before publication, at all. None of this is discoverable from the
outside; each was found by hitting it.

**Check which artifact you are uploading.** Every EAS artifact is called
`application-<uuid>.aab`. Nothing in the filename says which build it is. One wrong file cost a
rejected upload, a burnt version code, and an afternoon of testing a build that did not contain
the fix being tested.

## The repository

**Take the whole branch, not a patch.** Delivering changed files as archives produced two
phantom bugs in one afternoon: a screen still calling a renamed translation key, and a fix that
appeared applied because the string being grepped for existed in both versions. Replacing the
whole tree costs a `npm install` and removes an entire class of error.

**Claims in code and documentation rot into lies.** "No account, no server, nothing leaves this
device" was true when written and false the moment sync shipped. So was "never sent anywhere",
on the two profile fields that sync. So was "no payments of any kind", after Play Billing
started taking money. Play compares what an app says on screen against its Data safety
declaration, and a legal notice naming the wrong hosting arrangement is the one thing that
document exists to get right. When the architecture changes, sweep the prose — it does not
typecheck.

**Dead configuration is not free.** An environment variable set to `""` broke every `eas`
command until it was removed. Another sat unread in three build profiles for weeks, muddying a
diagnosis. A 23 MB video, uploaded once through GitHub's web interface and referenced by
nothing, went to the build servers on every single run — 23 of the 25.5 MB each build reported
compressing.

**Verify deletions differently from other edits.** Removing unused translation keys looked
safe: a grep for `t('key')` flagged 119. But keys held in lookup maps or cast through
`as never` bypass both that grep *and* the type checker, so a wrong deletion would have shipped
as a blank label rather than failing the build. Searching the full text of every source file
brought it to 35 genuinely unreferenced. When the compiler cannot catch a mistake, the search
has to be stricter, not looser.

## Sequencing

**Back up the signing keystore before touching anything that could move it.** Losing it means
never publishing an update again — not recoverable by anyone, including Google. It takes two
minutes and is the single most consequential file in the project.

**Free build quotas run out mid-debug.** Each failed build costs fifteen minutes and one of a
small monthly allowance. Batch native changes into one build rather than testing them one at a
time, and spend a build on a *discriminating* experiment rather than on a hopeful fix.
