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

## v0.1.0-beta.10 — Real Magic cards and legendary commanders

Owner decision: use real Magic: The Gathering cards for commanders, spells and tokens; towers stay original. ARCHEMANCY is free, unofficial Fan Content under the Wizards Fan Content Policy, and the menu now shows the required notice.

Spells keep their rules and get the closest real card: Raise the Alarm, Make a Stand, Return to the Ranks, Anointed Procession, Intangible Virtue (W); Divination, Rite of Replication, Twincast, Sleep, Twiddle (U); Animate Dead, Culling the Weak, Grim Discovery, Blood Artist, Deathmark (B); Fireball, Pyroclasm, Grapeshot, Chain Lightning, Temur Battle Rage (R); Wild Growth, Root Snare, Craterhoof Behemoth, Parallel Lives, Seedborn Muse (G); Lithoform Engine, Strionic Resonator, Fireshrieker, Steel Overseer, Loxodon Warhammer (colorless).

Commanders (owner-approved list) replace the Beta 8 originals:
- Starters: Krenko, Mob Boss (goblin tokens that double, cap 12), Talrand, Sky Summoner (a flying Drake per spell that can hit fliers, cap 8), Omnath, Locus of Mana (groves +25% speed, +1 attack per 50 unspent mana).
- Edgar Markov (R/W/B) at wave 10: a Vampire token for every 3 troops summoned (cap 10).
- Light-Paws, Emperor's Voice at wave 15: +8 attack and +40 health per Aura/enchantment/Equipment cast (up to 15).
- Unpicked starters at wave 25.
- Meren of Clan Nel Toth (B/G), return 10 troops in a battle: returns your latest fallen troop every 10 s.
- Teysa Karlov (W/B), lose 200 troops in a battle: death triggers happen twice.
- Korvold, Fae-Cursed King (B/R/G), sacrifice 50 troops in a battle: +4 attack and a card per sacrifice.
- Atraxa, Praetors' Voice (W/U/B/G), Endless wave 30: proliferate every 10 s (towers up to +10 growth).
- The Ur-Dragon (WUBRG), win the Gauntlet with a tower of every color: flying fire breath on 3 leading enemies, triple vs bosses.

Card and commander art is looked up from Scryfall in the browser (art crops, one request at a time, cached locally) and every tile credits its artist; failures just show the card without art. Beta 9 saves with the old original starters reset to a fresh starter pick. New stats: troops returned and sacrificed. 51 Archemancy tests pass, including commander passives, token caps and all unlock rules.

## v0.1.0-beta.10.1 — Card accuracy pass

Checked all 10 commanders and 30 spells against Scryfall (2026-11-22, via the owner's browser). Every color and color identity matched, Edgar Markov included (R/W/B). Two commanders now follow their real text more closely: Talrand makes Drakes only for instants and sorceries, and Light-Paws grows only from Auras and Equipment (Animate Dead, Wild Growth, Fireshrieker and Loxodon Warhammer). Each card now carries its real type line, which is shown when you select it.

## v0.1.0-beta.11 — Enemy traits and boss waves

Owner priority: enemy traits and boss waves before the painted map.

New enemies:
- Shade Stalker (shrouded): towers can only target it near a Judgment Spire or Hex Sanctum (within their range), within 70 of your troops or commander, or for 3 s after any damage reveals it. Area spells and burns still hit it. Shown faded until revealed.
- Spellward Warden: immune to magic damage.
- Ironhide Golem: immune to physical damage; Godpiercer (Judgment Spire T4 path A) still hurts it.
Towers no longer waste shots on enemies their damage type cannot hurt.

The 25-wave Gauntlet is now hand-designed: traits arrive from wave 6, and a named boss closes every fifth wave. Grimgut, Raider King (w5) hastes nearby enemies with a war cry every 8 s. The Veiled Matron (w10) is shrouded and births two Shade Stalkers every 8 s, up to 8. Ironclad Colossus (w15) is immune to physical damage. Spellbane Hierophant (w20) is immune to magic; every 10 s it marks its two nearest towers (dashed ring), then silences them for 4 s. The Hollow Tyrant (w25) swaps between physical and magic immunity every 8 s, with a flash warning. Endless keeps cycling the bosses every 5 waves. The wave forecast lists names, BOSS tags and trait rules, and bosses show their name over the battlefield.

Benchmark (seed 1, same no-spell build policy): wins wave 25 with 6/20 health (was 17), loses on wave 30. That makes the Gauntlet harder, as the owner asked earlier. 56 Archemancy tests pass, including immunity, reveal rules, every boss ability and the wave plan.

### Beta 11 balance from the owner's wave-32 Endless run

Owner run (Beta 9 build, lost at Endless wave 32): towers dealt 97% of 1.5M damage, while spells did 1.8k, troops 6.7k and the commander 197, because those used fixed numbers while enemy health had grown about 130×. All 20 leaks were Carrion Wings, and the strongest towers (Pyre Battery, Thornheart) are ground-only. Changes:
- Spell damage, burns (from spells and Inferno towers), troop health and attack, death blasts, commander attack and health, and commander tokens now scale with wave health. Spells and commanders use enemy scale^0.8; troops, tokens and death blasts use ^0.6. Wave 1 values are unchanged.
- Tower cards and the selected-tower details now say "Ground only" or "Hits fliers".
Benchmark after both changes: wins wave 25 at 4/20 health and loses on wave 30.

## 2026-11-22 — v0.1.0-beta.11.1 commander fix and update notice
- Owner's run 2 report was from Beta 10.1: the run began before Beta 11 finished deploying. Cloudflare already serves the game files with `max-age=0, must-revalidate`, so a refresh gets the latest; an open tab keeps the old code until it reloads.
- The page now checks for a newer build on load and every 5 minutes, and shows "Beta X is out" with a Reload button. The menu shows the running version from the engine.
- Bug: Krenko's goblin tokens stood on his spot and claimed every enemy first, so Krenko never swung (58 damage in the owner's run, 0 in the benchmark). Commanders now fight beside their tokens and troops: they hit a free enemy if one is in reach, otherwise they help on one already held (without taking its hits).
- Token damage is now credited to the commander: `stats.commanderArmyDamage` and `commander.armyDamage` in the report, and "Commander token damage" in Battle statistics.
- Titan leaks: bosses cost 3 fortress per leak, so 6 titans ended the run. Beta 11 already replaced wave 25 (3 Titans plus the Hollow Tyrant) and scaled spells, troops and commanders late; no further wave change in this patch.

