# Hive Run — Game Design Document (GDD), Alpha 0.2

**Public game identity: Hive Run, original art** · First drafted 2026-10-13 · Implemented playable Alpha 0.2 evolution systems. "Sliver Swarm" remains an unlicensed working inspiration, not the public title.

## Vision and pillars

A quick-to-learn, difficult-to-master Snake-inspired arcade survival game about original fantasy hive creatures. Collect brood, grow a continuous swarm, draft mutations affecting every segment, avoid collisions, and chase scores across increasingly hazardous stages. Retro 1990s pixel art, forest green/gold UI, and optional chiptune atmosphere.

**Tagline:** A growing hive. Endless mutations. One mistake ends the run.

Core principles: understand gameplay in five seconds; whole-swarm evolution differentiates this from Snake; high scores increase alongside movement difficulty; portrait mobile works from day one; restart is immediate; visuals are readable at phone sizes. Rethink35's Frogger adaptation inspired a simple topical arcade format, not its assets or code.

## Mobile-first screen plan

- Top HUD: compact identity, score, best score, sound toggle.
- Play field: responsive pixel-crisp grid; **18 × 22 cells is an illustration**, not a locked balance/design decision.
- Bottom HUD: stage, brood remaining to the next mutation, available defensive charges.
- Controls: swipe anywhere within the active play field; no need to rotate the phone. Desktop supports arrows/WASD. Visible pause, restart and onboarding. Optional alternate on-screen arrow controls if testing shows swipes are insufficient.
- End screen: score, personal best, stage survived, mutation build and one-tap retry.
- Important: game swipes must not cause page scrolling, except that non-game parts of the site retain normal scrolling.
- App/background interruption pauses safely. Respect reduced motion and user-controlled audio.

## Primary gameplay loop (v0.1)

1. Start with a short connected hive moving continuously on a tile grid.
2. Leader advances one tile at each fixed-timestep simulation update.
3. Direction changes may be queued but immediate reversal into the body is blocked.
4. Brood spawns only on reachable empty tiles.
5. Collect brood to earn points and add one tail segment.
6. Collision with arena edge or the hive's body causes game over, absent later defensive mutation rules.
7. Restart restores the initial run state while local personal best remains.
8. Increasing difficulty through speed/stages is planned but not required for the very first playable proof.

**Unspecified tuning:** initial length, points per brood, movement interval, level thresholds, time limits and mutation draft thresholds are not finalized. Put values in config and record actual chosen defaults when implemented.

## Five proposed mutation families

| Path | Play philosophy | Prototype idea | Tradeoff |
| --- | --- | --- | --- |
| White — Carapace | Defense | Hardened Shell absorbs one otherwise fatal collision | Consumable charge |
| Blue — Adaptation | Control | Temporal Drift slows motion temporarily | Short duration |
| Black — Regeneration | Sacrifice | Emergency Molt consumes three segments to avert death | Requires enough length |
| Red — Frenzy | Risk/scoring | Blood Rush increases speed and points temporarily | Harder maneuvering |
| Green — Brood | Growth | Rapid Brood increases brood/segment rewards | Longer, riskier body |

**Implemented in Alpha 0.2:** Every fifth brood pickup pauses for three distinct random WUBRG choices, selected using touch or keyboard 1/2/3. Each mutation changes the pure game engine, the status HUD and an aura on the actual creature. White grants a one-hit shield; blue slows 28 simulation steps; black consumes a stored charge and three segments to avoid a crash; red speeds movement and doubles scoring for 24 steps; green gives double growth for the next four brood. Effects can stack within bounded durations. Actual Stage 2+ maps and enemies remain planned.

## Stages and hazards

1. **The Hatchery:** introductory open arena, plain collection and basic turning.
2. **The Burrows:** tighter corridors, rock hazards, simple roaming creatures.
3. **The Fracture:** unsafe tiles, moving hazards and tighter timing.
4. **The Broodmother:** proposed boss with readable hazard patterns; deferred until after basic movement is fun.

**Arcade mode:** endless high-score runs with escalating conditions, selected as first implementation recommendation. **Daily Challenge:** future deterministic seeded arena and mutation selection for comparable scores. Daily reset/time-zone rules and server-side anti-cheating design must be specified before release. Multiplayer, account linkage and a full boss campaign are not part of v0.1.

## Art / audio

Use independently designed sprites, backgrounds, collectibles, creatures, hazards, menus and sounds. Do not pixelate, trace or otherwise repurpose official Magic art or Sliver designs. Nearest-neighbor Canvas rendering, dark green/black/gold base palette, accent colors for five mutations. 8-bit sound is optional, muted until user interaction and configurable. No monetization requirement.

