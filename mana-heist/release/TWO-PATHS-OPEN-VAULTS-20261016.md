# Mana Heist — Two Paths & Open Vaults (Game Lab, Oct 16, 2026)

**Owner request:** "can we unseal the vaults? if levels are too easy i want people to be able to move to harder easily. im also not seeing the seperation between the training mode and the puzzle mode".

**Scope:** `mana-heist/**` only, standalone Game Lab. No public Deep Cuts EDH release, accounts, leaderboards, Cloudflare D1, unrelated games, or rules-engine changes.

## Delivered

The map opens to **Choose Your Path**, with two visibly distinct options. The map (and selected path) may be changed at any time.

- **Learn Mana:** 18 *existing authored* scenarios grouped by skill topic into a separate practice gallery. Lesson completions use `dc-mana-heist-learn-v1`; choosing Learn Mana does not write puzzle best scores or medals. Wins show "LESSON COMPLETE," not stars. Lessons provide original scenario briefings through the Lesson Notes guide and use the same legal engine and cauldron as the puzzle path.
- **Mana Heist:** All 250 vaults, 25 worlds, five galaxies are accessible immediately. A Quick Jump bar and the original five galaxy selectors allow direct access to any world; medals and historical bests remain recorded in the existing guest save `dc-mana-heist-landfall-v2`. Nothing is silently cleared. Playing an advanced vault does not require previous solutions.
- The chosen path is remembered locally under `dc-mana-heist-mode-v1`, distinct from the legacy bests. Players can switch without losing their selection or puzzle results.
- Accessibility: conventional native buttons, accessible mode pressed state, focusable lesson list, no modal lock, and the active tabletop remains a fixed 100dvh non-scrolling play surface while the mode-selection map remains scrollable.

## Deliberate limitations / roadmap status

This is a functional **P04 Learn Mode entry/starter practice** and open-access campaign navigation improvement, not the completed planned P04 beginner curriculum or P06–P10 vetted 250-level difficulty rebuild. The 18 old authored exercises include more advanced scenarios; they are not a fully progressive tutorial designed from scratch. The additional 232 generated puzzles still mostly adapt original templates and have not been independently difficulty-calibrated. Selecting Galaxy V provides direct access to its scenarios; it does **not** prove they are harder than every earlier puzzle. We should correct generation and genuine difficulty scoring in the future curriculum overhaul.

The older `highestUnlocked()` routine remains a historical sequential-progress measure for old saves, but the accessors `unlocked()`, `chapterAccessible()` and `galaxyAccessible()` now return true for valid items independent of completion. No account-based achievements or global site promotion.

## Tests and rollback

Node unit suite including `two-paths-open-vaults.test.mjs`; legacy 250-stage solver/replay certification unchanged. Cloudflare branch preview at 375×812 confirmed new-user path choice, 18 training cards, ability to jump to Galaxy V with all ten current-world stages enabled, and selecting its first vault. Another live preview test cleared Learn Exercise 01 via land tap+Cast and verified `completed:[0]` in the new learning key, `bests:{}` in the old puzzle save, no stars and a 1/18 completed indicator. Campaign selection remains scrollable while gameplay does not.

Rollback: revert the merge commit on standalone Game Lab and wait for Cloudflare Pages production deployment. Existing save keys `dc-mana-heist-landfall-v2` are never migrated, rewritten with a new version, or deleted. Training preference/progress keys may remain inert after rollback. IP review P01 remains BLOCKED; no public-site promotion.
