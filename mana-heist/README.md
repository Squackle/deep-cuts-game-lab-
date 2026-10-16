# Mana Heist — Landfall playtest 0.2

> **Future agents — start here (2026-10-15):** This README contains historical release notes starting with v0.2 and should **not** be mistaken for the current 1.0 rules specification. Read [**AGENTS.md**](AGENTS.md) for scoped agent responsibilities, [**ROADMAP-1.0.md**](ROADMAP-1.0.md) for the **15 planned deployment packages P01–P15, release gates and status ledger**, and [**RULESET-1.0.md**](RULESET-1.0.md) for the implemented mana rules, known simplifications and educational 1.0 targets. **No P01–P15 package is marked completed simply because a related prototype feature already exists.** The current 250-stage Game Lab prototype is not a rights-cleared public game. The repo-root [AGENTS.md](../AGENTS.md) also applies.

> **P01 release foundations — Game Lab review package:** [release scope, acceptance criteria and risk register](release/FOUNDATIONS-P01.md) · [24-land/19-mechanic current engine audit](release/MECHANICS-MATRIX-P01.md) · [Magic artwork/IP and Scryfall decision register](release/ASSET-RIGHTS-P01.md). **P01 technical documentation is delivered; owner rights/brand sign-off remains BLOCKED.** No game code or public-site release is authorized by these documents.

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

## 0.8 — Readable full cards and red ward rejection (2026-10-15)

The entire set of 18 puzzles, difficulty, score calculation and deterministic game rules are intentionally unchanged. In particular, mana payment was already correct: a **generic** mana symbol (`N` in the heist cost model, a gray diamond onscreen) accepts any color, while a required **red** mana symbol still needs red. A **true colorless** mana requirement (`C`) remains different from generic. This distinction is covered by `tests/ward-feedback.test.mjs`.

**Cards are bigger.** On desktop the playfield takes substantially more of the single-screen table, and full-size Scryfall land card scans have increased readable dimensions (with a slightly smaller hand size). Tapped lands now have appropriately sized sideways landscape hitboxes with the *image itself* rotated 90 degrees, preserving the complete real-card art, frame and artist credits. Narrow and short viewports use a proportional card-size cap to keep both rows accessible without vertical gameplay scrolling. Dragging, tapping, mana orb physics and inspector interactions are unchanged.

**A failed spellcast is visibly denied.** A short red aura sweeps around the security ward; its lock trembles; the Cast button flashes crimson; missing mana-cost glyphs pulse bright red; and an accessible feedback message names the precise shortage. For example, a pool with two blue mana against a spell costing one red and one generic correctly reports **“Need 1 red mana.”** This does not spend or convert any blue mana. Every new invalid attempt retriggers the effect, and the feedback remains readable for reduced-motion users without requiring flashing animations.

Acceptance: existing 18-puzzle solver and replay suite remains authoritative; new tests check generic vs. true colorless and colored shortfalls, feedback message specificity, and accessible full-card CSS design. Lab-only prototype, no production website or other games changed.

## 0.9 — Ward Charge (2026-10-15)

The former floating-mana **reservoir of seven empty circles** is retired. The ledger is a compact **3-column × 2-row inventory** of real generated mana, using colored RED/BLUE/etc. labeled chips and visibly empty cells; it expands in groups of three only if a puzzle ever generates more than six unspent mana. The ledger stays within the one-screen desktop/mobile playtable, and End Turn/Undo/Restart/Map remain directly below it.

The **ward circle is now the mana destination**. When you tap a land, a colored mana orb flies from that real MTG card to the large ward ring, and the corresponding slice of the ward fills with a bright translucent *pie wedge* and a glowing rim. A spell costing R,R,U fills in **three equal 120° segments**, in the *order the valid mana was tapped* (e.g. red, blue, red); the fraction below the lock shows 1/3, 2/3, 3/3. The game distinguishes mana floating in the ledger from mana *contributing to this ward*. Surplus or wrong-colored mana remains available but does not falsely charge a colored requirement. Exact printed-colored requirements are reserved before the generic portion, so colors never get misallocated; real generic payment remains valid using any leftover mana. Multiple simultaneously flying orbs are tracked independently, lighting only when each arrives.

