# Hive Run 2.0 — Dominion: definitive roadmap

Owner design direction, 2026-10-16, with **seven-segment Hunt balance approved 2026-10-19**. Supersedes historical speculative feature expansion in docs/ROADMAP.md. Scope **Hive Run only**; the Lab also hosts other independent games. See the [Dominion implementation plan](HIVE-RUN-DOMINION-IMPLEMENTATION-PLAN.md) for release increments and approval gates.

## Vision / stop condition
Ship **two finished arcade experiences** rather than an unbounded live-service roadmap. The four established painted environments, five existing bosses, five WUBRG mutation families and two game modes form the **final content scope**. After Dominion, development is bug fixes, tuning, accessibility, performance and maintenance. No sixth boss, infinite biome series, new mutation colors, campaign expansion, or multiplayer is part of 2.0.

### Brood Trail — growth mastery (approved direction)
- Preserve the current orb-only Snake gameplay, five existing color mutations, score chasing, soundtrack and independent records; do not change the mechanic just to create more content.
- **Perfect-clear victory**: filling the playable arena with the swarm deserves a dramatic, full-screen animated celebration, gold pixel-art particles, finale music, score summary and replay invitation; respect reduced-motion and mute.
- The existing 6,000-step technical expedition cap remains a separate special case until the ending acceptance spec decides how to label it. Never imply that reaching a step cap equals filling the board.
- Show ordinary losses as ordinary losses. Showcase previews in Director Mode must not impersonate real clears.

### Predator Hunt — capture mastery (seven-segment Lab implementation approved by owner)
- Keep **five bosses**: Burrow Stalker (evolution 2), Hatchery Warden (4), Tunnel Weaver (6), Rift Guardian (8), Broodmother (12). Their existing abilities remain. No sixth boss.
- The **Broodmother's third capture** should end the expedition with **THE HIVE REIGNS**, a dramatic visual/audio celebration, final recap, and replay. No further boss loop once the final encounter is defeated.
- **Separate growth identity from Brood Trail.** User correctly raised that repeated Hunt capture rewards grow the player body until mobility and boss capture become unwieldy. **Approved choice (2026-10-19): seven-segment baseline** in Hunt, with ordinary and boss captures awarding energy, score and mutations but **not** permanent body segments; defensive Black molt can temporarily shorten and regrow them. Brood Trail retains unbounded growth. No more alternate-length trials are scheduled unless there is a demonstrated bug.
- Hunt Green *Rapid Brood* now grants +1 evolution energy for four earned reward events; Black *Emergency Molt* temporarily sheds then regrows segments; White+Green *Hatchling Ward* and Black+Green discount remain functional. The owner has accepted these existing Game Lab rules as the seven-segment balance; continue regression testing.
- Seven-segment Hunt capture feasibility is covered by automated tests; player acceptance of the overall game and final endings still requires physical-device QA. Production must implement matching versioned client/server replay without touching historical scores.
- **Approved for 2.0 by owner on 2026-10-19; already implemented in Game Lab `hive-1.5.3`. Not yet promoted to production.**

## Milestones and gates

### D0 — Proven foundation (COMPLETE)
- [x] Brood Trail and Predator Hunt with keyboard/touch controls, music, four environments, mutations and the first four bosses.
- [x] Public Beacon 1.4, retained verified score history, first-party player authentication and boss-discovery progress.

### D1 — Content freeze (GAME LAB FEATURE-COMPLETE; acceptance outstanding)
- [x] Matriarch 1.5.2 in Game Lab: fifth boss Broodmother; 1.4s egg incubation; 7.5s blind chasing spider hatchlings; slower Broodmother.
- [x] W+G Hatchling Ward, U+R and B+G mutation synergies.
- [x] Original pixel-art pass across five bosses, abilities and hatchlings; contrast adjustments to Rift and Broodmother.
- [ ] Physical-phone and desktop acceptance for difficult bosses, visual clarity, steering, hazard fairness.