## 2026-11-22 — v0.1.0-beta.12 Polish Update, drop 1: clean layout
Owner direction: a big polish update, with a UI as clean and simple as the best mobile tower-defense games (layout principles only; all art stays original).
- The battlefield fills the screen. Side panels are gone.
- Small corner HUD: lives, mana and wave at top left; pause, speed (1×/2×/3× in one button) and menu at top right. Notices are short toasts that fade.
- Ring menu on the pad you tap: five school icons, then that school's three towers drawn with their real models and prices. Tap once to see what it does, tap again to build. Built towers get Upgrade (top), Sell (bottom) and Rally (troop towers). Near the top or bottom of the screen the ring opens as an arc away from the edge. Tapping empty ground closes it.
- The wave button sits at the road entrance and pulses; during combat it shows the early-call bonus.
- Commander portrait (card art, health bar) at bottom left with wave info; spell cards as a small hand at bottom right with a pop-up card tip for Cast, Discard and Cancel.
- Portrait phones get a one-time "turn sideways" hint. The Game Lab link moved into the menu.
- No rules changes.

## 2026-11-22 — v0.1.0-beta.12.1 Polish Update, drop 2: game feel
- New `fx.mjs` effects layer. It reads engine events and health changes and never touches the simulation (tested).
- Hit sparks on every hit; damage numbers only on bosses so the field stays readable; death puffs and floating "+mana" on kills, bigger bursts for bosses.
- Dust ring and sparkle when a tower is built or upgraded.
- Wave banner ("Wave 10 · Boss: Ironclad Colossus"); boss falls get their own banner.
- Boss health bar across the top while a named boss is alive, with its current immunity. In-world boss labels replaced by a colored ring under the boss.
- Screen shake on boss arrival, boss death and leaks; red flash and a pulse on the lives counter when an enemy gets through.
- Boss abilities (war cry, brood, silence, phase) announced as short toasts.

## 2026-11-22 — v0.1.0-beta.12.2 Polish Update, drop 3: title, stars, difficulty, sound, tips, map facelift
- Title screen: Play Gauntlet, Endless Siege, Proving Grounds, a difficulty picker and best stars per difficulty. "Main menu" in the game menu returns to it.
- Difficulty (Gauntlet and Endless, chosen before wave 1): Easy 0.7×, Normal 1×, Hard 1.35× enemy health. Saved with the commander profile. Reported in Copy Stats.
- Stars: winning the Gauntlet gives 3 stars at 18+ fortress left, 2 at 10+, otherwise 1. Best stars per difficulty are saved.
- End screen for victory or defeat with stars, wave, kills, damage, mana, time, best tower and commander damage; Play again, Continue to Endless, Main menu, Copy stats.
- Sound (new `sfx.mjs`, synthesized with Web Audio, no files): build, upgrade, sell, hits, kills, leaks, wave horn, boss horn, boss defeat, spells, boss abilities, victory and defeat, stars. A quiet generated music loop. Sound button at top right; music toggle in the menu; both saved.
- First-run tips in the Gauntlet walk through building a tower, sending the first wave and casting a card, with a Skip button. They end after wave 1.
- Map facelift: warm light pools, grass tufts, flowers, rocks, stones lining the road, cobble texture and drifting fireflies.

## 2026-11-22 — v0.1.0-beta.12.3 sharp rendering and boss melee
- Sharpness: the battlefield canvas was a fixed 1000×600 image stretched to fill the screen, so it looked blurry on large and high-density screens. The canvas now renders at its on-screen size × devicePixelRatio (up to 3×), terrain is repainted at that resolution, and sprites are cached at a matching scale. Ring-menu tower icons are drawn at 2–3×. Taps map through logical map units.
- Boss melee (owner question: "why don't bosses fight player troops"): bosses and Titans used to keep walking at 60% speed through blockers, so troops lost contact almost at once. Now they stop for whoever blocks them, like other enemies, and every 1.4 s smash all ground troops and the commander within reach for 3× their attack (SMASH constant). Still immune to roots; slows still reduced. Red shock ring, small shake and a thud on each smash.
- Balance: the no-spell benchmark now finishes the Gauntlet at 9 fortress instead of 4 (bosses held by troops leak less). Hard difficulty covers players who want the old pressure.
- Icons: pause, play, menu, sound, mute, lives, mana, wave and the wave-call button are now drawn SVG icons instead of font glyphs (the pause sign rendered like a Roman numeral II). The pause button turns into a play button while paused.
- Tower attack sounds per tower family (arcane zap, strike twang, artillery boom, chain crackle, hex hum, root creak, mirror shimmer), rate-limited so big fights stay listenable.

## 2026-11-22 — Beta 12.3 end screens and hub link

- New victory and defeat screens: rotating light rays, gold title on a win and a red shake on a loss, the 1–3 stars, a mode/difficulty kicker, and actions for New run, Copy battle stats, Main menu and the hub link.
- `hub.mjs` decides where "back" goes. On deep-cuts-game-lab.pages.dev and local hosts it reads "Back to Game Lab" (`/`). On any other host, such as the main Deep Cuts site, it becomes "Back to Arcade" (`/games`). A page can force a target with `<meta name="archemancy-hub" content="/path|Label">`. Tested in `tests/hub.test.mjs`.

## 2026-11-22 — Beta 12.4 commander controls, manned barracks, Continue