Costs with different totals automatically divide the circle into equal arcs and interior sectors. Casting resets the circle for the *next ward* using any legitimately unspent pool, ending a turn empties both display and pool, Undo restores the prior colored mana and progress, and Restart/Map cancels in-flight effects. The authoritative v0.2 deterministic reducer, legal payments, game progression, scoring, saved progress and all 18 authored puzzle solutions are **unchanged**.

The landing animation and radial glow respect `prefers-reduced-motion`: a user requesting less motion gets immediate correct visual charging with no flight. A screen-reader-readable ring describes the current charge fraction, and the ledger communicates actual mana colors through labels rather than hue alone.

Checks: `tests/ward-charge.test.mjs` exercises red/blue/red filling sequence, generic vs colored and true colorless distinctions, simultaneous in-flight tap handling, partial ring fill and all authored ward totals. `tests/campaign.test.mjs` verifies 3×2 ledger data, blank slots, pending arrivals and unchanged pool/reducer parity. The existing CI solver continues to prove 18/18 puzzles. The Game Lab Cloudflare preview browser at 390×844 verified six ledger cells, no legacy sockets, Island flight, a 1/1 blue sector after arrival, casting, and preserved single-screen layout.

Release integration note: the shared /lab/ navigation and all three Game Lab cover assets are preserved from the current main branch; no shared files or other game directories are modified by this release.

## 1.0 — Auto Wards, no right-side mana ledger (2026-10-15)

The Mana Heist Lab playtable is now a true **full-width game**: the entire right-hand “Mana on Hand / Floating mana” panel is removed, and the four controls (End Turn, Undo, Restart, Map) are repositioned in a compact row *immediately below the current ward*. The full readable Magic lands and drag/drop battlefield occupy the newly available width; the playable game remains within one visual viewport, and the long instructions still live below the game.

**There is no Cast button or payment confirmation.** Mana flies from a tapped land into the segmented ward ring. When the final qualifying orb arrives, the ring briefly flashes **WARD PRIMED** for ~520ms and the ward-breaking spell resolves automatically using the unchanged, fully validated MTG-like mana payment reducer. Any leftover mana can then automatically break the next ward if it already satisfies its cost. Life, land drops, turns, spell effects, mana types, and all puzzle data are unchanged.

Some spells allow several equivalent generic payments and the Level 15 Rewind spell requires selecting a land to untap. Instead of presenting a Cast/payment modal, the new `src/auto-cast.js` looks ahead using the existing solvability solver and picks a legal route that is completable at minimal turn/life cost. The existing gameplay reducer is still authoritative; the auto-caster never creates mana or performs illegal game actions. Other decisions (which land to play, dual/pain mana color, shock entry, fetch target, bounce return) remain choices by the player. Mana arriving simultaneously waits for the last in-flight bubble before beginning an automatic cast, so visual segments still fill individually. Undo reverses the last player action and any automatically generated casts resulting from it as one move.

**Critical automated acceptance test:** `tests/auto-cast.test.mjs` explores each of the **18 authored levels** under a constrained model where casting is mandatory and not directly accessible as an action. All 18 remain beatable; this is stronger than the pre-existing manual-solver check. Other tests verify that the Cast button and right-side ledger are absent while full-card Scryfall scans, the single-screen layout, and accessible color-selection dialogs remain unchanged.

The public Deep Cuts EDH site, Hive Run, Stackbreaker, game navigation, user accounts, D1, and rankings remain untouched. Real Wizards card art continues to be an owner-requested Game Lab-only experiment and is **not an IP-cleared public/commercial release**.

## 1.1 — Unclipped playtable, no header inspector, rotating real reprint art (2026-10-15)

The single-screen fixed layout previously allocated too little vertical space to the ward and too much to the battlefield, making the ward circle/status clip and pushing the hand down beyond the visible viewport (owner screenshot of stage 1:2 at approximately 1277×895). The override in `styles.css` now gives the ward its **intrinsic, fully visible height** and divides the remaining play area evenly between battlefield and hand. Land images cap to the available row height without cropping, tapped cards keep complete landscape frames, controls stay between the ward and battlefield, and the whole game still fits one visual viewport. Chrome preview browser confirmed the stage 1:2 layout at 1277×895: ward and auto-cast status entirely within vault, turn controls nonoverlapping, hand Mountain wholly within the hand panel, game bottom at 895, zero horizontal overflow.

The top-right **ⓘ MTG CARD** button is removed entirely. Tapping a hand card (without dragging) or pressing `I` while focused on a card still opens the full-size matching printed card.

