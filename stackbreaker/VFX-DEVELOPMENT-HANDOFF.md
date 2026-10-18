# Stackbreaker — Spell VFX development handoff

**Created:** 2026-10-17  
**Owner instruction:** "Just tell me how many steps you need and I'll tell you to progress through them ... have some file created so another chat can pickup if you time out."  
**Status:** **2 of 5 development steps implemented and tested**. Step 1 was deployed successfully at Game Lab commit `4d8bf71d9b638138bec1e339a6217dac61f77c4e`. Step 2 passed **489/489 tests** and Cloudflare preview at PR #90; production deployment SHA is recorded in [PR #90](https://github.com/Squackle/deep-cuts-game-lab-/pull/90). Browser Rendering for Step 2 was rate-limited (2001), so a fresh in-browser VFX pass is **not claimed**. **Next: Step 3 (Pyroblast fireball)**. The initial creation of this document was planning, not Step 1.  
**Next trigger:** When owner says "next", "step 1", "go ahead", etc., begin the **first unchecked step**; complete/test it and update this file before stopping. If owner asks to progress further, begin the following step.

## Five steps — owner only needs to say "next"

- [x] **Step 1 — Event bridge / animation layer.** Capture authentic resolved spell actions and original source/target positions before the UI removes stack items. Create a lightweight VFX controller that consumes deterministic event descriptors (e.g. {type, sourceStackId, targetId, outcome}) without altering Magic rules, scenario replay, undo, card visibility or save keys. Add unit tests of events and reduced-motion fallback. *No large showy effects needed in this step.*
- [x] **Step 2 — Lightning Bolt.** Crackling projectile/branched electrical arc travels from the resolving stack spell toward its actual creature or player target; impact flash and damage reaction after a successful resolution. Distinguish spell damage being prevented, target no longer valid and loss/win. Mobile positions and short (roughly 0.4–0.9 s) motion.
- [ ] **Step 3 — Pyroblast fireball.** Red fire/ember projectile from Pyroblast into its legal target; vary the endpoint effect based on the **actual** resolution: countering a blue spell on stack versus destroying a blue permanent. Do not claim either occurs if the spell fails to resolve. Reusable red spell VFX primitives. Verify Pyroblast is part of supported scenario/card data before promising a live trigger; if not, use an explicitly isolated VFX fixture and do not silently extend the rules engine.
- [ ] **Step 4 — Counter / fizzle dust.** On a successful counter action, targeted spell flickers, fractures, and dissolves into magical dust/embers before stack settles. Spell casting/resolution must remain rule-correct and the canceled item must never visually resolve a second time. Distinguish a countered spell from a spell that fails to resolve because all targets became illegal ("fizzle")—different rule events can share visual motifs but must be accurately labeled.
- [ ] **Step 5 — Polish, regression, and release.** Tune effect timing, overlap, reduced-motion, accessible announcements, no input-blocking, mobile scale, slow devices, undo/restart/rapid passes and stacked multi-spell effects. Run full unified Game Lab CI; Cloudflare preview and browser smoke if available; merge approved Stackbreaker-only PR and **verify the exact merged SHA in successful Game Lab production deployment**. Document QA gaps and rollback. **Public** Deep Cuts EDH website is a separate website-developer-owned promotion, never implicit.

## Verified code baseline / placement

Repository: `Squackle/deep-cuts-game-lab-` (trailing hyphen is part of repo name); standalone route https://deep-cuts-game-lab.pages.dev/stackbreaker/; Cloudflare Pages project `deep-cuts-game-lab` (no trailing hyphen). Initial baseline main SHA at planning time: `8848837298879fc30757828fcd0d048336a950ea` (refresh before coding; other game developers routinely merge). Current version has 250 Classic stages, a separate Final Turn prototype, official Scryfall art, and pure P/T presentation already released. Do not rewrite or remove them.

Ownership: Stackbreaker developer owns **only `stackbreaker/**`** in Git branches `game/stackbreaker-*`. Follow repo `AGENTS.md` and release coordination requirements. Never change other games, `lab/**`, production website repo `Squackle/deep-cuts-edh`, or user data. All source edits to `stackbreaker/src/**`, CSS, and HTML should be reflected in the standalone generated `stackbreaker/index.html`.