- Commander moves Kingdom Rush style: tap the commander or the portrait to select (pulsing ring, glowing portrait), then tap the road. A marker shows the destination. Tap the commander again, tap off the road, or press Esc to cancel. Tapping the portrait while selected opens commander details. The old menu step is gone. Between waves the commander arrives at once; on screen they walk there smoothly.
- While the commander is down, the portrait ring fills clockwise as a respawn countdown with the seconds left, and the portrait is dimmed.
- Barracks (Goblin Warcamp, Legion Hall, Necropolis and the rest) are fully manned the moment they are built or upgraded between waves, and refill after each wave. Before, a new barracks stood empty until the next wave started, so its goblins seemed to be missing.
- Continue: the current Gauntlet or Endless run is saved in this browser every few seconds, when the tab is hidden or closed, and when leaving to the menu. The title screen shows Continue with the mode, wave and difficulty. A run restored mid-wave starts paused. Saves are cleared on victory, defeat or a new run. `engine.snapshot()` and `engine.restore()` use `SAVE_FORMAT`, which changes only when the save shape changes; unknown or corrupt saves are refused and removed. Tested: a restored run matches the original state and stays identical for 900 more ticks.

## 2026-11-22 — Beta 12.5 status effects

- Every effect now stays visible on the enemy for its full length, with small icons above the health bar.
- Burn: every Pyre Battery blast sets enemies on fire for 1 second (Inferno Cannon adds 2.5 seconds). Flames on the body.
- Poison (new): Thornheart hits add a poison stack, up to 3 (Venom Thicket: up to 6, and it lasts longer). Each stack deals damage over time that ignores armor; the stack count shows in the icon. Green drips. Venom Thicket used to apply burn and now applies poison.
- Freeze: the Arcanum slow is now shown as frost, with a pale tint and ice crystals.
- Curse: Hex Sanctum curses (and Deathmark) show a purple sigil under the enemy; cursed enemies take 35% more damage.
- Balance: benchmark Gauntlet run now ends with 8 health instead of 9.

## 2026-11-22 — Beta 12.6 balance and wave records

From Logan's Beta 12.4 Easy run (3 stars, 0 leaks, 7,328 mana left, waves 3–15 and 16–25 called early and stacked).
- Early calls: at most three waves can be on the road at once. Logan stacked 13 at once, which let the army fight one long combined wave.
- Soul Foundry income now has a per-wave budget (50/110/200/320 by tier, more with Soul Harvester), like Mana Groves. Goblin and Legion death loops beside a foundry made 12,862 mana, a third of all income.
- Difficulty: enemy health Easy 0.85× (was 0.7×), Normal 1.1× (was 1×), Hard 1.45× (was 1.35×).
- Wave history: each wave is now recorded when its own enemies are gone. Stacked waves used to be recorded together at the end, so their entries were identical. Enemies now carry their wave number.
- Benchmark (Normal) ends with 9 health.

## 2026-11-22 — Beta 12.7 Hard run follow-up

From Logan's Beta 12.5 Hard run (2 stars, 12 health, 27,429 mana unspent; Soul Foundry 24,473 mana; all 8 leaks were Wings).
- Soul Foundry per-wave budget lowered to 40/80/140/220 by tier (12.6 had 50/110/200/320). A tier IV foundry now tops out near 5,500 mana over 25 waves instead of 24,000.
- Air defense is unchanged: Arcanum, Judgment Spire, Storm Engine, Hex Sanctum and Mirrorworks all hit fliers, and Logan's damage came mostly from ground-only Pyre and Thornheart. Waves with flyers now say so in the wave banner.

## 2026-11-22 — Beta 13.0 The Confluence

A second battlefield, picked on the title screen next to The Hollow Road.
- The Confluence: two roads (North Ford and South Ford) enter on the left and merge into one road before the Verdant Keep. Enemies take turns entering at each ford. 21 pads, with high ground over the north road and a mana spring between the fords.
- Engine: maps are data (`MAPS` in `engine.mjs`). A road is one or more segments; a segment can feed into another where it ends. Each segment has its own stretch of the progress number line, so the old one-road rules carry over. Towers target the enemy with the least road left, whichever lane it is on. Troops and the commander walk through the junction to reach the other lane.
- Saves remember their map, and a save only loads on its own map. Saves from before 13.0 load on The Hollow Road. The save format is unchanged.
- Best Gauntlet stars are kept per map. The Hollow Road keeps its old star keys, so earlier stars still count.
- Bot benchmark (same bot, seeds 1–3): The Confluence plays a little harder than The Hollow Road on Normal (won all three with 1–5 health, against 2 of 3 won on the Hollow Road).

## 2026-11-22 — Beta 13.1 Logan's first upgrade picks

Logan picked three upgrades from the quality list.
- Build and upgrade animations: scaffolding goes up and the tower rises out of the ground inside it, then settles with a bounce. Upgrades flash the old tier and pop in the new one. Sold towers shake, sink into the ground and throw up rubble. Restored runs and map changes show towers as they are, without animating.
- Next-wave preview beside the wave button: each enemy type with its count and flags (Boss, Flying, Armored, Physical immune, Magic resist, Magic immune, Shrouded, Regenerates). It shows between waves and while an early call is open, hides while a pad or spell is selected, and folds up with a tap (remembered). The list ignores taps so it never blocks a pad.
- Star upgrades: best Gauntlet stars on every map and difficulty form a star pool. Eight perks with three ranks each (1, 2 and 3 stars): a mastery per tower color (+8% damage and +10% troop health per rank), War Chest (+30 starting mana), Spellcraft (spells 5% cheaper) and Commander Training (+10% commander health and damage). Refund any time. Perks apply once, at the start of new Gauntlet and Endless runs, are stored in saves and the copied run report, and never apply in the Proving Grounds.

## 2026-11-22 — Beta 13.2 Targeting modes and commander abilities

From Logan's picks in the Kingdom Rush feature thread.
- Targeting modes: towers that aim (Arcanum, Judgment Spire, Pyre Battery, Storm Engine, Hex Sanctum, Thornheart, Mirrorworks) get a target button in their ring menu that cycles First, Last, Strongest and Closest. Ties fall back to First. Troop towers keep their rally button in that slot.
- Commander abilities: a tap power beside the commander portrait (or press Q), usable during waves, with a cooldown sweep. Themes follow each card's Scryfall text (checked 2026-11-22): Krenko Mob Rally, Talrand Drake Squall, Omnath Mana Bloom, Edgar Blood Charge, Light-Paws Emperor's Aura, Meren Grave Return, Teysa Lifelink Vigil, Korvold Royal Feast, Atraxa Proliferate, Ur-Dragon Dragon Tempest. Cooldowns are 40 to 60 seconds.

