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

## 2026-11-21 — v0.1.0-beta.1 early playtest

- All fifteen planned tower families, four linear tiers, 24 pads, seven enemy types, 25-wave provisional Gauntlet, endless continuation and isolated Proving Grounds sandbox.
- 21 original cards, configurable 30-card spellbook, draw/discard, targeted spells, copying, sacrifice, resurrection, death explosions, token doubling, growth, wards, cooldown resets and bounded trigger processing.
- Cached original vector battlefield, color-coded towers, combat effects, responsive controls and tower contribution metrics. Not final hand-painted art.
- Sixteen deterministic engine regression scenarios executed successfully in isolated JavaScript, including seed-1 wave-25 victory and wave-26 completion (18 fortress health). Engine source tested with overlapping wave reward correction. Browser playtest and shared CI remain separately reportable verification steps.
- Balance is deliberately provisional: late farms and tier-four towers can snowball. No ranked scoring, commanders, campaign branching, full upgrade branches, or complete advanced combo catalog yet. Early beta is not final acceptance of all eight non-negotiables.
- Only archamancy/ changed; no main production website or other games modified. Catalog integration remains issue #230.

## 2026-11-21 — ARCHEMANCY spelling update
Owner approved the revised spelling. Canonical game entry `/archemancy/`, legacy `/archamancy/` redirects; same gameplay engine, version and asset paths. Catalogs and ownership documentation updated. No separate preview URL or Arcade promotion.

## 2026-11-21 — v0.1.0-beta.2, battlefield-first UI and farm economy

Owner playtest at wave 20: 205,520 available mana, 216,390 farm income, no leaks. Scrolling the mobile page to access combat controls disrupted play. Inspiration: Kingdom Rush's contextual pad/tower actions and compact HUD; Bloons TD 6's persistent battlefield and compact tower/upgrade panels. New viewport-contained layout, school-filtered tower dock (three choices per school), five-card hand, wave button and forecast, contextual upgrade/sell/rally, modal menu/stats/deck/sandbox; active simulation pauses while a dialog is open. No separate preview links. Original engine and art retained.

Mana Groves pay 3/7/16/34 per 2 seconds of active simulation (before bonuses), limited to 22/65/165/400 mana per owned pad per wave. Mana Spring multiplier 1.35 (formerly 2); Wild Growth +10% per cast capped at +30% on farms. Upgrading may raise a pad's remaining harvest budget but selling/rebuilding cannot reset it. Early calls allow the next wave's budget while the current wave group remains in combat. Standard kill and completion rewards, starting mana and tower costs unchanged.

