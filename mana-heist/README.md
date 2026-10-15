# Mana Heist — First Playtest

**Environment:** Standalone Deep Cuts Game Lab ONLY. No production Arcade promotion.
**Path:** `/mana-heist/` within `Squackle/deep-cuts-game-lab-`.
**Engine:** `mh-core-0.1.0` — deterministic, single-action turn model.

## Play
Open `mana-heist/index.html` through any static web server, or use the Game Lab's `/mana-heist/` route after approved deployment.

Tap a device tile to inspect it, then tap the action button in its Device Dossier. Sources grant energy; dual source offers exactly one of two choices; converters spend input; relays turn clockwise; the vault spends its stated resources. Every successful action costs one move. Undo and Reset are free. There is no hard move limit and no timer. All six vaults are always available for testing.

## Tutorial progression
1. First Light: one Sun source, one seal.
2. The Paired Key: collect Sun and Tide.
3. The Alchemist: two Sun charges, one Sun-to-Ember exchange.
4. A Crooked Wire: one disconnected relay, reachability.
5. Switchback: three clockwise turns through a winding circuit.
6. The Twin Gambit: dual-choice source, converter, and conduit.

## Engineering contracts
- Immutable game transitions via `src/engine.js` and `applyAction`.
- Graph traversal uses reciprocal orthogonal connector ports. Devices must be connected to the vault **when activated**; collected energy then remains in a shared satchel.
- Converters cannot run without their inputs, and spent energy cannot pay twice.
- Gate opening counts as one move. The move budget is an optimal medal target, **not** an attempt failure limit.
- Unit-cost BFS in `src/solver.js` proves minimum-move solutions; hitting its state bound returns `inconclusive`, never `unsolvable`.
- All player interactions use the same legal-action reducer the solver uses.
- Guest best scores and selected vault are saved in browser storage key `dc-mana-heist-progress-v1`; no profile, backend or leaderboard calls.
- No Wizards card artwork, Magic mana symbols, borrowed icons, or external script/font dependencies.
- Unused resource types Shadow and Grove are reserved for later authored vaults.
- New game files are confined to `mana-heist/**` plus one dedicated CI workflow.

## Automated checks
```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/main.js
```

## Current limits
Six handcrafted tutorials only. No Endless generator, reservoir mechanic, sound, server scores, profile unlocks, production integration, or daily rotation. Physical touch-device and full cross-browser QA should be completed as separate acceptance work. Do not treat Cloudflare deploy success alone as proof of gameplay.

## Release
Promote to public `/games/mana-heist` only via new user authorization, separate Website Developer integration, explicit source SHA and reviewed QA. Keep Hive Run's prototype page, source modules, solo scores and retired `410 Gone` API unchanged.
