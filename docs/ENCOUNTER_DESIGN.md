# Hive Run: Predators, Traps & Evolution Bosses
**Design proposal v0.3 — approved direction; NOT live gameplay** · 2026-10-13

## Core identity: HUNT → TRAP → EVOLVE → SURVIVE
Hive Run shifts from food-driven Snake into a moving, territorial hunt. The connected swarm is both a vulnerability and a weapon. Prey constantly move, avoid danger and seek open routes; players must cut off their escapes with the moving body, Tron/light-cycle style. Captures drive evolution; rare orbs give a smaller supplemental reward.

## Foundational rules
1. The player does not shoot or automatically damage enemies. Prey are captured when their mandatory movement step crashes into the player's body or they are unavoidably enclosed by player-created barriers.
2. Enemy AI must keep moving on scheduled ticks, not freeze in front of the player's head or dodge with unlimited reflexes. No instantaneous 180-degree reversal and no phasing through trails.
3. A prey wall crash away from the player's pressure is not a free kill. XP/score are credited only to validated player traps; never twice for one enemy.
4. The player can also lose to body/wall and enemy contact unless protected by a mutation. Opponents have a clear visual shape and movement rhythm.
5. Energy is gained through captures primarily, rare orbs secondarily. The old orb-count-driven stage and mutation progression must be replaced; the current live game does NOT yet implement these changes.
6. All encounter logic must be deterministic/testable and tuned for 320px portrait gameplay.

## Evolution economy (starting playtest numbers, not final)
| Event | Evolution Energy (EV) | Score | Growth |
| --- | ---: | ---: | ---: |
| Capture normal prey | +3 | +300 | +1 |
| Collect rare orb | +1 | +100 | +1 |
| Defeat miniboss | +5 | +750 | +2 |
| Defeat full boss | +8 | +1500 | +3 |

- Mutation draft triggers for every 5 EV. Carry EV remainder: 3+3 energy leads to one draft and 1 stored EV. Handle accumulated thresholds without stacking simultaneous overlays.
- Rare orbs: max 1 active, a randomized 20–32 seconds of **active simulation time** between spawns; only safe unoccupied cells; prevent paused/off-tab spawning and XP farming.
- Maintain at least one valid source of progression (prey or rare orb), even through difficult map geometry; never unwinnable softlock.
- Red doubles score, NOT EV; Green increases body growth rewards, NOT EV. White and Black rescues cannot generate free kills.
- **Evolution count equals completed mutation selections.** Track a new evolutionsChosen counter, distinct from current draft count, and use it for encounter progression.

## Encounter schedule by completed evolutions
| Evolutions selected | Encounter | Behavior | Defeat |
| ---: | --- | --- | --- |
| 0 | Skitter Hunt | One skittish prey; basic avoidance, forgiving movement | One trap |
| 1 | Pack Pressure | Up to two prey, including straight-line Burrow Runner | Capture prey |
| **2** | **MINIBOSS — Burrow Stalker** | Fast, seeks open passages, forced to adapt when boxed in | **2 trapping phases** |
| 3 | Advanced Hunt | Mixed prey with stronger but still fallible survival AI | Capture prey |
| **4** | **BOSS — Hatchery Warden** | Three distinct chase phases, speed/pattern changes telegraphed | **3 trapping phases** |
| 5 | Recovery Wave | Temporary reduced pressure following boss | Capture prey |
| **6** | **MINIBOSS — Tunnel Weaver** | Prefers corridors and detects obvious traps | 2 phases |
| 7 | High Pressure | More coordinated escape routes, not perfect prediction | Capture prey |
| **8** | **BOSS — Rift Guardian** | Three phases and one clearly marked environmental danger | 3 phases |
| 9+ | Endless rotation | Similar pattern, gradually escalating difficulty and later biomes | Continue survival |

**Repeatable cadence:** miniboss at 2,6,10,14... completed evolutions; full boss at 4,8,12,16... . Boss or miniboss encounter is queued only **after a mutation is chosen**. One encounter at a time; do not spawn it immediately into the player's body or head. Use a clear 3-beat announcement and resume movement together.