Reproducible seed-1 comparison, same automated build policy (not the user's actual run): wave 20 farm income 125,895 → 12,737; unspent mana 90,144 → 2,352. Updated policy completes wave 25 with 18/20 health, 2,783 mana left and continues into wave 26. Twenty engine scenarios pass including four new budget/growth/reset tests. This is a first balance pass rather than final tuning. Portrait browser smoke at 390×740 passed, no page overflow. Canonical deployment and shared suite verified separately.

## 2026-11-21 — v0.1.0-beta.3: pressure, early calls and playtest exports

Owner feedback: wave 30, fortress 20/20 with 2,503 mana; difficulty too low. Adopt stronger predetermined enemy scaling, more late armored/flying enemies and titans, faster deployment, and titans that push through blocks/roots and receive weaker slows. In the same automated non-spell focused build policy used for Beta 2, the new variant wins wave 25 with 18 health but loses on wave 30; different builds can perform differently. No hidden adaptation.

Early wave calls: available immediately during active combat, including queued spawns and already overlapping waves. Each called wave begins its own spawn schedule on the next simulation tick, interleaved with previous queues. The bonus is 0–40 mana, decays according to time since the last call over max(20 seconds, wave spawn span + 8 seconds), and is zero before the most recently called wave has actually spawned an enemy. No automated start at bonus expiry. No fixed two-wave overlap limit; a 3,000 queued/live enemy safety threshold and eight spawns per tick prevent unlimited queue generation. All called waves remain payable once their wave group clears; farm budgets follow the number of waves in that group. Campaign wave 25 remains its endpoint before voluntary endless continuation.

Battle statistics includes Copy Stats with a JSON payload: version, seed, mode, current wave, time, health/mana, tower placements/upgrades and enchantments, deck/card use, enemy kills/leaks, resources, recent per-wave cumulative results (60), and recent wave calls (120). Manual selection fallback for unavailable clipboard. No external analytics, network submission, or personal data. Twenty-three engine scenarios passed in isolated JS. Release CI/browser checks separate.

## v0.1.0-beta.4 — Original battlefield models and combat visuals

All 15 tower types have distinct cached procedural sprites with tier growth and tier markers. All seven enemy classes and four summon families, constructs and Titan Bloom beasts have distinct silhouettes. Canvas sprites are depth-sorted, with horizontal facing, light motion and health bars. DOM pad controls remain keyboard/touch targets. Ranged attacks display colored travelling projectiles, lobbed fireballs, chained lightning, melee slashes, healing motes and small impact sparks. Cosmetic events are bounded to 240 and expire after 3–5 simulation ticks; visual flight is independent of damage timing. No balance changes. Original assets, no external images or dependencies. Owner standing instruction: implement requested gameplay updates and deploy after required checks, using canonical Game Lab only.

## v0.1.0-beta.5 — First targeting

Owner requested priority on enemies nearest the fortress. Direct ranged targeting already sorted by distance traveled; extracted a single explicit foremost-eligible selection, excluding dead/escaped/invalid aerial targets. Lightning secondary targets now also prioritize furthest road progress rather than spawn order. Targeted projectile visuals follow living targets for non-area, non-chain shots; simulation damage still resolves instantly. Selected attacking towers show Target: First. Added regressions across bends, range, flight restrictions, chain priority and retargeting. No separate preview URL; canonical Game Lab deployment only.

## v0.1.0-beta.6 — Tower specializations

Inflection point at T2 → T3: choose one of two permanent specializations for each of all 15 tower types. T4 unlocks that path's stronger named ultimate. Base/T2 unchanged, branch costs 4.2× build cost and ultimate 17×. Changing paths requires selling/rebuilding (70% refund; paid in-place respec is deferred). Thirty paths with distinct tower behavior, including swarm/tank tradeoffs, ward/smite, boss/armor damage versus secondary strikes, crowd control versus damage, recurring spell recovery versus cooldown aura, death blasts, sacrifice income versus altar blast, spreading curses, burns, extended chains, farm speed versus cap, and giant beasts. Visual branch markers, modal comparisons, named tower details and report fields. Existing sacrifice and enchantment combos preserved. Damage source categories reconcile to the total; burn provenance is kept even after selling a source tower. Individual wave completion telemetry is deferred; existing grouped wave accounting remains unchanged.

Test benchmark: seed 1, deterministic two-farm mixed attack strategy without spells, T3 branch choices selected by role, clears 25 waves with 17 health, 4,338 mana remaining; survives wave 26, loses wave 30. Final farm budget tuned down after provisional simulation. Thirty-two engine scenarios passed, including all thirty paths, finite farm budgets and damage provenance. Required shared checks and browser verification separately. Owner authorized direct canonical Game Lab releases after checks; no manual or sent preview URLs.

## v0.1.0-beta.7 — The full 30-card collection

Owner asked to continue toward first playable, starting with the cards from the original design list that were still missing. Added all nine, completing the proposed 30-card collection (five per color plus colorless):
- Rally the Fallen (W): return the two most recent fallen troops from any tower to a chosen troop tower, with a 20-point ward.
- Fractured Reflection (U): for 10 seconds an attacking tower also strikes a second leading enemy at 60% power.
- Deathmark (B): enemies near a point take +35% damage for 10 seconds and pay 6 mana when they die.
- Bloodrush (R): a troop tower's soldiers pay 15% of their health to attack twice as fast for 10 seconds.
- Wild Lightning (R): lightning leaps from the leading enemy near a point through up to six foes, 90 magical damage fading 15% per jump.
- Verdant Multiplication (G): copy up to six living troops of a tower as healthy tokens.
- Primal Awakening (G): a non-farm, non-library tower acts twice as fast for 15 seconds.
- Echo Prism (colorless): copies each of the next two eligible targeted spells; does not stack with Echo Spell.
- Titan's Blade (colorless): equipment; current and future troops of the tower gain +60% attack and +40 health.

Copies resolve once and never re-arm copying, so copy chains stay finite. Farms and the Arcane Library are excluded from Primal Awakening to protect the economy and draw rate. Deathmark mana counts as spell mana in the ledger. The default spellbook is now one copy of each of the 30 cards; the deck editor still allows up to three copies. Three new engine scenarios cover targeting rules, copy limits, damage reconciliation and the mana ledger. No balance changes to towers or waves.

## v0.1.0-beta.8 — First commanders

Owner direction: continue toward first playable with commanders after the card collection. Five original physical commanders, one per color, each built on an EDH-style archetype from DESIGN.md. Choose one (or none) from the new Commander button before wave 1:
- Ysolde, Banner Marshal (W, Tokens): each wave start, every troop tower calls one extra soldier; troops near her gain a 6-point ward every 3 seconds.
- Quill, Lantern Archivist (U, Spellslinger): spells cost 15% less; every spell cast fires an arcane bolt from Quill at the leading enemy within reach.
- Mother Vesk, Pale Abbess (B, Sacrifice): each friendly troop death or sacrifice gives 3 mana and heals her 15.
- Kragg Emberjaw (R, Voltron): +3 attack per kill up to +150; blows cleave nearby ground enemies for half damage.
- Bramblemother (G, Ramp): +100 mana once when wave 1 begins; Mana Groves harvest 25% faster, with per-wave harvest budgets unchanged.

Commanders stand on the road, block one ground enemy, fight automatically and can be moved anywhere on the road (Commander → Move, then tap). A fallen commander returns at full health after 20 seconds of combat. Passives only apply while the commander is alive. New ledger categories: commander mana and commander damage, both reconciled in tests and shown in Battle statistics and Copy Stats. Original procedural models; no external assets.

Deferred: partners, paid instant resummoning, commander-specific cards and abilities with cooldowns, and balance tuning from owner playtests. Three new engine scenarios cover selection rules, every passive, Kragg growth, death and return, damage reconciliation and the mana ledger.

## v0.1.0-beta.9 — Starter commanders and unlocks

Owner direction: players pick a first commander like a game's starter choice, then unlock more as they progress. On first visit a "Choose your first commander" dialog offers three starters: Ysolde (W tokens), Quill (U spellslinger) and Bramblemother (G ramp). Mother Vesk unlocks at wave 10 and Kragg Emberjaw at wave 15; the two starters you did not pick unlock at wave 25. Unlocks count the best wave reached in Gauntlet or Endless; Proving Grounds shows every commander and never unlocks anything. Your last chosen commander is preselected for new runs. Locked commanders show their requirement.

Progress is saved only in this browser (`archemancy.progress.v1` in localStorage) and is sanitized on load, so tampered or broken data falls back to a fresh profile. Nothing is sent anywhere. New `archamancy/progress.mjs` and three tests cover starter rules, unlock thresholds, sandbox exclusion, save/load and tamper handling. Engine rules unchanged apart from the report version. Further original commanders are being designed with the owner and will slot into the same unlock list.