## 2026-11-22 — Beta 13.3 Onslaught, trials and rubble pads

From Logan's picks in the Kingdom Rush feature thread.
- Onslaught: a title-screen toggle for the Gauntlet. After you start wave 1, each next wave arrives 30 seconds after the last one started, cleared road or not (the clock keeps running between waves). You can still call waves early for the bonus. Auto-sent waves give no early bonus and are marked in the run report.
- Trials: badges for winning the Gauntlet with towers of a single color (Mono-White, Blue, Black, Red, Green; sold towers count) and for winning an Onslaught Gauntlet on each map. A Trials button on the title screen shows them.
- Rubble pads: some prime pads start under old ruins (Hollow Road: the high ground for 120 mana and two central pads for 70; Confluence: the high ground for 120 and two central pads for 80). Select one and tap the pick to clear it. None in the Proving Grounds, and runs saved before 13.3 load without rubble.

## 2026-11-22 — Beta 13.4 Player level and Codex

The last two of Logan's picks from the Kingdom Rush feature thread.
- Player level: every wave cleared outside the Proving Grounds gives 10 + wave XP. Level n to n + 1 takes 60 × n XP, so a full Gauntlet is about three levels early on. One basic tower per color is open from the start (Legion Hall, Arcanum, Necropolis, Pyre Battery, Mana Grove). Level 2 opens Judgment Spire and Storm Engine; 3 Hex Sanctum, Beast Den and The Confluence; 4 Dawn Chapel, Goblin Warcamp and Endless Siege; 5 Arcane Library, Thornheart and Onslaught; 6 Soul Foundry and Mirrorworks. Towers unlocked mid-run can be built right away. Players from before levels keep what they had: a best wave of 25 or any stars means max level, a best wave of 10 or more means at least level 4. Locks never apply in the Proving Grounds.
- Codex: a book of all 15 enemies, 15 towers and 30 spells on the title screen. Entries fill in the first time you meet an enemy, build a tower or draw a spell in a run, with stats, traits and a counter tip for each enemy.

## 2026-11-22 — Beta 13.5 Onslaught and Confluence flier balance

From Logan's Hard + Onslaught win on The Confluence (4 of 20 health, 14 leaks, 11 of them Carrion Wings in waves 20 to 24):
- Onslaught now holds its next wave while 3 waves are still on the road, the same cap as calling early. Before, it stacked up to 6, so waves 20 to 24 (boss wave included) all shared the road. The button reads "Wave N waits: 3 on the road" while held.
- The Confluence route is about 2,280 road units against 2,880 on The Hollow Road, and fliers ignore troop blocks, so they spent about 20% less time under towers. Fliers on The Confluence now have 85% health. Ground enemies are unchanged. The map blurb says so.
- Tests: Onslaught cap, and flier versus ground health across maps.

## 2026-11-22 — Beta 13.6 Phone layout

From Logan's phone screenshots (The Hollow Road, wave 9):
- The next-wave preview starts collapsed on phones and small windows (until you open it; your choice is remembered). On phones it sits under the top bar, on the right in landscape, so it no longer covers the road, the wave button or the HUD. Long lists scroll.
- Phones held upright: the battlefield is drawn about 65% larger and slides sideways, instead of a thin strip between empty bands. The turn-sideways tip is unchanged.
- Ruins pads (and any empty pad) now take taps before the taller tap area of a built tower just below them. Before, on phones, tapping the ruins above a Legion Hall opened the Legion Hall.

## 2026-11-22 — Beta 13.7 Level chip and boss counters

