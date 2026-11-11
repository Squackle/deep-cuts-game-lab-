# GRAFTBOUND architecture (v0.4)
Simulation (`src/core`, `src/data`, `src/engine`, `src/cards`) is DOM-free and Node-tested. Rendering (`src/rendering`: WebGL2 shadows, point lights, bloom, tilt-shift, billboard pixel sprites) consumes state and decides nothing. UI in `src/ui`; flow in `src/main.js`. Branding constants live in `src/config.js` (`GAME`).
Real cards: `cards/real-pool.js` → `compatibility.toGameCard` → `catalog` → rewards, evolution and saves. Live Scryfall data only fills `sourceInfo` (display). Saves: run v2, meta v3, under keys `deepcutsedh.livingcard.*` (unchanged on purpose).
Renderer decision: keep the custom WebGL2 renderer. A Three.js migration would only replace `src/rendering/`.
