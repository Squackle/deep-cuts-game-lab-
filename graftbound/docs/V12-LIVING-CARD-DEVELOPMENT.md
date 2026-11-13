# GRAFTBOUND v1.2 — Living Card Development Candidate

Workstream: Game Lab only (`graftbound/**`). Base: Game Lab main `ab9943b1cb4b994f85d00665d209e38cd542f8a2`.
Owner approved development and Game Lab deployment **conditional on passing release gates**.

## Implemented in this candidate
- Seed-selected six actual legendary boss identities: Nemata, Arasta, Drakuseth, Krenko, The Scarab God, and Toxrill. Original acts, connected arenas, and hazards remain; printed P/T is separate from visible encounter Vitality (20–40 HP).
- Real-card identities and printed P/T for sixteen ordinary/Elite foes. Current implemented mechanics include Timberpack Wolf / Nightpack Ambusher, Mudbutton Torchrunner, Spikeshot Goblin, Thermo-Alchemist, Plague Stinger Infect, Dauntless Escort, Caustic Caterpillar, Rageblood Shaman, and Triplicate Titan.
- Persistent two-slot Equipment inventory, modeled on the evolving character sheet; ten real Equipment/Aura card definitions. One-encounter Auras are drawn and cast, then consumed at encounter end. Appropriate printed bonuses and status effects.
- Deterministic shuffled combat library: three opening cards, one draw on later turns, hand limit with discard, graveyard; stationary-cover arcane spiral presentation. Tapping, Vigilance, First Strike and one legal counteraction by untapped creatures.
- World Threat, hard cap twelve, separate visible opponent shields, bounded reinforcements, and threat UI; Versioned new saves and ranked challenges.
- New targeted test coverage for printed enemy identities, death triggers, Infect, Toxrill end steps, and run systems.

## Incomplete / blocking production release
- Real Magic printed abilities need full card-by-card acceptance, especially Combustible Gearhulk's opponent-choice ETB, Fallen Shinobi's exile/free-cast on combat damage, Faerie Duelist ETB, enemy Longbow equipment, and fully modeled Scarab God library/scry/return-to-hand. Tactical encounter adaptations must not be misrepresented as Oracle.
- Browser screenshot / mobile UI acceptance, precise equipment-to-animation rig registration, fully individual custom boss creature sprites, performance on actual devices, and preview playthrough need validation.
- In-battle attachment equip-cost actions and ally equipment UI must be completed or an intentional alternate user-facing rule must be approved.
- Live Scryfall card metadata verification: 98 curated entries checked on network-enabled GitHub CI with zero mismatches (latest remote candidate `bb21188`). This verifies printed facts only, not faithful execution of every ability. Re-run for each subsequent changed commit.
- Balance regression: in 24-seed greedy simulations the spell-focused build won 0% of complete adventures; this must be investigated before production merge (a simplistic bot is directional evidence, not an estimate of human win rate).
- Require full Game Lab CI, recorded visual acceptance and owner-approved production deploy before merging.

## Important gameplay safety
- No changes to DeepCutsEDH production site, unrelated games, D1, profiles, or leaderboard.
- Existing local saves retain their keys and migrate additively; old replays remain isolated through new version metadata.
- Rollback target is previous production Game Lab SHA `ab9943b1cb4b994f85d00665d209e38cd542f8a2`.

## Latest candidate evidence
- Remote preview first candidate: Cloudflare Pages branch deployment `514005de.deep-cuts-game-lab.pages.dev`; subsequent branch updates require fresh SHA verification.
- Local `npm test` after boss and Faerie Duelist fixes: 212 passing, zero failing, one Scryfall-only skip.
- Strict sprite bounds: 21 sheets, zero edge warnings.
- QA limitations: browser E2E blocked by localhost navigation policy; no visual acceptance on physical devices.
- Draft PR #148 remains the development source of truth; production `main` remains v1.1.1 until all blockers are resolved.

## Verified continued work — in-battle Equipment and browser checks

