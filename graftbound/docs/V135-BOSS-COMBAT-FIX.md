# GRAFTBOUND v1.3.5-beta — Legendary boss combat fix

The six real-Magic legendary bosses retain their existing card-derived signature abilities and encounter health, but their tactical AI now participates in combat rather than treating the special ability as its entire turn.

## Cause
The legendary branch in `src/engine/ai.js` only called `approach()` for four bosses. Nemata and Krenko never received a movement plan. Nemata queued Saproling generation and pumping with no normal strike; Krenko tapped to create Goblins every turn and never attacked.

## Behavior
- **Nemata:** Advances into legal adjacency; can melee while using the non-tap Saproling creation/pump abilities.
- **Arasta:** Moves, attacks the nearest player-side creature, and still spawns spiders from the real-card spell-cast trigger.
- **Drakuseth:** Advances and attacks; the multi-target 4/3/3 fire trigger remains tied to an actual attack.
- **Krenko:** Moves toward its opponent, alternating printed tapped Goblin summoning turns with untapped attack turns. It never attacks on a tap-to-summon turn.
- **The Scarab God:** Can advance and attack while retaining its upkeep, graveyard reanimation and return-to-hand behavior.
- **Toxrill:** Moves and attacks while its end-step slime effects remain unchanged.
- All six can choose an adjacent or nearer Soldier instead of ignoring allies.
- Rooted, stunned, blocked and hazardous moves use existing legal pathing and restrictions.

The existing three legacy boss tactical patterns remain unchanged.

## QA and replay
- Dedicated tests cover movement, real damage events, Nemata attack plus summoning, Krenko tapped turns, Soldier targeting, intent determinism, and immobilization.
- Game rules fingerprint updated to `graftbound-rules-1.3.5-beta`, challenge revision 18. Existing unranked adventures and save keys are unchanged.
- PR must pass GRAFTBOUND, unified Lab, release-coordination and Cloudflare preview gates before merge and production SHA confirmation.

Rollback: revert only this Game Lab PR.