Known source architecture (verified when file was created):
- `stackbreaker/src/engine.js`: deterministic `pass(s0)` advances priority/stack and `resolve(s,item)` uses card `effect` fields. Cases include `damage` (Lightning Bolt-like), `counter`, `destroy`; `sbas(s)` performs state-based actions. Actual rules resolve synchronously.
- `stackbreaker/src/ui.js`: `stackCard(item,i)` generates `data-stack-target` DOM nodes; `shortCard(u)` creates `data-unit`; `applyPass()` currently calls `pushState(pass(game))` and `pushState` immediately calls `render()`. Thus spell source/target disappear on rerender: Step 1 MUST capture DOM rects and immutable effect data **before** applying/rerendering. Life targets use `player` and `opponent` and have DOM life widgets; inspect exact selector IDs in template before implementing.
- `stackbreaker/src/cards.js`: card effects and supported card catalog. Use the card's *actual resolved action/effect*, not purely its title, to pick animation. Check whether `Pyroblast` is currently in that catalog and in a playable scenario; if absent no cosmetic change should purport to add its rules.
- `stackbreaker/styles.css`, `observatory.css`, `design-tokens.css`, `template.html`, `src/ui.js`.
- `stackbreaker/build.py` generates deployable `stackbreaker/index.html` with inline concatenated CSS and JS; **regenerate and commit the bundle** after source/template/style changes. Include new JS files in build script in the correct dependency order when necessary, keeping `src/ui.js` as the app controller.
- Existing tests `stackbreaker/tests/*.test.mjs`; local `cd stackbreaker && npm test && python build.py && npm test`; shared repo-wide CI verifies other game regressions and coordination gates.
- Latest working game displays "current effective P/T" overlay and separate counter/boost badges. VFX must not obscure this or replace original card art.
- Image assets: prefer CSS/SVG/Canvas generated particles; no externally downloaded unlicensed game VFX required. Animation opt-out for `prefers-reduced-motion`; pointer-events:none on VFX layer.

## Correctness & UX contracts

1. **Rules first:** Keep deterministic game state and existing priority/stack rules authoritative; never delay legal resolution *in the engine* solely for animation. Visual animation can queue off a state-transition journal. No double-resolution, phantom targets, duplicate damage, wrong target or teleporting projectile after target removed.
2. **Origin/endpoint:** Use actual stack spell DOM rectangle and target DOM rectangle (creature, life, spell on stack), plus graceful fallback for an already removed target and scroll/resize changes. Multi-object and mobile clipping need browser coverage.
3. **Outcomes:** Distinguish damage dealt, damage prevented, successfully countered, uncounterable, and all-illegal-target nonresolution. Pyroblast has distinct counter or destroy modes.
4. **Accessibility:** reduced motion -> instant state and announcement; keyboard, touch and focus remain operable; VFX layer never blocks mouse/touch; skippable on undo/restart or rapid actions.
5. **Progress:** Original stage IDs, save key `dc-stackbreaker-progress-v3`, star scoring and Finale/Atlas unchanged. Separate `stackbreaker/final-turn/` prototype unchanged unless owner explicitly assigns.
6. **Tests:** Unit tests for emitted event correctness/outcome, visual controller cancellation, reduced-motion support, specific VFX availability, and full existing scenario suite. Browser preview at 390 and 1280 widths if service permits; if rate limited, report honestly. Record tested SHA and production SHA.


## Step 1 implementation details — for the next chat

- New `src/vfx-events.js` exports `describeSpellResolution(before,after)` (pure, effect/outcome journal), `captureSpellAnchors(document,event)` (source/target DOM centroids before rerender), and `createSpellVfxController(document,window)` (brief inert cancelable cue with reduced-motion opt-out).
- `src/ui.js` pass handler snapshots the authoritative resolution **after** engine `pass()` yet captures visual positions **before** `pushState()` rerenders; `pushState`, `undo`, and `changeCase` cancel pending visual cues. Exceptions from the visual layer cannot prevent rules-state update.
- `build.py` embeds `src/vfx-events.js` in `index.html`; `observatory.css` contains `.sb-vfx-layer` and `.sb-vfx-trace` animation (260ms). `tests/vfx-events.test.mjs` exercises damage, damage prevention, countering, uncounterable, invalid-target, target coordinates, cancellation, reduced motion, and bundled source.
- Preview Cloudflare browser at 390px and 1280px: cast/resolve Lightning Bolt scenario from live page; `effect=damage`, `outcome=damage-dealt`, one source→target trace, no horizontal page overflow and `pointer-events:none` verified. This is a placeholder golden trace only, **not** the promised Step 2 lightning animation.
- **Step 2 start point:** Replace/extend `createSpellVfxController.play(event,anchors)` based on `event.effect` and `event.outcome`; actual Lightning Bolt hits only for `outcome=damage-dealt`, and prevention/invalid-target must not show a damage impact. Do not edit the engine or release Step 3-5 early. Begin from latest main, preserve branch isolation and rerun full Game Lab CI.

## Step 2 implementation details — for the next chat

