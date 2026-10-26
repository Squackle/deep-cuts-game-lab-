# Mana Heist: decision calibration batch — October 26, 2026

Status: implemented for review on a dedicated Game Lab branch. Not deployed or promoted. P01/P02/P03 and human difficulty calibration remain incomplete.

Owner authorization: “go ahead with that plan” — Mana Heist first, decision evaluation, a small sample progression, regression tests and a reviewable PR.

## Findings and completed changes

| Priority | Reproduction / impact | Resolution in this batch |
| --- | --- | --- |
| High: difficulty inference | One Island paying a blue ward has legacy estimated D=17. Repeat that forced ward over six turns and D=60, although there is still no strategic alternative. Structural/execution indices cannot certify thinking difficulty. | Added a separate, bounded decision checkpoint diagnostic and repetition regression. Existing campaign numbers remain historical estimates; this batch does not present the diagnostic as a validated replacement rating. |
| Medium: planning information | The tabletop hides its stage list; the current ward's cost alone is insufficient to plan later resource commitments. | Each sample exposes every named ward and its exact costs through the visible **Ward Plan** control. Browser tests open the plan and verify rendered cost symbols. |
| High: short-screen Cast interception | At 320×568, solving the final sample leaves hand cards capable of intercepting a pointer click on Cast. Keyboard legality alone missed this. | Scoped practice CSS removes the vault's isolated stacking context and lifts the interactive cauldron controls above the hand. The regression uses ordinary Cast clicks; no forced clicks. |

The five sample boards use the current reducer and existing tabletop, choice dialogs, keyboard navigation, hand, art fallback, hints, auto-payment, Undo, Restart and map controls. Access them through **Learn Mana → Decision Lab**. They are unscored and do not persist campaign, lesson or bonus results. Next Decision stays in the sample ladder; the last sample returns to its picker. Campaign levels, original IDs, engine rules, save keys and stored medals are unchanged.

Only `mana-heist/**` is touched. Runtime source: `src/decision-ladder.js`, `src/main.js`, `decision-ladder.css`. Offline tooling: `src/decision-analysis.js`, `src/decision-checkpoints.js`, `scripts/audit-decision-ladder.mjs`. Regression checks: `tests/decision-ladder.test.mjs`, `scripts/test-decision-ladder-browser.mjs`. The nested package/lock pins the optional browser test dependency; gameplay remains dependency-free.

## What the equation establishes

For an explicitly authored checkpoint, enumerate legal alternatives within the same decision. Deduplicate identical successor states. Solve each successor twice: once for the current ward and once for the whole vault.

- I: alternatives with a proven route through the current ward.
- W: alternatives with a proven finish of the whole vault.
- Deferred traps: can clear the current ward, but exhaustive search proves no whole-vault finish.
- Deferred pressure: **log2(I / W)** bits, only when all searches complete and W > 0.

A budget exhaustion returns `inconclusive` and null totals/pressure. It never becomes a low score or a proven loss. No winning option in the selected alternatives is distinct from proving the entire puzzle unsolvable. Budgets are enforced per solve, not a global runtime cap; this is offline tooling, never called in the gameplay render loop.

This diagnostic does not use click count, turn count, stage number, or source count. Duplicate successors do not increase it, and forced repeated blue wards both return zero. It establishes **a particular form of delayed consequence**, not a player's solve probability or total mental effort. Obviously bad moves can still count as deferred traps if other resources clear the first ward; equivalent strategic plans can remain separate successor states. Checkpoint selection is authored, not exhaustive. The current engine/solver abstractions remain its authority. Do not extrapolate these values to all campaign puzzles or to Stackbreaker.

| Sample | Intended additional skill | Reference actions | Options | Whole-vault wins | Deferred traps | Bits at selected checkpoint |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| D1 Two Colors, Two Sources | Exact color matching | 3 | 2 | 1 | 0 | 0 |
| D2 Keep the Red Key | Preserve a flexible source for a later ward | 4 | 2 | 1 | 1 | 1 |
| D3 A Filter Needs Fuel | Reserve an activation input and choose the output | 6 | 4 | 1 | 3 | 2 |
| D4 Tomorrow's Life | Land order and a life budget across two turns | 12 | 3 | 1 | 2 | 1.585 |
| D5 The Interlocking Vault | Combine land order, life and opposite filter roles across turns | 18 | 3 | 1 | 2 | 1.585 |

Reference action counts are replay evidence, not difficulty ratings. The checkpoint bits are intentionally **not monotonic** across this proposed teaching order: one scalar does not capture switching between different skills or combining them. In particular, D5's land-choice probe alone cannot quantify its filter dependencies. Player calibration is required before calling the order a smooth difficulty curve. Existing main-site game difficulty has not changed.

