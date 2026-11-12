# GRAFTBOUND v1.1.1 — Combat feedback hotfix

Owner-reported issues: two live screenshots taken November 12, 2026. All changes are limited to GRAFTBOUND Game Lab.

1. **Spell-hand clipping:** fixes horizontal scroll clipping and full Magic card image cropping by using `object-fit: contain`, responsive card sizing for short viewports, adequate transform headroom, and an independent enlarged hand readout. No card images are altered.
2. **Visible mana-tier spectacle:** spell visuals now use *actual GRAFTBOUND mana paid* (including taxes) to select three graphical tiers. One mana = short charge, a single restrained sigil, fewer particles and dimmer light; two mana = layered rune, longer charge, stronger effects; three or more mana = extra halo, brightest light, greater particle budget, two aftermath rings. Spell identity and existing elemental colors remain distinct, and Fast / Instant / reduced-motion / low-graphics options are retained.
3. **Hazard-aware movement:** eliminates the global safe-only candidate filter that made enemies idle when their only progress required a detour or nonlethal hazard. A deterministic reverse Dijkstra field prices hazardous tiles while retaining all nonlethal movement options. Safe detours are preferred, necessary crossings remain possible, and lethal paths are still excluded. Player spell state and rewards are unchanged.

**Rules isolation:** movement AI changes affect deterministic encounters, so the game rules ID is `graftbound-rules-1.1.1` and challenge `gb-expedition-01` revision 6; previous results are not mixed. Save schema and key unchanged. This does **not** authorize the separate main DeepCutsEDH ranked site, whose verifier is still pinned to an older revision.

**Verification:** `npm test`, sprite audit, and browser suites to be recorded in the PR. Browser/device testing remains unverified if blocked by Chromium environment policy. No changes to other Game Lab games, central lab catalog, accounts, D1, or DeepCutsEDH production.

**Rollback:** revert only this GRAFTBOUND PR to the previously live Game Lab main commit `299b8b07e84805517f68e634985feaee8b1be70a`.
