# GRAFTBOUND v0.5 — decisions & open risks

| Decision | Rationale |
|---|---|
| Rewards are real Magic cards only: 50 creatures + 13 spells from a curated, rules-checked pool | Owner requirement. The engine models every effect that matters, and spells are labeled adaptations. |
| No fictional card ever fills a gap; Scryfall outages never substitute cards | Gameplay runs entirely on the bundled card facts. Scryfall only adds images and Oracle text. |
| Tutorial card is **Typhoid Rats** (real 1/1 Deathtouch), giving a 2/2 Deathtouch | I could not verify a real, keyword-only 2/2 Deathtouch creature without network access, so I did not invent one. The acceptance test now reads Blank 1/1 + 1/1 DT = 2/2 DT. |
| Legacy (v0.1–v0.4) original cards stay resolvable for old saves only | Never silently swap a player's earned card for a different one. |
| Graft capacity 4/6/8 instead of shrinking printed stats | Keeps "+2/+2 for a 2/2" exact, bounds growth and adds a visible choice. |
| Custom WebGL2 renderer kept | The floor bug was geometry plus filtering, not the renderer architecture. |

## Rights and asset status (not legal advice)
- **Scryfall:** images are hot-linked unmodified from `cards.scryfall.io` with the artist credit and a Scryfall link. Data requests are cached and spaced at least 110 ms apart. Check Scryfall's current API terms before release.
- **Wizards of the Coast:** unofficial fan content disclaimer on the title screen and every source panel. Free to play. I have not verified that the Wizards Fan Content Policy covers this specific use; that is **unresolved**.
- **No official artwork is converted into sprites or textures.** All sprites, effects and scenery are original programmer art (placeholder quality; see ART-BIBLE.md).
- **Card facts are unverified:** the bundled pool was entered from general knowledge because the sandbox had no network. Run `node tools/verify-real-pool.mjs` (needs network) before release. The game also logs a "Scryfall mismatch" warning at runtime for any difference.
