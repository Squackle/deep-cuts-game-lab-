# Mana Heist — Immersive Tabletop (Game Lab, October 16, 2026)

**Owner authorization:** "deploy this" after explicit UI plan for a giant central mana pot, unlabeled upper battlefield and fanned hand, non-scrolling game viewport, and gravitational mana orbits.

**Release scope:** Gameplay presentation and interactions only. Work confined to mana-heist/**. Existing Game Lab route /mana-heist/, 250 level definitions, all IDs, automatic and deliberate casting, deterministic rules, medal logic, and browser storage key dc-mana-heist-landfall-v2 remain unchanged. No public Deep Cuts EDH website, D1, or identity system is touched.

## Shipped interface
- The campaign overworld remains a normal, scrollable route. Entering a vault switches to a fixed 100dvh full-viewport tabletop with no page scrolling, desktop and mobile.
- A substantially larger, active Chromatic Cauldron is centered. Spell name, required mana and explicit Cast remain available. Static titles for "Battlefield" and "Your Hand", fixed instructional labels, and nonessential HUD copy are hidden visually; accessibility labels, screen-reader feedback and an optional guide remain.
- The player's real card images are fanned at the bottom edge with curved overlap, selection/hover elevation, drag-to-play, and tap-to-select with optional Play selected land. All cards stay keyboard accessible.
- Tapping lands and activating mana sources launches one particle per unit of output mana. Particles curve toward the cauldron, spiral around its rim under decaying radial motion, and are absorbed with colored ripples. Two- and three-mana sources launch separate particles.
- Animation never controls the authoritative pool. Mana rules and pool change synchronously in src/engine.js. Visual flights only determine the display timing of cauldron charge. Undo, Restart, Map, changing spells, and reduced-motion settings cancel or skip pending animation safely.
- In-game action decisions and the card/rules inspector remain usable on demand. The guide is now a bounded overlay instead of a scrolling section under the gameplay board.

## Technical acceptance and known limitations
- Files: tabletop-immersion.css, src/orbital-mana.js, index.html, src/main.js, tests/orbital-tabletop.test.mjs, and updates to old visual-flight tests.
- Rule version is **mh-landfall-0.2.0**, with the previously integrated mana ability kernel **mh-mana-lab-2.0.0**. Game logic and 250 puzzle definitions are untouched. Original Magic step/phase simplifications remain; do not claim full Oracle accuracy.
- CI: node --test mana-heist/tests/*.test.mjs, the syntax checks and unified Game Lab checks must pass before merge.
- Browser: 375×812 smoke confirmed no document overflow, center cauldron, active orbit and successful Cast. 320×568 smoke with actual hand cards confirmed no document overflow; corrected legacy battlefield card sizing and short-device overlap. Desktop browser smoke required before merge.
- Native physical iOS/Android testing, very-short landscape orientation, screen readers, and sustained particle-performance profiling are separate release QA items. Respect prefers-reduced-motion.
- P12 visual/performance package is still **IN PROGRESS**, not accepted as a finished 1.0 delivery. Main-site rights gate P01 remains BLOCKED.

## Rollback
Revert the Game Lab merge commit and allow its Cloudflare Pages main deployment to complete. The existing v2 guest save key and level IDs require no data migration. Do not promote these gameplay files to deep-cuts-edh without a separate explicit owner authorization and rights review.


## October 16 hover/fan hotfix — user screenshot follow-up

After the immersive tabletop merge, an inherited selector in the older stylesheet matched `#wardTarget.is-stirring` / `:hover` with `transform:none!important`, overriding the new table's centered `translateX(-50%)`. With the pointer over the pool, the cauldron jumped sideways by approximately half its width. Corrective CSS explicitly holds `translateX(-50%)` during hover, stirring and keyboard focus, with only a static highlight added for interaction. No cauldron resize, layout movement or rules effect is permitted.

The owner also supplied a Moxgate.com screenshot as a **visual reference**, not a source to copy: cards visible in a broad physical fan across the bottom. The game now computes viewport-dependent card width, natural overlap even on wide screens, symmetric tilt and shallow edge drop. CSS raises the whole fan so the cards are substantially visible, and moves desktop spell controls beside the cauldron. Short phone screens use compact cards while leaving the casting area accessible. A prior auto-cast checkbox floating over the cauldron rim now stays with the spell area (or in an unobtrusive upper corner on short phones).

Files: `tabletop-immersion.css`, `src/hand-fan-layout.js`, `src/main.js`, and `tests/cauldron-hover-fan.test.mjs`. Existing saves `dc-mana-heist-landfall-v2`, puzzle IDs, engine `mh-landfall-0.2.0`, and game rules remain unchanged. Tests include a regression for the original selector conflict and viewport-fitting geometry across phones, tablets and desktops. Real-device hover/touch QA remains to be completed separately.
