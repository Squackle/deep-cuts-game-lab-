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
