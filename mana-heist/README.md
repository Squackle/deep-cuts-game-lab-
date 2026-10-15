# Mana Heist — Landfall playtest 0.2

**Game:** Mana Heist: Crack the Vault  
**Route:** `/mana-heist/` on the **standalone Deep Cuts Game Lab**, not the public Arcade.  
**Rules engine:** `mh-landfall-0.2.0` (self-contained, deterministic, no servers).

## What's new

Version 0.2 rebuilds the original abstract relay game around **tappable land cards outside the vault**, a visible mana pool, land drops, casting ward-breaking spells, life decisions and tight turn deadlines. The battlefield is a land row separate from the vault; tap a land to add exactly one of its possible colors and rotate it sideways. Tapped lands remain unavailable until you end the turn. The player must cast a sequence of named spells to open a vault.

Cards are **original land designs and names** inspired by familiar land *categories* rather than copied Magic: The Gathering card art, names, icons, or complete game rules. The land archetype names “basic”, “dual”, “shock”, “pain”, “check”, “fetch”, “bounce”, and “utility” describe what they do.

### How to play

- **Land drop:** One card may be played from hand each turn; existing battlefield cards begin untapped.
- **Tap:** Click or tap a battlefield card. Monocolor lands tap instantly; multiple-color cards offer a choice of exactly **one** mana color. The card visibly turns 90°.
- **Pool:** All produced mana goes into a visible, colored/lettered pool. It persists between actions and empties when ending the turn.
- **Cast:** Spend exact colored costs plus any colored/colorless payment for generic requirements. When generic payment is ambiguous, select a real allocation. Spell effects may let you choose and untap a land.
- **Land families:** Shock lands enter tapped unless you pay 2 life. Pain lands charge 1 life for colored mana but give colorless freely. Check lands depend on typed lands already in play. Fetch lands sacrifice themselves and charge 1 life to get a matching reserve land. Bounce lands enter tapped, returning another land to your hand. Duals tap for one of two colors.
- **Life:** Life can never reach 0. You lose only if an action would be illegal, but may always Undo or Reset. The level deadline forbids another end-turn action after its last turn.
- **Scoring:** Three stars when solved within the solver's fewest turns and least life spent among those fastest solutions; two for up to one extra turn (within deadline), one otherwise. Extra taps are **not** punished as clicks.

## Complexity ladder

| Levels | Chapter | Difficulty | Core decisions |
|---|---|---|---|
| 01–03 | The First Key | Initiate | Single taps, hand-to-field timing, unspent mana reset |
| 04–07 | False Shores | Rookie to Tactician | Two-color duals, shock-enter choices, tempo vs. life |
| 08–11 | The Ledger | Tactician | Pain lands, typed check lands, generic vs. colored costs |
| 12–15 | The Deep Search | Expert | Fetch target selection, shock sequencing, untap spells |
| 16–18 | The Grand Heist | Mastermind | Bounce-land land drops, alternative life costs, chained multi-ward puzzles |

The final three test nested resource requirements and sequencing across multiple turns; the final vault has **three successive wards**, five possible battlefield lands, color competition, shock and pain decisions, and a strict turn limit. No daily repetition or randomness is involved.

## Engineering quality gates

- Pure engine in `src/engine.js`, with `reduce(level,state,action)`, `actions(level,state)`, `key(state)` and strict puzzle validation. UI and solver use the *same* legal action list.
- Search in `src/solver.js` prioritizes minimum turn count, then minimum life spent, then minimum action count. The search reports `inconclusive` if bounded before completing; it never falsely calls a timed-out puzzle unsolvable.
- All **18 authored levels are solver-proven**, including exact optimal replay through the live reducer. Latest CI evidence: `18:24:59 UTC, 2026-10-15`; 4,625 distinct explored state keys across 18 levels, 0 Node test failures on branch version 0.2.
- Source syntax, isolated API checks and backend separation included in `.github/workflows/mana-heist.yml`.
- Local guest best medals use `dc-mana-heist-landfall-v2` browser storage; v0.1 saves remain untouched. No accounts, profile bling, leaderboard, D1 or external APIs.
- Cloudflare preview smoke test at 390px: 18 picker levels loaded, single-land tap changed card to sideways, blue mana added, spell opened first vault and awarded ★★★, no horizontal overflow. Broader manual physical device testing still recommended.

Run local checks from repository root:

```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

## Scope and copyright

This is a simplified *original* mana-base strategy game; it does **not** implement the entire Magic rules engine, Magic card text, Wizards marks, or official land image assets. Exact Wizards card art/names and full proprietary components are not included pending appropriate permissions. The game is free and standalone.

### Future after playtesting

- Tune the five difficulty ratings from actual player performance and misplay rates rather than just solver search size.
- Add 6 optional expert “Black Vault” scenarios with near-optimal-line constraints, multi-choice fetches, and intertwined abilities.
- Add optional move-by-move hints only after proven replay paths; preserve challenge integrity.
- Consider original licensed illustrations/audio and improved keyboard-first controls.

The **Game Lab** may be updated with owner authorization and its own CI/preview. **Do not deploy the public Deep Cuts EDH Arcade** without a separate owner-authorized integration PR and website developer review. Hive Run's systems remain separate.
