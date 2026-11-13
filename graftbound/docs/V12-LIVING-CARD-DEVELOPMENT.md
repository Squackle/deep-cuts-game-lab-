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
