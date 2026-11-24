# Physical library candidate — activation package (round 3)

**Scope:** issue #342; candidate rules `mh-landfall-0.2.1-physical-preview`. No scored campaign activation, migration, public promotion or rights clearance. The historical `mh-landfall-0.2.0` remains the default for all 500 definitions. Workbench is a text-only, synthetic development fixture, not another ranked or authored campaign level.

## Evidence before integration

- Previous PR #345 head c7a58104: 500/500 legacy and candidate reference certificates, 43/43 affected automatic reference routes, no fallback or unknown; 255 dedicated / 1066 unified, zero failures.
- Workbench head 5e2b1c49: 257 dedicated / 1068 unified, same 500 and 43 evidence; tests exercise distinct same-name copies, bounced card in hand, undo and reset, explicit manual and auto-cast routes.
- PR #338 independently prepares campaign reserve display from `state.libraryAvailable` and labels the historical scenario reserve. It also owns manual cast selection, undo grouping and verified hint feedback. No campaign board has been changed.
- Latest-head CI and hosted browser checks are required. Direct Gatherer access returned 403; CR effective Nov 6 2026 (400, 701.21, 701.23, 602, 605), prior Oracle mirrors and Wizards card gallery corroborate fetch identities. Not full Oracle/Forge certification. Known-reserve search, immediate fetch resolution, life-floor, and turn-only mana expiry remain deliberate puzzle abstractions. Other physical-zone omissions (e.g. sacrificed artifact handling) are outside this candidate's rules scope.

## Owner decision A — activation

Recommend approve only after exact-head CI, combined integration and hosted preview evidence. First integrate non-overlapping #338 and #345 in a fresh Mana Heist-only branch from the then-current main, preserving historical reducer selection by explicit version. Add version-aware reserve, reference lookup, save/replay dispatch and candidate-specific unranked QA before changing any campaign definition. Workbench route: `/mana-heist/physical-library-workbench.html`. Verify manual/auto cast, multiple copies, shock costs, exhausted reserve, bounce, Undo, Restart, map return, existing star import/export and browser reload at desktop/mobile. The candidate's isolated test fixture does not certify full campaign UI.

Only with explicit versioned owner approval, consider migrating the 43 affected board definitions (all IDs and historical stars unchanged). Keep original definitions and the old reducer available to replay any historical trace under its original version. Never re-interpret old wins under new legality or retroactively delete them. Current guest star storage has no authority to verify past traces; do not invent old trace data. Record engine version on any future replay export/verification before activation. Validate all 500 certificates and affected manual/automatic routes on combined exact SHA; report unknowns, block if any known failure. Preserve original save key and progression access, and snapshot existing save contract in tests. Review whether revised-scoring metadata is needed; that is an owner decision, not inferred here.

Rollback: close candidate draft before merge. After versioned activation, restore old active definition selection and pinned old replay dispatch without rewriting stars or deleting history; test rollback in isolated preview only.

## Owner decision B — rights

Keep P01 public release blocked. Choose original/cleared art and branding or obtain qualified clearance. Do not publish existing Magic images on a rights-sensitive release without approval. Workbench intentionally includes no art assets.

## Owner decision C — difficulty

Keep all 14 trial IDs unranked. Pilot with consent, measuring first-attempt success, active solve time, retries, hint use and strategy differences; no telemetry without authorization. Use complete graph evidence as decision-risk evidence, not a human rating. Any campaign replacements need distinct board version, old ID mapping/rollback, validated winning/losing routes and review. Do not change ranked manifests or past records on this package.

## Owner decision D — Stackbreaker final acceptance

Issue #96 checkpoint 10 requires authenticated isolated staging with two accounts, actual server replay, guest/auth boundaries, no cross-account reads/writes, physical mobile and assistive-tech review, daily/editorial review and website developer coordination. No public promotion in this package.
