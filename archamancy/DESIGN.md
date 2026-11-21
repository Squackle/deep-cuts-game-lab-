# ARCHAMANCY — master design and delivery contract

Design baseline v2.0, 2026-11-21. Previously called WARDFORGE. ARCHAMANCY is the owner-approved name (not a trademark clearance). A fifth, independent Deep Cuts Game Lab game; not a GRAFTBOUND expansion or a production Arcade release.

## Vision
Handcrafted illustrated fantasy tower defense with freely buildable WUBRG-themed towers, investment-driven mana economy, autonomous armies, real-time card play and emergent combos. Influences: Kingdom Rush tactical positions and troops, Bloons-style investment and branching upgrades, Commander-style deckbuilding. Original names/art/rules/lore; no assumption of licensed MTG assets. No mandatory merging. Design pillars: strategic freedom, earned absurdity, constant tension, replayable experimentation, readable combat. Predetermined threats rather than hidden adaptive enemy scaling. Extraordinary earned combinations may exceed expectations; no unbounded same-tick execution.

## Owner-approved first playable requirements (v0.1.0)
1. Fully illustrated original Gauntlet battlefield.
2. All 15 differentiated tower types.
3. Deep passive mana farming and compounding investment, sacrifice and mana-producing creatures; shared normal building pads.
4. Real-time targeted card casting (drag and accessible tap/select alternative).
5. Shared functional combo rules engine, with bounded recursion and reproducible behavior.
6. Endless survival continuation.
7. Unrestricted sandbox for implemented content.
8. Detailed post-battle statistics, including support/economic contributions.

Mechanics-first intermediate builds may use placeholder graphics; these do not meet the first-playable illustrated-map gate. No requirement to deliver the entire long-term game in v0.1.0. Foundation is v0.0.1; this commit establishes only the project and design, not a playable simulation.

## Long-term systems (confirmed preferences; numbers, names of individual mechanics, and implementation details provisional)
- Fixed pads and one spendable mana pool; all five colors available without strict commander identity locks. Reward mono-color specialization and inter-color synergies without mandatory merging. Towers always buildable independently of card draws.
- Troop swarms and large creatures, melee/ranged/flying diversity, automatic fights, rally points within range, growth, death and sacrifice interactions, card reinforcements; no individual squad micromanagement requirement. Automatic ultimate abilities. Game speed controls.
- Passive farms share defensive pads; compounding investments, sacrifice and troop income, costly ultimates, risk/reward, endless scaling. No mandatory manual harvesting. Partial resale and paid branch changes with consistent investment/upgrade ownership. Unique legendary structures.
- Two normal branches of upgrades following shared early tiers; ordinary top-tier towers and separate unique legendary buildings. Full 30 ultimate branches may follow first playable.
- Draw at wave start; hold unused cards; real-time card targeting; spells, temporary summons, tower upgrades, artifacts/enchantments; library tutoring and selection; all colors available, larger customizable spellbooks, duplicates, saved loadouts, mission/boss unlocks, rare legendary cards. Preserve tower choice regardless of draws.
- Card/creature mechanics: duplication, death triggers, sacrifice, reanimation, growth counters, storm chains, spell copying, tutoring, graveyard recursion, discounts, mana rituals, equipment, artifact creatures, trigger doubling, cooldown resets, temporary tower copies, tower transformations. Colorless artifacts bridge colors.
- Physical commanders inspired by broad EDH archetypes (not copied characters); automatic passives, rally movement, death/resummoning and partners. Archetypes: tokens, ramp, recursion, sacrifice, spellslinger, draw, artifacts, Voltron, growth, control. No restrictive color identity. Partner balance and resummoning prices TBD.
- Physical/magical damage, armor/resistance, status interactions, relevant counters for flight, spellcasters and unusual enemy abilities. Bosses may temporarily alter pathways or disable structures with clear telegraphing, not arbitrarily delete investments.
- Gauntlet single winding route; Confluence multiple entrances converge. Fixed pads; special sites and optional objectives. Long endurance battles, early wave calls for bonus mana, detailed wave previews, different difficulty levels and optional challenge modifiers.
- Branching world map, five themed regions, stars/ratings, basic towers immediately available, other towers and specific cards unlocked through play, modest persistent research. No mandatory grinding or pay-to-win.
- Campaign, endless, sandbox, boss challenges, roguelike expeditions, verified ranked survival/daily seeded challenges (future separate review and authorization for production integrations), cosmetics, collectible Codex, detailed metrics. Main replay motivation is discovering increasingly ridiculous builds and combos.
- Illustrated stylized dark fairy-tale fantasy blended with epic spectacle, strong WUBRG visual silhouettes, exceptional full-field spells, readable combo feedback, restrained HUD and detailed Codex; original visual direction, not a clone.