### D2 — **Director Mode** (LAB ONLY; *never* public)
- [x] Isolated `/director/` tool uses original deterministic game engine/visual modules and repeatable solo seeds, no persistent/ranked sessions.
- [x] Select mode, boss, first/final phase, invulnerability, half-speed; skip to final phase and invoke unranked victory rehearsal.
- [x] Touch/swipe and keyboard movement, unranked indicator, mobile layout.
- [x] **Lab-only test-cheat legend**, placed to the right of the game on desktop and beneath on mobile. Press **1** or the cheat button to summon a custom pixel-cheeseburger super orb on a safe unoccupied arena tile. Collecting it grants **10 additional tail segments over the next 10 moves**. Can be respawned for repeatable stress tests. No score, profile, or genuine achievement rewards. Leave expandable slots for future cheat tools.
- [x] Giant Sliver victory **concept art preview** revised with the distinctive elongated, scythe-like forelimb and original pixel-rendered soldiers defending the village. Includes screen-level text over the visual art, and remains a LAB-ONLY Director rehearsal (NOT the final production victory screen). Future public art requires separate rights and release review.
- [x] Permanent production-exclusion rule in `docs/MAIN-SITE-PROMOTION.md`: NEVER copy `director/**` nor Director cheats into public.
- [ ] Owner hands-on visual/behavior acceptance of Director's scenario and control parity.
- [ ] The exact later finale sequences must remain independently earned in arcade, not simulated by Director.

### D3 — Hunt fixed-size redesign (GAME LAB IMPLEMENTED · OWNER APPROVED 2026-10-19)
- [x] Prototype seven-segment Hunt movement/trapping in Game Lab, with original Brood Trail growth intact.
- [x] Replace Hunt capture/orb/boss permanent growth: score and energy remain, but no reward creates tail segments. Green spends a charge to add +1 evolution energy per reward (4 charges per mutation); Black's emergency molt sheds 3 segments temporarily, then regrows over 3 safe steps (2 with Black+Green synergy at the cost of one Green charge). White+Green still consumes a Green charge to create Hatchling Ward.
- [x] Seven-segment Hunt balance accepted as the final target (2026-10-19). No additional length variants planned; retain all-five-boss regression and general QA.
- [x] Bump Lab-only deterministic rules to `hive-1.5.3`; extend replay, 7-segment boss capture, color effects, Director cheat isolation and collision regression tests.
- [x] Owner chose and approved the seven-segment baseline; final end-to-end release QA and production authorization remain separate gates.

### D4 — Real endings (AUTHENTIC SIMULATION COMPLETE IN LAB; CINEMATIC PRESENTATION NEXT)
- [x] Brood Trail earned perfect-clear terminal condition, including permanent-rock / temporary-hazard discrimination, in Lab `hive-1.5.4`.
- [ ] Brood Trail actual finale animation/music, score recap, reduced-motion and mute support (Task 2B).
- [x] Predator Hunt earned final Broodmother capture at evolution 12 terminates once, with boss score/energy and no draft or further AI (Lab `hive-1.5.4`).
- [ ] Director preview shortcuts trigger **non-authoritative** versions for QA and animation inspection; these do not earn scores/achievements.
- [x] Distinct deterministic death, 6,000-step run limit, Lair practice and two earned victory outcomes with honest temporary textual overlay labels.
- [x] Lab deterministic tests for both real terminal triggers, one-time boss award, frozen game state, draft priority, no fake hazard fill, and replay outcome anti-forgery.
- [ ] Public server/client replay equivalence and historical score preservation (Task 4, separately authorized).

### D5 — Acceptance and 2.0 public release (PENDING)
- [ ] Physical iOS/Android, desktop keyboards, touch, fullscreen, accessibility, performance and color-contrast signoff.
- [ ] Versioned production integration **only after separate owner authorization**, matching client and authenticated server replays without losing old records.
- [ ] Exclude Director Mode absolutely; confirm public game has no Director route, button, invulnerability, phase skips or forced wins.
- [ ] Verify Cloudflare deployment exact SHA and post-release public scoreboard/auth regression.
- [ ] Official release **Dominion 2.0**; content scope freezes at two modes, four biomes, five bosses, five mutation families.

## Security and platform boundaries

Standalone Game Lab's `director/**` is a debug harness, not user content or a game feature. It has no account identity, rankings, entitlement, saved victories, API posts or D1 access. Its win previews are **not** official accomplishments. Production gameplay needs server-verifiable replay for newly earned results. The existing scripted bulk export is intentionally disabled; selective review must explicitly exclude all of `director/**`.

**Current source snapshots:** public Beacon uses replay rules `hive-1.3`; Game Lab's **approved** Hunt seven-segment balance uses `hive-1.5.3`. Director Mode includes victory concept art, but genuine earned victory finales and production integration are still pending. Refer to the linked implementation plan for the four completion tasks.
