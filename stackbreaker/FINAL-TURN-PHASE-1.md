# Stackbreaker 2.0 · Final Turn — Development Phase 1 (Game-State Lifecycle)

**Owner authorization:** "deploy phase 1" on 2026-10-16, referring to the immediately preceding *Stackbreaker 2.0 Development Roadmap*. This implements **Phase 1: game-state lifecycle**, not Phase 2 action architecture, Phase 3 combat or a complete MTG simulator.

## Play now
- Experimental drill: `/stackbreaker/final-turn/` on the Game Lab domain.
- Original Stackbreaker: `/stackbreaker/` remains intact, with a link to the separate drill beneath the Classic game.
- Scenario `final-turn-001` **From the Brink**: opponent has already cast a lethal Lightning Bolt targeting you during their end step. Tap two Islands, cast Counterspell on the Bolt, and resolve it. The game continues, then you pass into your own upkeep, draw and precombat main. Tap Mountain and cast Lava Spike at the opponent for lethal. You win only when their life total reaches 0.
- Opponent uses strictly `alwaysPass` behavior, not AI.
- Current Phase 1 supports only Counterspell, Lightning Bolt, Lava Spike, basic Island and Mountain mana, phase/step progression with neutral no-creature combat, state-based player life termination, ending-step mana expiration, automatic untap, draw and standard sorcery timing.
- Card art is retrieved from Scryfall when available. No full Magic card parser or other Scryfall metadata-to-rules injection occurs.
- The own-turn deadline is a **scenario challenge condition** (`failed`), not a claim the Magic Comprehensive Rules declare a game loss after an ordinary turn.
- Real combat, complex targets, zones/triggered effects, hidden information, live opponent strategy, mulligans, Commander multiplayer and general land-playing are not supported. They are later phases.

## Code isolation
- `src/final-turn-engine.js`: deterministic, pure state transforms with explicit scenario schema. Classic `src/engine.js`, `src/ui.js`, card catalog, and all 250 stage sources untouched.
- `final-turn/index.html`, `final-turn/drill.css`, `final-turn/app.js`: standalone Game Lab drill. Root Cloudflare Pages project deploys these as static assets without a build command.
- Original `template.html` and its generated `index.html` gain only an optional navigation link to the separate drill, with Classic rendering/behavior untouched.
- Original local progress `dc-stackbreaker-progress-v3`, selected stage and stars untouched; experimental drill stores its own `dc-stackbreaker-final-turn-v1` completion key.
- No changes to `lab/**`, Hive Run, Mana Heist or the production Deep Cuts EDH site.

## Rules reference and limits
Rules baseline: Wizards of the Coast Magic Comprehensive Rules (published June 19, 2026; plus September 21, 2026 Reality Fracture update bulletin), accessed October 16, 2026. Relevant rules are 117 (priority), 106.4 / 500.5 (mana pool empties at end of steps and phases), 500.1–500.3 (turn structure / stack emptiness is not phase end by itself), 502 (untap), 504 (draw), 601 (casting), 608 (resolving), 704 (state-based actions) and 307 (sorceries). The implementation is deliberately limited and does NOT claim comprehensive accuracy for unsupported card interactions or combat. Oracle wording for Lava Spike confirmed against card catalogs showing "deals 3 damage to target player or planeswalker"; no planeswalker exists in this drill.

## Acceptance
- Unit tests: an unanswered Bolt loses, unsupported scenarios rejected, mana color rules, invalid target, sorcery timing, countering, continuing after stack empty, mana emptying, untap, draw, and lethal win.
- Classic full 250-scenario test suite remains green.
- Source/browser test: open the drill at mobile/desktop width, tap Islands, cast Counterspell, resolve; advance to the next main phase; tap Mountain; cast Lava Spike and resolve to victory. Verify no app-console errors or page-breaking overflow.
- Review and release coordination, exact-SHA Cloudflare preview/production and standalone path are required to call it deployed.

## Rollback
Revert the Stackbreaker-only Phase 1 PR. No Classic save migration or shared Lab update is necessary.
