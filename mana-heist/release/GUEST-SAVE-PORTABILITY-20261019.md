# Mana Heist · P12 Guest Save Portability — Export and Safe Merge

**October 19, 2026 | Game Lab only | Scope: `mana-heist/**`**

## Owner authorization and existing gap

Following the completed P11 accessibility releases, the owner explicitly instructed "deploy next phase." The approved P12 roadmap calls for reliable guest save/export. The currently shipped Mana Heist retains its scores only in one browser's `localStorage`. Clearing browser storage, switching browsers, or moving devices can otherwise lose those local records.

This scoped improvement introduces a manually downloaded/clipboard-copied JSON guest backup with a **preview-and-confirmed import merge**. This is not account sync, secure proof for public leaderboards, a D1 export, or proof that any physical-device QA has been completed.

## What is in the backup

Format `deep-cuts-mana-heist-guest-backup`, schema v1. Exactly **six existing save namespaces**:

- `dc-mana-heist-landfall-v2`: original campaign best turns/life and last-stage index. Original 18 stages and all 500 known stage IDs remain unchanged.
- `dc-mana-heist-capstones-v1`: revision-1/2 scores.
- `dc-mana-heist-variety-v1`: revision-3 bests including **historical revision-three medals for now-revised IDs**.
- `dc-mana-heist-certified-remixes-v1`: distinct revision-four scores for five remodeled later-galaxy stages.
- `dc-mana-heist-bonus-trials-v1`: the two separately scored optional trials.
- `dc-mana-heist-learn-v1`: all 28 lesson-completion flags and last lesson.

**Not in the backup:** usernames, profile or account data, screenshots, Scryfall imagery, opted-in playtest metrics, opt-in consent, personal data, real phone QA results, device/browser metadata, archived action traces, game-mode/UI preferences, and anything from other Game Lab lanes.

## Restore protections

1. A player chooses a local JSON file of at most **256 KB**. Unknown schema versions, missing/extra sections and malformed file containers are rejected **before writing anything**. Every score is normalized against known current stage IDs and existing score constraints, discarding unfamiliar IDs or malformed values. No script code is evaluated.
2. A preview reports how many new, improved vault results and added lesson completions would be merged; nothing is imported on file selection. An explicit **Confirm & Merge** button plus a second confirmation prompt is required.
3. For scored results, only a **better turn**, or equal turn with less life spent, or equal turn/life with fewer recorded actions (when that score family supports actions) replaces the local best. Imported lesson completions are unioned and sorted. Prior archived v3 results and current rev4 results remain in **independent** stores and cannot silently overwrite one another. A locally active current-stage index stays unless the browser had no meaningful prior progress.
4. Only the six known save keys are written. The restore re-reads current local data at confirmation and uses best-effort snapshot rollback on storage quota/write failure. On success the page reloads so all in-memory progress and maps use the newly validated values, avoiding stale state overwriting imported scores.
5. The Save Backup File button uses local browser Blob/download. The Copy Backup Text button uses the clipboard, with a selectable-text fallback where clipboard permission is absent. **No upload, network request, or email** is performed by this feature. Files are user-controlled and unsigned; an edited file is never proof of authentic or ranked achievement.

## Tests and release gate

`node --test mana-heist/tests/*.test.mjs` and existing syntax checks. New `tests/guest-backup.test.mjs` covers schema roundtrip, exact namespace whitelist, rev3/v4 and trial separation, stronger-local score preservation, lesson union, legacy two-digit stage IDs, unknown/malformed/oversized file rejection, preservation of opt-in and device-QA local records, 256 KB maximum, rollback on browser write failures, import confirmation and responsive controls.

Verify Cloudflare Pages Game Lab branch preview; ensure all unified/game and release-coordination PR checks pass; squash merge after no lane overlap; verify exact GitHub SHA in successful Cloudflare Pages production deployment and both post-merge workflows. **Physical-phone touch testing not yet claimed.** The P01 licensing/brand gate is still BLOCKED.

## Rollback

Revert this isolated PR and redeploy prior Game Lab SHA. No new key or D1 migration was introduced. Previously existing and imported results remain in the six unchanged original keys; the backup UI disappears without deleting results. Historical progress continues to be read by the older build. Main Deep Cuts website and other Game Lab games remain untouched.
