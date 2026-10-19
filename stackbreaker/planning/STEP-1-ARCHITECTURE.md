# Stackbreaker — Step 1 Architecture & Product Contracts

**Workstream:** Stackbreaker in Game Lab only  
**Owner:** User said “start” after the ten-step Daily Stackbreaker / Mastery / Advanced Magic plan; this authorizes **Step 1 only**.  
**Date:** 2026-10-19  
**Status:** Step 1 contract draft implemented as *non-runtime planning artifacts*. No daily game, cosmetic awards, advanced Magic rules, production account services, database migration or new game route is active.  
**Tracking:** [Roadmap issue #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96)  
**Contract mock:** [daily-mastery-advanced-contracts-v1.json](daily-mastery-advanced-contracts-v1.json)

## 1. Verified baseline and nonnegotiable invariants

- Game Lab is `Squackle/deep-cuts-game-lab-`; the Stackbreaker lane owns **`stackbreaker/**` only**. Site `Squackle/deep-cuts-edh` controls authenticated My Profile, website APIs and production D1. This step touches neither the site nor other games.
- Classic is a bounded, deterministic two-player **stack-training puzzle simulator**, not the full MTG rules engine. It has 30 approved core cases and **220 generated cases** (`sb-01..sb-30`, `sg-031..sg-250`), 5 galaxies and 25 worlds. The opponent policy normally passes. One current stack target is `targetId`.
- Current Classic rules version: **`sb-mtg-training-0.3.0`**. Retain the original 250 scenario IDs, scenario content and all existing state transitions, including stars and `dc-stackbreaker-progress-v3` / `dc-stackbreaker-last-level`. Advanced rules version **`sb-mtg-training-0.4.0`** is an unshipped proposal.
- Only source additions under `stackbreaker/planning/**` and a contracts test are allowed in Step 1. The JSON contract is **not** loaded by gameplay, and the D1 tables below are examples only.
- Before changing Magic behavior later, confirm the then-current [Wizards Comprehensive Rules](https://magic.wizards.com/en/rules), official [Gatherer Oracle](https://gatherer.wizards.com/), exact numbered rules and card wording; where practical cross-check [Forge](https://github.com/Card-Forge/forge) as an unofficial reference. No Forge code has been imported or executed.

## 2. Frozen default decisions (owner can explicitly amend before Step 2)

**Daily rollover and content**
- One globally shared challenge per **UTC calendar date**, reset at **00:00 UTC**. Date label and countdown must state UTC, not browser local midnight.
- At least **90 reviewed candidates** are required before daily launch. A versioned, immutable per-date manifest maps `UTC date -> puzzleId, revision, rulesVersion, difficulty, digest`. Avoid hidden randomness at page load and never silently change a published day.
- Game Lab's browser clock only selects a **local, unverified** daily preview; it cannot securely attest the date. The future authenticated website must issue the authoritative UTC date and accepted puzzle digest from the server. Never mistake local time for fraud-resistant evidence.
- Do not ship answer lines, solution hints or future unpublished daily *solution data* in the daily API. Since the existing 250 Classic scenarios are downloadable publicly in the static Lab, **future secrecy cannot be guaranteed** on Lab alone. No competitive claims until server verification exists.
- Replenishment: prepare a new 90+-entry, separately versioned catalog before the current schedule ends; old date-to-puzzle bindings stay stable forever. Practice/archive views must not leak as-yet-unpublished daily data.

**Attempts, hints, score and sharing**
- A player must explicitly click **Start Scored Attempt**; one scored start **per authenticated profile and UTC date**, whether that attempt wins or loses. Its state is resumable after refresh, **never reset to gain another ranked try**. Practice is unlimited.
- **Undo and hints disabled in scored mode**, including post-start hint leakage. Invalid/denied clicks do not increment accepted actions, but they are not silently treated as permitted game events. A failed scored attempt gives no verified daily win credit; practice remains available immediately.
- `acceptedActionCount` is the count of accepted, state-changing **player decisions**: tap land, play land, cast/activate, priority pass and any *separate* choice/payment action added by advanced rules. Target, mode, and mana allocation that are part of a single cast are recorded in that cast's arguments and count **once**. Count accepted actions as recorded by the engine, not button clicks. Keep `castAndActivationCount` and `priorityPassCount` as visible detail. A won game always displays result and action count. No public leaderboard or competitive rankings are in this authorization.
- Spoiler-free sharing: `date + success/failure symbol + difficulty + accepted action count + "verified"/"unverified"` only. Do not embed puzzle ID, card names, hidden strategy, target sequence or answers. Accessibility: textual copy alternative.
- Offline/anonymous Lab scores are **LOCAL / UNVERIFIED**. Never promote a browser result into official My Profile credit by trusting localStorage, screenshots, pasted JSON, or a client hash.

**Visibility and privacy**
- Future verified equipped title/frame may appear publicly **only after the user equips it**; achievement progress is private by default. Offer hide cosmetics and reduced-motion options. No subscriber/payer advantage, bonus mana or game-affecting equipment.
- Current plan has **24 achievements**, **13 named titles**, five base mana frames plus optional gold/prismatic frames, and five base mana VFX plus optional prismatic. The catalog is versioned and IDs are permanent once issued. The JSON contract is the sole catalog definition for this stage; Step 3 may add catalog entries only with explicit reviewed revisions.

## 3. Mastery proof and idempotency

- Semantic events are emitted by the **rules transition**, not by CSS, VFX or rendering. A `spell.countered` event is not inferred from a counterspell animation; only an actual removed target spell on the authoritative stack qualifies.
- Award on *verified successful puzzle completions* using semantically relevant events within the accepted replay. To stop farming, mechanic achievements count **distinct completed puzzle ID + revision**, not raw number of resolutions or repeated replay. Daily milestones count **distinct authenticated UTC date** (not required to be consecutive). A player cannot get duplicate grants for refresh/retry.
- Advanced mastery achievements remain **locked / not yet eligible** until the corresponding validated 0.4+ advanced mechanics are released. Local Lab preview achievements are conspicuously **UNVERIFIED**, never presented as an actual site profile record.
- Store idempotent grants with unique `(user_id, achievement_id)`. Validate equipped cosmetic by a server-owned grant (or an explicitly whitelisted free/default cosmetic). Never accept arbitrary title or asset markup sent from the browser.

## 4. Semantic event, replay and version contracts

Use the companion JSON contract as the normative *shape proposal*. Before Step 3/5 code, define a small runtime validator; do not rely on `typeof` guesses in browser UI.

```json
{
  "schemaVersion": 1,
  "rulesVersion": "sb-mtg-training-0.3.0",
  "contentVersion": "classic-250",
  "puzzleId": "sb-02",
  "puzzleRevision": 1,
  "puzzleDigest": "sha256-of-canonical-scenario",
  "actor": "player",
  "actionIndex": 3,
  "actionId": "cast",
  "args": {"cardInstanceId": "salve", "targetId": "player", "spendGeneric": {}},
  "stateHashBefore": "sha256-of-normalized-state",
  "stateHashAfter": "sha256-of-normalized-state",
  "semanticEvents": [
    {"eventId":"sb-02:3:0","actionIndex":3,"eventIndex":0,"type":"spell.cast","subjectId":"salve","causeId":"salve"}
  ]
}
```

- All ID/key ordering and serialization must be canonical and deterministic. A hash gives trace integrity but **does not prove a score genuine**; the website service will parse and independently replay allowed actions under exactly pinned rules, scenario and content digest. Require a bounded payload size, max actions, no unknown event types, and legal transition verification.
- New advanced stack objects (design for Step 5 onward): `{id,kind:spell|ability|trigger|copy,cardId,controller,sourceId,isCast,chosenModes[],targets[],xValue,choices,originActionIndex}`. Preserve `targetId` as a read-only compatibility projection for legacy one-target Classic scenarios. Copies must have unique IDs and never masquerade as newly cast spells.
- The **0.4.0** candidate is a versioned **new track** with new content; keep the 0.3.0 resolver and archived Classic manifests available for legacy replays. No destructive conversion of the 250 old puzzles, saved stars or events. Snapshot the original algorithms and fixture solutions before changing code.
- Semantic events are typed, deterministic and ordered by `actionIndex, eventIndex`. Positive and negative tests must demonstrate each event is emitted *exactly once* for the correct transition (and never for visual effects).
- Rules architecture for future steps: a well-defined stack object serializer; explicit mode/target validation; trigger discovery/queued placement and APNAP; real ward-trigger/payment decision; replacement pipeline **before event occurrence** with applied-once guards. Do not implement any of these in Step 1.

## 5. Website-only proposed schema — NO migration executed

These are **review-only** table shapes for the website developer. Do not create them in the Lab or use production D1 credentials in a test game.

```sql
-- Conceptual Cloudflare D1 schema, NOT an executable migration in this PR.
CREATE TABLE stackbreaker_daily_manifest (
 utc_date TEXT PRIMARY KEY,
 manifest_revision INTEGER NOT NULL,
 puzzle_id TEXT NOT NULL,
 puzzle_revision INTEGER NOT NULL,
 rules_version TEXT NOT NULL,
 content_digest TEXT NOT NULL,
 published_at TEXT NOT NULL
);
CREATE TABLE stackbreaker_daily_attempt (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 utc_date TEXT NOT NULL REFERENCES stackbreaker_daily_manifest(utc_date),
 puzzle_revision INTEGER NOT NULL,
 rules_version TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('started','won','lost','invalid')),
 accepted_action_count INTEGER,
 replay_digest TEXT,
 created_at TEXT NOT NULL,
 completed_at TEXT,
 UNIQUE(user_id, utc_date)
);
CREATE TABLE stackbreaker_mastery_grant (
 user_id TEXT NOT NULL,
 achievement_id TEXT NOT NULL,
 catalog_version INTEGER NOT NULL,
 proof_replay_id TEXT NOT NULL,
 granted_at TEXT NOT NULL,
 PRIMARY KEY(user_id,achievement_id)
);
CREATE TABLE stackbreaker_mastery_equip (
 user_id TEXT PRIMARY KEY,
 title_id TEXT,
 frame_id TEXT,
 vfx_id TEXT,
 visibility TEXT NOT NULL DEFAULT 'private'
);
```

Website security expectations: derive `user_id` **only from authenticated session**; explicit row ownership on every fetch/equip, transactional uniqueness for duplicate or simultaneous daily claims, server-side replay verification against a pinned digest, rate limits, abuse bounds and auditing. Use reversible additive migrations, no dropping historic scores, no alteration of retired Daily Ritual records and no shared Game Lab D1 bindings. Actual schema/API design and writes require **fresh explicit user authorization in Step 9**.

**Rollback:** Doc-only Step 1 reverts by reverting its PR. For later daily launch: stop publishing new dates, preserve completed historical attempt IDs; for future website D1: feature flag off first, keep historic grants, reverse additive schema only after a documented data-preservation decision. Old game progress remains readable under the original keys.

## 6. Risk, QA and feature acceptance matrix

| Check | Step | Required evidence |
| --- | --- | --- |
| 250 Classic case IDs, solutions, versions and star keys unchanged | 1–10 | Baseline deterministic tests, immutable-ID assertion, prior progress compatibility |
| 90+ globally consistent dated puzzle choices | 2 | Same UTC day across devices/timezones, DST and leap-year tests, no retroactive remapping |
| Practice vs scored separation | 2 / 9 | Hints/undo blocked in scored, one start/day enforced by server later, local guest marked unverified |
| Spoiler-free exports and accessibility | 2 | Tests reject card/strategy text and screen-reader/keyboard smoke |
| 24 achievement definitions and idempotence | 3 | Positive, negative, repeated, undo/refresh, distinct puzzle/date and locked advanced eligibility |
| Equip-only cosmetic effects | 4 / 9 | Accessibility, optional motion, no gameplay state mutation, unauthorized equipment rejected |
| Legacy adapter for 0.3.0 | 5 | All 250 original outcomes and saved keys preserved, old replays pin old engine |
| Modal spell/legal target combinations | 5 | Exact current Wizards rules + Gatherer Oracle evidence per tested card and invalid target negative case |
| Copy/retarget, priority | 6 | Not-cast invariant, legal new targets, copy-of-copy, modal choice propagation |
| Trigger ordering and ward | 7 | APNAP ordering, source-leaves edge cases, ward pay/no-pay, two-player priority traces |
| Replacement/prevention, advanced puzzle suite | 8 | Applied-once, affected-player choice, 30+ tested additional puzzles and meaningful losing lines |
| Verified authenticated daily, grants and profile | 9 | Identity isolation, rate limits, version pinning, transactional idempotence, tampered replay rejection |
| Mobile 390px/desktop 1280px, reduced motion | all/10 | Real browser smoke, CI, Cloudflare preview and exact production SHA |

**Not yet decided / must be signed off before writing website code:** website D1 migration naming & account reference, whether any personal daily history becomes public, whether there will ever be a public leaderboard, guest claim/import policy, and limits/rate thresholds. None is needed for Step 2's local-only preview.

## 7. Next permitted work

**Step 2 — Daily Stackbreaker on isolated Game Lab**, and nothing from later steps unless specifically authorized. Before starting, re-read [issue #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96), the current PR/open SHA, this document, the immutable JSON contract and the latest test evidence. User may simply say **“next”**. The new daily challenge is not yet implemented, and the main website is not authorized for changes.