- Level chip in the battle top bar: your level inside a ring that fills toward the next level. Tap it for XP to go and what the next level opens. "+N XP" floats up from it when a wave clears; a level-up shows a big banner with the unlocks and makes the chip glow. The end screen shows XP earned this run, a bar and the next unlock. On narrow upright phones the chip sits under the health pill.
- Bosses immune to one damage type now say what hurts them under the boss bar (Ironclad Colossus: only magic, so Arcanum, Mirrorworks, Hex Sanctum, Storm Engine). Physical towers ignoring it is by design. On landscape phones the boss bar moved into the top row so it no longer covers the first stretch of road (it hid the boss in Logan's screenshot).

## 2026-11-22 — Beta 13.8 Art upgrade

Logan asked for higher-quality art, closer to Kingdom Rush. Art rules taken from research: one warm light from the top-left, soft shadows to the lower right, thick ink outlines so every piece reads at small size, a quiet mid-tone ground, and the road as the brightest large shape.

- Towers, enemies, troops and commanders: ink outline, key light and darker base on every sprite, soft ground shadows, towers about 10% larger, units about 12% larger, a small walk squash (#262).
- Effects: shaped glowing projectiles with trails, impact flashes, hit sparks, death flash and smoke, dust on build, upgrade and boss smash (#263).
- Map: a bright painted meadow (Logan picked it over a darker forest). Sandy road with ruts and edging stones, bevelled stone build pads, clumps of round and pine trees, bushes, rocks and flowers, warm light and a softer vignette. Painted in archamancy/terrain.mjs for every map.

## 2026-11-22 — Beta 13.9 Boss stalls and commander health

From Logan's Hard Hollow Road win (17 health, 2 stars):
- Wave 15's Ironclad Colossus spent about 9 minutes held at the entrance by Beast Den troops that cannot hurt it, out of reach of most magic towers, and the 3-wave cap then held wave 19 back for over 5 minutes. Troops now hold a physical-immune enemy for 6 seconds, then it shoves past for 3, so it walks into the magic towers. Its trait text says so. Phase bosses are unchanged.
- Commanders kept their wave 1 health all run while enemy hits grow with the wave, so Omnath fell 18 times. Commander health now grows each wave (about 4x by wave 25).
- The copied report now lists the wave each tower was built (builtWave). The Storm Engine that showed 0 damage hits normally in tests on that pad, so it was most likely built during the last wave after the road there had cleared.
- The pinned benchmark run now ends with 6 health instead of 9 (its wave 25 boss now leaks), since the troop change shifts that bot run.

## 2026-11-22 — Beta 13.10 Fuller battle stats

Logan asked for the copied battle stats to track everything useful for balancing and fixing. Still one copy-paste (about 17 KB for a full 25-wave run). New fields:
- Towers: builtWave, upgrades (wave of each upgrade), soldWave, shots, idleChecks (ready to fire with nothing it can hit in range), immuneHits and resisted damage.
- stats: immuneHits, immuneDamage, resistedDamage.
- leakLog: wave, enemy, tick, health left and whether it was slowed.
- bossLog: each boss with spawn and end tick, seconds alive, killed or leaked, health left, stallTicks and stuckAt (road position where it sat still).
- commanderDeaths: wave, tick, what killed it, where, and its max health.
- castLog: card, wave, tick, cost, mana and enemy count at cast, total damage before the cast (so the next entries show its value).
- waveTop: top three towers by damage for each finished wave.
- client: screen size, pixel ratio, orientation, touch, browser, real seconds at each game speed, paused and in menus, session length, and any page errors.

## 2026-11-22 — Beta 13.11 Readable battlefield

Logan: the battlefield was covered by text on a landscape phone (boss name, bar and a two-line hint over the top road, a toast over the towers, the spell hand over the bottom-right pads). Kingdom Rush keeps play readable by keeping status in the screen corners, showing only icons and numbers during play, keeping boss bars compact, and showing details only when you tap.
- Boss counters are now a short tag ("Magic only" or "Physical only"); tap it for the full list of towers that hurt the boss.
- Wide landscape phones (21:10 and wider, the usual case): everything moves into the dark side margins. Left: health, mana, wave and level stacked, then the boss bar, then messages, then the commander buttons at the bottom. Right: sound, pause, speed and menu in a 2 by 2 grid, the next-wave pill, and the spell hand as a two-column stack (card art and cost; tap for details). Nothing sits over the road or the pads.
- Desktop: messages sit below the boss tag instead of on it.

## 2026-11-22 — Beta 13.12 Boss leaks

Logan's Hard Hollow Road run (2 stars, 14 health): the Ironclad Colossus leaked at 40% health and the Spellbane Hierophant at 65%. Physical splash towers dealt most of the run's damage, but 324k damage hit immune targets, so a physical-heavy defence had no way to finish a magic-only boss once it was hurt.
- Bosses with an immunity (Colossus, Hierophant, Tyrant) crack below 40% health. Every immunity drops to 50% resistance, so the rest of the defence can finish them. A notch on the boss bar marks the point; the tag changes to "Cracked" with a toast.
- A leaking boss costs 3 health above two-thirds health, 2 above a third, and 1 below that (was always 3).
- Colossus health 2200 to 1900, Hierophant 2400 to 2050.
- Battle stats: bossCracks, and crackedTick on each boss log entry.
- Benchmark run: 6 to 9 health.

## 2026-11-22 — Beta 13.13 Season groundwork

Logan chose "More content first": autumn and winter versions of Hollow Road and Confluence, then a third map. This release lays the groundwork; the art thread builds the seasonal looks in terrain.mjs.
- Runs carry a season (summer, autumn or winter), chosen before the first wave, kept in saves and in battle stats. The renderer reads `game.map.season`.
- Title screen season picker, remembered in the profile. It stays hidden until a season beyond summer has art (`SEASON_LOOKS` in main.mjs).

## 2026-11-22 — Beta 13.14 Autumn and winter

The season picker is on: Summer, Autumn or Winter for The Hollow Road and The Confluence. Art: golden grass and falling leaves in autumn; snow, snowy trees and a frozen creek in winter (terrain.mjs, art thread). Seasons are cosmetic for now and share stars with the summer map.

## 2026-11-22 — Beta 13.15 Frostfen Crossing (data, hidden)

Third map, built for winter. A serpentine road whose middle leg crosses a frozen lake. Ground enemies move at 60% speed on the ice (`ICE_SLOW`, `map.ice` rects); fliers ignore it and have 115% health here. Winter only (`map.seasons`), opens at level 6, 21 pads, three ruins. Benchmark bot (3 seeds, Normal): wins with 7–12 health, between The Hollow Road (9–16) and The Confluence (0–6).
The map stays off the title screen (`MAP_LOOKS` in main.mjs) until the art thread paints its frozen lake.

## 2026-11-22 — Beta 13.16 Frostfen Crossing opens

Frostfen Crossing is on the title screen (level 6), with its frozen lake and packed-snow causeway painted by the art thread.

## 2026-11-22 — Beta 13.17 Picks up new versions

Logan didn't see Frostfen Crossing after 13.16 shipped. The map list is correct (all three maps show, locked ones with "Opens at level N"), so the page was an older build still open. Now the game checks for a newer version when the tab comes back into view and every 5 minutes: on the title screen it reloads at once; mid-run it says so and reloads when you next return to the title (the run is saved first).

## 2026-11-22 — Beta 13.18 Hits land on impact

Logan: enemies took damage well before the projectile reached them. Tower damage was applied the tick a tower fired; the projectile was only drawn afterwards.
- Every damaging tower shot is now a record in `state.inFlight` that lands `FLIGHT` ticks later (5; chain lightning 3), the same time the projectile is drawn for. Damage, slows, roots, curses, poison, burn, splash, chain hops and extra/reflected shots all apply on landing, so hit flashes and damage numbers line up.
- Splash, and hex or root spreads, still burst where the target was if it died meanwhile; single-target shots at a dead enemy fizzle. Shots from a sold tower are dropped.
- Arcanum, Judgment, Mirror and Hex towers skip an enemy that shots already in flight will kill, so several towers no longer pour shots into a dying enemy.
- In-flight shots are plain data: saves, restores and replays stay deterministic. Benchmark run: 9 to 10 health (less overkill).

## 2026-11-22 — Beta 13.19 Frostfen and death-burst balance

Logan's first Frostfen run (Hard, winter, 3 stars, 18 health, 2 flier leaks). One Goblin Warcamp (Goblin King's Warband with Funeral, Twins, Blade and Forge) dealt 998k of 1.94M damage, 714k of it from death bursts, about eight times the damage per mana of any other tower.
- Death bursts (Funeral enchantment, Powderkeg Legion): base 45 + 8 per tier → 30 + 6 per tier, and late-wave scaling `late(.6)` → `late(.5)`. Roughly half the damage by wave 25.
- A tower's death bursts fire at most once every 0.6 s (`DEATH_BURST_GAP`), so a horde dying together can't chain-detonate a wave. Resonance and Teysa still double each burst.
- Frostfen ice: ground enemies move at 70% speed on the lake (was 60%).

## 2026-11-22 — Beta 13.20 Summoner combo balance

Logan's Normal Hollow Road run (3 stars, 19 health): a Necropolis (Lich Citadel with Twins, Funeral and Blade) dealt 593k of 1.45M damage, half of it from death bursts — the same Twins + Funeral + Blade stack that carried the goblin run, on a different tower. The 13.19 burst limit applied to every tower, but Twins doubled the troops and so the deaths.
- Twins: a tower with Anointed Procession fields twice the troops, each at 70% health and damage (`TWIN_SCALE`), and its death bursts deal 70% damage.
- Blade troop damage bonus 1.6× → 1.4×.
- Funeral death burst 30 + 6 per tier → 24 + 5 per tier; burst limit once per 0.6 s → once per second per tower.
- Sandbox test of the full stack at wave 20: Necropolis −26% total damage, Goblin Warcamp −24%. Builds without these cards are unchanged.

## 2026-11-22 — v0.1.0-beta.13.21 commanders fall back when hurt

- Owner request: a low-health commander steps back behind the units around it, and stands and fights when there are none.
- Below 35% health with a ground enemy within 60, the commander looks for friendly ground troops within 140 (its own tokens count at its chosen spot). If any exist it moves 30 past the rearmost of them, toward the keep, while its tokens hold the original spot.
- While fallen back and out of melee it heals 0.5% of max health per tick. It returns to its spot at 70% health, when no enemies are near that spot, on respawn, or when the player moves it.
- No troops nearby: no retreat, it keeps fighting. New stat `commanderRetreats` and event `commanderRetreat`.
- Test: `hold.test.mjs` covers both cases. 95 ARCHEMANCY tests and 267 Lab tests pass.

## 2026-11-23 — v0.1.0-beta.13.22 troops run out from their towers, spare-mana hint

- Owner request: troops now appear at their tower, step onto the nearest point of the road (0.4 s) and run to the rally. They don't fight until they are out.
- Run report (Hard + Onslaught, Confluence, lost wave 15 with 4,441 mana unspent; 8 of 9 wave-4 Carrion Wings leaked): wave 4 now sends 7 wings instead of 9.
- Built towers whose next upgrade you can afford show a bobbing gold ▲, and a status hint appears after a wave when you have 500+ spare mana and an affordable upgrade. Not in sandbox.
- The save/resume test's scripted player stops calling waves early once it reaches its target wave, so tiny balance changes no longer push it into endless overlapping waves.
- Benchmark fortress health 10 → 11. 113 ARCHEMANCY tests pass.

## 2026-11-23 — v0.1.0-beta.13.23 enemies are real Magic cards

- Owner request: every enemy and boss is a real MTG creature that fits what it does. Names, type lines and power/toughness checked on Scryfall (2026-11-23).
- Raider → Goblin Raider, Runner → Monastery Swiftspear, Armored → Indomitable Ancients (2/10), Wing → Carrion Crow, Mage → Prodigal Sorcerer, Regen → Mossbridge Troll, Titan → Primeval Titan, Stalker → Invisible Stalker, Warden → Kappa Cannoneer (ward), Golem → Darksteel Juggernaut (indestructible).
- Bosses: Grimgut → Lovisa Coldeyes (gives warriors haste), Matron → Oona, Queen of the Fae (makes Faerie Rogues), Colossus → Darksteel Colossus, Hierophant → Iona, Shield of Emeria (shuts off spells), Tyrant → Emrakul, the Aeons Torn.
- Internal keys, stats, wave mixes and abilities unchanged; a seed-1 31-wave bot run matches main exactly apart from the name strings. `role`, `card` and `short` are non-enumerable so they stay out of saved enemy state.
- Codex shows the card's Scryfall art, type line and artist; boss bar shows a small art portrait; boss alerts use short names (Lovisa, Oona, Iona, Emrakul). Map sprites unchanged.
- Test: `enemy-cards.test.mjs`.

## 2026-11-23 — v0.1.0-beta.13.24 Thornheart and troop balance, Oona clarity

From Logan's Hard + Onslaught Confluence run (three Thornhearts did ~790k of 1.78M damage; Grand Battalion 4.8k) and "how am I supposed to beat the second boss":
- Grasping Forest / Elder Wildwood spread now hits at most 8 enemies; spread targets take 50% damage and get one poison stack refreshed (only the main target stacks). Poison was ~78% of its damage. Sandbox at wave 20: Grasping T3 290k → 111k (Pyre Inferno 243k, Venom Thicket 45k unchanged). Thornheart hits still land on arrival through `land()` (13.18 sync intact).
- Tier 4 troop towers: troops get ×1.6 health and damage (`TROOP_T4`). Grand Battalion T4 sandbox 83k → 130k.
- Oona (wave 10 boss) is revealed for 3 s each time she births Stalkers (`BROOD_REVEAL`). The boss bar shows "ⓘ Hidden" while she is shrouded, and a held notice explains how to reveal her when she arrives.
- Benchmark fortress health 11 → 13. Seeded map bot wins all 9 runs.

## 2026-11-23 — v0.1.0-beta.13.25 Pyre trimmed, troops scale better late

From Logan's 13.24 Hard + Onslaught Confluence run (two Inferno Cannons ~31% of all damage; Grand Battalion T4 0.8%):
- Tower burns deal 9 × late scaling per half second (was 12); spell burns (Flame) unchanged. Inferno Cannon extra burn 25 → 15 ticks. Pyre splash hits the main target in full and others for 75%.
- Troop damage scales with late(.75) instead of late(.6), so troops keep up with late enemy health (+67% at wave 25). Troop health unchanged.
- Sandbox wave 20: Inferno T3 243k → 191k; Grand Battalion T4 130k → 189k; Necropolis T3 53k → 79k; Goblin T3 65k → 101k.
- Benchmark fortress health 13 → 10. Seeded map bot still wins all 9 runs.

## 2026-11-23 — v0.1.0-beta.13.26 Grand Battalion buff

Logan's 13.25 run was a flawless 3-star Hard Onslaught win, but Legion Hall Grand Battalion (branch B) did 1.5k damage for 2,242 mana while Royal Paladins did 22k. Grand Battalion now also gives +30% troop damage and +25% troop health (×1.6 at tier 4) on top of extra soldiers and faster reinforcement. Sandbox wave 20: T4 189k → 269k. Elder Wildwood left as is (~17% of damage per tower, under the 30% guideline).

## 2026-11-23 — v0.1.0-beta.13.27 Combat feedback

Logan picked "combat feedback" from the idea list. Cosmetic only; the simulation, seeded runs and copied stats are unchanged.
- Damage numbers on every enemy (hits inside 300 ms add up into one number so crowds stay readable; bosses get larger numbers).
- Big hits (a fifth of a normal enemy's health, or 5% of a boss) pop a larger orange number with "!", a flash and a small screen shake (at most one every 0.65 s).
- Screen shake is off when the device asks for reduced motion.
- Every barracks now has its own strike sound (Legion steel, Necropolis bone, Goblin squeals, Beast snarls), plus commander strikes, commander tokens and Dawn Chapel heals. Each attacking tower already had its own shot sound.

## 2026-11-23 — v0.1.0-beta.13.28 Greyhorn Pass (fourth map)

- New map `pass`, Greyhorn Pass: one road that runs through a tunnel under a mountain. Ground enemies inside the tunnel (map.tunnel rects) can't be seen, targeted, splashed, chained, blocked by troops or hit by the commander; damage over time keeps ticking. Fliers cross over the peak and stay targetable. Troop rally points and commander moves into the tunnel are refused.
- 20 pads, rubble on 3, fliers at 90% health (shorter road, like the Confluence). All three seasons. Opens at player level 6 with Frostfen.
- terrain.mjs paints a craggy massif over the tunnel with a stone portal and torch at each end (snow-capped, autumn and winter palettes).
- Crude seeded bot (same placement rule on every map): Hollow wave 17–18, Confluence 17, Frostfen 16, Greyhorn 15. A little harder than the others, as a later map should be.

## 2026-11-23 — v0.1.0-beta.13.29 Voices and fuller music

Logan picked tower voice lines and fuller music. Still no audio files: everything is made in the browser.
- Voice barks: towers and commanders speak short made-up "mumble" lines (no real words), built from a buzzy voice through moving vowel filters. Each tower school has its own voice (white bright, blue airy, black low and raspy, red gruff and quick, green deep and slow); towers sound deeper as they rank up. Each commander has a voice of their own (Krenko squeaky, Korvold and the Ur-Dragon growling, Atraxa choral).
- Lines: tower picked (a question), built, upgraded, and an occasional battle shout (at most every 7 seconds); commander picked, moved, and ability. One bark at a time, panned to where it happened, and the music dips under it.
- New "Voices: on/off" toggle in the menu next to Music (saved per browser). The main sound toggle mutes voices too.
- Fuller music: every theme gains a harmony line under the melody, plus a string counter-line or low cellos.

## 2026-11-23 — v0.1.0-beta.13.30 three new commanders, new unlock paths

Owner request: more popular commanders with a pick-a-starter, unlock-more progression. Starters stay Krenko, Talrand and Omnath. Card names, mana costs and rules text checked against Scryfall (2026-11-23).
- **Toxrill, the Corrosive** (mono-black, Slime counters). Every 10 s every enemy gets a slime counter (up to 5): each one takes 10% off its attack and 3% of its full health. Slimed enemies that die leave a Slug token (up to 8). Tap: Slime Tide, two counters on every enemy near him. Unlock: win a Gauntlet on Hard (earlier Hard wins count).
- **Torbran, Thane of Red Fell** (mono-red, Red damage). Red towers and red troops deal +4 per hit, scaled by late waves. Tap: Red Fell Fury, hits nearby enemies for twice his attack and triples the red bonus for 10 s. Unlock: win any 25-wave Gauntlet.
- **Urza, Lord High Artificer** (mono-blue, Artifacts). Brings a Construct token that grows with every tower you control and comes back 20 s after it falls; each wave your towers tap for 4 mana each (up to 60). Tap: draw a card and the next spell costs no mana. Unlock: reach player level 3.
- New unlock rule kinds in progress.mjs: `level`, `win`, `hard`. recordRun now takes `difficulty`.
- Seeded benchmark build with each commander, seeds 1–4, fortress health after wave 30: Toxrill 15, Torbran 15, Urza 13 (field: Krenko 10, Talrand 17, Atraxa 20, Ur-Dragon 17). None dominates.

## 2026-11-23 — v0.1.0-beta.13.32 Enemy animations and guided first battle

Logan picked these from the idea list. Visual and UI only; the simulation, seeded runs and copied stats are unchanged.
- Enemy walk cycles: ground enemies bounce and rock in step with their speed, heavy ones (speed 7 or less) stomp and squash on each footfall, fliers flap. Enemies held up by troops breathe in place.
- Death animations: a killed enemy flashes, tips over, sinks and fades over half a second (fliers spin and drop) instead of vanishing. Leaked enemies don't leave a body.
- Guided first battle: the first Gauntlet run walks through seven real steps (build, send a wave, move the commander, use its power, cast a spell, upgrade, call a wave early) with a "Tutorial n of 7" label. A step that can't happen yet is passed over and comes back. It ends when all seven are done or at wave 6. "Skip tutorial" any time; "Replay tutorial" in the menu starts a fresh Gauntlet with it on.
## 2026-11-23 — v0.1.0-beta.13.33 Campaign world map (stage A)

- Title screen gains a painted world map above the battlefield cards: five regions on a trail (Verdant Lowlands = Hollow Road, The Riverlands = Confluence, Frostfen Marches, Greyhorn Mountains = Greyhorn Pass, The Ember Wastes = coming soon). Each stop shows its best stars; tapping one picks that battlefield.
- progress.REGIONS / mapOpen / mapStars: a region opens at its map's player level as before, or as soon as the region before it has been won (any stars, any difficulty). Locked cards say both ways in.
- Cosmetic module archamancy/worldmap.mjs (paintWorld, NODES). No engine or save changes.

## 2026-11-23 — v0.1.0-beta.13.34 commanders batch 2: Heliod, Wilhelt, Kaalia

Card names, mana costs and rules text checked against Scryfall (2026-11-23).
- **Heliod, Sun-Crowned** (mono-white, Lifegain). Every 10 s troops heal 25%; when anyone healed, the three strongest troops get a +1/+1 counter (up to 5 each) and Heliod gains +3 attack. Indestructible: respawns in half the time. Tap: Sun's Blessing, a counter on Heliod and every troop plus 10 s of lifelink. Unlock: 6 Gauntlet stars in total.
- **Wilhelt, the Rotcleaver** (blue-black, Zombies). Each tower troop that dies makes a 2/2 decayed Zombie that crumbles after 10 s (up to 10); every 10 s he sacrifices a Zombie to draw a card. Tap: Rotcleave, three Zombies. Unlock: win a Gauntlet on two different battlefields.
- **Kaalia of the Vast** (red-white-black). Every 12 s while she fights, puts an Angel, Demon or Dragon onto the field (one of each at most). Tap: Call of the Vast, all three at once. Unlock: reach player level 6.
- New unlock rule kinds: `stars`, `maps`. Troop tokens can carry `expires` (decayed) and `counters`.
- Seeded benchmark, fortress health after wave 30 (avg of seeds 1–4): Heliod 12, Wilhelt 11, Kaalia 15 (field 10–20).
## 2026-11-23 — v0.1.0-beta.13.35 Emberfall Caldera (campaign region 5)

- New map `caldera`, Emberfall Caldera, for the Ember Wastes region: the road spirals into a volcano to a keep at the centre. Three lava vents (map.vents [x,y,radius]) erupt every 15 s of a wave (VENT_EVERY 150 ticks), taking 12% max health from ground enemies (bosses 4%, armor ignored) and 30% from ground troops in range. Fliers are unharmed. Damage counts as hazardDamage in stats.
- Ash palette (map.palette "ember"): lava instead of water, charred trees, rising embers. Vents glow and show their blast ring for the last 2.5 s before each eruption. One season only.
- The world map's fifth stop now opens it (win Greyhorn Pass, or level 6). Crude bot: Hollow 17–18, Greyhorn 15, Caldera 15–16.

## 2026-11-23 — v0.1.0-beta.13.36 Enemies without medallions

- Logan: "The circles around the enemies gotta go." On the map, enemies now show their card's art crop bare (a card-shaped crop with the usual ink outline), with no round medallion, colored rim, stone stand or wing flaps. Bosses keep a small gold crown on top. Walk, attack and death animations are unchanged; the drawn creature still shows until the art loads.

## 2026-11-23 — v0.1.0-beta.13.37 Mana Groves pay all wave

Owner report: "Mana Groves stop producing mana at some point." Cause: each Grove has a per-wave harvest limit (22/65/165/400 by tier), and it paid at full speed until that was reached, which took about 15 to 25 seconds. Waves usually last much longer, so Groves went quiet for most of every wave.
- Groves now pace their per-wave harvest across the wave: each payout aims to spread what is left over the time the slowest enemy still needs to walk out (stretching on its own while the road is held). Mana Nexus and Omnath still harvest faster, so they front-load the same amount.
- Anything still unpaid when the road clears is paid then, so a Grove that stood all wave earns exactly one budget per wave as before (no balance change). A Grove built mid-wave keeps the old rule, so a last-second build cannot claim a full harvest.
- The limit is now visible: a harvest bar under each Grove during a wave (turns gold when the wave's harvest is done), and the Grove's panel explains the per-wave amount.

## 2026-11-23 — v0.1.0-beta.13.40 Campaign deckbuilding, part 1: card pool and engine

Logan asked for "Balatro deck building meets MTG": a deck you build over the campaign instead of the big spell list. This part adds the rules and the card pool; the world map Shop, Deck view and drafts come next.
- Balatro's pool (1.0): 150 Jokers (61 common, 64 uncommon, 20 rare, 5 legendary), 22 Tarot, 12 Planet, 18 Spectral, 32 Vouchers = 234. Shares: Jokers 64%, Vouchers 14%, Tarot 9%, Spectral 8%, Planet 5%. Joker effect mix: +Mult 22%, xMult 23%, +Chips 13%, Economy 13%, Retrigger 4%, Utility 24%.
- archamancy/pool.mjs maps that onto 76 real Magic cards in the same proportions: 48 Relics (Jokers: 6 flat damage, 11 percent damage, 11 multipliers, 6 economy, 2 double-up, 12 utility), 10 Boons (Vouchers), 7 Rituals (Tarot: tutors, Giant Growth upgrades, Path to Exile removes), 6 Forbidden (Spectral), 5 basic Lands (Planets: level up a color). The 30 existing spells are the playing cards; the campaign deck is a singleton set of them.
- Engine `kit` command (Gauntlet, before wave 1): deck, relics, boons, land levels and spell upgrades. Relic hooks live in one place (`kitDamage` inside `hurt`) plus wave start, deaths, kills, casts and summons. Small decks reshuffle the graveyard into the library when it runs dry. Runs without a kit are unchanged.
- archamancy/campaign.mjs: starting deck of 8, deck cap 15, 5 relic slots, Treasure payouts, Balatro-weighted shop (relic 20, ritual 4, land 4, forbidden 1, plus one spell and one boon), rerolls, drafts, upgrades and exiles.
- New CI check `.github/workflows/archemancy-cards.yml` runs archamancy/tools/verify-cards.mjs against Scryfall for every pool card and spell: exact name, color identity, type line and a phrase of rules text.
