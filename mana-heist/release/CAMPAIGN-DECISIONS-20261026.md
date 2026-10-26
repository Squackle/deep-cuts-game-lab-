# Mana Heist campaign decision audit — October 26, 2026

Status: reviewable follow-up to the unmerged practice ladder [PR #132](https://github.com/Squackle/deep-cuts-game-lab-/pull/132). This branch is independent of that PR and does not change its files. Owner authorization: “go ahead with the next steps.” No deployment, campaign puzzle edit, score migration, or human difficulty certification.

## Completed work and health assessment

Every one of the **500 campaign vaults** has a reducer-legal reference route, replayed and profiled by this batch. The reference is an existing authored/constructive certificate or original solver route, not a new claim of global optimality. Only selected complete state graphs establish shortest-action routes and consequential-choice bounds.

The game has a sound base for regression testing and consistent legality. Its 500-vault inventory and structural C/D estimates do not yet establish 500 distinct strategic experiences or a calibrated difficulty curve. Higher reference action counts, more legal menu options, and more wards cannot substitute for player evidence. The release, rules and rights gates remain open.

Implemented files:

- `src/strategy-graph.js`: bounded exhaustive graph analysis using the existing reducer, reverse winning reachability, shortest-action witness and minimum consequential-choice counts across winning routes.
- `src/route-decision-profile.js`: legal reference replay, action types, descriptive choice menus, repetition and runs of successive ward casts.
- `src/campaign-decision-audit.js` and `scripts/audit-campaign-decisions.mjs`: all-500 profiling, declared representative graph selection, JSON exports and source hashes.
- `src/readiness-audit.js`: corrected board fingerprints and shared existing reference/cache helpers; existing audit format stays v1 with additive `boardFingerprintVersion: 2` metadata.
- `tests/campaign-decisions.test.mjs` and `tests/board-fingerprint-regression.test.mjs`: new regression and counterexample tests.
- `release/CAMPAIGN-DECISION-EVIDENCE-20261026.json`: machine-readable measured results; `PLAYER-CALIBRATION-TEMPLATE.csv`: six blank human playtest records.

## Confirmed issues and review candidates

| Priority | Finding | Status |
| --- | --- | --- |
| Medium | Board fingerprints ignored untap effects, creature-spell payment eligibility and source-specific charge counts. Three regression fixtures matched incorrectly before the fix. | **Fixed** and tested. Current 500-board group counts stay at 340 distinct fingerprints; no current campaign pair was reclassified. This prevents future false matches rather than inventing a present campaign collision. |
| High content-review priority | The legacy D index rewards execution burden. A forced one-Island blue ward can grow from D17 to D60 through six repetitions. | Repetition regressions now prove that added work does not add consequential patterns in the new diagnostic. Legacy ratings remain unchanged pending human calibration. |
| High content-review priority | Similar legacy ratings can conceal different choice structures. `mh-110` (D44) has an 8-action route with zero critical productive commitments under this model; `mh-251` (D46) has four minimum critical and three minimum deferred commitments. | Reproducible curation candidates, **not** a human difficulty ranking. The protected existing boards are unchanged. |
| Medium | Some certificate routes are longer than the shortest-action route: `mh-110` uses 10 reference actions versus 8 in the complete graph; `mh-150` uses 10 versus 9. | Recorded as reference-versus-shortest evidence. Certificates have always been legal references, not guaranteed optima. No medal thresholds changed. |
| Open coverage gap | Some large graphs exceed the declared budgets. | Their metrics are null. Legal reference replay still succeeds, but their strategic complexity remains unresolved. |

## What the measurements mean

A **productive commitment** is any legal action other than ending the turn. End-turn timing risks are reported separately; they still matter to gameplay and are a deliberate limitation of this diagnostic.

For each fully explored state s, let P(s) be distinct productive successors and W(s) the subset from which the vault can still be finished:

- Critical state: `0 < |W(s)| < |P(s)|`.
- Deferred critical state: at least one losing productive option can still clear the current ward, and a winning productive option also exists.
- Minimum critical/deferred commitments: minimum number of the respective state exposures along **any** complete winning route, calculated using reverse 0/1 shortest paths. They are lower bounds on this defined choice burden, not minimum human thought.
- Reference decision patterns: distinct productive choice menus with winning/losing labels along **one shortest-action route**. Card instance IDs, cosmetic ward names and repeated turn numbers do not create new patterns. Card identities, charges, output modes, payments and untap/fetch/return targets remain relevant.

Exact engine state keys control graph deduplication. Coarse menu signatures never merge graph states. Reversible activation cycles terminate through state deduplication. A complete graph without a winning state can prove failure; a state/edge budget exhaustion returns **inconclusive**, null metrics and no solution/unsolvable verdict. Every complete graph's shortest-action witness is separately replayed through the reducer, and complete graphs must agree with the existing legal references.

The regression pair is intentional: a single Island needs 2 actions for one blue ward and 17 for six wards, but both have zero consequential patterns. A dual land repeating the same blue choice has one pattern in both cases, while its count of choice visits increases from one to six. No scalar score is manufactured from these dimensions.

The cheaper all-500 profile observes **one legal reference trace**. Its `distinctChoiceMenus`, repeated menus and single-option commitments do not prove strategic necessity. An identical menu can have a different future purpose; a larger menu can contain irrelevant options. A single-option commitment can still have an end-turn alternative. Neither menu count nor action count is a calibrated difficulty equation.

## Verification and evidence

The deeper run completed **26 of 41** selected graphs, including **all 18 originals**. The remaining **15 are inconclusive**, with null metrics; no complete graph contradicts a legal reference route. An earlier 3,000-state pass completed 24, so the higher targeted budget resolved two additional cases without converting timeouts into difficulty claims.

| Vault | Legacy D | Reference actions | Shortest actions | Minimum critical | Minimum deferred | Shortest-route patterns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| mh-03 | 32 | 7 | 7 | 0 | 0 | 0 |
| mh-109 | 33 | 9 | 7 | 5 | 0 | 5 |
| mh-110 | 44 | 10 | 8 | 0 | 0 | 0 |
| mh-251 | 46 | 7 | 7 | 4 | 3 | 4 |
| mh-301 | 53 | 11 | 11 | 4 | 2 | 4 |
| mh-351 | 59 | 16 | 16 | 7 | 7 | 8 |

These values support inspecting the actual decision structures rather than ranking players or certifying the smoothness of a difficulty curve. In particular, counts can repeat a familiar decision and omit end-turn reasoning; the pattern and timing fields are needed alongside them.

The baseline on Lab main was **215/215** Node tests. This branch passes **235/235**, including all existing authored/campaign replay, auto-cast, save and UI-source regressions. Four fingerprint regressions include the three before/after failures and charge-preserving source renaming. Sixteen decision tests include repeated-work invariance, deferred traps, exact winning replay, reversible cycles, budget failures, invalid traces, all-500 profiles, and an independently enumerated check of the reverse lower-bound algorithm.

Run from repository root with Node 24:

```sh
node --test mana-heist/tests/*.test.mjs
node mana-heist/scripts/audit-campaign-decisions.mjs --max-states=15000 --max-edges=200000
```

Export the full per-vault profiles and the compact report:

```sh
node mana-heist/scripts/audit-campaign-decisions.mjs --max-states=15000 --max-edges=200000 --json=/tmp/mana-campaign-full.json --summary=/tmp/mana-campaign-summary.json
```

Use `--ids=mh-109,mh-251` to change the graph selection, or `--ids=none` for only all-500 reference profiles. The default sample consists of the 18 originals, the first representative of each revised family, and each galaxy finale: **41 selected IDs**. The library default is 3,000 states/60,000 edges; the committed deeper evidence uses the explicit 15,000/200,000 budgets above. Budgets apply independently to each selected graph. The deeper sample can take several minutes; it is an offline developer command, not a browser startup task.

The evidence records engine version, analyzer version, selected IDs, limits, source commit, whether source files were modified, and SHA-256 hashes of every `mana-heist/src/*.js` module. Hashes identify the exact analyzed code even when generated from a working tree. It contains no player data. The JSON is a snapshot, not a live status page.

Existing readiness UI received local browser checks at **320×568** and **1280×900**, with external traffic blocked: 500 rendered rows, galaxy/search filtering, all-500 CSV and JSON downloads, v1 report/v2 fingerprint metadata, no page exception or horizontal page overflow. No gameplay UI was edited in this batch; the practice ladder's earlier browser evidence remains specific to PR #132.

## Human pilot ready to run

The six blank CSV rows cover `mh-03`, `mh-09`, `mh-109`, `mh-110`, `mh-251` and `mh-301`. Record the actual build SHA, an anonymous tester label, experience, assist mode, completion, elapsed seconds, hints, restarts, perceived difficulty and clarity. Blank rows are a template, **not observed results**.

1. Have several players with different mana familiarity try the six vaults. Vary their order and do not disclose expected classifications. The current game still shows legacy ratings, so this pilot is not fully blinded.
2. Keep manual/automatic casting modes separate. Count stopped or failed attempts as well as wins; record elapsed time at stopping rather than silently dropping difficult attempts.
3. Keep the first exposure separate from repeat attempts. Ask what decision caused confusion or required planning; identical menus can require different reasoning.
4. Review results before changing the progression or fitting a multi-factor model. A small pilot is feedback, not representative statistical calibration. Broader beta/device acceptance remains outstanding.

Human pilot work has not been performed by the assistant. No automatic telemetry, user contacts, account changes or score submission was added.

## Safety, coordination and remaining work

Lab base: `50be4e6735749b8dc090b75373407da7c1f9ef23`; website main observed `e4e2976f574b0bba83948574a2daf65ad35d194e`. Older Lab #128 and #132 remain separate; none of their changed paths is touched. The status record is kept here to avoid their roadmap/file overlap; no release milestone is claimed complete.

Rules remain **mh-landfall-0.2.0**. Diagnostic version is **mh-strategy-graph-1**. This batch changes no mana/card/turn rule, levels, control, save key, medal, membership, payment, authentication, public API or database. Tests and analysis use the existing simplified engine; no new Oracle/Forge verification or official Magic accuracy claim is made. The prior Oracle, physical-device, licensing and release gates remain unresolved.

No dependency or framework was added. The only existing browser-consumed logic change is audit fingerprint correctness; heavy graph work runs offline. Rollback is a normal PR revert; no data migration or restoration is required. Production deployment and database migration remain unauthorized.

Next priorities:

1. Review the two independent Mana Heist batches and run the six-vault human pilot.
2. Review the named capstone candidates against the intended lessons. Preserve all original 250 boards/IDs; use separately versioned optional remixes or an explicitly reviewed migration for any future board changes.
3. Resolve remaining bounded graphs selectively and test whether more efficient search changes the evidence. Do not fill gaps with estimated difficulty numbers.
4. Fit and validate a multi-factor difficulty model on actual player results, keeping strategic variety separate from repeated execution. Recheck the combined branch before any release.
5. Perform Stackbreaker's corresponding decision/sequence audit in its own workstream. Its difficulty equation has not been changed or certified by this Mana Heist batch.