**Random genuine reprint illustrations:** In this isolated solo playtest, CI deliberately disallows additional JavaScript `fetch()` API integrations. Instead, Scryfall's `/cards/random` **image redirect** (exact land name, English, `format=image&version=small`) is assigned directly as each land's normal `<img>` source when a stage starts. Duplicate lands receive distinct URLs, including per-stage cache-busting tokens, so each card can display a different authentic printing without storing image assets locally. The image element itself is **preserved** as the land is tapped, cast around, moved from hand to battlefield, or restored through Undo; therefore that printing does not reroll mid-puzzle. Restarting or revisiting a stage creates fresh printing URLs. If an image fails to load, the existing full-card named redirect and/or illustrated fallback remains available. No engine or Scryfall API `fetch` calls were added. The remaining hand-card inspection overlay works without a header button.

The authoritative land reducer, all 18 levels, automatic cast logic, campaign locks, scores and user progress are unchanged. Changes are limited to Mana Heist in the standalone Game Lab; no public website or other game files are changed. Scryfall/Wizards fan-IP restrictions still apply to this non-production test experiment.

## 2.0 — The Galactic Heist (2026-10-15)

The standalone Game Lab campaign now has **5 galaxies × 5 worlds × 10 levels = 250 playable land-and-mana puzzles**. The visible map shows the currently selected world's ten nodes, five world pips in its galaxy, and five galaxy tabs; later galaxies and worlds remain sealed until preceding stages are completed. The first 18 levels retain their IDs, order, mechanics and saved best records from Landfall v2. The on-screen stage identifier now reads **Galaxy:World:Level** (for example, `1:2:8`). After the existing 18 stages the campaign continues smoothly into the new vaults. The original 18 proof/solver exercises remain unchanged.

**Puzzle construction and quality:** The 232 additional levels are *deterministically generated variations* of the original 18 authored puzzles, not 232 independently invented spell mechanics. Each new level has its own ID, galactic title, new optional/distractor mana-base choices and some safe flexibility upgrades of existing basics, while **preserving a fully legal winning route** from its original template. The CI tests replay and validate that route for **each of the 250 puzzles**, test the entire 25-world/5-galaxy atlas and legacy guest unlocks, and measure diversity of the physical land configurations. Later galaxies concentrate the more advanced fetch, shock, pain, bounce and three-ward archetypes, and every world's tenth vault receives a boss-style label. The underlying engine is unchanged, so the full MTG-like land tap interactions, auto-cast, mana colors, life costs, and awards remain compatible.

**Performance and stars:** The old implementation synchronously solved every puzzle on initial load; at 250 levels this would be unacceptably expensive. The new lazy proof cache solves only the *active* vault and any completed nodes needing medal comparison. The CI build separately validates all puzzles. If a level's optimal search exceeds its bounded proof budget, the previously proven template route supplies an achievable baseline; every level remains playable and winnable.

**Card zoom:** Hovering a Magic card on desktop, or keyboard-focusing it, opens a responsive **full-size floating card magnifier** that does not intercept clicks or drag gestures. Rather than re-requesting Scryfall's randomized redirect and accidentally displaying a different printing, the zoom view paints the exact already-loaded image node to a 488×680 canvas. Touch devices still use the existing tap-to-inspect overlay. The full real-card image, frame and artists' credits remain visible without cropping. Escape, pointer departure or beginning a drag dismisses the preview. The original one-screen playtable and the Scryfall licensing caveat remain unchanged.

Release scope is exclusively `mana-heist/**`. The user-requested 250 puzzle Game Lab prototype is not a rights-cleared public Magic game; public Deep Cuts EDH Arcade promotion or commercial use needs a separate review and owner instruction.

Readability correction: the selected Scryfall random printing now uses **normal-size 488×680 full-card image resolution**, not the former 146px small scan. The hover canvas draws at native image resolution so Oracle text is much more legible without requesting a different printing. Individual card thumbnails simply downscale the same original image. No additional external API calls.

## 2.1 — Chromatic Mana Fusion: stir the magical water (2026-10-15)

