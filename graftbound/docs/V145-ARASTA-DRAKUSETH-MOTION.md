# GRAFTBOUND v1.4.5 — Arasta and Drakuseth articulated legendary motion

## Code implemented

Continues the premium HD-2D battle art improvement while respecting the approved creature identities and the existing one-tile game rules.

- **Arasta of the Endless Web**: the actual eight spider legs are animated with opposing gait offsets, independent knees and grounded tips; abdomen pulses, head lunges, web strands tense during attack/cast, and a distinct nonlooping collapse replaces the reused hurt-only defeat.
- **Drakuseth, Maw of Flames**: shoulder-rooted wings change their sweep in walk/attack/cast; tail segments flex; the head and neck advance, jaws open during fire breath, flame lobes bloom within the source frame, and the wings sag as the dragon is defeated.

Both now have the same 112×112 source-cell format, two directional views and six animation states (4 frames each, non-looping attack/cast/hurt/defeat) as the previously upgraded Nemata and Toxrill. State transitions are **visual only**. The authoritative boss AI, damage timing, signature effects, phases and card interactions are unchanged. No game RNG, saves or replay/version changes.

The original pixels are authored by code into cached RGBA sprite atlases at load time, not generated every rendered frame. The existing owner-approved illustration concept remains the target. This is an intermediate anatomical motion refinement, **not** completed hand-painted artwork or full final quality acceptance.

## Verification

- GRAFTBOUND npm test and the existing full Game Lab protected checks.
- Updated `/graftbound/dev/boss-motion-qa.html` loads the four actual runtime sprite sheets and compares all six states, front/back views, nonempty and distinct RGBA frames, and atlas edge contact.
- Source regressions `v143` and `v145` check visual pose determinism, anatomy, wing/web/flame motion, boss registry metadata and isolation from simulation.
- Smoke-test exact Cloudflare production SHA after successful PR merge.
- Physical mobile FPS and final owner visual comparison remain separate outstanding acceptance steps.

## Remaining boss artwork

Krenko and The Scarab God still need their own advanced pose/defeat pass. All six, including these four, still require more hand-crafted high-resolution details, additional viewing directions, longer animation sequences and source-to-battle visual comparisons. This work must not be represented as full completion of the master art overhaul.

Only files inside `graftbound/**` change; the GRAFTBOUND rule fingerprint and challenge revision are not modified by this purely visual patch. Rollback by reverting this isolated art PR.
