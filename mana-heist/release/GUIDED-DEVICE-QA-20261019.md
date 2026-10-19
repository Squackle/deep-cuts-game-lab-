# Mana Heist — Guided physical-device QA walkthrough (Game Lab)

**October 19, 2026 · Scope: Mana Heist only · Pilot testing infrastructure, not actual test evidence**

## Why this release

The previous Mana Heist release introduced voluntary difficulty counts and improved mobile mana-choice overlays. Its next step required actual iPhone/Android/keyboard usability testing. A code assistant cannot assert tests happened on physical hardware without an actual tester. This increment adds a **real, in-game manual QA walkthrough and self-reported result export**, not invented test observations.

## In-game procedure

In the Game Lab Mana Heist campaign screen, expand **GUIDED DEVICE CHECK · MANUAL TESTING**, optionally select a broad device category (phone/tablet/desktop), browser (Safari/Chrome/Firefox/Edge/other) and portrait/landscape. Each of the nine cards includes human-readable checks, an **Open Test Stage** shortcut and an outcome selector defaulting to **Not tested**.

1. Basic tap, mana display and Cast Spell — Learn 1.
2. Fellwar Stone color-choice dialog, cancel and reopening — Learn 27.
3. Talisman life payment feedback — Learn 28.
4. Scrollable advanced battlefield and mana source rack — Galaxy X stage 451.
5. Portrait tap-target visibility — basic first vault.
6. Landscape or short-viewport choice dialog scrolling — Galaxy X stage 451.
7. Real-card inspector and on-screen hand play — early hand-play vault.
8. Reload persistence plus Undo/Restart response — Learn 1.
9. Hardware keyboard focus, Tab containment, Escape cancellation — Learn 27.

All outcomes require a conscious human choice: **Not tested**, **Pass**, **Needs fixing**, **Not applicable**. A software launch never automatically marks a test passed. The status counter clearly distinguishes checks reviewed, passed, issues reported, and untested. All nine start **Not tested** even on freshly deployed hardware.

Tester choices are stored only on that browser under `dc-mana-heist-device-qa-v1`, fully independent from opt-in difficulty counts `dc-mana-heist-playtest-v1`, user game medals, v3/v4 score archives, two bonus-trial scores and unscored Learn progress. **Copy Manual QA Report** copies a strictly whitelisted self-report with broad environment categories, check IDs and results; if clipboard access fails it displays a selectable JSON block. **Reset QA Checklist** clears only its own key after confirmation. There is no backend, network transmission, account or automatic analytics.

## Scope and privacy limits

Data collected is limited to fixed categories and fixed test-case result enums. No free-text fields, emails, IP addresses, device models, user-agent fingerprints, timestamps, precise location, action traces or individual player identities are collected or exported by this feature. Browser localStorage itself is not encrypted; users explicitly choose whether to share their copied results. Unlike a certified physical QA service, reports are **self-described**, not verified; use them to drive an owner-supervised test plan, not to assert hardware certification. Browser or viewport rendering through Cloudflare does **not** establish that a phone was physically tested.

No gameplay/rules changes, no dynamic difficulty rating tweaks, no changes to 500 stage IDs, 28 lessons, prior earned stars, hosted leaderboard, P01 rights/IP blocker, public Deep Cuts website or other games.

## Tests and verification requirements

Run `node --test mana-heist/tests/*.test.mjs`, JS syntax checks and Unified Game Lab suite. New `tests/device-qa-walkthrough.test.mjs` verifies all cases route to real existing puzzles, strict opt-out defaults, invalid/manual status sanitization, explicit environment metadata limits, export key whitelist, local-only reset, and >=44px touch/keyboard access in responsive UI. Verify the Cloudflare **branch preview before merge** and successful production deployment for the exact merged SHA, with both post-merge workflows green.

**Not yet completed:** actual phone interaction, screen-reader walkthrough by a human, multi-browser checks, measured usability outcomes, voluntary tester recruitment, sample-size review and difficulty calibration. These require real physical-device test reports and acceptance criteria. Existing P01 legal/brand gate remains blocked; no public-site promotion.

## Rollback

Revert this Mana Heist PR and redeploy the prior Game Lab SHA. The new QA-only browser key becomes inert; all other save data remains untouched. No database migration.
