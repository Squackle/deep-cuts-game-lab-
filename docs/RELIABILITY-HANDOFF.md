# Game Lab QA and reliability handoff
Snapshot 2026-11-24; current source and GitHub Actions take precedence. Main at baseline 0867b8d1aa7591a169e8b56b5b711a278a863423; canonical Cloudflare deployment matched and succeeded. Required ruleset check is release-coordination (not verify); up-to-date branches and independent human approvals are not currently required. Active PR #335 at baseline changes ARCHEMANCY code/tests; do not overwrite it.

## Architecture and ownership map
- Root index.html and lab/index.html: shared five-game catalog; lab/** shared UI. Hive Run entry hive-run/index.html; root src/**, assets/**, tests/** include Hive gameplay. Only shared QA files in tests/** are in coordination scope.
- Stackbreaker stackbreaker/**, Mana Heist mana-heist/**; read each AGENTS.md and current roadmap before gameplay changes.
- GRAFTBOUND graftbound/**, package.json npm test, tools/integration-manifest.mjs; read graftbound/AGENTS.md and ARCHITECTURE.md. The former living-card route redirects. Source-bundle workflow is export only: its test exit code is recorded but intentionally does not fail its job.
- ARCHEMANCY canonical archemancy/index.html, implementation archamancy/** (legacy spelling preserved). Scryfall validation is external-source dependent and separate from deterministic tests.
- No public identity or production D1 score writes from Lab. Production game promotions are separate reviewed and owner-authorized PRs; preserve rules versions, hashes, history, and save compatibility. Read docs/SHARED-GAME-LAB.md and docs/MAIN-SITE-PROMOTION.md.

## CI contract (proposed in coordination PR)
Required release-coordination calls unified Lab suite plus the existing GRAFTBOUND verifier (complete npm test and integration manifest validation); any failed/cancelled/skipped prerequisite fails the required job. Unified and GRAFTBOUND PR invocations now go through this one reusable path, avoiding duplicated runs; standalone main push and manual workflows remain. Existing game assertions and syntax checks unchanged.

The unified suite tests the candidate merge ref. The separate coordination job runs the PR base policy before using its read-only API token. Review workflow changes themselves during release acceptance.
- Local: node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs archamancy/tests/*.test.mjs ; (cd graftbound && npm test && node tools/integration-manifest.mjs). Use Node 24 for unified suites and existing verifier Node 22 to match CI.
- Daily deployed route health: seven anonymous static GETs (both catalogs and five games); exact expected title, HTTP 200, HTML content type and catalog links. No game scripts, account APIs, third-party calls or data writes; synthetic tests cover fallback, redirect and outage. This is HTTP smoke, not interactive mobile or browser QA.
- Do not interpret a successful export bundle as passed tests. Inspect the actual verifier job and exact head. For gameplay, run game-specific browser/manual tests as appropriate, preserve deterministic replay and test-server-first policies.

## Release/incident procedure
Check current main and other open PR file overlap, create coord/* or authorized game branch, record scope/rollback, inspect all exact-head checks, do not bypass failures. If deployment is authorized, verify canonical Pages SHA and route results. Revert scoped PR if needed, not another developer's commits; confirm old saves and replay compatibility. Never auto-promote or alter production DB.
If health job fails, investigate HTTP status or route marker before making a code change. Wrong title catches a 200 fallback; a network failure is not an application diagnosis. If a shared catalog URL changes intentionally, update the contract in the same coordinated release.
No fresh interactive browser/physical-device tests or production score writes are performed by this QA branch. Lab preview and published Lab appear to share presence KV on initial readback; verify value shape and intended isolation before any configuration change. No production access/config changes authorized.