The security ward is now a **top-down pool of enchanted water** rather than wedges of colored pie. On each valid mana-orb arrival, a dye plume is injected well inside the circle with a small outward splash ripple. Newly injected red/blue/green/white/black/colorless dyes remain locally distinct before actually mixing as they flow, rather than orbiting or sticking to the circumference. Desktop mouse and touch pointer drags **stir the liquid** by adding local velocity; dye is advected through a circular pool with boundary friction and mild diffusion. Drag direction and speed affect the water; releasing the pointer lets it gently settle. No constant rotational force, edge-bounce particles, or external shader dependencies. The circular rim and glow adapt immediately to the correctly charged mana mixture, while the authentic cost symbols, charge count and automatic payment rules remain visible.

**Zero-delay weighted color combinations:** `src/fluid-palette.js` precomputes all **8,008** ways of distributing 0–10 accepted mana among the six existing Magic mana colors on module import (a small in-memory JavaScript lookup, no network or external asset). E.g. red + blue yields a purple mixture, while red + red + blue is redder. The fluid solver advects dye density and dye-weighted RGB channels, so stirring produces *locally mixed* gradients (not merely switching one flat circle color). The ring glow uses the precomputed RGB mixture, while the water surface preserves visible unmixed plumes. The true colorless cost distinction and existing generic payment rules are unchanged.

**Fluid implementation:** `src/fluid-ward.js` has a low-cost 64×64 fluid grid with bilinear backtraced advection, local dye diffusion, a damped circular wall, no allocations per pixel, a reusable 64×64 offscreen image, and a 192×192 reusable display canvas. No network requests or textures and no new persistence. The loop pauses off-game and skips heavy physics while empty. `prefers-reduced-motion` uses an immediate static colored splash with no constant animation. No-canvas browsers transparently fall back to the existing wedge/arc ward. The authoritative reducer still decides which mana colors qualify for the ward; wrong or surplus mana cannot artificially charge it. Multiple mana orbs each add dye only **after their own flight arrives**.

**Automatic spellcasting remains mandatory.** After a fully charged ward, the player gets roughly 1.4 seconds of visible water before auto-casting. Actively stirring extends this briefly, but **never beyond 5.1 seconds**, so interaction is purely optional and cannot softlock the game. The next ward, Undo, End Turn, Restart or Map automatically resynchronize pigment with real game state. Existing 250-stage game rules, life, land drops, achievements, guest progress, and the Scryfall image system are untouched.

`tests/fluid-ward.test.mjs` verifies the 8,008 cached mixes, weighted RGB red/blue ratios, interior injection and pot boundaries, stable advection, Canvas fallback, and auto-cast integration. Existing 250 puzzle legal replay checks and 18 core optimal/mandatory auto-cast checks stay in the suite. Only `mana-heist/**` Game Lab files are changed; no public Deep Cuts EDH Arcade update or licensing claim.

## 2.2 — The Chromatic Cauldron: proportional water, hover-stirring, full-size central ward (2026-10-15)

The ward is redesigned as the **dominant centered interaction** with battlefield and hand still visible beneath it in the same visual viewport. The cauldron is about 315px across at 1280×900, 262px at 390×844, and 170px at 320×568; flexible CSS manages title, turn stats, four controls, land cards and hand without overlay/scroll. On desktop, existing full-size printed MTG card hover zoom and drag-to-play continue to work. Real MTG land printings and all 250 original/generated levels remain unchanged.

**The entire water surface belongs to mana.** Once a valid orb hits the water, the whole circular field receives its color—not a small dyed patch surrounded by teal water. One red mana = completely red. One red + one blue = two regions of approximately half the pot each. Two red + one blue = approximately two-thirds red and one-third blue. Sectors are *physical starting dye regions*, with slightly organic boundaries in the grid, **not fixed drawn pie wedges**. Local bilinear fluid advection then transports RGB pigment and gently diffuses the boundary as the user stirs; the previously precomputed 8,008 weighted RGB mixtures power the responsive illuminated rim. Color areas remain distinct at first and become mixed streams as the water moves.

**Desktop:** entering and moving a mouse across the water imparts local momentum without holding any button. Mouse press-and-drag also works. **Mobile:** tap to ripple and touch-drag to stir; touch capture and touch-action control operate inside the circular pot without changing gestures elsewhere. The pool wall damps velocity instead of trapping particles along the rim. The widget is pointer-accessible without intercepting land taps or hand drags.

**Satisfying but never blocking auto-cast:** once the necessary mana arrives, players receive approximately two seconds to swirl before the spell casts automatically. Active stirring extends that briefly, but no later than approximately 5.1 seconds after completion. The liquid pulls inward, then an animated gold-and-mana-colored shockwave breaks the ward, with a 250ms finale. Reduced-motion and Canvas-free fallbacks are preserved. The underlying reducer, exact-colored versus generic mana payments, solver, life totals, awards, undo state and persistence are unchanged. No new network requests or external assets.

