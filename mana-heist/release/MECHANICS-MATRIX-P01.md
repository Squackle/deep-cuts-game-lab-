# P01 — Supported mechanics inventory and P02 review queue

**Snapshot:** GitHub `main` at `1f3502c33c8ecb86159d83e3377968993e0b3c1d`, 2026-10-15.
**Authority:** current behavior is exactly what `src/engine.js` and `src/auto-cast.js` implement, **not** full MTG Oracle rules. P02 must use current [official Comprehensive Rules](https://magic.wizards.com/en/rules) and official card wording for every supported identity. Source review in this P01 matrix is exploratory, **not an official card-by-card certification**.

## Supported source / behavior matrix

| ID | Mechanic or family | Source in code | Current behavior | Accuracy state / P02 obligation | Impact |
|---|---|---|---|---|---|
| M-01 | Five colors and true colorless | `COLORS`, `zero`, `pool` | Separate W/U/B/R/G/C counts | PROVISIONAL: audit visual pips vs game color IDs | Every puzzle |
| M-02 | Colored, generic and C costs | `payOptions(pool,cost)` | Exact colored/C reserves first; generic `N` may spend any remaining mana, including C | LIKELY CORRECT FOR SUPPORTED COSTS; test alternate allocations and future autoward effects | All mixed-cost puzzles |
| M-03 | Land drop / turn | `actions`, `reduce(play)` | One land play per turn; turn 1 can play; `end` resets `played` | SIMPLIFIED: no priority or phases; clarify scope | Entire campaign |
| M-04 | Mana activation | `CARDS[key].colors`; `reduce(tap)` | Every non-fetch tap chooses exactly one mana symbol | **KNOWN MISMATCH FOR MULTI-MANA SOURCES**; support outputs as vectors not singular symbols where real card requires it | Bounce land, possible authoring API |
| M-05 | Basic lands | `plains,island,swamp,mountain,forest` | Produce W/U/B/R/G, respectively | PROVISIONAL; compare official typed land behavior | Beginner curriculum |
| M-06 | Typed dual lands | `dualUR,WU,UG,WB,BR` | One of two mana colors; two basic land types | PROVISIONAL; validate type/check interactions and life/entry | Color mastery |
| M-07 | Shock lands | `shockUR,BG,BR,WU`, `enterTapped` | Untapped if player chooses to pay 2 life, otherwise tapped | PROVISIONAL; compare exact entry condition; preserve legal payment choices | P08 |
| M-08 | Pain lands | `painUR,UB,BG` | Produce chosen colored mana at 1 life, or C without life loss | PROVISIONAL; verify state-based consequences and pay cost | P08 |
| M-09 | Check lands | `checkUB,UR,WG`, `enterTapped` | Untapped if existing field has one of listed basic land types | PROVISIONAL; check exact matching semantics and replacement timing | P08 |
| M-10 | Fetch lands | `fetchUR,BG`, `actions(fetch)` | Separate fetch activation, costs life, sacrifices source, picks typed land from bounded `level.library` | SIMPLIFIED library/search/shuffle/priority; avoid implying full deck behavior | P08 |
| M-11 | Bounce lands | `bounceUG`, `reduce(play)` | Enters tapped and returns chosen other land; **taps for U OR G** | **KNOWN WRONG relative to Simic Growth Chamber**, which adds **U AND G together**; P02 refactor plus puzzle/hint migration | P02 blocker |
| M-12 | Wastes / colorless | `relic` | Makes 1 `C`; `N` is not the same symbol | PROVISIONAL; teach correct separation | P07 |
| M-13 | Floating mana lifetime | `reduce(end)` | Mana persists for a whole abstract turn and empties at `end` only | **KNOWN SIMPLIFICATION:** Official Magic mana empties at end of each step and phase; explicitly choose scope | P02 blocker |
| M-14 | Untap effect | `stages[].effect === "untap"`, `reduce(cast)` | A stage may untap one already tapped land as it resolves | PUZZLE-ONLY named spells; not an Oracle card text replica | P04/P09 |
| M-15 | Automatic cast and payment | `chooseAutomaticCast` | Player never manually casts; legal cast is selected (solver aids ambiguous generic payment/untap selection) | GAME UX, not official turn timing; validator must check no forced-choice softlocks | P03 |
| M-16 | End turn / last turn | `actions(end)`, `turnLimit` | End turn resets tapped lands, floating mana and land drop; final turn cannot advance | SUPPORTED GAME CHALLENGE; do not present as match timer | Entire campaign |
| M-17 | Life > 0 | `actions` shock/pain/fetch costs | Disallow activation or entry choice reducing life to 0 or below | PUZZLE-ONLY safety rule, not exact official losing game behavior | P02/P08 |
| M-18 | No stack/opponent/combat | Engine intentionally lacks these features | Only mana sequencing and ward objectives | UNSUPPORTED BY DESIGN; do not teach opponent interactions as implemented | Product claims |
| M-19 | Score/medals/progression | `medal`, `campaign` | Best solver turns/life yield 3-star; sequential unlock | GAME-SPECIFIC; version/migrate for future updates | P03/P13 |

### 24 current land identities

These are the **actual real-card identities in the current Game Lab prototype**, not an indication that rights to redistribute them have been obtained.

| Family | Implemented land names |
|---|---|
| Basic (5) | Plains; Island; Swamp; Mountain; Forest |
| Typed dual (5) | Volcanic Island; Tundra; Tropical Island; Scrubland; Badlands |
| Shock (4) | Steam Vents; Overgrown Tomb; Blood Crypt; Hallowed Fountain |
| Pain (3) | Shivan Reef; Underground River; Llanowar Wastes |
| Check (3) | Drowned Catacomb; Sulfur Falls; Sunpetal Grove |
| Fetch (2) | Scalding Tarn; Verdant Catacombs |
| Bounce (1) | Simic Growth Chamber |
| Utility / true C (1) | Wastes |
| **Total** | **24 distinct modeled identities** |

This catalog is a **future rights/asset migration scope**, not a P01 mandate to replace art or names without user approval. If original assets are chosen, record original identities and independent designs separately; preserve stage IDs and resource-puzzle concepts only after expert review.

## Explicit P02 architectural decisions

1. **Mana output representation:** allow one tap to produce a *vector* of mana amounts rather than a single color, for actual multiple-mana producers. Investigate impact on `actions`, `reduce`, `payOptions`, orbs, full-pool visual, auto-cast and solver. Unit tests must include Simic Growth Chamber U+G and multi-ward behavior.
2. **Time/phase model:** decide a scoped representation of mana expiration vs the existing abstract-turn pool, with honest game text and learner outcomes. Do not silently change the campaign timing.
3. **Spell/ward identity:** distinguish invented mana-ward names from actual Oracle spells; disclose "puzzle spell" abstractions where used.
4. **Life-loss and mana activation:** reconcile life-loss constraints, replacement behavior, entry choices and fetching against actual sources; record deliberate simplifications explicitly.
5. **Save/replay migration:** every rules change requires engine-version bump analysis, prior levels affected, tests for save ID/medal stability and rollback.
6. **Curriculum claims:** each mechanic should have a user-visible lesson objective and confirmation that the game doesn't teach the wrong real-world interaction.

## Source verification protocol for P02

- Start at [Wizards Comprehensive Rules hub](https://magic.wizards.com/en/rules), and retrieve the then-current CR edition. The April 17, 2026 official PDF is an accessible historical reference, **not guaranteed the latest in October 2026**.
- Verify real card text using an authoritative/official card source and record current Oracle wording, rules identifiers, access date and copyright/usage limitations.
- Reproduce each mechanic under a test that calls the authoritative reducer. **Never use card art availability as permission to use it in another game**.
- For all level changes, re-run both solver replay and mandatory auto-cast resolution. Check generic vs C and multi-source multi-mana edge cases.
- Label every matrix item `VERIFIED`, `SIMPLIFIED-DISCLOSED`, `OUT OF SCOPE`, or `OPEN`, with source and reviewer. No item is VERIFIED by this P01 snapshot.

**Maintainer rule:** Do not update this document to "all rules accurate" until P02 official source verification and a complete campaign migration have been tested.
