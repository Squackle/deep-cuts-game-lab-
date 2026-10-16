# Mana Heist — Ruleset: current implementation vs. 1.0 contract

**Status:** Working contract for future developers (2026-10-15). **Not an official Magic rules document** and not a claim of Oracle accuracy. The code is currently a self-contained *mana-puzzle* rules engine; the public 1.0 curriculum's supported rules must be explicitly reviewed and versioned in **P02**.

**Agent entry point:** [AGENTS.md](AGENTS.md). **Release package plan:** [ROADMAP-1.0.md](ROADMAP-1.0.md). **Historical playtest development:** [README.md](README.md).

## 1. Authority, priority and versioning

1. **Current executable truth:** `src/engine.js` (`VERSION = "mh-landfall-0.2.0"`) owns legal actions and state mutation. `actions(level,state)`, `reduce(level,state,action)`, `payOptions`, `initial`, `validate`, `completed`, `medal` define the current game. Reuse these rather than duplicating gameplay logic in UI.
2. **Puzzles:** `src/levels.js` defines `BASE_LEVELS` (18 authored), `LEVELS` (250), `CHAPTERS` (25), `GALAXIES` (5). `src/solver.js` is the current proof source. Solver returns `inconclusive` for exceeded bounds; this is **not** proof that a puzzle cannot be solved.
3. **Mandatory auto-cast:** `src/auto-cast.js` chooses a legal `cast` action when mana meets the current ward, and its `resolveAutomaticCasts` variant applies consecutive legal casts. Players do not press a Cast button.
4. **Visuals only:** `src/fluid-ward.js`, `src/pigment-mixer.js`, `src/fluid-palette.js`, `src/ward-charge.js`, `src/mana-orbs.js` can depict charged, consumed or expelled mana but **cannot** make previously illegal actions legal. Dye blending changes displayed colors, never mana identities or payment rules.
5. **Future source of truth:** P02 should introduce an explicit, tested **1.0 supported-mechanics specification** and an updated engine/replay version where necessary. Do not silently change current code to match an imagined full Magic simulator.

### What the current model does (engineering facts; not marketing copy)

- **Mana colors:** `W` (white), `U` (blue), `B` (black), `R` (red), `G` (green), `C` (true colorless).
- **Spell costs:** a `cost` object can contain exact colored/colorless symbols and `N` (generic amount). The `N` requirement can be paid using any leftover color after exact symbol requirements are reserved. **True colorless `C` is not generic.**
- **Land play:** one land per turn, from `state.hand`, subject to legal choices. Land options include shock life-payment choice and bounce return target.
- **Tap:** an untapped land provides one chosen symbol from the engine's `CARDS[card].colors` array; tapping marks it tapped. This is a deliberately **simplified one-symbol-per-tap model**. Fetch land has a separate `fetch` action.
- **Life:** shock-land untapped entry costs 2 life, eligible pain-land colored taps cost 1, eligible fetch land costs 1, and life-paying actions are disallowed if they would take life to 0 or less.
- **Entering tapped:** shocks enter tapped if the player does not pay; bounce lands enter tapped and return another land; check lands consult matching basic land types already on the battlefield. The engine has no stack or opponent.
- **Fetch:** selected fetch sacrifices itself, pays life, chooses a matching eligible target from its fixed `level.library`, and enters that land using the game's entry rules.
- **Untapping:** normal `end` action increments turn, allows another land drop, clears the whole floating mana pool and untaps battlefield lands. A spell may explicitly `untap` one tapped land.
- **Turn limit:** `end` is legal only while `state.turn < level.turnLimit`. On the final turn, `FINAL TURN` is a UI explanation rather than a legal third turn. Undo/Restart still recover; **do not silently extend authored puzzle deadlines**.
- **Casting:** when the current ward's entire cost is payable and the automatic payment selector finds a legal option, the game casts after a short optional water-stirring window; extra suitable mana may remain for a subsequent ward.
- **Progress & medals:** `src/campaign.js` sequentially unlocks one stage after another; `5 galaxies × 5 worlds × 10 levels`; bests are stored under `dc-mana-heist-landfall-v2`. Three-star scoring is based primarily on solver turns/life. Preserve past progress when evolving the rules; save migration may be required.

### Supported land archetypes to audit in P02

| Archetype | Current simplified engine | 1.0 audit obligation |
|---|---|---|
| Basics / original duals | One color per tap from allowed `colors`, duals have two land types | Check legal mana outputs and typed interactions |
| Shocks | Enter tapped unless paying 2 life | Check real entry choice and life restrictions |
| Pain | Colored mana costs life; colorless is free | Check all colorless vs colored payments and life cost |
| Checks | Enter tapped absent specified typed lands | Check exact land-type queries and timing |
| Fetch | Pay life, sacrifice, search the puzzle's fixed library | Clarify limited-puzzle library; confirm cost, targeting, shuffle assumptions and entry |
| Bounce | Enter tapped and return another land; engine currently produces one of U/G | **Mismatch:** Simic Growth Chamber's real tap ability produces both U **and** G; a player should not be taught current simplified output as actual printed behavior |
| Wastes / utility | Tap for one `C` | Confirm colorless `C` and generic `N` differences |

