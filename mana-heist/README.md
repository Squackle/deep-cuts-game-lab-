# Mana Heist — Landfall playtest 0.2

**Game:** Mana Heist: Crack the Vault  
**Route:** `/mana-heist/` on the **standalone Deep Cuts Game Lab**, not the public Arcade.  
**Rules engine:** `mh-landfall-0.2.0` (self-contained, deterministic, no servers).

## What's new

Version 0.2 rebuilds the original abstract relay game around **tappable land cards outside the vault**, a visible mana pool, land drops, casting ward-breaking spells, life decisions and tight turn deadlines. The battlefield is a land row separate from the vault; tap a land to add exactly one of its possible colors and rotate it sideways. Tapped lands remain unavailable until you end the turn. The player must cast a sequence of named spells to open a vault.

Cards are **original land designs and names** inspired by familiar land *categories* rather than copied Magic: The Gathering card art, names, icons, or complete game rules. The land archetype names “basic”, “dual”, “shock”, “pain”, “check”, “fetch”, “bounce”, and “utility” describe what they do.

### How to play

- **Land drop:** One card may be played from hand each turn; existing battlefield cards begin untapped.
- **Tap:** Click or tap a battlefield card. Monocolor lands tap instantly; multiple-color cards offer a choice of exactly **one** mana color. The card visibly turns 90°.
- **Pool:** All produced mana goes into a visible, colored/lettered pool. It persists between actions and empties when ending the turn.
- **Cast:** Spend exact colored costs plus any colored/colorless payment for generic requirements. When generic payment is ambiguous, select a real allocation. Spell effects may let you choose and untap a land.
- **Land families:** Shock lands enter tapped unless you pay 2 life. Pain lands charge 1 life for colored mana but give colorless freely. Check lands depend on typed lands already in play. Fetch lands sacrifice themselves and charge 1 life to get a matching reserve land. Bounce lands enter tapped, returning another land to your hand. Duals tap for one of two colors.
- **Life:** Life can never reach 0. You lose only if an action would be illegal, but may always Undo or Reset. The level deadline forbids another end-turn action after its last turn.
- **Scoring:** Three stars when solved within the solver's fewest turns and least life spent among those fastest solutions; two for up to one extra turn (within deadline), one otherwise. Extra taps are **not** punished as clicks.

## Complexity ladder

| Levels | Chapter | Difficulty | Core decisions |
|---|---|---|---|
| 01–03 | The First Key | Initiate | Single taps, hand-to-field timing, unspent mana reset |
| 04–07 | False Shores | Rookie to Tactician | Two-color duals, shock-enter choices, tempo vs. life |
| 08–11 | The Ledger | Tactician | Pain lands, typed check lands, generic vs. colored costs |
| 12–15 | The Deep Search | Expert | Fetch target selection, shock sequencing, untap spells |
| 16–18 | The Grand Heist | Mastermind | Bounce-land land drops, alternative life costs, chained multi-ward puzzles |

The final three test nested resource requirements and sequencing across multiple turns; the final vault has **three successive wards**, five possible battlefield lands, color competition, shock and pain decisions, and a strict turn limit. No daily repetition or randomness is involved.

## Engineering quality gates

- Pure engine in `src/engine.js`, with `reduce(level,state,action)`, `actions(level,state)`, `key(state)` and strict puzzle validation. UI and solver use the *same* legal action list.
- Search in `src/solver.js` prioritizes minimum turn count, then minimum life spent, then minimum action count. The search reports `inconclusive` if bounded before completing; it never falsely calls a timed-out puzzle unsolvable.
- All **18 authored levels are solver-proven**, including exact optimal replay through the live reducer. Latest CI evidence: `18:24:59 UTC, 2026-10-15`; 4,625 distinct explored state keys across 18 levels, 0 Node test failures on branch version 0.2.
- Source syntax, isolated API checks and backend separation included in `.github/workflows/mana-heist.yml`.
- Local guest best medals use `dc-mana-heist-landfall-v2` browser storage; v0.1 saves remain untouched. No accounts, profile bling, leaderboard, D1 or external APIs.
- Cloudflare preview smoke test at 390px: 18 picker levels loaded, single-land tap changed card to sideways, blue mana added, spell opened first vault and awarded ★★★, no horizontal overflow. Broader manual physical device testing still recommended.

Run local checks from repository root:

