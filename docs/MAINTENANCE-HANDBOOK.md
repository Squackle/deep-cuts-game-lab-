# Game Lab maintenance handbook
The Lab is an independent prototype Pages site. Production identity, verified scores and D1 belong to Squackle/deep-cuts-edh, never to this repository. Read AGENTS.md, docs/SHARED-GAME-LAB.md and docs/MAIN-SITE-PROMOTION.md before touching runtime.

## Source map and targeted verification
| Area | Owner / entry and first source | Targeted test |
|---|---|---|
| Catalog and presence | shared catalog: index.html, lab/index.html, lab/**, functions/api/lab-presence.js | node --test tests/lab-catalog.test.mjs tests/lab-presence.test.mjs |
| Hive Run | Hive developer: hive-run/index.html, root src/**, assets/** | node --test tests/*.test.mjs; use specific failed test first |
| Stackbreaker | puzzle developer: stackbreaker/index.html and stackbreaker/src/** | node --test stackbreaker/tests/*.test.mjs |
| Mana Heist | puzzle developer: mana-heist/index.html and mana-heist/src/** | node --test mana-heist/tests/*.test.mjs |
| GRAFTBOUND | game owner: graftbound/index.html, graftbound/src/** | cd graftbound && npm test; run verifier manifest exactly as CI |
| ARCHEMANCY | game owner: archemancy/index.html, archamancy/engine.mjs and main.mjs | node --test archamancy/tests/*.test.mjs |
| Shared verification | QA: scripts/**, tests shared, .github/workflows/**, docs/** | node --test tests/release-coordination.test.mjs tests/lab-live-health.test.mjs |

Use Node 24. The complete unified command is `node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs archamancy/tests/*.test.mjs`, plus GRAFTBOUND's own npm test and manifest verifier. The exact workflow commands are authoritative. Don't rerun a whole suite to diagnose a known single assertion; reproduce focused, fix the cause, then require complete exact-head CI. Keep game-specific tests with their owners.

## Routine work without AI
| Trigger | Automation | Exception response |
|---|---|---|
| Every PR | release-coordination, unified game-lab-suite, GRAFTBOUND verifier (#340) | review exact failing job; do not bypass or lower requirements |
| Entry/catalog PR | offline desktop and mobile Chromium smoke (#341) | reproduce actual tile/cover/route, no production requests |
| Every PR / weekly Monday 14:19 UTC | Lab source-security scan (#344) | potential credential rule/path only; private review; no values |
| Daily 13:43 UTC | deployed route health (#340) | first attempt healthy vs transient recovered vs persistent failure; investigate red |
| Presence | ordinary 30-second anonymous heartbeat, 180-second expiry (#346 retains timing) | use synthetic KV/VM fixtures, no live load or manual writes |
| Deploy | existing Cloudflare Pages and notifications | verify canonical deployed SHA and route identity; compare to expected main |
| Promotion | reviewed separate website integration PR | owner approval, exact source SHA, replay/score compatibility |

Health uses seven static anonymous GETs; a network/read error, HTTP 408/429 or 5xx gets one retry after one second; incorrect title, type, redirects and other client errors fail immediately. At most fourteen GETs. Recovered transient failures are visible in job summary, persistent failures are red; no game APIs, writes or load test. For an isolated network failure, inspect summary and native Cloudflare status rather than creating duplicate alarms. Manual workflow dispatch once if justified; repeated failure is an incident. Do not treat automatic schedule configuration as proof of success: after authorized merge, verify first run with event=schedule, main SHA, expected seven routes, result categories and notification destination. Confirm native GitHub/Cloudflare alerts before reducing existing AI monitoring. Do not modify user schedules or create paid monitoring without approval.

## Release package and recovery
1. Record exact Lab main and candidate SHA, open PRs, ownership and rollback. Require all relevant check runs on candidate / merge ref; Lab ruleset currently requires release-coordination only, strict up-to-date policy false. Before merge manually recheck against current main. #340 makes unified + GRAFTBOUND prerequisites, not a substitute for owner review.
2. Include rules version, challenge revision, deterministic replay evidence and preserved score history; document changes in the game-owned lane. Browser catalog smoke proves navigation only, not playability. Add meaningful rule tests for gameplay. Follow existing Magic rules verification policy.
3. Owner authorizes Lab merge. Verify canonical deployment commit and status; exercise affected game with safe guest/local fixtures only; no public scores. Record exact tested SHA and release evidence in Control Room.
4. Main-site promotion needs separate explicit owner approval and website developer PR with source SHA, game versions, replay compatibility, shared template and server authorization. See docs/MAIN-SITE-PROMOTION.md. Never auto-copy Lab main or overwrite unrelated website features.
5. Failure: pause promotion, distinguish runtime/game regression from CI/provider configuration. Revert narrowly via PR or authorized known-good deployment, verify exact SHA again. Lab has no D1 and cannot restore authoritative scores; production rollback is separate. Never change preview/production bindings to fix a route failure.

Lab preview and canonical production currently share LAB_PRESENCE KV; Pages previews disabled as read back Nov 24. Owner must approve a separate isolated KV before enabling previews. No live storage inspection is necessary to verify routes. Presence labels for GRAFTBOUND and ARCHEMANCY prepared by #346; their owner-approved entry integration is separate. See issue #343.

Reserve advanced AI reasoning for novel rules/replay issues, concurrency/security bugs, cross-repo migration, unexplained persistent incidents or large refactors. Routine CI review, browser/route checks, dependency review, snapshot evidence and promotion checklist are deterministic or human review tasks. Report one actionable incident with exact SHA, failing job, scope, remediation and regression test, not repeated daily long reports.
