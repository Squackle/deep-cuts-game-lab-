# Stackbreaker — Riku-style current P/T + counters overlay

**Owner authorization:** “deploy it” (2026-10-17) referring to the Moxgate-style example showing printed Riku 3/3, effective 4/4 in the bottom-right P/T box, and a separate +1/+1 counter chip.

## Changes

- **Any known modification to effective P/T** displays current power/toughness over the printed Scryfall P/T corner, even when the cause is an ordinary temporary +3/+3 boost. The underlying card image remains completely original.
- **Every tracked +1/+1 counter** appears as an independent green chip (single `+1/+1`, multiple `N × +1/+1`). **Known pump effects** appear as their own separate green chip (e.g., `+2/+2`). These are not substitute P/T; they're explanations of the current value.
- Example: printed 2/1 Elite Vanguard with +3/+3 is displayed as **current 5/4 + green +3/+3**. Example: printed 3/3 Riku with a single +1/+1 counter is displayed as **current 4/4 + green +1/+1** when the future engine passes effective 4/4 and counter metadata.
- If only base stats change, current P/T is displayed without an invented badge. If existing counters and/or boosts are also recorded, they appear as separate badges. Source-of-truth effective P/T comes from the unchanged game rules engine.
- Badge positioning is directly above the bottom-right effective P/T and adapts to tablet and phone sizes. Readable two-digit replacement values retained.
- The existing Classic game saves and stage IDs are unchanged. The Phase 1 Final Turn drill remains independent; it does not currently contain creatures.
- The Classic engine **does not currently track creature +1/+1 counters or support arbitrary base-set effects**. This UI supports their future display when accurately supplied by game state; this release does not add those game mechanics or claim Commander compatibility.

## Code boundary

`src/pt-display.js` is a **pure visual representation helper**. `src/ui.js` consumes it and preserves original Scryfall image plus current-value overlay and separate badges. `observatory.css` places accessible chip/overlay layers. The standalone `index.html` is regenerated with unchanged `build.py` and tested for exact CSS parity. `tests/pt-display.test.mjs` covers single/multiple counters, mixed counters + pump, unmodified cards, Elite Vanguard +3/+3, debuffs, base-set/no-invented-badges and source/bundle integration.

No changes to `src/engine.js`, `data/**`, account data, site navigation or unrelated Lab games. Cloudflare release is for Game Lab only, not production Deep Cuts EDH site.

## Release QA / rollback

Run unified Game Lab CI and coordinate release gate. In the browser, inspect buffed creature at phone/desktop; ensure the existing printed Scryfall card is intact, the effective P/T replacement is legible at bottom-right, and chips appear above with no overflow. Verify exact-commit Cloudflare production deployment. Revert only this Stackbreaker-specific PR to roll back; no user data migration needed.