- Released source in PR #90: `src/vfx-events.js` now emits engine-verified `damageAmount` and `terminalStatus`; `lightningVisualMode(event)` maps only actual Lightning Bolt with damage to `impact`, `shield` (prevented), or `dissipate` (all targets illegal). Every other event, including countering Bolt before it resolves, keeps the original subtle bridge.
- `lightningGeometry(source,target,sourceStackId)` deterministically draws a jagged 11-segment main path with three branching forks from actual pre-rerender stack/target rectangles; never calls random generators or modifies the game.
- `createSpellVfxController.play()` renders SVG electricity, bright impact flash and floating actual damage amount for successfully dealt damage; prevented events show a cyan shield with no red hit or damage number; all-illegal-target events only dissipate at source (no projectile). Lethal status is preserved from engine.
- `observatory.css` contains lightning SVG flight/impact/shield/miss keyframes at 420–800ms; no external assets; pointer events disabled; `prefers-reduced-motion` opt-out. Tests in `tests/vfx-events.test.mjs`; standalone `index.html` rebuilt. Separate Final Turn prototype unchanged.
- CI: 489/489 passed on PR #90 head `34001e72a59169d3a46d327fed468bf7a6e323fb`, release coordination green; Cloudflare preview `696dee6a-6371-4af3-a46e-0e8fc7d959b8` successful. Cloudflare Browser Rendering rejected fresh check with 2001 Rate limit exceeded. Real-device visual inspection remains an explicit QA gap.
- Step 3 discovery: Neither `Pyroblast` nor `Red Elemental Blast` is in `stackbreaker/src/cards.js` today. Re-check latest card catalog/scenarios. A fixture-only standalone fireball renderer is permissible without new rules, but do not falsely claim playable Pyroblast until its legal counter/destroy behavior is supported in a separately verified scenario.
- Do not begin Step 4 (dust) or Step 5 (polish) without another explicit owner "next".

## Running checklist / resuming in another chat

1. Read **this file** at `stackbreaker/VFX-DEVELOPMENT-HANDOFF.md` on repo main and the last conversation instruction. Determine which of the five steps is next. Treat status labels and commit/PR notes below as canonical; do not mark a step complete based on a planned description.
2. Fetch latest main SHA and open PRs in both Lab and public site repos; check owner branch/lane conflicts; create `game/stackbreaker-<step>-<date>` branch from latest main.
3. Implement the next unchecked step, including source tests and rebuilt standalone index; test through unified CI, and use isolated Cloudflare preview. Owner said they can push progress one step at a time: do not start later steps unless authorized.
4. Once accepted/deployed to Game Lab, update this file on the appropriate branch/PR: tick the checkbox, add commit/PR/deployment/test evidence in the **Progress log**, then merge document changes. Keep it available in main for future chats.
5. If session times out mid-step, commit implementation to feature branch when safe, immediately update this file with branch name, files modified, what remains, QA status and blockers; do not claim deployment until confirmed. Do not silently merge work-in-progress.

## Progress log

| Date | Step | Status | Branch / PR / deployment | Tests and notes |
|---|---|---|---|---|
| 2026-10-17 | Planning | COMPLETE | `game/stackbreaker-vfx-handoff-20261017` | This document only; no VFX code or game deployment yet |
| 2026-10-17 | Step 1 | IMPLEMENTED & TESTED; production commit confirmation via PR #89 | `game/stackbreaker-vfx-event-bridge-s1-20261017` / [PR #89](https://github.com/Squackle/deep-cuts-game-lab-/pull/89) | 481/481 unified CI tests passed, release coordination success; Cloudflare preview `e0e69799-55e2-4fc1-be46-e25b0ceeb828` success; 390×844 and 1280×800 live browser pass detected Lightning Bolt resolution, source/target trace, `pointer-events:none`, no horizontal overflow. No engine/card/scenario/save changes. |
| 2026-10-17 | Step 2 | IMPLEMENTED & TESTED; production confirmation at PR #90 | `game/stackbreaker-vfx-lightning-step2-20261017` / [PR #90](https://github.com/Squackle/deep-cuts-game-lab-/pull/90) | 489/489 unified CI, release-coordination success; Cloudflare preview `696dee6a-6371-4af3-a46e-0e8fc7d959b8` success; new regression fixtures verify 800ms branching geometry, impact and `−3` from real game-state damage, prevention shield, missing-target dissipation, lethal outcome, cancellation and reduced-motion. Fresh browser test hit Cloudflare Browser Rendering rate limit 2001; do not claim mobile/desktop VFX verified. No rules, saves, or stage changes. |
| — | Step 3 | NOT STARTED | — | — |
| — | Step 4 | NOT STARTED | — | — |
| — | Step 5 | NOT STARTED | — | — |

**Developer note:** These are five **owner-driven development checkpoints**, not guaranteed fixed-hour estimates. The assistant can tell owner only the current step number and completed state unless details are requested. The handoff is intentionally comprehensive so a new chat can resume without relying on past context.