## Repeatable verification

From repository root (Node 24):

```sh
node --test mana-heist/tests/*.test.mjs
node mana-heist/scripts/audit-decision-ladder.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

Optional browser checks:

```sh
npm --prefix mana-heist ci
cd mana-heist
npx playwright-core install chromium
npm run test:browser
```

For a preinstalled matching browser, set `PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_EXECUTABLE_PATH`. Optional `SCREENSHOT_DIR` captures each initial sample board. All HTTP assets are snapshotted from this checkout into a local server; external traffic is blocked. No production account, API, database, membership or user content is involved.

Baseline: **215/215** Node tests. Updated suite: **231/231**, including all existing authored/campaign route, auto-cast, save and UI-source checks. Five decision probes complete with legal replayed solutions; bounds and forced repetition regressions pass. Browser verification: **20/20 sample playthroughs** at 320×568, 375×667, 390×844 and 1280×900. Each covers Ward Plan visibility/costs, no title/control overlap, turn/life labels, ordinary pointer Cast, keyboard source/land choices, Undo, Restart, next/return, unchanged campaign/lesson/bonus saves, and no page exception or horizontal overflow. Each viewport also opens an existing lesson and bonus trial and solves the first campaign vault with local persistence. Screenshots were visually inspected at 320px, 390px and desktop with external card art blocked; this is not genuine online art acceptance. The final sample additionally has regressions proving its filter must produce UU on turn one and RR on turn two. Existing path-triggered Mana Heist CI automatically discovers the new Node test; the optional browser suite is a separate local command, not yet a required GitHub Actions job. `npm audit`: zero reported vulnerabilities for the pinned development dependency on this run.

## Rules and compatibility

Engine and replay version stays **mh-landfall-0.2.0**. Diagnostic version: **mh-decision-checkpoint-1**. No engine/payment kernel change; five new `mh-decision-*` IDs are outside the campaign and saves. The samples remain **simplified Mana Heist puzzles**, not Oracle-certified Magic instruction.

Official rules site checked October 26, 2026: [Wizards rules](https://magic.wizards.com/en/rules) currently links to [Comprehensive Rules effective September 25, 2026](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt). Reviewed 107.4a–c (colored, generic and true colorless), 305.2/305.6 (land plays/basic types), and 106.4 (pool expiration). Existing campaign turn-boundary expiration remains an explicit approximation to the official step/phase rule. Life/damage and card-specific implementations are unchanged.

Attempts to retrieve the current Gatherer pages/searches for Cascade Bluffs, Drowned Catacomb and Underground River failed through the available retrieval service. Their implemented effects were checked against this engine's legal actions and replay tests; **current Oracle verification is still outstanding**. No complicated new card interaction or new mana rule was implemented; Forge comparison was not performed. Neither legal-route proofs nor a successful browser solve certify official rules fidelity. Rights clearance remains blocked separately.

## Coordination, rollout and rollback

Started from Lab main `3d634002b46a957f34fe6009c4a268a0001b1868`; website main observed `9bc3882a4d2e8de8781799b2c059b59826efe752`. Older Lab #128 owns `tabletop-immersion.css`, `ROADMAP-1.0.md` and its October 20 release record; none is changed here. Stackbreaker #129 is also untouched. This record is the package handoff without claiming a completed roadmap milestone or creating a same-file collision.

Merge, deployment and production promotion require separate approval. Revert this PR to remove the optional sample mode/tooling; no score/save migration or production rollback is needed. Review interaction with #128 after it merges and repeat relevant browser checks on any combined head.

## Remaining work, in order

1. Owner review of these five samples; resolve current Oracle text access and existing rules/rights gates before educational certification.
2. Small human playtest: record unaided completion, time, restarts, chosen traps, perceived difficulty and clarity. No automatic telemetry is introduced here. Adjust D3/D4 order from evidence rather than forcing diagnostic numbers to rise.
3. Extend independently proven checkpoints to filter-role reversal and life commitments in D5, then representative campaign families; identify alternate winning strategies and equivalent choices.
4. Develop a multi-factor model from those results and validate it on held-out puzzles. Keep action burden separate from strategic complexity. Version any revised campaign puzzles/scores through the existing migration process.
5. Apply the same evidence standard to Stackbreaker in its own branch and workstream. Full-game difficulty certification, physical iOS/Android testing, genuine online card-art acceptance and a site-wide audit are not completed by this batch.
