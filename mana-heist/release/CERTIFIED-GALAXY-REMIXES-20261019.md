# Mana Heist — five certified strategic remixes, Galaxies VI–X

**Date:** 2026-10-19. **Scope:** standalone Game Lab only. **Owner authorization:** "proceed with next step" in response to the prior release's proposal to expand distinct scored strategies while retaining old player scores.

## Five revised, hand-routed campaign vaults

Preserve **all 500 IDs**, original 18 boards, Galaxy V boss `mh-250`, final boss `mh-500`, 28 unscored lessons and two independent optional side trials. Revision 4 changes exactly one **previously revision-3** scored vault per later galaxy, with materially different legal action/payment plans rather than color or text reskins:

| Galaxy | Stable ID | Revision 4 challenge | Wards / turns | Legal decision under test |
|---|---|---|---|---|
| VI | mh-251 | The Borrowed Signet | 2 / 1 | Wastes must fuel Azorius Signet; Fellwar supplies additional blue; Talisman spends life for black while Mountain supplies red |
| VII | mh-301 | The Second-Turn Palette | 3 / 2 | Switch Fellwar white to green on the next turn, using the Talisman as risky black then safe true colorless |
| VIII | mh-351 | The Survival Circuit | 4 / 2 | Sol Ring funds Signet and retains one C; only one Talisman damage activation is survivable, later red requirements need independent sources |
| IX | mh-401 | The Three-Turn Ledger | 5 / 3 | Multi-ward paid conversion network, Fellwar changes G/B, and Talisman life is budgeted across turns |
| X | mh-451 | The Prismatic Debt | 6 / 3 | Thran Dynamo funds Signet and Lens while saving real C, separate opponent palettes and two damage payments; final ward genuinely requires W U B R G **and C** plus a sacrificed Lotus Petal |

All new boards use only already supported, explicitly modeled card abilities from PR #100 and existing mana kernel. The fictional opponent land-color snapshot is a property of each puzzle, not live Magic opponent simulation. Life damage is a simplified unprevented life loss. The main game clears floating mana at **turn** end, not after every Magic phase or step; printed ETB/casting histories and global priority rules are intentionally absent.

## Scored-record guarantees

- Old revision-3 saved bests are preserved under their **original** `dc-mana-heist-variety-v1`. They are loaded even after their matching stage IDs become revision 4. The game shows a **PREVIOUS VERSION** historical medal/turn/life note alongside the revised puzzle briefing, calculated against the actual original revision-3 route and board.
- Current revision-4 attempts are scored only in **`dc-mana-heist-certified-remixes-v1`** and are validated against the five exact IDs; malformed entries are ignored.
- Map medals and cleared-count for these five IDs use **only new revision-4 scores** until the new board is won. An archived score is never incorrectly counted as a win of the changed board. No reset/deletion of stored v3 results, 500 base bests, capstone bests, bonus-trial bests or Learn Mana completion.
- Original revision 3 puzzles can still be reconstructed with `diverseFor(i)` for archived medal calculation and deterministic legal route auditing.
- The reference actions are **legal deterministic witness traces**, not globally proven optimal paths, neither a difficulty empirical study nor a claim all cards are implemented.

## Test gate

`node --test mana-heist/tests/*.test.mjs` plus module syntax checks, full 500-stage existing ID and route certification. The new `tests/certified-remixes.test.mjs` verifies each revised vault's distinct field and exact legal trace, multi-turn boundaries, genuine colored vs colorless mana, old v3 route reproducibility, prior save-key retention, and corrupted remix score rejection. Existing campaign/mastery/variety/rating test expectations must still pass.

Cloudflare Game Lab **preview first**, then PR coordination/unified-lab checks; merge/single Game Lab production deploy only after green checks, verify production commit SHA and real page fetch. Physical phones and live player skill calibration are separate QA; these are not claimed as performed without direct evidence.

## Rollback and rights

Revert this PR (Game Lab only) and redeploy the previously successful Lab SHA. The five old revision-3 levels automatically return, with old bests intact; new v4 best records remain separate and inert if the feature is removed. No database migration, accounts, paid features, or main site updates. **P01 rights/branding/IP remains BLOCKED**; genuine MTG artwork in Lab is research/testing use, not public commercialization or a license for production launch.

## Follow-up

Collect small-scale playtest difficulty data and revise any genuinely confusing stages through a new, separate save-compatible version, rather than silently retuning levels with existing medals. Expand further only after independent route/rules tests.
