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
