# Stackbreaker · The Arcane Observatory — Phase 1 Foundation

**Scope:** Game Lab only, `stackbreaker/**`. This is a source/architecture preparation release, **not** the full tabletop redesign. Visual appearance should remain equivalent to Stackbreaker 1.4. No rules version bump.

## Baseline audit (2026-10-16)

- Standalone `index.html` is the deployable generated artifact. Source is `template.html`, `styles.css`, `src/**`, and `data/**`; `python build.py` must regenerate it.
- Existing visual CSS was a ~45 KB single stylesheet including 45 `!important` overrides and 32 `@media` rules at audit. Repeated overrides in later sections are technical debt; deleting them blindly will break mobile cards/scrolling.
- The actual play page uses an opponent/player battlefield, stack, land row, a scrollable seven-card hand, mission HUD, controls, and a galaxy map dialog. All original DOM IDs remain.
- The generated file embeds the complete style and script so the root Cloudflare Pages project requires **no build command**. It must remain self-contained.
- No reliable physical-device screenshot or assistive-technology audit is claimed by this source-level change.

## Foundation contract

1. `design-tokens.css` owns legacy `:root` palette/layout settings **unchanged** and defines new `--sb-*` semantics for later phases. The existing style sheet consumes initial tokens for focus, mast, mission gradient and widgets at exactly the same values.
2. `styles.css` retains current component and 32 responsive media rules. Phase 2 may move sections to component files only with screenshot comparison and style-order audit; avoid cascaded `!important` regressions.
3. `template.html` loads tokens first, then component CSS. `build.py` concatenates the same order into `index.html`. The new regression test enforces exact bundled source parity.
4. Responsive acceptance widths for upcoming UI work: 320, 375, 390, 600, 768, 1024 and 1440 CSS pixels; landscape phone and short viewport must also work. Prefer in-game card legibility and a one-screen table over cosmetic decorations.
5. Reduced-motion support is required for any new hover, lift, spell-stack or transition effects; existing reduced-motion CSS is preserved. Original functional keyboard controls, focus rings, Scryfall inspection and alternate selection paths are mandatory.
6. Stage identifiers, all 250 puzzles, `dc-stackbreaker-progress-v3`, `dc-stackbreaker-last-level`, cards, rules, scores and stars must remain unchanged.

## Visual architecture for subsequent phases

- **Phase 2:** Recompose the magical playing surface, integrate life/mana HUD, stack and physical hand; introduce actual `--sb-*` component styles without reworking rules.
- **Phase 3:** Card hover/drag/target/stack-resolution choreography; animation cannot alter action legality or timing.
- **Phase 4:** Opt-in sound, concise magical feedback and victory recaps; obey reduced-motion and mute.
- **Phase 5:** Cosmic atlas for five galaxies, twenty-five worlds, 250 existing stage IDs, with no save migration.
- **Phase 6:** Multi-browser/mobile UX, accessibility, performance, full regression and release QA.

## Phase 1 verification

Run `cd stackbreaker && npm test && python build.py && npm test` and confirm a clean `git diff --exit-code -- stackbreaker/index.html` after the build. Source-only regression test checks palette, CSS bundle, fixed DOM/drop zones, reduced-motion support and progress keys. The shared Game Lab CI must pass before merge; verify the actual Cloudflare Pages deployment SHA after merge. Browser checks against an actual deployed URL remain necessary; they are not implied by tests passing.

## Rollback

Revert only this Stackbreaker PR. It changes no `src/**` game reducer/controller, `data/**`, user progression, other game directories, D1, or public main-site assets.
