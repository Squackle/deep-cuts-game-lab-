# GRAFTBOUND v1.4.3 — Nemata & Toxrill boss-specific animated runtime art

## Actual in-game implementation

This is the first code-only premium-boss motion follow-up after the ordinary-creature rebuild. The existing original 112px Nemata Treefolk and Toxrill Slug Horror artwork now receives individualized **six-state animation sheets**, with four independently rendered frames for each idle/walk/attack/cast/hurt/defeat state and front/back views.

- **Nemata**: Roots now adjust independently while walking. Branch and claw attacks extend from the trunk. Canopy movement responds to idle, casting, recoil and collapse. Casting alters leaf/sprout highlights and defeat produces falling bark pieces.
- **Toxrill**: The slug foot and mantle undulate rather than relying on a static upright body. The four eye-feelers bend in response to attack, casting, damage and death. Poison/slime trails and the flattened defeat form are original visual animation.

The deterministic `advanced-boss-motion.js` defines all pose progressions. `legendary-boss-art.js` consumes these poses at asset creation and adds non-looping defeat states with explicit per-character animation metadata. Visual states are not used as input to combat damage, card effects, AI, ranked rules or save logic.

**Scope:** Only `mtg_nemata` and `mtg_toxrill` receive six-state atlases. Arasta, Drakuseth, Krenko, Scarab God and three legacy bosses retain their existing ten-row atlas and existing metadata. All six legendary identities remain separate; only the two selected ones change.

## Tests, QA and acceptance

Run `npm test` under `graftbound/`; existing boss-regression tests now explicitly verify expected 112×448×1344 (two upgraded bosses) versus 112×448×1120 for the remaining four. Dedicated pose tests cover root steps, arm reach, head feelers, body undulation, casting pulses and deterministic defeat, with no simulation RNG.

Open `/graftbound/dev/boss-motion-qa.html` on the exact PR Cloudflare preview and the eventual Game Lab production site. The browser reads the game's actual sprite registry; both front/back views and six states are evaluated for distinct opaque RGBA frames and atlas edge contact. The page is an inspection tool, not proof of premium painterly quality.

**Outstanding:** Distinct higher-resolution individually drawn boss textures, richer anatomy, correct Equipment/graft interactions, more directions, mobile performance and original approved concept comparisons remain unverified. The other four premium bosses need a similar articulated motion pass. Never claim full boss-art acceptance from CI alone.

Rollback by reverting this isolated GRAFTBOUND visual PR. No ranked rule version or save migration required. Other games, main website, Cloudflare infrastructure, accounts and D1 are not changed.
