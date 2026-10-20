# Mana Heist · Single-screen victory modal (Game Lab)

**October 20, 2026 · Owner requested "deploy it" after supplying a screenshot of the bad vertically scrolling win screen.**

## Incident and concrete correction

The screenshot showed a narrow viewport win panel with a prominent Next Vault action separated from a vertical 1–5 difficulty rating column, a smaller Vault Map button and significant forced scrolling. Source investigation found a **cascade and DOM-structure problem**: legacy `sage-and-card-fixes.css` targets the old `.win > div` layout and stacks its children as a grid; a newer playtest feature appended buttons to `#winPanel` as unrelated siblings. In addition, direct-child `display:grid!important` could overpower the global `[hidden]` rule, risking a visually shown feedback panel even when opt-in data was unavailable.

**Changes (Mana Heist only):**
- Replace flat `#winPanel` children with a compact win heading, three labeled results (turn, life spent and legal reference), one grouped action row, and a dedicated optional difficulty rating section. Bonus trials use Best Medal in the third chip. Learn exercises hide the scored chips and retain the actual lesson explanation.
- Append the existing `winReturn` button to `#winActions`, retaining its click-to-map behavior and the current `winNext` click handler. Keep rating event delegation and the same explicit local opt-in storage. The five difficulty buttons now reside in a single group with clear 1–5 accessible labels.
- Load `victory-layout.css` **after** both late-loaded legacy/modal styles; use win-only scoped specificity, explicit `[hidden]` selectors and responsive one-row/five-column ratings. The modal uses a short, accessible layout with minimum 44px tap targets. For very short viewports/large text zoom only, keep a maximum-height scrolling fallback rather than clipping controls.
- Treat victory as a titled accessible dialog, move focus to the Next action when the win first appears, and wrap keyboard Tab through its visible buttons so it cannot disappear behind the overlay.
- Summaries distinguish a **verified legal reference** from a globally optimal route. No fake best/optimal-solution claim was introduced.

## Real browser verification, not just source checks

Using Cloudflare's real Chromium renderer on the isolated preview after winning vault 1, the exact screenshot-like **457×447 viewport** (with the optional rating shown for layout testing) gave: **261px panel height, no internal scrolling, both navigation buttons in a single 407px action row, all five 44px rating buttons on the same horizontal row and inside the visible viewport**. On **320×568**: **286px modal height, no scrolling, five buttons on one row, Next Vault advanced into stage 2 with the win overlay closed**. A live CSS inspection verified the higher-specificity hidden rule actually works, including on the original opt-out flow.

**Do not overclaim:** Chromium viewport simulations are not physical iPhone/Android testing. Actual user devices, large-text/zoom edge cases, VoiceOver/TalkBack and human acceptance still need testing. These checks have no scoreboard/live profile significance.

## Change boundaries, tests and rollback

- `mana-heist/index.html`, `src/main.js`, new `victory-layout.css`, `tests/compact-victory-layout.test.mjs`, README and this release note only.
- All 500 scored vaults, 28 Learn lessons, 2 bonus trials, actual mana engine, puzzle versions, guest saves, v3/v4 medals, device QA, optional playtest storage and all other game lanes remain untouched.
- `node --test mana-heist/tests/*.test.mjs`, Node syntax and required Unified Game Lab and release coordination CI before merge; exact branch preview + production SHA/Chromium win UI smoke after merge.
- Rollback by reverting this scoped Game Lab PR and redeploying prior Game Lab SHA. **Do not revert the earlier repaired `selectedHandId` stage-launch bug**; it must remain initialized before `load()`. No database or browser-save migrations.
- P01 Wizards/Scryfall artwork rights review remains BLOCKED; not promoting Mana Heist to public `deep-cuts-edh` as part of this release.