```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

## Scope and copyright

This is a simplified *original* mana-base strategy game; it does **not** implement the entire Magic rules engine, Magic card text, Wizards marks, or official land image assets. Exact Wizards card art/names and full proprietary components are not included pending appropriate permissions. The game is free and standalone.

### Future after playtesting

- Tune the five difficulty ratings from actual player performance and misplay rates rather than just solver search size.
- Add 6 optional expert “Black Vault” scenarios with near-optimal-line constraints, multi-choice fetches, and intertwined abilities.
- Add optional move-by-move hints only after proven replay paths; preserve challenge integrity.
- Consider original licensed illustrations/audio and improved keyboard-first controls.

The **Game Lab** may be updated with owner authorization and its own CI/preview. **Do not deploy the public Deep Cuts EDH Arcade** without a separate owner-authorized integration PR and website developer review. Hive Run's systems remain separate.

## 0.3 — Overworld & Mana FX (2026-10-15)

The live Lab-only playtest now opens on a **chapter-based campaign map**, not an exposed 18-stage grid. Each of five acts shows only its own three or four stage nodes as `1:1`, `1:2`, `1:3`, `2:1`, etc. Future acts are represented by locked numbered pips with names hidden. The first uncracked stage is highlighted; only stage 1:1 is available for brand-new players. Clearing a stage permanently unlocks exactly the next stage; previous completed stages remain replayable. The game screen and campaign map are separate. The "Next" shortcut in an active game was replaced with "Map" to prevent skipping.

Guest progression continues using **the existing v2 browser storage** `dc-mana-heist-landfall-v2`, so returning players keep completed stages and best scores. Malformed best entries are ignored, and an out-of-sequence v2 save does not permit skipping locked gaps. No profile or server access.

The mana ledger is now an illustrated **mana reservoir of circular sockets**. Each legal land tap (i) rotates the land sideways, (ii) produces a typed orb in the deterministic reducer-backed pool, (iii) animates a colored bubble from the tapped card's last screen position to a pending empty socket, and (iv) lights that socket when the bubble arrives. Spells remove exactly the colors actually paid. End turn clears orbs; Undo restores the prior socket inventory. Color identity is conveyed by both letter and hue. Reduced-motion settings bypass the animation without blocking game state.

Land art panels now use **self-contained original SVG painted landscapes**, uniquely seeded from land identities, instead of the previous generic card glyph. Official MTG card images, Wizards branding and copied mana symbols remain intentionally excluded; no new remote image, license or API dependency is introduced.

### v0.3 acceptance checks

- Node regression coverage in `mana-heist/tests/campaign.test.mjs` proves stage numbering and sequential unlocking across all 18 vaults, old-save sanitization, out-of-order best behavior, and orb-to-pool bookkeeping. Existing 18-level solver tests remain unchanged.
- Browser-rendered Cloudflare preview at 390px: fresh player saw only 3 Act I stages, with 1:2 locked; entering 1:1 rendered original SVG card art; tapping the blue land visibly rotated the card, launched an orb toward the reservoir and filled the blue socket; casting opened the vault, then the map unlocked 1:2 while retaining lock on 1:3.
- At 320px both the campaign screen and gameplay screen rendered without horizontal overflow; the orb animation and 7 visible sockets were present.
- Browser/device interaction, multi-stage QA, reduced-motion visual spot checks and physical touch testing can be deepened in subsequent releases.
- Scope limited to `mana-heist/**`; **public Deep Cuts EDH Arcade, Hive Run, membership and score APIs remain untouched**.

## 0.4 — One-screen heist table and genuine Magic card references (2026-10-15)

The campaign still opens on a chapter map, but **entering a vault now uses one fixed visual viewport** instead of a tall page with several competing panels. The heist HUD packs the active ward, land battlefield, hand, floating mana sockets, life, turn and Undo/End Turn controls into one screen. Long-form explanatory content begins below the fold, reachable via `ⓘ INFO ↓` and ordinary page scrolling. The legend was removed. Dialog-only decisions (shock entries, mana color choices, fetch targets, payment choices) appear in a dismissible overlay, so the main game never permanently reserves screen space for a decision panel. Mobile card rows scroll **horizontally** if too many land cards are visible; the page is not expected to need vertical scrolling to play.

The land *game pieces* remain original artwork and have original names; no Wizards intellectual property is incorporated as an independently played game component. Wizards' Fan Content Policy (https://company.wizards.com/en/legal/fancontentpolicy) explicitly restricts using its IP in other games, so embedding official card faces directly into our game pieces requires permission.

However, the reading area below the game now includes a clearly separated **“Real Magic lands” reference gallery**. It names the actual cards that inspire each available land class — including Steam Vents, Volcanic Island, Shivan Reef, Scalding Tarn, and others — with an external Scryfall link and a **full, intact official card image** served on demand using Scryfall's named-card image endpoint. Card artist and copyright markings remain visible; images are never copied to the project, cropped or overlayed. The reference gallery is not interactive game content and is explicitly labeled as an educational comparison (some official abilities, particularly bounce-land outputs, differ from the simplified Mana Heist rules). If images cannot load, the user still has links and names. Scryfall: https://scryfall.com. Fan Content Policy: https://company.wizards.com/en/legal/fancontentpolicy.

### v0.4 release checks

- Node suite still tests all 18 solvable heists, older save migration, sequential progression, mana-orb consistency; additional tests in `tests/card-references.test.mjs` validate genuine Magic reference-name mappings, full-card image URL format and fallbacks.
- Cloudflare **preview browser** prior to final viewport adjustment at 390×844 and 320×568 confirmed the compact board and controls were visible together without horizontal page overflow; tapping a land rotated it, filled the orb, and casting completed Stage 1:1. The last viewport tweak sets the game height to exactly `100dvh` so the explanation section begins below the visual fold; run final production verification after merge.
- Only `mana-heist/**` paths modified; **no public Deep Cuts site, Hive Run paths, user profiles, scores or D1**.

## 0.5 — Drag lands to the battlefield; actions beneath mana ledger

The Mana Heist playtable now treats the hand like a card game: **drag a land from your hand up onto the battlefield to play it**. Mouse, pen, and touch are handled by a single pointer-gesture controller (`src/drag-lands.js`). Hand clicks intentionally **do not play lands**. The source card dims while moving, a floating card preview follows the pointer, the battlefield highlights on a valid drop, and releasing anywhere else cancels without changing resources. The engine still enforces one land play per turn and preserves shock/bounce choices after a valid drop. Tapping already-played lands for mana is unchanged. Keyboard accessibility: focus a hand card, press Enter or Space to pick it up, and press Enter or Space on the focused battlefield to play; Escape cancels.

**End Turn, Undo, Restart, and Map** are grouped directly under the floating mana ledger on desktop and in the immediate next row after the reservoir on mobile. On mobile the vertical order is ward → reservoir → actions → battlefield → hand; the full playable table remains within one viewport. Instructions and official Magic card reference gallery remain below the fold, and no legend returns.

### Tests

- `mana-heist/tests/drag-lands.test.mjs` validates droppable-area hit testing, gesture movement threshold, the real control placement in the HTML sidebar, disabled click-to-play wiring and keyboard/pointer drop controllers.
- All 18 authored puzzles still use the same previously proven reducer/solver and local best-state storage.
- Cloudflare preview browser proof at 390×844: tap and cast Stage 1:1, enter Stage 1:2; a hand click leaves the land drop available; synthetic **touch pointer** drag highlights the battlefield and successfully plays the red land, removing it from hand; four controls are visible beneath mana ledger without overflow.
- Browser at 320×568: full game fits without horizontal overflow; keyboard pickup and drop plays a land and controls remain visible.
- Browser at 1440×900: simulated **mouse pointer** drag plays a land, sidebar controls remain under the ledger, full game fits the viewport with no horizontal overflow.
- Hardware-specific touchscreen gesture testing remains a useful follow-up. Lab-only scope, no production Arcade changes and no other game paths modified.

## 0.6 — Scryfall Magic card inspector in the playtable

**Reason for scope:** The owner requested real MTG cards in the playable land game using Scryfall. Wizards' Fan Content Policy prohibits using Wizards IP as components in other independently created games without prior authorization, and Scryfall's API/image usage guidelines prohibit using its content to create a new game. Thus the *playable pieces* remain original cards; the new feature is a direct, full-image **educational card inspection overlay** within the heist, not a substitute for or a licensed game component. This is a best-effort alternative pending rights-holder approval; no assertion of authorization.

In the main single-screen game, tapping (not dragging) a card in the **hand** opens its real Magic analog as a full, uncropped Scryfall card image, with its actual card name, Scryfall link, and Wizards/artist credit notice. The existing drag interaction still plays the original land card, and tapping battlefield lands still makes mana. A new `ⓘ MTG CARD` button in the playtable title bar shows the most recently interacted land's reference (defaulting to the first land in play/hand), and focus on either hand or battlefield card followed by `I` also opens the inspector. Escape, close button, or backdrop click dismisses it without changing game state. The inspector defers its image request until opened; the full card image is not cached or bundled in the project. If Scryfall image retrieval fails or is blocked, the card's real name and Scryfall link remain accessible. The original below-fold reference gallery remains.

Scryfall docs and Wizards policy: https://scryfall.com/docs/api and https://company.wizards.com/en/legal/fancontentpolicy. The official images and notices stay intact; none are overlaid/cropped/recolored or distributed in this repository.

### Validation

- Added `tests/card-inspector.test.mjs` validating real-card mapping to Scryfall image endpoint, dedicated non-playable overlay markup, inspect-vs-drag separation and intact art notices.
- Existing 18 solver-replayed puzzles, single-screen layout, mobile controls, mouse/touch drag-and-drop, and orb tracker are unchanged.
- Browser smoke on Cloudflare preview at 390x844: clicking `MTG CARD` opened the Island reference with full-image Scryfall URL; closing left the mana untouched; tapping the battlefield produced mana and casting opened Vault 1; hand tap in Vault 2 opened the Mountain reference without consuming a land drop. At 320x568: no page overflow, both header buttons visible, inspector fit viewport, and dragging the Mountain into play still worked without opening the inspector.
- This does not satisfy a requirement to use official Wizards card imagery *as a playable game asset*; doing so requires authorization outside this Lab release.

## 0.7 — Real MTG lands in the playable board (2026-10-15)

**This release supersedes the earlier 0.2–0.6 original-land visual treatment.** In response to the owner's explicit request, all 24 curated land definitions use genuine Magic: The Gathering card names, and the *playable* cards visible in both the hand and battlefield render the **complete printed card images** hosted by Scryfall (via the `/cards/named?exact=...&format=image&version=small` image redirect). Example: Island / Mountain basics; Steam Vents / Blood Crypt shocks; Volcanic Island dual; Scalding Tarn fetch; Shivan Reef pain; Drowned Catacomb check; Simic Growth Chamber bounce. Source map remains `src/card-references.js` and the image-url helper is `src/scryfall-cards.js`.

- Images are loaded **only for lands presently visible**, as ordinary `<img>` tags. They are not downloaded into this repository, proxied, altered, or art-cropped. The browser manages HTTP caching naturally, and the existing large inspector/gallery continue to link to Scryfall.
- The printed image preserves copyright and artist notices. The image stays full/undistorted with `object-fit: contain`, no blur/color filters, and no text watermark overlays. A named original vector graphic only appears as a fallback if an external image cannot load.
- Drag-to-play from hand, tap on the battlefield, mana-orb animations, map progression, 18 deterministic proven puzzles, local saved results, and one-screen layout are unchanged. Game mechanics remain an intentionally simplified puzzle, **not a full Magic rules simulator**. Printed bounce-land text makes more mana than this puzzle models; actual land oracle text can differ from this prototype's approximation.
- Attribution and disclaimer appear in the game footer and explanatory content. The prototype remains on the separate Game Lab test domain, not the public Deep Cuts EDH website.

**IP/usage caveat:** Wizards' Fan Content Policy (https://company.wizards.com/en/legal/fancontentpolicy) explicitly restricts using Wizards IP in new games, and Scryfall's API usage guidance (https://scryfall.com/docs/api) similarly restricts new game creation. This Lab-only visual experiment does not grant a license, eliminate that risk, or authorize production release/monetization. Before public Arcade promotion, seek rights-holder permission or switch the playable card images back to original artwork. The update is an implementation of the owner's explicit testing request, not a representation of permission from Wizards or Scryfall.

QA: `tests/scryfall-cards.test.mjs` confirms 24/24 real-card mappings, full unmodified named-card image URLs and the original drag interface. Existing `tests/engine.test.mjs` replays all 18 vaults. Cloudflare 390×844 preview browser confirmed the battlefield Island real card source, tap/mana, ward cast, progression to Stage 1:2 and hand Mountain source. Shared release and main-site boundaries unchanged.