### Making boss phases work with body trapping
- Normal enemies require one collision/capture; minibosses require two captures, full bosses require three.
- On each successful boss trap, break one visible armor ring. **Only the final hit gives the full boss EV and score.**
- After a non-final capture, use a clearly announced between-phase reset to a prevalidated empty gate, with 2–3 countdown beats. Both player and boss stop together during that transition. This is not mid-chase teleportation.
- Each phase modifies a visible characteristic and a modest AI speed/path-preference. Preserve no-phasing and identical collision rules.
- If no safe gate exists, choose a certified open reset layout; never spawn in a body or run a zero-escape countdown. Log recovery cases in tests.
- Bosses should have unique original silhouettes and adaptive music cues; existing Hatchery soundtrack remains for ordinary play.

## Enemy intelligence that feels clever but beatable
Each enemy executes one grid movement on its own fixed interval, not one move per visual frame:
1. Gather legal non-reverse directions; reject walls, swarm body, other enemies and impending hazard tiles.
2. Rank remaining routes by reachable connected open area (bounded flood-fill), 1–3 steps of lookahead, distance from the player and heading continuity.
3. Apply distinct personalities: Skitter makes more predictable errors; Runner favors open straight lanes; Stalker looks farther ahead; Weaver favors corridors.
4. Use seeded pseudo-random tie breaks and a bounded per-tick CPU cost; do NOT give the AI clairvoyance about future input.
5. If no legal step exists, the compulsory next move collides and can count as a capture if the player visibly closed the route.
6. Specify deterministic collision order for simultaneous moves, crossing-head attacks and two enemies trying the same cell. Enemy and player deaths are resolved once per tick.

## Spawn fairness and pacing
- One active prey at the opening, at most two by evolution 1; three only after confirmed phone performance.
- Safe spawn at least two clear tiles from the player head, never within the body, on food, or on a hazard.
- Spawn gates flicker/announce for 2–3 beats before the enemy becomes active.
- Keep normal-prey speeds slightly slower than the early player until balances establish fair trapping, not outrunning indefinitely.
- After ~25–35 seconds without a meaningful chase, adjust enemy risk taking or route bias rather than handing over kills or spawning instant-death hazards.
- No offscreen kills rewarded, no guaranteed survival, no unfair instant spawn damage.
- Contrast/readability: readable enemy silhouettes on dimmed arena; boss phase rings visible in color and shape; reduce flash for reduced-motion preference.

## Existing five WUBRG powers in combat
| Mutation | Trapping role | Rule |
| --- | --- | --- |
| White (Carapace) | Block a dangerous interception | Shield saves player collision once; not free kill XP |
| Blue (Temporal Drift) | More control while corralling | Clarify player/enemy tick interaction; limit extreme slowdown |
| Black (Emergency Molt) | Sacrifice tail to escape a failed trap | Opening the body should affect enemy escape calculations |
| Red (Blood Rush) | Chase prey and double score | No doubled evolution XP; faster movement is risky |
| Green (Rapid Brood) | Build longer barriers from captures and orbs | Extra growth, not extra XP; no duplicate body tiles |

## Visuals and interface
- New main game identity and onboarding: **HUNT • TRAP • EVOLVE**.
- HUD: EV meter (e.g., 3/5), evolution count, enemies remaining, current biome, boss phase marks and acquired mutations.
- Ordinary capture: quick sound, bright kill burst and +EV/score toast, with no huge modal.
- Boss announcement: title, short distinct rule/pattern hint, explicit countdown, and a small boss/phase tracker during chase.
- Existing three-choice mutation draft reappears after EV threshold rather than five brood.
- Local records: high score, total prey captured, bosses and highest evolution reached. Online public leaderboards remain deferred.

## Implementation order (single release candidate only after passing gates)
**A. First playable trap.** Pure simulation module for a single Skitter, continuous enemy ticks, legal route planning, trap collisions and kill-only energy. Replace frequent orb growth with rare-orb fallback. Confirm actual mobile trap can be made.

**B. Enemy families.** Runner, Stalker and Weaver patterns; two-enemy wave, safe gates, reward ledger, and evolution progression. Integrate WUBRG effects with actual capture events.

**C. Boss milestones.** Schedule at evolution 2/4/6/8; implement two/three capture phases, phase ring UI, fair reset, original sprites and audio cues.

**D. Environment expansion & polish.** Introduce Burrows and Fracture only after trapping works reliably in Hatchery; add hazards deliberately, avoiding inescapable simultaneous attacks.

