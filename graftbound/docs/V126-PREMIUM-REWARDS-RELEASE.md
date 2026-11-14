# GRAFTBOUND v1.2.6-beta — Premium Loot, Card Movement, and Living Grafts

**Scope:** `Squackle/deep-cuts-game-lab-`, all changes restricted to `graftbound/**`. This is a Game Lab beta-only release under the standing November 13 direct-to-Game-Lab instruction. **No separate public Deep Cuts EDH site promotion, D1/score backend, shared Lab catalog, other game, or save-key changes.**

## Changes and actual rules

### Real rarities, eligibility, cosmetic treatments

- The curated catalog grows from 68 to **79 creature identities**, plus 21 adapted spells and 10 Equipment/Aura cards: **110 reward records**. The expansion includes useful rules-triggered grafts such as Young Pyromancer, Talrand, Blood Artist, Vito, Sheoldred, Archmage Emeritus, Elvish Visionary, Brimaz, and Archaeomancer. Their rules **are GRAFTBOUND-specific adaptations** described on the cards; do not claim they are exact printed Magic Oracle behavior.
- First select the rarity bucket, then a random eligible card in that bucket. Per-slot tables are fixed but **the realized probabilities must renormalize over eligible rarities** at early stages and under challenge restrictions. Power-budget gating still applies independently of rarity.

| Pack tier | Common | Uncommon | Rare | Mythic |
|---|---:|---:|---:|---:|
| Battle | 60% | 28% | 10% | 2% |
| Elite | 30% | 42% | 23% | 5% |
| Boss | 12% | 33% | 43% | 12% |
| Shrine | 45% | 35% | 17% | 3% |

- When eligible: Elite packs always include at least one Uncommon+, Boss packs always include at least one Rare+. Otherwise a guarantee does not invent or inject an ineligible card. Three distinct offerings are retained, including creature/spell access where eligible.
- Each revealed card rolls an **independent, deterministic cosmetic treatment**: Original GRAFTBOUND 88%, Etched 10%, Masterwork 2% (visual decoration only). These are **not official Magic showcase frames, licensed card art variants, or proof of a foil printing**. A Rare's gameplay rarity never changes when it gets a cosmetic.
- Pack wrappers are original game artwork; no Magic art is sampled into generated assets. The game already supports external Scryfall reference images and attribution; expanding that use would require separate licensing review.

### Encounter rules and saves

- **Combustible Gearhulk is replaced by Wurmcoil Engine**, a 6/6 Lifelink/Deathtouch artifact creature whose death creates separate 3/3 Deathtouch and 3/3 Lifelink Wurms when legal spaces exist. Gearhulk's enemy hand, mock library, opponent-choice dialog, and automatic drawn-creature casting have been retired. 
- **Fallen Shinobi** still exiles cards from the *player's* actual combat Library; it is unaffected by removing the opponent's artificial library. **The Scarab God** still causes Zombie-count life loss and reanimates actual defeated battlefield creatures; its former fake-library scry is replaced by a disclosed tactical foresight message.
- **Channel Reserve** banks up to two mana and two Channel charges, lasting until an eligible spell consumes them or the encounter ends. Normal mana stays governed by its existing turn/cap rules. Channel decisions remain deterministic and replayable.
- After the final Act III boss, record an authoritative saved **win immediately, with no final booster**. A skippable original victory celebration leads to the standard run statistics and achievements. A bounded meta ledger prevents counting the same completed run twice after refresh.
- Save migration **run v7 → v8** preserves learned spells, the actual player's deck, gear, health, and history, and retires only the simulated opponent-hand fields. Encounter **battle v9**, rules `graftbound-rules-1.2.6-beta`, card-pool `real-pool-110-v6`, ranked challenge revision 13. Earlier replay versions remain isolated, not silently submitted under the new version.

### UI / spectacle

- One compact **Library / Graveyard** pair in the battle HUD. The Library uses an original GRAFTBOUND face-down card back and count; the Graveyard shows the latest actual card face and opens a full accessible card list. No hidden Library card names are leaked. 
- The presentation-only animation director animates draw, cast, discard, return and reshuffle events with cancellable, GPU-transform card movements and independent Full / Minimal / Off preferences (Auto respects reduced-motion settings). It never mutates the underlying deck or ranked replay log.
- Rebuilt **Shock** as a quick branched electrical snap, distinct in timing and silhouette from Lightning Bolt. Added explicit spell-level and bounded impact-strength metadata to scale impact visuals without changing deterministic spell outcomes.
- Premium rarities and cosmetic finishes receive different frame/glow treatments, always skippable and reduced-motion aware. Revised creature cards display their tested graft-trigger adaptation instead of an incorrect “No abilities” label.
- The final victory cinematic is original procedural CSS/SVG with a direct **View Run Statistics** action and keyboard/skip support.

## Quality gates and observed test evidence

- `cd graftbound && npm run assets` — source art generated successfully (21 sprite sheets, 19 parts, 16 materials, 11 foliage).
- `python3 graftbound/tools/audit_sprite_bounds.py` — 21 sheets, **0 warnings**.
- `cd graftbound && npm test` — full local unit suite (record final totals in PR). Live Scryfall is skipped without outbound network: **do not equate local skip with live validation**.
- `node graftbound/tools/audit-loot-v126.mjs` — **60,000 seeded pack rolls = 180,000 card slots** over 8 campaign steps × 3 pack tiers: **0 short packs, 0 duplicate offerings, 0 missing Elite/Boss rarity guarantees, 0 ineligible cards**. Full output in `graftbound/reports/loot-audit-v126.json`; observed rarity frequencies are conditioned on eligibility/guarantee slots and therefore do not equal the per-slot nominal tables in a three-card pack.
- GitHub's network-enabled `graftbound/tests/zzz-scryfall-live-ci.test.mjs` **must** run against the exact release commit and certify all curated cards; any mismatches must be corrected without bypassing checks.
- GitHub Unified Game Lab and release-coordination checks must pass before merging to Game Lab `main`.
- **Manual browser testing is not certified here**: sandbox Chromium blocked both localhost and file navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Physical iPhone/Android playthrough, layout and interaction acceptance, audio loudness, and premium reveal polish should be assessed on the Game Lab build before describing those as verified. This is a **beta**, not final commercial QA.

## Rollback

If Game Lab beta needs rollback, revert the isolated v1.2.6 PR to the pre-release Game Lab `main` SHA `ec3268822f3761e637f311b852167636bdd16396`. Preserve existing local storage and archived ranked versions. No rollback or deployment to `Squackle/deep-cuts-edh` is authorized by this Lab release.
