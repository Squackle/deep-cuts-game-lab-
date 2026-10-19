# Stackbreaker Step 8 — Replacement and prevention training pack
**Owner:** requested Steps 8–10 together on 2026-10-19. **Scope:** Stackbreaker Game Lab prototype only; no website D1/auth scores here.

## Contents
- New standalone `/stackbreaker/replacements/` route with 24 version-pinned `rp-001`–`rp-024` public *practice only* cases across 12 board-state archetypes (A/B configurations). Four Copy/Retarget plus six Trigger/Ward prior validated cases mean **34 distinct advanced practice IDs**.
- Replacement/prevention effect model: initial damage event, order selected by the affected player or controller of an affected permanent; after every transformation recompute what still applies. Each effect can apply to the *same event* at most once; consumed prevention shield capacity is accounted for. Damage can instead be redirected by Pariah, so the destination/chooser/effect applicability may change.
- Cards illustrated: Furnace of Rath, Dictate of the Twin Gods (damage doubling), Healing Salve (3-point shield), Pariah (redirect damage that would hit enchanted creature's controller to enchanted creature). Only a subset of their real card behavior is modeled; no full enchantment/targeting engine is claimed.
- Every authored winning line and deliberate losing line must be verified via deterministic replay, plus affected controller choice and negative cases. The 250 Classic campaign IDs, preexisting version, stars, local Daily, mastery, cosmetics, other Lab game lanes, public website, scores and D1 are not changed.

## Grounded rules
Official [Wizards Comprehensive Rules](https://magic.wizards.com/en/rules) and Sept. 25, 2026 [TXT](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt), checked October 19:
- **614.1**, 614.5–614.6: replacements alter events and do not repeatedly replace the same event.
- **615.1–615.6**: prevention is a type of replacement effect; prevention shield amounts matter.
- **616.1 / 616.1a**: where several replacement/prevention effects modify the same event, affected player/affected object's controller decides sequence, then reconsider remaining applicable effects.
- **120.3–120.4**: damage events and life/creature damage assignment.
- Official card Oracle should remain authoritative for broader gameplay. These exercises use declared standalone shields and already-applied static effects rather than simulating their casting/enchantment setup.
- Forge was **not run** and no Forge GPL code imported.

## Release gates
- [ ] Unified Game Lab CI / Release coordination both green
- [ ] Exact-SHA Cloudflare preview and 390px/1280px interactive browser QA
- [ ] Isolated PR to Lab main, exact-SHA Cloudflare production success, live post-merge smoke
- [ ] Issue #96 Step 8 only if all checks pass
- Step 9 requires a **separate website integration PR** with source SHA; Step 10 requires actual authenticated security/replay tests and staged cross-site release verification. These are not satisfied just because Step 8 deploys.

**Rollback:** revert the isolated Step 8 PR after checking latest Lab main. Do not rewrite the Classic campaign or cross-game files. Never claim locally edited browser state as verified account proof.