## Quality bar and exclusions

It must be truly playable: working movement, collisions, growth, score, game-over and retry—not an animation or concept art. Test actual controls on iPhone-class portrait widths and desktop keyboards. Do **not** add MTG deck gameplay, official card art, network multiplayer, logins, purchases or speculative boss content to v0.1. Keep game self-contained, with the Deep Cuts public site unchanged until owner approval.

## Next major update — Predator Loop / Evolution Milestone Encounters (design approved, not shipped)

The owner's chosen direction replaces the orb-centric identity with **HUNT → TRAP → EVOLVE**: moving prey survive intelligently but cannot stand still; the player closes escape routes using their body (light-cycle-style territorial control). Most mutation energy comes from prey captures; occasional orbs offer slower secondary progress.

- Provisional economy: normal prey +3 EV; rare orb +1 EV at 20–32 second active-time intervals; mutation selection for every 5 EV with remainder carried over; miniboss +5 EV and boss +8 EV on final capture only.
- Completed mutation choices, NOT simply draft offers, count as evolutions and trigger encounters.
- **At 2, 6, 10... evolutions:** a two-phase miniboss with distinct movement strategy.
- **At 4, 8, 12... evolutions:** a three-phase boss with new arena behavior.
- Intro/phase transitions freeze everyone together and visibly warn the player before safe spawning; enemies move continuously at all other times.
- Enemy AI values reachable space and avoiding walls/body, but remains fallible and computationally bounded. No free XP from an unrelated enemy wall collision.
- The first encounter roster: Skitter → Burrow Runner → Burrow Stalker (miniboss) → Hatchery Warden (boss), followed by Tunnel Weaver / Rift Guardian and new biomes.
- Retain all five WUBRG abilities with capture-specific effects; never let Red double mutation energy.
- Boss rewards apply once; bosses require two or three true traps instead of traditional bullets/HP.
- First implement and prove ordinary trapping inside the existing Hatchery, then enemy families, milestone bosses, and later distinct Burrows/Fracture map assets.
- Detailed specification, fairness cases, tuning and testing: [docs/ENCOUNTER_DESIGN.md](ENCOUNTER_DESIGN.md).

**Important:** This is an approved next direction and documented plan, not a gameplay claim. Current live Alpha 0.2 still grants evolutions primarily by collecting brood, and has no enemies or bosses.

## Future alternate game mode — Classic Snake (design only)

**Classic Snake:** A separate, enemy-free mode that brings back Hive Run's original gameplay: steer the swarm, collect glowing orbs, grow longer, and choose one of three mutations after every five orb pickups. Use the original WUBRG effects: White shield, Blue temporary slow movement, Black emergency molt (lose three segments to survive), Red movement boost and double orb score, and Green bonus growth from orbs. Classic players should still be able to travel through each planned environment and naturally hear the matching level music as they progress. No trapping, enemy kills, minibosses or bosses are used for evolution or gameplay in this mode.

The current enemy-hunting Predator Hunt remains unchanged as a separate selectable option. Scores, rankings and rule versions must be mode-specific. Shared art/music/controls can be reused, but classic rules and orb-based pacing must be independent. This idea has **not** been implemented; it requires a future mode selector, level transitions and independent replay-verified leaderboards.

## Alpha 0.4 signature miniboss abilities (planned)

**Burrow Stalker (evolution 2):** Every 10 seconds while the encounter is active, may burrow to an unoccupied, telegraphed cell exactly five grid steps away. Its active-ability recharge is shown via a small **🕳** symbol with a **gold circular progress ring** at the top-right of the game, reaching a full ring when ready.

**Tunnel Weaver (evolution 6):** Every 10 seconds, may place a **single-tile web**. Stepping on the web **stuns player movement for two seconds**; untriggered webs fade away after **15 seconds**. A **🕸** symbol in the same top-right gold circular meter shows cooldown/ready status. Provisional maximum two active webs and fair protection against unavoidable deaths while immobilized; confirm during playtesting.

The shared charge-ring UI will work for any later boss or miniboss with a defined active power, including Game Only mode, and remain hidden when no ability-bearing encounter is active. **All timers freeze** during pause, evolution draft, app backgrounding or encounter phase transitions. Leaderboard replay must simulate identical ability choices, placements and timers. This is a plan, not live code. Detailed mechanics: [ENCOUNTER_DESIGN.md](ENCOUNTER_DESIGN.md).
