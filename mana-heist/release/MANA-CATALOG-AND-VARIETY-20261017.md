# Mana Heist — Oracle mana catalog and genuine puzzle-family diversification

**Research + implementation handoff · 2026-10-17. Workstream: standalone Game Lab only.** The owner rejected repeating three identical rituals and the same paid-mana sequence over multiple worlds. This branch changes the underlying strategy, not merely a card picture, mana color, target pip, level name or arbitrary score.

## Compiling the broader real-card pool

Run `node mana-heist/tools/build-mana-catalog.mjs` in a network-enabled development environment. It obtains the current Scryfall **Oracle Cards** bulk export, deduplicated by Oracle identity (not by printing), and examines all Oracle entries and every face. It exports artifacts, instants and sorceries whose text appears mana-relevant (production, Treasure creation, mana manipulation, untap and cost changes) to `mana-heist/data/mana-oracle-candidates.json` with name, Oracle ID, original type, Oracle text, legality, cards faces, tags and source/update timestamp.

**Important honesty limit:** This is an offline *candidate discovery pipeline*, **not a full verified inventory of every possible mana interaction**. Oracle wording varies, some cards create mana indirectly, and the search can both miss edge cases and include false positives. The full bulk export was NOT fetched in this authoring environment, so there is not yet a generated dated all-card catalog to claim as completed. Before activating a new card in puzzles, compare exact Oracle text with [Gatherer](https://gatherer.wizards.com), Wizards [Comprehensive Rules](https://magic.wizards.com/en/rules), add a scenario and deterministic tests, and record unmodeled side-effects. Do **not** render unreviewed discovered cards as playable.

### Real MTG abilities supported in this branch

Five mana spells: **Seething Song, Desperate Ritual, Rite of Flame, Mana Geyser, High Tide**. Existing Dark Ritual and Pyretic Ritual remain. These are actually **cast from hand** with input payments, consumed into the graveyard, and generate appropriate outputs. Rite of Flame counts prior copies in the player's graveyard; High Tide lasts only until turn end, benefits any Island tapped for mana even if the chosen mana is not blue; Mana Geyser uses an explicit puzzle-snapshot count of **tapped opponent lands**.

Sixteen artifact identities: **Mind Stone, Thought Vessel, Hedron Archive, Thran Dynamo, Worn Powerstone, Gilded Lotus, Arcane Signet, Prismatic Lens, Mana Cylix, Chromatic Lantern, Skyclave Relic, Basalt Monolith, Voltaic Key, Lotus Bloom, Nyx Lotus, Everflowing Chalice**. Sol Ring, Azorius Signet, Treasure and Lotus Petal remain. New ability classes include true colorless multi-output, paid one-mana color filtering, any-color output, Chromatic Lantern's granted land mana abilities, Basalt Monolith's paid untap and refusal to untap naturally on new turns, Voltaic Key's paid targeted untap, sacrificed Lotus Bloom, devotion-scaling Nyx Lotus and charge-counter-scaling Everflowing Chalice. All permanents in this prototype start on the battlefield; entering tapped/casting costs and additional non-mana text **are not fully simulated** unless explicitly modeled.

**Explicit exclusions / future rule families**, not deceptively approximated: Cabal Ritual's threshold without live graveyard support for arbitrary cards; Jeska's Will's modes/exile; Mana Vault's upkeep/untap timing; Jeweled Lotus's commander-only mana restrictions; Mana Reflection, Doubling Cube and mana-spending replacement effects; Culling the Weak and sacrifice creatures; Frantic Search/Turnabout untapping several real targets; mana effects with X, copied spells, stack priority or opponent actions. Do not classify these as fully playable until verified.

## Puzzles that require genuinely different thinking

Original mh-001–mh-250 remain exactly preserved. Each **10-stage world** in Galaxy VI–X now rotates **at least five strategy families** (twice), rather than ten copies of the same “Signet → Coffers → three Dark Rituals” route. Each family has its own source array, legal cost requirements and deterministic replay trace:

- **Island Tide:** spell-casting High Tide before tapping Island-typed duals; blue extra mana appears even when Volcanic Island produces red. Low-life pain-land variant restricts timing/choices.
- **Chromatic Works:** Thran Dynamo pays Signet and Prismatic Lens activation fees, Cascade Bluffs converts blue, Gilded Lotus and Nyx Lotus supply specialized colors, Pyretic/Desperate Ritual spend then generate red. Treasure is one-use and differs by turn.
- **Opponent's Furnace:** Mana Geyser produces red depending on 8–10 **tapped opponent lands**. Colored source and artifact allocation must satisfy two wards after the sorcery is cast.
- **Growing Flame:** Rite of Flame creates more red mana in turns two/three because *prior Rites are in the graveyard*, with ward red requirements rising to force the extra mana.
- **Monolith Lock (Galaxy VI):** Basalt Monolith must tap, be untapped by a separately paid Voltaic Key, and tapped again to meet **nine colorless mana**. An artifact isn't simply a land with another frame.
- **Black-Mana Engine (Galaxies VII–X):** existing, separately verified Urborg/Coffers/Nykthos/Signet/ritual line, now a minority option rather than the universal standard.
- **Actual finale mh-500:** a 21-permanent tabletop and three **different** mana spells across three turns: High Tide (Island type), Mana Geyser (eight opposing tapped lands and sacrificial color fuel), then Rite of Flame with Chromatic Lantern land-granted mana, an untap via Voltaic Key, and Basalt Monolith output. Six wards split three actual sequential turns; no three identical Dark Rituals.

The new recipes are strategically distinct, but **NOT 250 independent handmade scenarios** and NOT yet empirically proven unique or optimally difficult. Each has a legal replay certificate; an impossibility bound or optimal score proof needs future tooling. Structural C/D estimates remain heuristics, not observed player success rates.

## Regression, versioning and review

- Exact 500 IDs and original 250 progress records preserved. New changed mh-251–mh-500 boards use **revision 3** and new storage namespace `dc-mana-heist-variety-v1`. Previous revision 2 bests remain saved separately and never silently transfer stars.
- Test every supported spell/artifact family, every ten-vault world's variety, every changed level's replay legality, final multi-card interaction and responsive no-scroll UI. Check reduced-motion and mobile manually before full release.
- Existing mana UI/casting logic, curved hand, Chromatic Cauldron and optionally manual/automatic cast remain. No profile data, D1, shared Game Lab sources or public Deep Cuts site changes.
- The original rules simplify MTG steps/phases and the stack. Wizards rights review P01 is STILL BLOCKED. Never promote card art/this playtest to the public website without independent approval and legal review.

## Rollback

Revert this single Mana Heist Game Lab PR; Cloudflare Pages republish. Prior v2 bests/legacy IDs remain untouched and are still playable. New `dc-mana-heist-variety-v1` results remain inert and may be reused if the release is restored. No server migrations.
