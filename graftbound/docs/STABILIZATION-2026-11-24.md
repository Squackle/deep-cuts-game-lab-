# Stabilization work order — 2026-11-24

## Scope and baseline

Branch based on Game Lab main `0867b8d1aa7591a169e8b56b5b711a278a863423`. Preview only under the owner's November 24 work order. No other games, shared infrastructure, website, accounts or databases are in scope. This is a candidate patch, not a release record until checks and preview are observed.

Current compatibility: GRAFTBOUND 1.8.3-beta, rules `graftbound-rules-1.8.3-beta`, card pool `real-pool-133-v7`, challenge revision 30. No valid gameplay action, scoring formula, seed, local save key or asset was changed. The verifier rejects malformed action envelopes that were never legal game decisions. The source digest changes and a future authorized site integration must pin it separately.

## Changes in this patch

- Ranked envelope validation requires own action type and challenge registry keys, an integer contiguous sequence, own required fields and no extraneous keys (including inherited Object names). Regression tests cover action, challenge, full replay and checkpoint rejection without state mutation.
- Mobile reward stack uses final pointer coordinates, cancels on lost pointer capture, rejects competing gestures and non-primary mouse buttons, and preserves reveal/choice separation. Regression tests cover fast releases, canceled gestures and reversed swipes.
- Shared modal behavior traps keyboard focus, names the dialog from its heading, restores the opener when closed, and rejects backdrop, Escape and dismissal controls when a mandatory choice is locked. Existing explicit choice resolution remains available. Added Chromium e2e checks; actual browser execution must be recorded separately.

## Prioritized next packages

1. **P0 — verification:** Run full GRAFTBOUND Node suite, integration source manifest, shared Lab checks, and Chromium e2e on exact PR SHA. Confirm Cloudflare branch preview and real iOS Safari/Android gesture handling. Do not merge or promote until separately authorized.
2. **P0 — replay and scoring:** Extend deterministic full-expedition/checkpoint parity tests, challenge revision and retired challenge boundaries, bad checkpoint metadata, duplicate/terminal actions, save/resume and all pending choices. Check score totals and legal strategy outcomes; retain compatibility for valid historical replays. No production score testing or writes.
3. **P1 — approved 12-card pilot (#204) and dialogs (#205):** Verify current card pool and owner decision history first. Implement in small dependency-ordered packages: existing draw/life/cast triggers; Verdant Force and Welcoming Vampire summon phase limits; Village Rites cost; Skullclamp state-based death/draw; Sleep per-boss resistance; Shadowspear paid ability; Opt persistent deterministic Scry choice. Each rules-changing package needs official Oracle review, version/revision decisions, regression and simulation evidence. The remaining 55 candidates toward 200 are not implicitly approved. Do not copy historical prototypes blindly.
4. **P1 — battle presentation:** Audit heading/foot anchors, tail join, facing under every camera rotation and attack/move animation, token identities, exile/library/graveyard alignment, targeting and HUD overlap at portrait and landscape viewports. Use real screenshots and device playtests; do not claim visual fixes without observing them.
5. **P1 — difficulty/combat:** Run fixed-seed baseline with different builds and player strategies. Assess enemy pathing, telegraph fairness, boss phases, action economy and failure recovery before changing AI or stats. Add replay assertions for every rules change; do not tune by one player's run.
6. **P2 — performance and maintainability:** Profile actual slow frames and asset loads on representative hardware. Evaluate stale animation-studio branch independently with its owner; no cherry-pick of a divergent branch. Refactor only verified duplication, retaining test and replay coverage.

## Rollback and evidence

Revert only this PR on its feature branch if regressions appear; no migration is needed for legitimate save data. Existing main and other developer branches are unchanged. See the PR checks and preview deployment for current evidence; pending or missing checks are not passes.


## Continuation pass — checkpoint, save and battle lifecycle

- The first patch passed 729/729 GRAFTBOUND tests and shared Lab checks. Its release-coordination failure was a malformed PR workstream label; PR #339 metadata now uses the required `Workstream: Game Lab` value.
- Main advanced to `e7a7a4f8ac1508613136eb7f0f16824410273b83` solely in `archamancy/**`. This branch deliberately retains its original base; compare shows no competing GRAFTBOUND path changes. No other developer branch was modified.
- Checkpoint continuation now enforces the same overall 4,000-decision budget as whole replay; requires the exact challenge revision, rules, card pool, scoring and replay metadata. This validates compatibility, not checkpoint authenticity: only trusted server-owned checkpoints are supported.
- Corrupt-primary recovery writes a validated backup to the primary key before returning success; immediate refresh preserves recovery. Intentional deletion still cannot resurrect a backup. The corrupt copy remains set aside.
- Auto-end is cancelled on actions, encounter start/stop, dialog opening and hidden tabs; execution checks the captured encounter and turn, active mode, visibility and modal state. Closing the dialog or returning to a visible battle re-evaluates legal actions. The unattended-turn cap resets per encounter.
- Added two checkpoint, three recovery and three real scheduler regression tests. All of these are compatibility fixes; valid action/scoring rules, challenge revision and save schema remain unchanged. Browser and device acceptance are separate; do not represent CI as a physical playthrough.
- No card expansion, aesthetic redesign, unreviewed balance tuning, shared workflow edits, production promotion or database activity in this patch. The card-pilot design and visual direction are tracked in #204/#205; do not infer approval of the remaining 55-card proposal.
