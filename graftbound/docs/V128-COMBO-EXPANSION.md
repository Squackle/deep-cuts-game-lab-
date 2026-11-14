# GRAFTBOUND v1.2.8-beta — 23 real-card, combo-first creature grafts

**Destination:** `Squackle/deep-cuts-game-lab-` → Game Lab `main` → `/graftbound/` only. No public `Squackle/deep-cuts-edh` changes, scores, accounts, D1, or shared games. Direct-to-Game-Lab beta release authorized by the owner. All new card identities are the owner's **exact 23 selected names**; no suggested substitutes added.

## Outcome

- Reward identities **110 → 133**: 102 curated real creatures, 21 spells, 10 Equipment/Auras. Creature name, mana cost, printed type, P/T and supported official keywords must pass the live Scryfall audit; game-specific abilities are explicitly described as adaptations on the cards.
- 23 new *permanent graft* abilities compose via authoritative, deterministic `combo` battle events, not UI side effects. A single action can generate nested token-entry, lifegain, card-draw, death and spellcast triggers in stable queue order. No arbitrary three-token or +5/+5 ceilings: physical battlefield squares and resource costs constrain growth. Long trigger queues have a 1600-event defensive recursion guard rather than unlimited engine recursion.
- Graft choices and activated abilities are deterministic and logged as versioned `combo` and `graft` actions. Actual mana is paid only when the chosen option is confirmed. Pending choices gate incompatible player actions.
- Seven new original procedural companion models: Bird Illusion, Tentacle, Skeleton, Snake, Goblin, Hornet and Squirrel. Existing elemental, Drake and Cat Soldier tokens are given actual color/subtype metadata for cross-card synergies.
- Equipment/save/run IDs unaffected; additive run migration **v8→v9** with battle v10 combo ledger. Prior ranked replays archived when rules changed. **Ranked revision 15**, rules `graftbound-rules-1.2.8-beta`, card pool `real-pool-133-v7`.

## New cards and honest tactical adaptations

| Color | Card | Playable GRAFTBOUND adaptation |
|---|---|---|
| W | Soul Warden | Another creature enters → 1 life gain event, which triggers life-gain grafts, even at full RPG HP without overhealing |
| W | Ajani's Pridemate | Each life-gain event → permanent **for the current battle** +1/+1 counter; multiple triggers stack without a small hidden limit |
| W | Mentor of the Meek | Friendly ≤2-power creature enters → **optional pay 1 mana** → draw a real spell card; a modal records accept/skip |
| U | Mulldrifter | Flying; draw two from real shuffled encounter Library at battle start; Evoke sacrifice is not modeled for grafts |
| U | Murmuring Mystic | Instant/sorcery cast → 1/1 Flying Bird Illusion ally, limited by actual free board squares |
| U | Nadir Kraken | Card drawn → **optional pay 1 mana** → battle-only +1/+1 counter and 1/1 Tentacle ally |
| U | Sea Gate Oracle | At encounter start, view top two Library cards, select one for hand, bottom-deck other; never inject fake cards |
| U | Dungeon Geists | At encounter start, choose a foe to freeze for two enemy actions (boss one); no permanent lockdown |
| B | Zulaport Cutthroat | A friendly ally dies → nearest enemy loses 1, hero gains 1; combines with Blood Artist and life-gain triggers |
| B | Ayara, First of Locthwain | Black ally enters → drain 1; once per player turn, explicitly sacrifice a black ally → draw |
| B | Reassembling Skeleton | Start with 1/1 black Skeleton, revive with 2 mana when absent; return exhausted and skip next companion action |
| B | Morbid Opportunist | Another creature dies → draw 1 **only once per turn**, including simultaneous deaths |
| B | Ophiomancer | At each turn start, if no living friendly Snake exists, create one 1/1 black Deathtouch Snake |
| R | Guttersnipe | Each instant/sorcery → 2 extra damage to nearest foe; real health damage and death triggers |
| R | Electrostatic Field | Adapt Defender as protective shield on encounter start; spells deal 1 damage to foe |
| R | Goblin Rabblemaster | Player turn start → 1/1 Haste Goblin, Goblin ally attacks empower hero for that turn; Goblin subtype works with enemy/ally tribal checks |
| R | Storm-Kiln Artist | Each instant/sorcery → 1 real spendable Treasure charge; artifacts/equipment may strengthen the hero |
| R | Chandra's Spitfire | Flying; each distinct noncombat enemy damage event gives +3 attack until the normal end-turn expiration |
| G | Ivy Lane Denizen | Green creature enters → select any friendly creature for one battle-only +1/+1 counter |
| G | Champion of Lambholt | Each allied creature entry → +1/+1 counter; weak foes cannot retaliate in melee; blocking mapped to tactical reaction attacks |
| G | Eternal Witness | Once per encounter, choose a real card in the Graveyard and put it back into your hand |
| G | Hornet Queen | Flying & Deathtouch; begin battle with up to four 1/1 green Flying Deathtouch Hornets where squares allow |
| G | Deep Forest Hermit | Begin battle with four 2/2 green Squirrels, each losing the temporary +1/+1 at the specified turn; Vanishing never sacrifices the grafted hero |

