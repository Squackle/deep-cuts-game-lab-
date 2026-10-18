# Stackbreaker — Spell VFX development handoff

**Created:** 2026-10-17  
**Owner instruction:** "Just tell me how many steps you need and I'll tell you to progress through them ... have some file created so another chat can pickup if you time out."  
**Status:** PLANNED; **0 of 5 implementation steps completed**. The creation of this document is preparation, **not Step 1**.  
**Next trigger:** When owner says "next", "step 1", "go ahead", etc., begin the **first unchecked step**; complete/test it and update this file before stopping. If owner asks to progress further, begin the following step.

## Five steps — owner only needs to say "next"

- [ ] **Step 1 — Event bridge / animation layer.** Capture authentic resolved spell actions and original source/target positions before the UI removes stack items. Create a lightweight VFX controller that consumes deterministic event descriptors (e.g. {type, sourceStackId, targetId, outcome}) without altering Magic rules, scenario replay, undo, card visibility or save keys. Add unit tests of events and reduced-motion fallback. *No large showy effects needed in this step.*
- [ ] **Step 2 — Lightning Bolt.** Crackling projectile/branched electrical arc travels from the resolving stack spell toward its actual creature or player target; impact flash and damage reaction after a successful resolution. Distinguish spell damage being prevented, target no longer valid and loss/win. Mobile positions and short (roughly 0.4–0.9 s) motion.
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
| — | Step 1 | NOT STARTED | — | — |
| — | Step 2 | NOT STARTED | — | — |
| — | Step 3 | NOT STARTED | — | — |
| — | Step 4 | NOT STARTED | — | — |
| — | Step 5 | NOT STARTED | — | — |

**Developer note:** These are five **owner-driven development checkpoints**, not guaranteed fixed-hour estimates. The assistant can tell owner only the current step number and completed state unless details are requested. The handoff is intentionally comprehensive so a new chat can resume without relying on past context.
