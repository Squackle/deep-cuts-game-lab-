# v1.3.x — Allegiance health bar palette

Owner art direction (November 14, 2026): the supplied **GRAFTBOUND — Unit Roster & Art Style Preview** is an approved visual reference. The owner additionally requested **blue health bars for the player and all allied units, red health bars for enemies**.

This cosmetic patch applies the same ally-blue palette in three places:
- Tactical battlefield labels, based solely on existing `u.side` (`player` or `enemy`), so a summoned Squirrel, Soldier, or Saproling uses blue and any hostile identity—including a boss—uses red.
- The player health meter inside the active battle plate.
- The player's health meter on the adventure map character panel.

Source colors: blue `#80d3ff → #2375d4`; enemy red `#ff9a7b → #b32b22`. A dark track remains visible as health decreases. The existing numeric HP display and distinct striped shield overlay remain in place; all colors are CSS, not gameplay data.

**Scope/compatibility:** `graftbound/styles.css` and dedicated cosmetic regression tests only. No changes to health mathematics, unit allegiance, encounter logic, save keys, ranked replay, game rules, card effects, or other Game Lab titles.

**Verification:** `cd graftbound && node --test tests/v136-team-hp-colors.test.mjs`; `npm test`; shared Game Lab / release-coordination checks; visual inspection of a mixed battle at normal and mobile zoom. Automated CSS tests can verify selectors but cannot confirm the real WebGL screenshot. The uploaded roster artwork is an approval reference, not a game-ready texture; the broader HD-2D creature overhaul remains a separate uncompleted workstream.