**Testing:** tests/fluid-ward.test.mjs now checks every pixel of a one-red pool, ~50/50 proportions for red/blue, ~2:1 proportions for red/red/blue, and stirring-induced changes to the pigment fields; the 250-stage campaign and existing auto-cast tests remain authoritative. Cloudflare browser preview verified desktop 1280×900 central pot diameter 315px, mobile 390×844 at 262px and 320×568 at 170px, no clipping or horizontal overflow, a wholly blue 1-mana pool by sampling pixels across the physical canvas, mouse-movement-only stirring, mobile touch drag, and automatic cast completion. Changes isolated to Mana Heist on the standalone Game Lab; the public Deep Cuts EDH site remains untouched.

## 2.3 — Genuine Chromatic Pigment Mixing (2026-10-15)

This isolated Mana Heist Lab patch fixes the observed bug where stirring simply pushed a dominant solid color across the cauldron instead of satisfying mixed red/blue → purple dye. The old simulation advected precombined RGB pixels; the replacement in `src/pigment-mixer.js` tracks **six individual mana pigment concentrations per water cell**. Stirring imparts local fluid velocity, advects all pigments through the SAME water field, and introduces speed-sensitive small-scale pigment diffusion. A normalization and conservative multi-iteration color correction keeps the total amount of each mana color consistent with the actual accepted orbs: 1 red + 1 blue stays roughly 50/50, while 2 red + 1 blue remains roughly 67/33 no matter how much the player stirs.

Pigments *truly overlap*: individual water cells contain both red and blue pigment and draw the actual weighted purple RGB value, rather than replacing whatever color was there. The un-stirred water still starts with distinct proportional colored regions, and slow settling preserves the blended gradient. **Newly arriving mana does not wipe previous stirred colors**: the incoming color enters a new softly edged sector while the rest of the previous water keeps its existing mixture; all pigment masses rebalance against the new count. Undo, stage restart, ward changes, or map departure correctly reset both the visible water and hidden pigment fractions so stale color cannot leak into later puzzles.

Performance remains lightweight: the reusable 64×64 Canvas grid now transports six Float32 pigment arrays with preallocated temporary buffers, avoids allocations inside its pixel/neighbor loops, reuses per-color conservation buffers, renders directly from the resulting RGB, and limits mobile simulation to roughly 30fps. The 8,008 RGB mixture lookups are still preloaded, no new network data/assets/shaders are introduced, and visual changes never alter casting, rules, rewards, progress or any of the 250 levels.

**Validation:** The extended `tests/pigment-mixer.test.mjs` verifies that a one-color pool is uniform, blue/red swirls generate actual purple pixels, the 50:50 and 2:1 proportions survive vigorous stirring, and adding a new red orb to existing mixed purple does not erase that mixture. Browser simulation of 18 stirring sweeps demonstrated **2,025 visibly mixed pixels out of 2,788 water cells**, with a red/blue ratio within 0.002 percentage points of 50/50; simulating 180 transport steps took approximately 641ms in the Cloudflare preview browser (~3.6ms each). Separate browser smoke verified mobile touch stir at 320×568, no overflow, and successful automatic casting at 390×844. Existing CI checks cover all 250 campaign levels, original strict puzzle solver, fallback rendering and unchanged save keys. This patch modifies Mana Heist in the standalone Game Lab only; no public Deep Cuts EDH website changes or additional MTG licensing claims.

## 2.4 — Readable Mobile Hand and Dragging (2026-10-15)

The owner supplied an iPhone screenshot of Stage 1:1:2 showing that a land in the player's hand had collapsed into a tiny, nearly invisible thumbnail. Root cause: the previous phone design assigned the whole game `height:100dvh`, allocated the majority of it to the large cauldron, then divided the few remaining pixels between battlefield and hand. A later land-size rule constrained the image to `height:min(card aspect height, 100% - 8px)` of its tiny parent; Scryfall cards could shrink to a few dozen pixels.