**Printed-Magic limitations:** None of these cards are separately cast as a creature spell; creatures are grafts on the hero, not ordinary permanent cards on the battlefield. Creature ETBs become encounter starts or ally-entry triggers. Wording explicitly discloses adaptations and any substitutions (e.g., no Evoke, Defender, Vanishing sacrifice).

## Reliability, balance and fairness

- Live Scryfall `tools/verify-real-pool.mjs` must pass on the exact release commit. The new print metadata is **not** considered verified by the offline local test.
- Never grant additional stats to permanent evolution for temporary battle counters, and never charge mana for canceled optional prompts.
- Combo event order deterministic; pending actions and Treasure live in serialized `s.combo`. Engine does not depend on animation, frame rate, real time or nondeterministic random APIs.
- Eligibility uses existing `graftRating`/`creatureBudget` progression; boss/elite rarity slot guarantees remain conditioned on *eligible* cards, not forced into early battles.
- Wurmcoil, Toxrill, Krenko, enemy AI, existing bosses, normal combat deck, and nonselected Magic reward identities remain untouched apart from intended shared trigger interoperability.
- Historical save keys stay `deepcutsedh.livingcard.*`. Old ranked logs aren't silently submitted under new rules.

## Required pre-merge checks

1. `cd graftbound && npm run assets` successful; inspect generated sprite manifest.
2. `cd graftbound && npm test` fully green apart from offline-only Scryfall skip; all source `node --check` valid.
3. `python3 tools/audit_sprite_bounds.py` 21 sprite sheets with zero warnings.
4. `node tools/audit-loot-v126.mjs` ≥60,000 seeded pack simulations with no illegal, duplicate or ineligible cards and no missing eligible Elite/Boss guarantees.
5. GitHub source bundle CI runs **all curated card Scryfall verifications** and full test suite, no skips. Correct any printed facts/metadata without bypassing verification.
6. GitHub Unified Game Lab and release-coordination workflows green against the exact PR SHA; 100% paths under `graftbound/**`.
7. Cloudflare Pages **production** deployment of merged Game Lab `main` SHA reports `success` before calling release live.

**Browser limitation:** Headless and real iPhone Safari full gameplay acceptance may be unverified in this environment. This must be disclosed as beta QA limitation; do not assert physical-device completion. Use mobile `Full/Minimal/Off` card motion and existing back-navigation controls.

## Rollback

Revert only this isolated Game Lab PR; known pre-release production SHA `70af3a432a341bc493f13e5a8f06c8136a92d706`. Preserve save keys and archived ranked challenge versions. Separate production `Squackle/deep-cuts-edh` remains untouched.