- Implemented paid, replayable in-battle Equip actions and mobile combat Armory for choosing hero or living friendly allies. Engine checks owned Equipment, exact printed Equip cost, bearer slots and available mana before mutating state. Hero equipment choices persist after battle.
- Added five regression cases for printed bonuses, atomic errors, ally transfers, distinct hero slots and replay envelope strictness.
- Exact GitHub branch commit 1391ea37e014af52c8b73c4c8b2a4d4291830e2a passed **218/218** tests on a network-enabled runner, including **98/98** live Scryfall card-fact comparisons (zero failures). Recheck all gates for final head before any merge.
- Cloudflare preview deployed successfully at https://59ba6c95.deep-cuts-game-lab.pages.dev/graftbound/ for this exact commit. Remote browser rendering at 360 by 640 loaded the title, campaign map, actual battle and mobile combat Armory. This does not constitute full mobile/desktop device acceptance.
- **Still blocking production:** Gearhulk opponent-choice ETB, Shinobi free-cast, Scarab God's complete scry/reanimation/death-return ability, precise equipment visual rig QA, boss art quality, simulation tuning and full browser playthrough.

## v1.2 first-level reward and Soldier token hotfix

- Raise the Alarm now creates **two separate 1/1 white Soldier tokens**, each on a distinct nearby tile. Spell level and Arcane do not change their printed 1/1 stats. Two empty tiles are required before spending mana.
- First cleared level grants **three consecutive three-card offerings**: standard booster, existing affordable Spell Primer, and another standard booster. Choose one per pack or skip individually. The UI shows Pack 1 of 3, Pack 2 of 3, and Pack 3 of 3.
- The sequence is saved and replayed deterministically. Beta ranked rules are now graftbound-rules-1.2.1-beta, challenge revision 8. No save-key changes.
- Added regression tests for two Soldiers, unavailable summoning positions, deterministic reward sequencing, and mid-sequence save/load.
- This is a preview-only hotfix; the larger v1.2 production release blockers remain unresolved.

## v1.2 boss/model/ranged-attack hotfix (preview)

- **Spikeshot Goblin** now emits an explicit `rangedShot` gameplay presentation event when its printed `{R}, {T}` ability resolves, and animates a camera-correct flying wooden shaft with a visible metal tip and feathers. The already-telegraphed Elvish Archer's Longbow shot uses this same actual arrow presentation; Thermo-Alchemist retains its distinct magical projectile. There is no gameplay damage change for these visual effects.
- Converted enemies now resolve to **distinct original animated models**, not their predecessor's legacy sprite keys. The new model renderer builds 32 individually themed front/back sprite sheets once at asset load, including all sixteen ordinary/Elite card replacements, all six legendary bosses, and their summon tokens. Original existing sprite art remains available to old saves and the unchanged preexisting game; new appearances are generated from original hand-drawn shapes, color identities and animated rigs without Magic card art.
- All six boss encounters resist the instantaneous destroy effect of Deathtouch while keeping the ordinary damage and a documented +2 chip-damage substitution. Non-boss creatures remain susceptible to Deathtouch. Explicit combat feedback and inspection text explain the exception.
- Beta rules version advances to `graftbound-rules-1.2.2-beta`, ranked challenge revision 9. Previous challenge revisions remain isolated by the replay version contract. No save keys, site root, or other games are changed.
- Added regression coverage for new creature-model identities and summon token models, projectile event emission, and the boss/ordinary-creature Deathtouch distinction. Continue manual mobile desktop animation acceptance before full v1.2 production promotion.
## v1.2.3 printed-ability completion (preview candidate)

Resolves three of the listed production blockers. Rules `graftbound-rules-1.2.3-beta`, ranked challenge revision 10. No save-key changes; new battle fields are optional and older in-progress battles fall back safely.

