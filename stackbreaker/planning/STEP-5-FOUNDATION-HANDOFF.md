# Stackbreaker Step 5 — Typed Stack and Priority Foundation

**Date:** 2026-10-19  
**Tracking:** [Roadmap #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96)  
**Owner authorization:** 2026-10-19 owner said "next" after Step 6 preview draft PR #109, approving completion of its missing Step 5 foundation prerequisite.  
**Scope:** Only Stackbreaker/** in the independent Game Lab repository. No authenticated game data, no public site promotion.

## Why a separate Step 5 PR?
Prior Step 6 preview [PR #109](https://github.com/Squackle/deep-cuts-game-lab-/pull/109) is still open and depends on typed stack/priority APIs. It modifies `stackbreaker/src/advanced-stack.js` and other Step 6 files. Building Step 5 in distinct files on fresh Lab main prevents concurrent file collisions. **Do not merge Step 6 out of order.** Step 5 can be merged independently, then Step 6 rebased onto newer main and integrated/verified.

## Files
- `src/advanced-foundation.js` — pure, typed, isolated version `sb-mtg-training-0.4.0-preview`; typed spell/activated ability/trigger/spell-copy objects with explicit controller, origin, chosen modes, target lists, X, choices and distinct cast semantics. Legacy `targetId` exists only as a projection, not a writable advanced attribute.
- Target-selector validator permits true multi-target cast structures, explicit per-mode target slots, real legality callback and caller-specified different-target constraints (such as Arc Trail). It does *not* infer rules from art or arbitrary card names.
- Two-player priority window uses explicit current/active actors, pass chain, retained-priority-after-casting, two successive passes to pop **one** top stack object, and active-player priority after resolution. It **does not resolve spells or move life totals**; the effect engine receives `resolve-top` and integrates after Step 5.
- Canonical JSON and schema-checked serialization, deterministic bounded priority replay; no invented cryptographic signing or account validation.
- `tests/advanced-foundation.test.mjs`: Classic corpus adapter tests for all **250** cases, cast vs copy vs ability/trigger, multi-target/modal legality failures, explicit priority turns and resets, LIFO, replay, schema tampering and caps.
- This document is the handoff; existing `src/engine.js`, `src/cards.js`, `src/ui.js`, `index.html`, Daily/Mastery/Cosmetics data and all 250 scenes remain **unchanged**.

## Official MTG source and scope
The canonical [Wizards September 25, 2026 Comprehensive Rules](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt), current on [Wizards' rules page](https://magic.wizards.com/en/rules) at this check:
- **117.1, 117.3c–d, 117.4–5:** casting timing, retaining priority, passing and stack resolution. Our two-player priority model is explicitly simpler than real state-based action/trigger placement; those belong in Step 7.
- **601.2 / 115:** choices of modes and targets, per-slot legality and appropriate distinctness requirements, with curated card adapters.
- **405 / 608:** LIFO order and resolution boundary. Step 5 marks `resolve-ready` without executing effects.
- **603 / 707:** typed placeholders for triggered abilities and copies, NOT a claim that the triggering or copy engine was implemented by Step 5. Step 6's separate copy resolver is currently draft.
- **Forge:** NOT executed. No GPL code imported or adapted.

## Tests, gates, migration and limitations
- Validate the 250 generated/preserved Classic puzzles, IDs and original engine behavior without replacing them or migrating scores.
- Run fresh unified Game Lab tests, isolated 0.4 preview tests and Release coordination check at the exact branch head.
- Lab Cloudflare preview/production status must be verified separately; green CI is not evidence of a real browser interaction or deployment.
- This module is intentionally **not yet wired** into the existing Classic UI. The Step 5 milestone is complete at **foundation API/contract level** only after its own tested Lab merge, with Step 6 integration separately acceptance-gated; public release remains blocked.
- Actual server replay signatures, D1/website-only scoring, full turn/priority model, triggers/APNAP, ward and replacement mechanics are NOT included.
- **Rollback**: revert the Step 5 PR, leaving all existing Classic and Lab-local progress/cosmetic keys unchanged.

## Next permitted continuation
1. Verify Step 5 final CI and Lab SHA, then merge its isolated PR if green.
2. Update Step 6 draft #109 onto the current main and integrate its copy/retarget reducer with Step 5 contracts. Re-run test suites and browser smoke before marking Step 6 complete.
3. Begin Step 7 trigger/ward work only with a new owner "next" after Steps 5–6 properly completed.

Do not tick Steps 5 or 6 on an untested/undeployed draft.