## Test gates (non-negotiable)
- Deterministic enemy direction and avoidance; never stand still while active.
- No impossible reverse turns; reachable-space score bounded for performance.
- Safe enemy spawn, no collision with player on spawn, guaranteed action during countdown.
- Capture credited once; no free XP for unprovoked enemy wall deaths.
- 5 EV threshold carries remainder and drafts trigger only when warranted.
- One boss/miniboss per evolution threshold; no overlapping encounters.
- Boss exactly 2/3 capture phases; each phase change safe, reward only once.
- White/Black defensive rescues and Red/Green score/growth effects remain correct.
- Correct behavior at player death, background tab, pause and restart.
- Real 320px/375px/390px portrait and desktop playtests, practical enemy AI difficulty and frame time.
- No change to public Deep Cuts EDH repo without owner's approval.

**Current implementation status:** These enemy and boss changes are not yet coded or deployed. The current playable Alpha 0.2 still evolves through brood orbs. This document is the source of truth for the next gameplay release.


## Adaptive retro soundtrack — four original tracks (music implemented ahead of combat)

There are four original, generated-in-browser 8-bit compositions. Each is a distinct eight-bar loop with its own melody, harmonies, bass and percussion:

| Game mode | Soundtrack | Tempo | Feel |
| --- | --- | ---: | --- |
| Hatchery exploration / ready | The Hatchery Theme | 108 BPM | Eerie, atmospheric arcade melody |
| Ordinary enemies | Skitter Chase | 124 BPM | Fast arpeggios, restless bass and snappy drums |
| Miniboss | Stalker's Pursuit | 142 BPM | Chromatic pursuit, urgent percussion |
| Full boss | Warden of the Hive | 156 BPM | Dark low-register motifs and heavy double-time pulse |

### Director behavior when combat is implemented
- The encounter controller picks one track by encounter type: exploration -> Hatchery, normal prey -> Skitter Chase, miniboss -> Stalker's Pursuit, and boss -> Warden of the Hive.
- Switch only at explicit encounter starts (after safe spawn warning), never for every AI decision or enemy animation frame.
- Keep the miniboss/boss theme continuing across all of its two/three capture phases; phase transitions pause gameplay and do not stack music layers.
- After final victory, return to normal-hunt music when regular enemies resume. Mutation draft, ordinary pause, death, tab hidden and music-off all mute the active track.
- Sound-effects toggle stays independent of Music. Play only after an explicit click/tap and preserve music-enabled preference locally.
- Avoid rapid re-triggers, doubling tracks, or excessive volume on phone speakers. Add win stingers and smooth crossfades during later boss tuning.

**Implementation status:** The compositions and four-track preview interface are playable now in the isolated Game Lab. Automatic encounter changes are staged as an API but will not execute until enemies/bosses actually exist.


## Alpha 0.3 shipped scope (as opposed to later bosses)

- One moving Skitter at start; after a chosen evolution allow up to two roaming Skitter/Runner prey. Base prey movement advances every two player ticks and uses bounded seeded connected-area search, heading persistence, and survival-aware route selection. All hostile sprites are new procedural art.
- Player starts with seven linked segments for tactical trapping. Prey captured against a swarm body or unavoidably enclosed by player barriers award +3 EV, +300 score and growth, once. Unrelated prey wall crashes give no EV.
- Rare orbs spawn only after 145–229 active player ticks (~20–31 seconds at initial speed); +1 EV each. Draft threshold 5 EV carries excess. Per-run EV and stats are replayable server-side.
- Alpha 0.3 only: ordinary predators and two enemy personalities; the Burrow Stalker miniboss and Warden full boss are next milestones. This section will be marked deployed only after CI and browser verification; follow the DEVLOG.
- Public leaderboard is seeded and rules-replayed through a separate D1-backed Pages Function. User-entered links to main Field Network profiles are flagged unverified until the main site's secure account sessions can be trusted on a single origin after merge.

## Future owner ideas — Hatchling Ward and evolving soundtrack

A **Hatchling Ward** is a stationary friendly unit placed by an earned player action. It occupies one cell and makes prey avoid its own square plus the surrounding eight squares wherever a safe alternative exists. It creates tactical zones for body-wall traps without granting passive kills. Specify resource cost, limited lifetime, safe placement, enemy AI exceptions and deterministic leaderboard replay before shipping. This is not playable in Alpha 0.3.2.

Rearrange the original soundtrack to scale markedly from calm Level 1 to dramatic Level 4: exploratory playtest targets **80 → 105 → 132 → 165 BPM**, with increasingly urgent patterns and rhythm layering. Players should discover each track organically as encounters unlock; there is no longer a public preview player. Current live track tempos are unchanged.

