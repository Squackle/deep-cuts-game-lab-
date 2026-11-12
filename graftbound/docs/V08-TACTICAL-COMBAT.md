# GRAFTBOUND v0.8 — Tactical Combat & Power Scaling (development build; not merged or deployed)

**Base:** Game Lab `main` @ `e0f20a32119fd8ab660cc799b17d7f66ce329316` (v0.7 Milestone 1; baseline `npm test` 128/128).

**Milestone 2 status:** the v0.7 Milestone 2 booster overhaul (`src/ui/pack-opening.js`, the Home labels) is **not on this main commit**. It was delivered as a package but never landed. v0.8 does not overwrite anything from it; the two "Home" label fixes are re-applied here. Re-applying the Milestone 2 package is a separate step.

## 1. Boss titles ("[object Object]")
- **Cause:** each `ACTS` entry defined `boss` twice: a name, then the encounter array, which overrode the name. The battle banner and the map label showed the array.
- **Fix:**
  - The fields are now `bossName` (string), `bossTitle` (location subtitle) and `bossEncounters` (authored templates).
  - `bossNameOf()` and `bossTitleOf()` are the only lookups the UI uses.
  - `banner()` refuses non-string titles.
- **Saves:** migration run v4 → v5 repairs a serialized array in `map.boss`. Nodes and encounter selection are untouched.

## 2. Spell access and tactical decisions
- **Three new REAL spells**, each with a reviewed adaptation. Card pool `real-pool-66-v1`.

  | Card | Printed cost | GRAFTBOUND cost | Adapted effect |
  |---|---|---|---|
  | Disfigure | {B} | 1 | 1 damage + Weaken 2 (the foe's next action) |
  | Titanic Growth | {1}{G} | 2 | +4 power this turn |
  | Pyroclasm | {1}{R} | 3 | 2 to every foe |

  **Card facts were entered without network access.** Run `node tools/verify-real-pool.mjs` before release.
- **Spell Primer:** after the first victory reward of an adventure (Act I), a free, separate choice of 3 affordable spells from 3 different tactical roles. It is deterministic per seed, can be skipped for +1 Spark, and is offered once per adventure. Runs already under way when they migrate never get one.
- **Spell-heavy packs early:** while the spellbook holds fewer than 2 spells in Act I, packs carry 2 spells of different roles plus at least 1 creature, still 3 cards.
- **Later replacement and upgrades:** existing Archivist (replace), Inscription Altar (upgrade) and Graft Exchange.
- **Tactical stances** (every creature; values in `src/data/tactics.js`):
  - **Guard:** costs your attack. Until your next turn, each hit from a foe is reduced by `min(6, 2 + toughness ÷ 4)`. Telegraphed slams, breath and aimed arrows are at least halved. Hazards and poison are unaffected.
  - **Channel:** costs your attack and remaining movement. +1 mana (may exceed the max by 1), and your next spell this turn gains +1.
  - Each stance counts as one accepted action, so efficiency scoring prices it in.
  - Stances block Auto-End only when they're useful: Guard when a foe threatens you, Channel when +1 mana unlocks a cast.
  - Intents show the damage after Guard.
- **Weaken on foes** (Disfigure) and **Rally** (Act II Ashbound Brutes give adjacent foes +1 on their next action) each last for exactly one action.

## 3. Power scaling
- `src/engine/strength.js` estimates offense and defense separately: power, Double Strike (applied once), Deathtouch as a flat bonus, spell burst within available mana, health, lifelink, flying, and protective spells. The two are combined with a geometric mean, so one-sided builds and stacked synergies aren't double-counted.
- The expected curve `3 + 2·step` is the greedy bot's median build per step.
- **Counter reinforcements:** foes that answer the build, never extra health. One foe per 8 (Act I) or 6 (Acts II–III) strength above the curve, capped at 1/2/3 per act. For example, a flying build in Act II draws Skyhook Harpooners, and a spell-heavy build in Act III draws Null Wardens.
- **Bosses read the build:**
  - The Thornmother hardens at 2/3 health and calls up to 4 kin against a build far above the curve.
  - The Pyre Matron calls a Harpooner against fliers as well as spell builds, and adds lava.
  - The Unwritten silences your costliest spell for one turn if you hold 3+ spells (instead of redacting an ability).
- Rules changed, so: `graftbound-rules-0.8.0`, challenge `gb-expedition-01` **revision 2**. Revision 1 replays are rejected and never mixed. Local adventure records use a new key.

## 4–5. Spell presentation
- **Pacing:** normal-speed charges are ×1.3 / ×1.6 / ×1.75 longer for quick / normal / powerful spells. Fireball's flight is longer. Brief lingering motes follow the impact. A new **Cinematic** speed (0.65×) joins Normal, Fast and Instant. Instant still skips the charge.
- **Magnitude:** every `spell` event carries `magnitude`, computed from the **resolved** effect after armor, shields and kills. An area spell counts its biggest hit fully and the rest at a quarter. The renderer maps it on a bounded square-root curve (0.6–2.0). That value scales charge motes, glow, bolt width and branches, Fireball size and blast radius, Frost volume, Drain tether width, impact rings and light.
- **Caps:** particles ≤ 40 extra per impact; shake ≤ 0.3 (none with reduced motion). Low graphics settings thin particles.

## 6. Spell hand
- The spell tray shows the actual card face, using the existing unmodified Scryfall image when online and the GRAFTBOUND frame offline. Broken images fall back to the frame.
- Overlays show the GRAFTBOUND mana cost (not the printed cost), level, and state (Ready / Cast this turn / Not enough mana / Silenced). The selected card is highlighted.
- Desktop: hover enlarges, number keys select, and ⓘ inspects the full card plus its adaptation. Mobile: a horizontal snap-scrolling hand; tap to select.

## 7. Time Taken
- Active play only, sampled from `performance.now()` every 250 ms. Each sample adds at most 1 s.
- The clock pauses on the pause menu, hidden tabs, the title and end screens, and finished runs. Only accumulated milliseconds are saved, so offline time never counts.
- Victory and defeat screens show `Time Taken` and per-act times. Runs from before v0.8 are labeled *partial*.
- Informational only: never scored, never ranked, never in replays.

## Navigation
"Save & Return Home" and the end-screen "Home" button. Internal `toTitle()` / `data-a="title"` are unchanged.

## Main-site integration impact
The separately prepared main-site score checker pinned the v0.6 rules. It must be re-pinned to this commit's rules files (rules 0.8.0, challenge revision 2) before any ranked launch. The production leaderboard was not touched.
