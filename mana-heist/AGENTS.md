# Mana Heist — instructions for future development agents

**Read first:** [ROADMAP-1.0.md](ROADMAP-1.0.md) (15 release packages and acceptance/status), [RULESET-1.0.md](RULESET-1.0.md) (current simplified mechanics vs reviewed 1.0 target), [README.md](README.md) (historical releases), and [../AGENTS.md](../AGENTS.md) (repository-wide ownership and deployment restrictions). If these conflict with live code, **verify the code and tests**, log the mismatch, and ask before changing rules.

## Assignment and mission

Maintain **Mana Heist**, a standalone mana-learning puzzle game under `mana-heist/**` on `Squackle/deep-cuts-game-lab-` (trailing hyphen is intentional). The owner wants a polished, educational 1.0 based on **5 galaxies × 5 worlds × 10 levels = 250 levels**, with accurate instruction, satisfying interactive cauldron and usable mobile controls.

The **roadmap is an approved planning baseline, not blanket permission** to implement, merge, deploy or publicly promote all 15 packages. Start by identifying which package the owner actually authorized in this turn. Documentation updates may be made when specifically requested; code releases require their own clear approval. The project is **not a license to create/distribute an official Magic game**.

## Rules of engagement

1. **Follow the 15 packages in ROADMAP-1.0.md:** P01–P03 foundations/rules/validator; P04–P05 Learn Mode and hints; P06–P10 five curated galaxies; P11–P13 accessibility, visual polish and saves/replay; P14 testing; P15 launch *only* after approvals and rights review.
2. **Do not invent completed status:** existing 250 levels are validated variants of 18 core authored puzzles; they have not passed the 1.0 educational review. Maintain the explicit status ledger with evidence, not assertions.
3. **Protect the source of truth:** `src/engine.js` owns legal game state; `src/auto-cast.js` owns automatic legal casting; `src/levels.js` and `src/solver.js` own puzzle definition/proofs. Visual cauldron modules are presentation only and cannot change legality.
4. **Never claim full Oracle accuracy:** current engine simplifies Magic interactions (including Simic Growth Chamber producing one color rather than both, and floating mana draining at turn boundary). Official behavior versus deliberate abstraction must be decided and tested in P02 before educational 1.0 claims.
5. **Protect saves and puzzle identity:** retain `dc-mana-heist-landfall-v2` and the first 18 stage IDs; maintain 250 unique IDs and sequential unlocks, or implement a reviewed migration with rollback. Any updated mana rule requires re-solving affected levels under automatic casting.
6. **Preserve the player's controls:** tap land to create mana, automatic cast after charge, Undo/Restart/Map, clearly labeled last turn, visible hand and battlefield on mobile, hover-to-zoom and scrollable hand, mouse movement to stir / touch drag on mobile. Keep a non-drag alternative on the 1.0 backlog.
7. **Do not confuse Lab and public site:** Mana Heist development belongs under `mana-heist/**` only. Never edit Stackbreaker, Hive Run, shared `lab/**`, account/leaderboard endpoints, public `deep-cuts-edh`, ads or Cloudflare D1 as part of this workstream without explicit separate coordination and owner authorization.
8. **IP and privacy are gates:** existing genuine Scryfall card images are a Game Lab experiment, **not licensed public product art**. P01 must resolve clearance versus an original-art route before public release. Do not copy private keys, emails or user profiles into test fixtures or documentation.
9. **Check concurrent agents:** determine current `main` SHA and open PRs before branching. Use a fresh `game/mana-heist-*` branch for **all Mana Heist changes, including documentation-only changes**: the repository's release-coordination CI enforces that prefix for any `mana-heist/**` path. Do not overwrite another agent's shared work.
10. **Test before release:** run `node --test mana-heist/tests/*.test.mjs` and syntax checks, verify all 250 stages, 18 stricter originals, auto-cast, and changes to engine/rendering/progress; check real browser on relevant viewport sizes and physical phones when needed. Report what couldn't be tested.
11. **Document each package handoff:** update status, PR, commit, changed paths, CI run, preview/live evidence, UX limitations, rules engine version, migration notes and rollback in the roadmap before claiming a milestone is done.
12. **Deploy only after explicit approval:** a successful Game Lab PR, CI, or Cloudflare deploy is not permission for a public Deep Cuts EDH update. Public promotion needs separate owner authorization, verified Lab SHA, rights approval and integration review.

## Useful commands

```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

**Expected PR metadata** (exact fields for repository coordination check):

```text
Workstream: Game Lab
Owner authorization: <this turn's explicit request>
Files/Scope: <only the intended files>
Concurrent work: <main SHA and overlapping PRs>
Test plan: <actual commands and checks>
Rollback: <revert/restore steps>
Rules version: <existing or new engine version>
Main-site impact: NONE
```

Do **not** add punctuation to the literal `Workstream: Game Lab` line. Follow any additional current CI template fields.

## Next unstarted package

**P01 — Release Foundations** technical baseline is documented in [release/FOUNDATIONS-P01.md](release/FOUNDATIONS-P01.md), [release/MECHANICS-MATRIX-P01.md](release/MECHANICS-MATRIX-P01.md), and [release/ASSET-RIGHTS-P01.md](release/ASSET-RIGHTS-P01.md). P01 status: **BLOCKED on owner's rights/brand strategy decision and qualified sign-off**; do not claim public release is cleared. **P02 — Mana Engine 1.0** is the next *unstarted implementation package*, but may begin only with a fresh owner instruction and clarified rules scope. Read P01 risks and source-matrix first; do not silently rewrite engine or cards.

For human-readable goals and package status, use [ROADMAP-1.0.md](ROADMAP-1.0.md). For everything a mana/puzzle change must preserve, use [RULESET-1.0.md](RULESET-1.0.md).
