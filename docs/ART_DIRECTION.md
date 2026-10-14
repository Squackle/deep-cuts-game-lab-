# HIVE RUN — WUBRG Creature Art Direction

## Approved visual reference
The original generated concept sheet is preserved in the user's ChatGPT Library at:

`/Deep Cuts Game Lab/Hive Run - WUBRG Creature Concept.png`

It depicts a pointed, swept-back head with **one scythe-like arm**, an elongated armored body, and a **double-pronged tail**. Five visual families match Magic's familiar W/U/B/R/G color order: white/bone, blue, black/purple-dark, red, and green.

## Art integrated into the playable prototype
- Source: the original generated poster; **not** the user's copyrighted Sliver illustration.
- 45 distinct body sprites, exactly nine sampled from each W/U/B/R/G row of the concept sheet.
- One pointed head sprite with a single scythe arm; one forked tail sprite.
- Indexed 20×20 body art and 28×36 head/tail art, palette reduced and compressed into `src/creature-sprites.js`.
- Native browser decompression reconstructs local Canvas sprites at runtime without image downloads or third-party services.
- Head/body/tail are rotated with movement, and connected by a spine to look like one continuous creature.
- Body sections cycle through W/U/B/R/G; each new cycle uses a new variant until all 45 are used.
- A Creature Codex previews the same sprite assets on the test site.

## Important implementation notes
- The full poster is **archived in Library**, not served as a 2.3 MB game asset. This avoids slowing mobile gameplay.
- A procedural fallback remains for browsers without native `DecompressionStream`.
- All five families remain within WUBRG; no sixth color path.
- Art remains an **original fantasy creature inspired by the desired silhouette**, not a reproduction of official Magic: The Gathering character art.
- Future polish: improve corner articulation and sprite blending; test real iPhone/Android devices.

## Testing
`npm test` and browser smoke tests on the independent Cloudflare Pages test URL.