**Other notable divergence:** Real Magic mana ordinarily empties from mana pools at the end of **each step and phase**, not just at end of turn. The current two-action turn abstraction only clears on `end`. Decide in P02 whether to model steps/phases or clearly brand the title as a simplified land-resource learning puzzle. Never describe its current engine as an Oracle-accurate simulation.

### Rules fidelity decision matrix (P01/P02 deliverable)

For each supported mechanic, future agents should fill a record:

| Field | Required evidence |
|---|---|
| Mechanic / card identity | Exact supported mechanic and illustrative cards |
| Source | Current official card Oracle text and applicable Comprehensive Rules or authorized licensed specification, with review date |
| Engine semantics | Actual action/state transition and script files |
| Playable puzzle behavior | Test cases, especially interactions with auto-cast and existing puzzles |
| Scope | `ACCURATE`, `SIMPLIFIED AND DISCLOSED`, or `UNSUPPORTED` |
| Migration | Existing 250 puzzles affected? Level fixes, solver updates, save/replay versioning |
| Review result | Reviewer, test URL/commit SHA, current status |

## 2. Future 1.0 learning rules (proposed, not shipped)

1. **Foundations before complexity:** players learn land vs mana, tapping, one land drop/turn, colors, generic, true colorless and untapping before shock/pain/fetch/bounce interactions.
2. **Learn Mode is optional:** tutorials explain what's happening; Challenge Mode remains playable without forced tutorials. Neither mode secretly changes legal mana costs.
3. **Three-step hints:** conceptual nudge; targeted mechanical clue; explicit solver-valid solution. Hints must reflect **this exact current level and state**, not a generic or invalid route. Never show the full answer without a user action.
4. **Post-win teaching:** concise explanation of the correct resource decision, why alternatives failed, and which concept carries into real Magic (if verified).
5. **250-stage curation:** keep original progression structure, review puzzle variants and unintended wins, ensure five themed galaxies of progressively harder concepts, manually curate ~10 anchor puzzles per galaxy.
6. **Mandatory legal auto-cast:** the user should not need to press Cast. Preserve mana-color accounting and complete tests on this behavior.
7. **No false prompts:** e.g. final-turn tapped land cannot say “End your turn to untap” if the turn limit forbids ending; use precise actionable feedback.
8. **Preserve user intent:** stirring cauldron is playful, optional and purely visual; don't require stirring to solve a ward. End-turn/Undo/Restart/Map should clear or reconstruct the fluid exactly from authoritative state.
9. **Accessibility:** full card names/text, color names/pips (not hue alone), mobile taps and drags, keyboard/focus; provide a practical **non-drag alternative** for placing lands, reduce-motion/reduced-FX support, mute.
10. **Progress safety:** do not delete or reorder level IDs, medals or saves casually. Test migrations for engine version, save format, and revised puzzles.

## 3. Testing and change-control rules

### Required commands and validation

```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

For a rules change, at minimum:

- Verify `validate` and deterministic `replay` of every level under the **new** engine.
- Test the player-facing **auto-cast** path, not just manual solver actions. Existing tests exhaustively exercise the 18 original puzzles; extend those checks to affected generated levels.
- Detect illegal pay allocations, generic vs colorless mistakes, life-payment edges, multi-symbol production, unused mana at turn/phase boundary, and last-turn softlocks.
- Keep `key(state)` and historical replay/save behavior consistent or explicitly migrate them.
- Test untouched 250 stage IDs and new puzzle difficulty/uniqueness metrics.
- Verify browser play at phone widths 320, 375, 390 and desktop; actual-device checks for mobile gesture, card visibility, scroll and focus should be separate evidence from headless tests.
- For cauldron changes, test pigment proportion conservation, drawing reset when mana is removed, Canvas fallback, and reduced motion.
- Confirm all changed functions are reflected in teaching copy and hints.

### Release and authorization rules

- **Scope:** update only `mana-heist/**` in Lab. `lab/**`, Hive Run, Stackbreaker and `deep-cuts-edh` belong to other workstreams.
- Check the current default branch SHA and open PRs, branch from latest main, and don't race a parallel agent's touched paths.
- Follow repo-root `AGENTS.md`. Use exact PR metadata when CI requires it, including an independent line **`Workstream: Game Lab`** (no extra punctuation).
- A package is **not** completed until its specific acceptance tests pass and evidence is in the roadmap status ledger.
- Preview first and report UI functionality proven in a browser, not merely compilation. Keep a rollback plan and exact SHA.
- Separate Game Lab merge from public-site promotion. **Each deployment requires fresh owner authorization.**
- Nothing in this document grants permission to use Wizards IP in a public commercial or free game. Review [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy), [Scryfall API documentation](https://scryfall.com/docs/api) and rights to card images/names; seek appropriate legal review. Public 1.0 requires permissions or a separately reviewed original-asset direction.
- Do not add public identities, live score submission, production D1/database access, subscriptions, or ads to the solo Lab.

## 4. Explicitly deferred / non-goals

Do not turn 1.0 into a full MTG client, multiplayer platform, tournament ladder, universal deck importer or complete game rules implementation. Such work requires separate product, engineering and rights authorization.

**Rules review gate:** P02 is the stage that decides exact educational fidelity. Until then, describe current behavior as a *simplified standalone mana puzzle*, never as canonical Magic gameplay.
