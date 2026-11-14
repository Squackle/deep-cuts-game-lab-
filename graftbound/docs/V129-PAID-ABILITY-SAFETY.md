# GRAFTBOUND v1.2.9-beta — paid-ability safety and ranked replay isolation

**Workstream:** Game Lab only, `graftbound/**`. Base: `b8bef333e0b80d600047dffab4016807b8a38c68` (v1.2.8-beta). The main DeepCutsEDH website, other Game Lab titles, Cloudflare configuration, public leaderboards, D1 and accounts are out of scope.

## Bug and intended behavior

Two newly introduced optional graft powers can previously accept mana while yielding no usable game benefit.

1. **Reassembling Skeleton** — the power was offered when the Skeleton was absent and 2 mana were available even if there was *no legal unoccupied tile* on the battlefield. The reducer consumed mana and counted an action, but `comboToken` returned null. The action is now unavailable until a legal tile opens. Once it does, the same 2-mana activation creates the exhausted Skeleton normally.
2. **Mentor of the Meek** — an optional 1-mana draw was offered even if the encounter Library and Graveyard were both empty. The paid option now requires at least one real drawable/recyclable card; Skip remains available. Existing deck recycling and actual mana spending are unchanged.

These are **GRAFTBOUND-specific tactical rules**, not claims about Magic's official empty-library or battlefield-space rules. All rewards remain genuine curated card identities, with adaptations disclosed.

## Versions and save safety

- Rules: `graftbound-rules-1.2.9-beta`; fixed Expedition challenge revision **16**.
- Package/UI: `1.2.9-beta`. No card pool or score formula changes.
- Run schema **v9** and battle schema **v10** stay unchanged; no save keys or game state are deleted.
- Existing saved ranked playthroughs recorded under older rules are archived to `archivedRanked` when loaded, retaining their campaign progress rather than being replayed against new decisions. The normalized save envelope is persisted. New ranked runs use the new revision; the previous version is not misrepresented as verified.
- Known historical limitation: only one `archivedRanked` replay snapshot is retained in a save. Never use this archive as a public scoring claim.

## Deterministic regression coverage

In `tests/v128-combo-expansion.test.mjs`:
- A fully occupied 7×9 battlefield cannot offer or charge Skeleton revival, cannot increment actions, and can revive for exactly 2 mana when a tile reopens.
- Mentor cannot pay for a draw without any live/reshufflable card, but can pay once a real card enters the Graveyard.
- A previously saved ranked v1.2.8 adventure is loaded without losing its world map, with its old ranked revision archived.

## Verification before release

1. `cd graftbound && npm test` — including all earlier regressions.
2. `node --check` for changed JS modules, build/asset audit if platform requires.
3. GitHub Unified Game Lab and release-coordination CI for the **exact PR head**; no skipped required gate.
4. Cloudflare Game Lab preview smoke test and mobile Graft Powers panel, then production-environment confirmation after main merge.
5. Physical iPhone Safari is **not independently verified** by these source tests; continue beta labeling.

**Rollback:** Revert only this GRAFTBOUND PR to restore previous Game Lab `main`. Keep the user's unchanged `deepcutsedh.livingcard.*` local saves and archived replay evidence. No public DeepCutsEDH promotion is part of this change.
