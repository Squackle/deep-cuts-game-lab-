# GRAFTBOUND v1.3.0-beta — Visual Evolution (game-lab only)

**Starting Game Lab `main`:** `83d330f5c3f6bcf92576c0f3b2c94c8a9654ba6a` (v1.2.9-beta).
**Owned scope:** `graftbound/**` exclusively. The public DeepCutsEDH website, other Lab games, profile data, payments, D1 and ranked rules are unchanged.

## Art standards and real-card references

Art source is authored in GRAFTBOUND's JavaScript sprite definitions. No actual MTG card image data is embedded, traced, or recolored into sprite sheets. The reference image on a card face continues to be the unmodified Scryfall image with artist credit and notice.

Bosses with dedicated original 112-pixel rigs (4 frames × idle/walk/attack/cast/hurt × front/back):

| Boss | Target card-art printing | Signature visual identity |
| --- | --- | --- |
| Nemata, Grove Guardian | Planeshift | Bark-covered Treefolk, branching limbs, roots, green canopy |
| Arasta of the Endless Web | Theros Beyond Death | Eight articulated spider legs, thorax, patterned abdomen, webbing |
| Drakuseth, Maw of Flames | Core Set 2020 | Red/black horned dragon, wings, talons, opening jaws and flames |
| Krenko, Mob Boss | Magic 2013 | Small but commanding armed Goblin, distinctive ears and layered clothing |
| The Scarab God | Hour of Devastation | Regal scarab-headed turquoise and gold deity |
| Toxrill, the Corrosive | Innistrad: Crimson Vow | Elongated purple slug Horror, feelers, corrosive slime |

The three historical non-card boss sprites (Thornmother, Pyre Matron, Unwritten) receive original, separate authored versions. All nine render using the same directional lighting, pixel-block sizing, outlines, palette density, and animation timing as the rest of the title. Bosses are visually prioritized, but mechanical grid footprints remain unchanged.

Equipment art is original and selected for these visual references:

| Equipment | Reference printing | Recognizable visual details |
| --- | --- | --- |
| Accorder's Shield | Scars of Mirrodin | Faceted metallic shield, structural metallic braces and rivets |
| Basilisk Collar | Worldwake | Heavy dark neckband with hanging fanged ornaments |
| Swiftfoot Boots | Magic 2012 | Warm leather, brass trim, luminescent enchanted soles |
| Mask of Memory | Mirrodin | Metallic facial plate with inset eyes and engraved brow |
| Moonsilver Spear | Avacyn Restored | Long luminous silver spear and stylized spearhead |

**Fidelity limitation:** These original pixel-art approximations are not exact copies of the card illustrations. A second art-direction pass, especially normal-zoom boss screenshots against the selected reference printing, remains necessary before describing any illustration as fully art-accurate. Art references above must be checked against the exact printing displayed in the online card viewer.

## Implemented systems

- 64-pixel Blank sprite replaces the previous 48-pixel round player model; premium mail-clad human Soldier wields a one-handed sword, without a huge shield or spear.
- 12 saved skin-material palettes across the natural human range, stable by adventure seed or unit ID. Skin-only material masks avoid recoloring armor, cloth, and gear. Legacy saves derive the same cosmetic value from their seed, without invalidating scores.
- Pure deterministic anatomy resolver retains the complete accumulated physical part set and derives morphology from actual absorbed creature subtype. Head/torso/back/limbs/tail all support compatible layers. The existing mechanical `evo.parts` and rules remain authoritative and unchanged.
- 64-pixel body-aware graft painter supports all twelve physical grafts (wings, shell, spikes, horns, antlers, crown, tail, blades, claws, tusks, beak, armor) and moss, eyes, tendrils, venom, color marks, bulk, plus aura lighting. Cross-species presentation supports feline, draconic, avian, insectoid, arboreal and other body materials; there are explicit deterministic precedence rules when the anatomy is ambiguous.
- Five separate Equipment models use anatomy anchors instead of hard-coded 48-pixel locations. Gear persists and follows animation frames, with target-bearing allies supported in combat.
- Five distinct Aura overlays use the authoritative target aura state and are updated when applied/removed. Existing duration and combat interactions stay untouched.
- Nine authored boss models added after the generic creature pipeline, so they override recolor-based placeholders for these identities. Each has unique animation geometry with movement, attacks/casting and damage response.
- Developer runtime asset QA gallery at `/graftbound/dev/v13-visual.html` shows actual models, saved graft presets and artifact/Aura variations; it requires no WebGL2.

## Verification and release

- Run `npm run assets`, `npm test`, `python3 tools/audit_sprite_bounds.py`, source syntax checks, and shared Game Lab / release coordination CI.
- Run runtime art pixel audit `node tools/render-v13-gallery.mjs` to check actual authored image data.
- Verify Cloudflare Pages production deployment for merged exact SHA.
- Regression tests for skin seeds, composite graft sets, morphology, and independently authored boss frames are `tests/v13-visual-evolution.test.mjs`.

### QA honesty

The installed container's Chromium cannot initialize EGL/WebGL, so an actual in-game WebGL capture and real-device performance acceptance were not available in this run. The runtime asset gallery is valid as a pixel rendering audit, **not** as an in-game screenshot. Any browser-specific clipping, leg collisions and animation refinement from live playtest must remain explicit beta follow-ups. Do not claim the full set of artistic acceptance criteria is proven solely by green unit tests.

### Compatibility and rollback

Keep RUN_VERSION, save keys, visual RNG isolation, and ranked replay rules unchanged: this is a visual-only beta; engine `RULES_VERSION` remains v1.2.9. Revert only the versioned, game-scoped Game Lab PR if needed. Do not remove existing saves or ranked logs, and do not update the production website.

### Release coordination evidence

PR #159 uses the repository-required plain-text work-order fields (Workstream, Owner authorization, Files/Scope, Concurrent work, Test plan, Rollback, Rules version, Main-site impact). The initial workflow failure was metadata formatting only; this documentation-only follow-up commit refreshes the pull-request event so the protected checker validates the corrected work order. Keep CI failure closed until the checker itself reports success.
