# Stackbreaker issue #96 — authenticated acceptance procedure, round 4

**State: READY FOR COORDINATED ACCEPTANCE, NOT ACCEPTED.** Game Lab changes are unranked only. This procedure does not authorize website deployment, credential handling by Lab agents, live profile activity, or any production database write.

## Prerequisites and exact evidence

- Website main inspected at `4d6197d46a833452db463724cc79b7d140f25d1d`; Game Lab main `e7a7a4f8ac1508613136eb7f0f16824410273b83`; refresh both SHAs and open PRs before execution.
- Website PR #138 merged Nov 17. `tests/stackbreaker-api-integration.test.mjs` provides local SQLite-backed synthetic complete victory, per-profile isolation, sequence/forgery rejection, idempotent rewards and finished-attempt locking. This is not a remote Access or authenticated browser session.
- Cloudflare Pages project `deep-cuts-edh` configuration inspected read-only Nov 24: DB and HIVE_DB bindings present for both production and preview; corresponding UUIDs differ. This is configuration-level evidence only: verify the **exact deployment** bindings and independently established synthetic provenance, not just current project defaults. Never test a historical preview or copied/unknown real data. No identifiers/credentials in this record.
- Website maintainer prepares a new Access-protected staging preview pinned to approved site SHA, with disposable synthetic DB and separately authorized staging feature state. Confirm with owner before any synthetic writes. Stop if any binding matches production, provenance is unclear, or preview is not Access restricted. Do not create accounts via production or use actual player profiles.
- Run site `node --test tests/stackbreaker-api-integration.test.mjs tests/stackbreaker-server-replay.test.mjs tests/stackbreaker-canonical-parity.test.mjs`; verify exact Lab unified CI and site protected CI. Record current manifest date, rules version, scenario digest and source SHA without exposing secrets.
- Two distinct synthetic test profiles A and B, separate browser contexts, no real addresses, no tokens pasted into issues. Use only preview origin `/games/stackbreaker` and same-origin `/api/stackbreaker`, profile page via normal UI. Test date is UTC; a fresh synthetic date/profile is required for repeat acceptance. Do not rewrite the date manifest or clock.

## Runbook (website developer/owner)

| ID | Action on isolated staging | Required result |
|---|---|---|
| S01 | Guest opens Daily, practices, reveals hint/undo if offered; reload | Practice explicitly unverified; guest cannot start verified attempt or award |
| S02 | Sign into synthetic A via authorized staging workflow; inspect Daily GET | Valid profile; current UTC puzzle and pinned scenario version; no prior attempt |
| S03 | Start qualifying run, reload before first move, resume | Exactly one row for A/date; same attempt and state, zero accepted moves; repeat start must not create a second |
| S04 | Cast/tap/pass legal moves from current server-approved scenario; refresh after a nonterminal move | Client and server replay states agree, monotonic move sequence; no hints/undo in scored attempt |
| S05 | In isolated synthetic API test only, send invalid target/forged-win/duplicate or stale sequence/wrong origin | Rejection, no accepted moves or awards for invalid attempt; correct next move still works |
| S06 | Complete genuine winning replay using pinned scene; reload | Terminal win, server-owned daily-first and eligible awards only, no duplicate grants; verified profile state and leaderboard match |
| S07 | Try another move and start after terminal win | No second qualifying attempt or overwritten result; practice remains available |
| S08 | Independent B signs in, opens Daily and profile, tries unowned cosmetic | No A attempt or reward state accessible; unowned equip denied; B can play its own attempt independently |
| S09 | A equips only earned cosmetic; sign out, reload; sign into B | A owned equip persists only for A, B does not inherit it, guest cannot equip |
| S10 | UTC rollover check using synthetic controlled date fixture, not production clock | New date distinct pinned attempt; previous verified outcome unchanged |
| S11 | Desktop keyboard, 320/375/390px and tablet responsive emulation, physical iOS Safari and Android Chrome; screen reader, offline art | All critical actions accessible, readable shared header, no trapped focus or overlap; guest/ranked affordances distinguish |
| S12 | Verify original Classic 250 IDs, 365 daily manifest dates, advanced local practice, prior historical scores | No manifest/score migration; audit remaining human editorial coverage separately |
| S13 | Rehearse rollback on isolated staging | Restore last approved deploy/feature config through website maintainer; retain historical tables and replay records, no data deletion |

Capture date, exact site SHA, deployment ID, rules version, scenario digest, synthetic account aliases, browser/viewport, test ID and pass/fail/blocked with redacted screenshots. Never include cookies, tokens, private rows, emails, or raw D1 exports. A single failed or unperformed mandatory row prevents Step 10 signoff. Keep human editorial review and rights clearance separate; no assumption that a complete server replay validates full Magic rules.

## Current Lab package

- #337 starting head 84727032: 1075/1075 unified, release coordination success. Round 4 trial UI asks explicit targets/payment, shows local card reference and scope notes, supports undo/retry/next and touch-sized controls; latest exact-head CI separately recorded.
- `strategy-lab.html?pack=replacement-review`: two proposed unranked replacements for sb-08 and sb-27 (targeted exile rather than redundant destroy), with distinct IDs, validated reference and alternate order tests. Original ranked sources and daily manifest unchanged. Official Wizards Bloomburrow release notes confirm Swords to Plowshares exile behavior: https://magic.wizards.com/en/news/feature/bloomburrow-release-notes ; CR 702.12, 608.2b, 701.7, 406 (Nov 6 2026). Direct current Gatherer verification remains blocked, no Forge claim.
- #96 stays open pending authenticated remote acceptance, real-device review and human editorial review. Do not promote or claim authoritative awards from Lab.
