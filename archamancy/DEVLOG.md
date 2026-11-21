# ARCHAMANCY development log

## 2026-11-21 — v0.0.1 Foundation (draft pre-release)

Owner authorized implementation after approving the new name and project design. All work remains in `archamancy/**` on `game/archamancy-v001`, in Squackle/deep-cuts-game-lab-. No catalog, other game, production website, public profiles or ranking changes.

Implemented:
- Deterministic 100 ms logical ticks, seeded wave ordering, command and bounded event history.
- Verdant Passage temporary procedural battlefield, 24 fixed pads, spring and height bonuses, five provisional enemy waves.
- Legion Hall (soldiers), Arcanum (magical slow), Necropolis (undead), Pyre Battery (physical ground splash), Mana Grove (passive combat-time income).
- Three placeholder upgrade tiers, 70% resale, rally relocation, enemy armor/resistance, flight, ground blocking, fortress health and terminal win/loss.
- Responsive canvas/DOM prototype with build-pad selector, construction, upgrades, rally selection, wave previews, pause and speed controls, restart and statistics.
- Node-compatible engine tests: run `node --test archamancy/tests/*.test.mjs` from repository root.

Verification in this session: executed the 12 engine scenarios against fetched/generated JavaScript in an isolated JS runtime, including a reproducible five-wave victory (seed 1, health 17/20, 99 kills, 3 leaks, 1015 mana). The renderer/controller function parsed successfully. These results are not a browser interaction test, cross-game regression run, Node CI result, accessibility audit, or deployed-preview verification. Full Lab regression and browser tests remain release gates; catalog and shared CI integration are separately tracked in issue #230.

Known limitations: temporary map art, only five towers, only five waves, no drag-based rally yet (tap target supported), no cards or general trigger dispatch, no endless mode or sandbox, no full attribution breakdown, no commander system, no production save/ranked features. No balance or performance claim. All eight owner non-negotiables still required for v0.1.0.

Next: strengthen troop combat and rendering, add remaining ten tower definitions with distinct behaviors and economy/upgrade tests; lay out the card state and explicit effect dispatcher against shared events, then continue DESIGN.md milestones. Keep rules deterministic and original.