## Alpha 0.4 — Miniboss signature powers & visible charge rings (approved design; future release)

### Burrow Stalker — Burrow Dash

- **Activation:** Becomes available every **10 seconds of active encounter gameplay**. The Stalker can relocate **exactly five connected grid steps in distance** (Manhattan distance 5) rather than moving normally. This is its signature burrow, separate from the safe-gate phase respawn after a successful capture.
- **AI and counterplay:** The Stalker chooses a **safe unoccupied exit** at distance 5, preferring escape lanes but not teleporting into the player's body/head, other enemies, walls, hazards or an enclosed trap. It briefly signals the old tile and expected exit before disappearing/reappearing, so the player can react. If no safe fair exit exists, keep the ability ready and wait; do not bypass a completed player trap or allow free, unavoidable damage.
- **Cooldown cycle:** Cast → yellow ring empties → refill clockwise over 10 seconds → complete ring = ready to burrow again. No charge progression during paused/draft/intro/phase transitions.

### Tunnel Weaver — Web Snare

- **Activation:** Can leave **one web tile per cast**, **every 10 seconds of active encounter gameplay**.
- **Effect:** If the player's head enters an active web tile, player movement is **stunned for 2 seconds**; display a visible snare effect and clear countdown. A triggered web is consumed.
- **Lifetime:** Untriggered webs disappear **15 seconds after placement** (visible fade near expiry). Web placement may not overlap walls, the player, an active web, spawn gates or an unsafe cell. Because web duration exceeds cooldown, there can temporarily be more than one web: propose **maximum two active webs** until real playtests establish the right balance.
- **Fairness:** Telegraphed placement, readable one-cell footprint, no unavoidable spawn trap; ensure the player is not killed solely because the input is disabled during the two-second stun. Suggested provisional implementation: enemies may continue navigating while a stunned player gets collision protection against unavoidable enemy contact until control is restored, then a short visible resume warning. Revisit after balance testing. Clear stun/web effects on death and encounter exit; avoid accumulating multiple overlapping stuns.

### Encounter charge meter — UI contract

- **Location:** **Top-right of the game view** for *any ability-equipped miniboss or boss*, including the mobile **Game Only** layout. Keep it clear of the active board where practical, and within safe-area insets.
- **Appearance / art direction:** No emoji or generic shiny icons. Render original rough, gothic burrow-themed vector/pixel linework: **Stalker Burrow** = a jagged cracked-stone opening enclosing a dark tunnel void, **Weaver Web** = a lopsided torn cobweb of irregular strands anchored to stone. Both use muted clay/limestone strokes (`#B2AB8F`) over deep peat/slate (`#18231D`) and a thin weathered-stone recess. Surround with a worn **dingy ochre** circular charge ring: recharge stroke `#98824B`, fully ready edge `#B19A5A`, unfilled recessed track `#414335`. Avoid neon yellow, uniform geometric spiders, emoji and bright pulsing effects. The clockwise ring spans 0–100% recharge with no different meaning from the original design.
- **States:** Cooldown spent = empty ochre arc with visible gray-olive track; recharging = clockwise advancing dull ochre arc; **fully charged = continuous complete dingy brass/ochre ring**, without becoming luminous/neon. On casting, empty instantly and begin a fresh 10-second cycle. Hide when the opponent is not actively on-screen or after defeat; pause/freeze during phase transitions. Indicate readiness with a small **solid notch/dot** as well as a full ring for users who cannot distinguish colors; do not rely on glow.
- **Accessibility:** Non-color shape/progress distinguishes charged from charging; provide screen-reader name and remaining cooldown or READY state. Avoid trapping taps/interfering with swipe steering.
- **Extensibility:** Reuse the same ring component for future full bosses; their symbols, cooldowns and signature abilities will be defined separately. Do not show a fake cooldown for bosses that don't yet have a specified active ability.
- **Testing:** Check arc at 0 / 25 / 50 / 75 / 100%, visibility/placement on 320/375/390/768px and Game Only, pause/draft/hidden-tab freezes, 10-second reload, 15-second web expiry, two-second stun and safe burrow destinations. Verify the deterministic game/score replay matches the client exactly.

**Status:** Planning only. No active minibosses, boss abilities, webs or yellow-ring HUD are live in Alpha 0.3.3.
