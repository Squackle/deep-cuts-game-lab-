# GRAFTBOUND v1.4.5–1.4.6 — All six legendary bosses have articulated runtime motion

## Code implemented

Continues the premium HD-2D battle art improvement while respecting the approved creature identities and the existing one-tile game rules.

- **Arasta of the Endless Web**: the actual eight spider legs are animated with opposing gait offsets, independent knees and grounded tips; abdomen pulses, head lunges, web strands tense during attack/cast, and a distinct nonlooping collapse replaces the reused hurt-only defeat.
- **Drakuseth, Maw of Flames**: shoulder-rooted wings change their sweep in walk/attack/cast; tail segments flex; the head and neck advance, jaws open during fire breath, flame lobes bloom within the source frame, and the wings sag as the dragon is defeated.
- **Krenko, Mob Boss**: humanoid Goblin footsteps, independently raised command arm, attached knife and hand-led strike, expressive head motion and defeat.
- **The Scarab God**: separate foot movement, gold ceremonial armor, cape/wing movement, independently lifted spellcasting arms, divine magic pulses and defeat.

All six legendary bosses now have a consistent 112×112 source-cell format, two directional views and six animation states (4 frames each, non-looping attack/cast/hurt/defeat). The three *legacy* bosses retain their previous source atlas layouts. State transitions are **visual only**. The authoritative boss AI, damage timing, signature effects, phases and card interactions are unchanged. No game RNG, saves or replay/version changes.

The original pixels are authored by code into cached RGBA sprite atlases at load time, not generated every rendered frame. The existing owner-approved illustration concept remains the target. This is an intermediate anatomical motion refinement, **not** completed hand-painted artwork or full final quality acceptance.

## Verification

- GRAFTBOUND npm test and the existing full Game Lab protected checks.
- Updated `/graftbound/dev/boss-motion-qa.html` loads all six actual runtime legendary sprite sheets and compares all six states, front/back views, nonempty and distinct RGBA frames, and atlas edge contact.
- Source regressions `v143`, `v145` and `v146` check visual pose determinism, anatomy, wing/web/flame and Goblin/Scarab casting motion, boss registry metadata and isolation from simulation.
- Smoke-test exact Cloudflare production SHA after successful PR merge.
- Physical mobile FPS and final owner visual comparison remain separate outstanding acceptance steps.

## Remaining boss artwork

All six legendary bosses now have basic advanced pose/defeat studies, but each still requires more hand-crafted high-resolution detail, anatomically richer animation, additional directions, longer sequences and source-to-battle visual comparisons. All three legacy bosses also still require their own finished premium art. This work must not be represented as full completion of the master art overhaul.

Only files inside `graftbound/**` change; the GRAFTBOUND rule fingerprint and challenge revision are not modified by this purely visual patch. Rollback by reverting this isolated art PR.