## Initial tower roster (15 required)
| Color | Tower | Role |
|---|---|---|
| White | Legion Hall | Soldier spawning |
| White | Dawn Chapel | Healing and wards |
| White | Judgment Spire | Precision damage/suppression |
| Blue | Arcanum | Magic/control |
| Blue | Arcane Library | Draw/tutoring |
| Blue | Mirrorworks | Illusions/duplication |
| Black | Necropolis | Undead spawning/reanimation |
| Black | Soul Foundry | Sacrifice economy |
| Black | Hex Sanctum | Debuffs/curse |
| Red | Pyre Battery | Area damage |
| Red | Goblin Warcamp | Troop spawning |
| Red | Storm Engine | Burst/chain lightning |
| Green | Mana Grove | Passive income |
| Green | Beast Den | Beasts/giant creatures |
| Green | Thornheart | Roots/retaliation |

Each must have distinct behavior; not merely a reskin. Proposed initial 30-card collection (five each W/U/B/R/G/colorless): Call the Legion, Guardian's Ward, Rally the Fallen, Twin Battalion, Crown of Valor; Arcane Inquiry, Fractured Reflection, Echo Spell, Frozen Moment, Temporal Reset; Raise the Fallen, Soul Offering, Grave Recall, Funeral Pact, Deathmark; Funeral Flame, Meteorfall, Bloodrush, Wild Lightning, Arcane Cascade; Wild Growth, Verdant Multiplication, Primal Awakening, Rootbound, Titan Bloom; Echo Prism, Resonance Core, Replication Matrix, Titan's Blade, Construct Forge. Names and effects to be tested. Proposed 30-card deck, max 3 copies ordinary card, 4 opening cards, 5-card hand, one draw per wave; handle full hand and deck exhaustion explicitly. All numbers provisional.

## Initial battlefield: Verdant Passage
Illustrated forest Gauntlet, proposed 24 fixed pads, one Mana Spring and one High Ground, 25 authored waves then endless continuation; starting 20 fortress health and 350 mana provisional. Enemy basics, fast, armored, flying, spellcaster, regenerating, elite. Side objectives and secondary maps later. No hidden adaptive scaling. Ensure meaningful payoff after expensive tower upgrades.

## Technical requirements
Standalone `archamancy/**` source/assets/tests, local-only namespace, no code imports across games, no production auth/D1/scores/payment integrations. Seeded deterministic RNG and fixed simulation ticks separated from renderer; stable ordering of commands/events; shared event definitions (summon, death, sacrifice, kill, draw, cast, mana, equip, ability activation, wave start/complete). Distinguish copies from original casts, revival origin, output provenance and eligible resets/doublers. Finite resources and bounded trigger queue; diagnostic for rejected unsafe cycles, do not silently truncate legitimate combos. Track damage/healing/control/mana/card/summon/trigger contributions without double counting. Passive production based on combat elapsed time; avoid double wave rewards/early-call exploits. Sandbox tools never feed competitive or campaign rewards. Replay validation and rules versions designed early, no ranked submission until approved separate implementation. Mobile and desktop input accessible. Data-driven definitions; original assets only.

## Implementation milestones
- v0.0.1 foundation: deterministic clock, map/path/pads, commands, tests.
- v0.0.2 combat: enemy movement, damage/resistance, creature spawning, autonomous fighting, rally points.
- v0.0.3 all 15 towers, costs, investment, upgrades/resale.
- v0.0.4 spellbook, casting, tutoring, artifacts.
- v0.0.5 shared combo engine and safeguards (events scaffolded from foundation).
- v0.0.6 endless and sandbox, stress tests.
- v0.0.7 metrics, balance, regression tests.
- v0.0.8 original illustrated map, UI, VFX/audio.
- v0.1.0 first playable acceptance review, isolated Lab preview.
Subsequent roadmap: full branches and multi-lane maps, commanders/partners, expanded cards/legendary structures/Codex, campaign/research, regions/bosses, competitive modes subject to separate approval, expeditions, cosmetics and polish.

## Acceptance
Verify all eight owner requirements; complete 25-wave battle; endless continuation; tower/card interactions, safe deterministic trigger handling; functioning sandbox; reconciled metrics; responsive desktop/touch; no critical errors/broken assets; tests for each rule and cross-game regression checks. Record test counts and preview commit SHA only after actual verification. No deployment claimed before verification.

## Repository boundary
Game Lab repository Squackle/deep-cuts-game-lab-, work branch game/archamancy-v001; intended route /archamancy/. Shared catalog and coordination changes belong to central integrator; register via separate coordinated change including both root and legacy catalogs, CI and ownership docs. No edits to other game paths or production repository. Do not promote to production without separate owner authorization.