**Mobile UX is now card-first.** At screen widths 600px and below, the game is allowed to *scroll naturally* instead of silently reducing the size of cards. The hand appears directly after End Turn / Undo / Restart / Map, **before the battlefield**. A warm gold border, clearer “Your hand” heading, and visible **START HERE** guidance tell the player to drag a land **down** into “Your lands,” then tap it for mana. The instruction and full-size hand panel disappear/collapse appropriately when there are no cards in hand. The ward remains center-stage above the controls but is now capped at about 157–202px across so it doesn't consume every available phone pixel.

Actual phone MTG image hitboxes are **107×149px in the hand**, instead of an aspect-constrained thumbnail, and battlefield scans are **88×123px** (tapped cards 119×86px). The cards use unmodified complete Scryfall frames and horizontally scrollable rows; nothing crops artwork or disables touch interaction. The drag system now gently scrolls the page as a held card approaches the top/bottom screen edge, so the battlefield remains reachable even at 320×568. Normal tap-to-inspect, pointer drag to play, keyboard accessibility, tapping battlefield for mana, auto-cast, and mouse/stirred water all remain unchanged. No additional APIs, external dependencies or site-wide changes.

**QA:** The Cloudflare Stage 1:1:2 preview was measured at 390×844: Mountain was **107×149px**, the 157px-tall hand row and 264px-tall gold-highlighted hand panel were fully visible, the first hand card began at y=545 and ended y=694 (comfortably inside the 844px visual viewport), both zones were correctly ordered, and there was **no horizontal overflow**. A 320px phone can scroll the document instead of forcing cards to shrink. Existing 250-stage puzzle proofs and rules remain intact. Only `mana-heist/**` in the standalone Game Lab is updated. No public Deep Cuts EDH site integration or additional Wizards/Scryfall licensing claims.

## 2.4.1 — Turn-boundary ward pigment reset (2026-10-15)

Ending a legal turn empties floating mana under the existing engine, but the liquid ward previously remained visually colored: `fluid.sync([])` cleared its pigment arrays while the running Canvas loop skipped painting frames when the pool became empty, leaving the last colored bitmap visible. The UI now explicitly calls `fluid.clear()` after a **successful** `end` action and invalidates the current visual stage key. The fluid controller immediately redraws neutral teal water, resets the six pigment concentrations, residual currents, ripples, pointer-stir state, glowing rim, and visible charged-mana count. It also repaints on other mana removals (Undo or cast) even when the animation loop is awake, fixing the same stale-bitmap issue elsewhere.

A dedicated `tests/turn-ward-reset.test.mjs` uses a fake-but-drawing Canvas 2D context to verify that red water is replaced by neutral pixels immediately **while the RAF controller is active**, that new blue mana can charge again, and that a legal two-turn puzzle's floating mana pool empties and lands untap. The engine, auto-casting logic, puzzle data, 250-stage campaign, saved progress and account/network code are unchanged. Scope: only the standalone Game Lab Mana Heist.

## 2.4.2 — Final-turn clarity in Two Roads and all vaults (2026-10-15)

The 250-vault campaign includes strictly limited-turn land puzzles. In **Two Roads** (the original stage 4, displayed as **1:1:4**), there is only one Volcanic Island and **two turns**: play/tap it for **blue on turn 1** to open the first ward, end that turn to untap, and tap it for **red on turn 2** to open the second ward. On turn 2/2, another end turn is intentionally illegal; using the wrong color means Undo (revert the last tap) or Restart. The UI incorrectly said “End your turn to untap it” when a land was already tapped on that final turn, and its disabled End Turn button gave no explanation.

This scoped UI fix retains the two-turn rules and the 250-stage puzzle campaign. On the final turn, **END TURN** visibly becomes an amber **FINAL TURN ✕** button that remains clickable to explain why a third turn is unavailable; the Turn indicator and ward status still show the level’s progress and needed mana. Tapping an already-tapped land on the last turn now says the current mana shortage (for example **1 red mana**) and suggests Undo or Restart rather than an impossible end turn. On earlier turns, End Turn continues to untap lands normally. Automatic casting, real card artwork, hand/dragging, the entire fluid-mixing system and saved records remain unchanged.

The new `tests/final-turn-guidance.test.mjs` exercises the exact Two Roads trap: turn 1 blue auto-cast; turn 2 wrong blue choice cannot access a third turn and shows accurate guidance; using red instead successfully auto-casts the last ward. It also verifies final-turn button accessibility and normal tapped-land instructions before the turn limit. All changes remain within standalone `mana-heist/**` Game Lab. No public site, game score or profile modifications.