- **Combustible Gearhulk ETB.** On entering, you (the target opponent) must choose before any other action: *let it draw three* or *mill three*. Mill deals damage equal to the milled cards' total mana value. The opponent's library is the curated set of 16 real enemy cards, shuffled per battle from a seeded RNG. **Tactical adaptation:** drawn cards are cast by the opponent, at most one creature per enemy turn, never a second Gearhulk, and only while fewer than six foes remain. The choice is a strict replay decision (`{type:'gearhulk', choice:'draw'|'mill'}`). A non-dismissible prompt blocks auto-end.
- **Fallen Shinobi.** Combat damage that actually reaches your hero exiles the top two cards of your encounter library. **Tactical adaptation:** the opponent plays an exiled card for free only if it is a single-target damage spell (Shock, Lightning Bolt, Flame Slash). It hits your hero at printed strength (level 1, no Arcane); other cards stay exiled for the encounter. Your permanent run spellbook is unaffected.
- **The Scarab God.**
  - Upkeep is now **life loss** that ignores shields and Guard, with X counting every Zombie, including Fallen Shinobi (Zombie Ninja). It also scries X.
  - Reanimation exiles a creature card from **any** graveyard, including Gearhulk-milled cards. It creates a **4/4 Zombie token copy** that keeps the creature's printed keywords and triggers.
  - On death the god returns to hand at the next end step. If other foes remain, it is recast for {3}{U}{B} as a printed 5/5 without encounter Vitality. If it was the last foe, the encounter is won immediately.
- **Deck recursion (balance change for owner review).** When your encounter library is empty at the draw step, the graveyard (never exile) shuffles back in deterministically. Revert by removing the `refillFromGraveyard` call in `startPlayerTurn`.
- **Balance (24 seeds, naive bot, directional only):**

  | Build | v1.2.2 win | v1.2.3 win |
  |---|---|---|
  | Greedy | 50% | 54% |
  | Melee | 25% | 38% |
  | Tank | 29% | 29% |
  | Pure spells | 0% | 0% (reaches Act II 8%) |

  The pure-spell bot never grafts, so it fights the whole adventure as a 1/1 with 7 health. Fixing that is an owner design decision, not a bug fix.
- **Tests:** `npm test` 240 total: 239 pass, 0 fail, 1 network-only Scryfall skip (baseline was 227 total, 226 pass). 13 new cases are in `tests/v123-printed-triggers.test.mjs`. Bots in `tests/helpers.mjs` and `tests/ranked-bot.mjs` answer the Gearhulk choice.
- **Browser:** `tests/e2e.py` was stale against the v1.2 Pack 1/2/3 first reward and failed identically on the untouched v1.2.2 source. It now skips Pack 3 of 3, confirming the skip dialog, and runs to completion: **34/36**. The two failures, *Lightning Bolt spawns procedural lightning geometry* and *legacy grafts kept exactly; legacy card shown as Legacy*, also fail on the untouched v1.2.2 source under the same patched script, so they are pre-existing. Environment: headless Chromium + SwiftShader, not real devices.
- **Still blocking production:** precise equipment visual rig QA, boss art quality, spell-build design, and full device playthroughs. Live Scryfall must be re-run on CI for this commit.

## v1.2.4 verification fixes (audit of committed d5e7e993)

An audit of the committed v1.2.3 (`d5e7e993`) found and fixed:
- **Fallen Shinobi** triggered on its counterblow when the hero attacked it. It now triggers only when the Shinobi is the attacker, matching "deals combat damage to a player".
- **Gearhulk choice** incremented `stats.actions`, which lowered the efficiency score for a forced choice. It is now score-neutral.
- **Gearhulk prompt** could be dismissed with Escape or a backdrop click, leaving the player with no visible way forward. Any modal close now reopens the prompt while the choice is pending (`main.js closeModal` → `BattleUI.reopenPendingChoice`).
- A comment wrongly said the Scarab God sorts by mana value; it sorts by printed power.

Rules `graftbound-rules-1.2.4-beta`, ranked challenge revision 11. No save-key changes.

Evidence:
- `npm test`: 242 total, 241 pass, 0 fail, 1 network-only skip. 2 new regressions.
- Fuzz: 400 mixed battles with Gearhulk, Shinobi and the Scarab God. 0 exceptions, 0 non-finite stats, 0 stuck turns, every state JSON round-trips.
- Targeted Scarab test: 100/100 return to hand, recast when the opponent's mana allows.
- Browser test (headless Chromium): Gearhulk injected into a live battle.
  - The prompt appears, and Escape or a backdrop click cannot dismiss it.
  - End Turn is refused while the choice is pending.
  - Mill applies 3 cards and the damage, then the battle continues.
  - No page errors.
  - Result: 10/10 checks.
