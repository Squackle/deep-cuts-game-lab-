# Hive Run 2.0 — Dominion: definitive roadmap

Owner design direction, 2026-10-16. Supersedes historical speculative feature expansion in docs/ROADMAP.md. Scope **Hive Run only**; the Lab also hosts other independent games.

## Vision / stop condition
Ship **two finished arcade experiences** rather than an unbounded live-service roadmap. The four established painted environments, five existing bosses, five WUBRG mutation families and two game modes form the **final content scope**. After Dominion, development is bug fixes, tuning, accessibility, performance and maintenance. No sixth boss, infinite biome series, new mutation colors, campaign expansion, or multiplayer is part of 2.0.

### Brood Trail — growth mastery (approved direction)
- Preserve the current orb-only Snake gameplay, five existing color mutations, score chasing, soundtrack and independent records; do not change the mechanic just to create more content.
- **Perfect-clear victory**: filling the playable arena with the swarm deserves a dramatic, full-screen animated celebration, gold pixel-art particles, finale music, score summary and replay invitation; respect reduced-motion and mute.
- The existing 6,000-step technical expedition cap remains a separate special case until the ending acceptance spec decides how to label it. Never imply that reaching a step cap equals filling the board.
- Show ordinary losses as ordinary losses. Showcase previews in Director Mode must not impersonate real clears.

### Predator Hunt — capture mastery (agreed vision, balance change not yet coded)
- Keep **five bosses**: Burrow Stalker (evolution 2), Hatchery Warden (4), Tunnel Weaver (6), Rift Guardian (8), Broodmother (12). Their existing abilities remain. No sixth boss.
- The **Broodmother's third capture** should end the expedition with **THE HIVE REIGNS**, a dramatic visual/audio celebration, final recap, and replay. No further boss loop once the final encounter is defeated.
- **Separate growth identity from Brood Trail.** User correctly raised that repeated Hunt capture rewards grow the player body until mobility and boss capture become unwieldy. Preferred experiment: **seven-segment fixed swarm** during Hunt (initial body length), where ordinary and boss captures still grant energy, score and mutations but **do not** add permanent body segments. Test seven and, if necessary, a narrow capped band before locking ranked rules. Brood Trail retains unbounded growth.
- Audit Hunt's Green *Rapid Brood*, Black *Emergency Molt*, White+Green *Hatchling Ward* and Black+Green synergy before coding fixed length. Existing Green charge spending and Black's sacrifice require a mode-specific redesign. Candidate: Green accumulates tactical nest/instinct charges from captures rather than permanent body growth; preserve real, distinct utility for all five colors. Black should still have a defensible non-growing survival cost. Do not ship a cosmetic-only upgrade.
- Test whether a shorter body makes trapping too hard, and whether seven segments can reliably isolate the smartest bosses. Separate deterministic client/server replay versions and never reinterpret prior ranked scores.
- **This Hunt balance change is a later milestone, not implemented by this Director Mode pull request.**

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
- [x] Permanent production-exclusion rule in `docs/MAIN-SITE-PROMOTION.md`: NEVER copy `director/**` nor Director cheats into public.
- [ ] Owner hands-on visual/behavior acceptance of Director's scenario and control parity.
- [ ] The exact later finale sequences must remain independently earned in arcade, not simulated by Director.

### D3 — Hunt fixed-size redesign (PROPOSED / requires playtests)
- [ ] Prototype seven-segment Hunt movement/trapping in Game Lab, with original Brood Trail untouched.
- [ ] Replace Hunt capture/orb/boss permanent growth and adjust Green/Black/Green synergies with usable mode-specific effects.
- [ ] Compare 7-segment, slight cap and existing grow-forever Hunt against all five bosses; assess fair time-to-capture/long-run survival.
- [ ] Bump deterministic rules version, extend replay and collision tests.
- [ ] Owner chooses the final Hunt-length cap after results.

### D4 — Real endings (DESIGN APPROVED, TO BUILD)
- [ ] Brood Trail authentic board-fill perfect clear: finale animation/music, earned-clear summary, reduced-motion and mute support.
- [ ] Predator Hunt real Broodmother last capture: terminal victory rather than more endless evolutions/boss loops.
- [ ] Director preview shortcuts trigger **non-authoritative** versions for QA and animation inspection; these do not earn scores/achievements.
- [ ] Ensure death, timeout/technical run boundary and real victory use distinct honest language.
- [ ] Tests for ending triggers, auto-stop, replay determinism and score records.

### D5 — Acceptance and 2.0 public release (PENDING)
- [ ] Physical iOS/Android, desktop keyboards, touch, fullscreen, accessibility, performance and color-contrast signoff.
- [ ] Versioned production integration **only after separate owner authorization**, matching client and authenticated server replays without losing old records.
- [ ] Exclude Director Mode absolutely; confirm public game has no Director route, button, invulnerability, phase skips or forced wins.
- [ ] Verify Cloudflare deployment exact SHA and post-release public scoreboard/auth regression.
- [ ] Official release **Dominion 2.0**; content scope freezes at two modes, four biomes, five bosses, five mutation families.

## Security and platform boundaries

Standalone Game Lab's `director/**` is a debug harness, not user content or a game feature. It has no account identity, rankings, entitlement, saved victories, API posts or D1 access. Its win previews are **not** official accomplishments. Production gameplay needs server-verifiable replay for newly earned results. The existing scripted bulk export is intentionally disabled; selective review must explicitly exclude all of `director/**`.

**Current source snapshots:** public Beacon uses replay rules `hive-1.3`; Game Lab Matriarch uses `hive-1.5.2`. This planning document describes the next steps without claiming any Hunt fixed-length or genuine final celebration has already shipped.
