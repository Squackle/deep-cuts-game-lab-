# Mana Heist — Borrowed Colors (Game Lab)

**2026-10-19 | Game Lab only | Two additive Learn Mana lessons.**

## Scope

Adds **Fellwar Stone** and **Talisman of Dominance** as playable, tap-activated mana artifacts and teaches them in unscored lessons **27 and 28**, respectively. No changes to the 500 scored vault boards, stage IDs, existing lessons 1–26, unlocks, score or guest-progress keys, Hive Run, Stackbreaker, D1, profiles or the public Deep Cuts website.

- **Fellwar Stone**: Tap for one of the *colors* an opponent's land could produce. The solo scenario explicitly supplies a frozen list, `opponentLandColors`, for a hypothetical opponent; the game does not simulate an opponent, lands changing abilities, replacements or a stack. Valid choices exclude colorless, even when an opponent's land could produce colorless. The card cannot invent colors. For these lessons, it may be tapped only if an available color makes a legal output. The real card can be tapped even if it produces no mana; that no-value case is not a required puzzle action.
- **Talisman of Dominance**: Tap for one colorless mana without damage, or blue/black with 1 unprevented damage to the player. The solo engine deducts one life immediately for damage and rejects a choice that would leave the player at zero life; it does not model damage replacement/prevention, triggers or losing the game from a lethal activation. Lesson 28 starts at **2 life** and requires the black-damage mode.

## Review basis

Official-text/rules audit reference: Wizards Gatherer Oracle and Comprehensive Rules (priority), with cross-checks from current printings and rulings:
- Fellwar Stone: https://scryfall.com/search?q=%21%22Fellwar+Stone%22 (notably ruling that it cannot produce colorless);
- Talisman of Dominance: https://scryfall.com/search?q=%21%22Talisman+of+Dominance%22 (colorless mode versus colored mode dealing 1 damage);
- Wizards rules: https://magic.wizards.com/en/rules

Real card images continue loading from Scryfall **for the experimental Game Lab only**. This does not clear the existing P01 legal/IP gate, nor authorize production-site promotion.

## Test and compatibility plan

- `node --test mana-heist/tests/*.test.mjs`; no replaced/disabled checks.
- New `opponent-mana-lessons.test.mjs`: exact Fellwar palette/no colorless/no imaginary colors; Talisman colored damage/zero-damage colorless/nonlethal Lab safeguard; game state and solver-replay paths; save keys and prior 500-board IDs.
- `sage-ritual-lessons.test.mjs`: all **28** lessons and coaching text present, original 18 unchanged and both new additions solver-certified.
- `two-paths-open-vaults.test.mjs`: all 500 vaults still open, static first-load count matches 28; prior persisted lesson achievements retain index identity.
- Cloudflare Pages preview and (after owner-approved scoped release) production should show 28 lessons and correct per-puzzle opponent mana summary on mobile. Actual physical iPhone/Android use remains an independent acceptance gate.

## Limits and next steps

The broad Scryfall Oracle bulk candidate **export has not been executed or reviewed**; merely discovering cards cannot make all Magic cards playable. These two deliberately limited artifact abilities are not a complete rules engine. Future Mana Heist content revisions should incorporate new mechanics into scored puzzles only with rules-certified replays, distinct revisioned results and an explicit old-medal migration decision.

## Rollback

Revert the PR introducing these additive lessons and deploy the prior Game Lab SHA. The 500 stage maps and existing `dc-mana-heist-landfall-v2`, `dc-mana-heist-variety-v1` and `dc-mana-heist-learn-v1` storage records remain intact; learned completion indices 26 and 27, if present, become inert until this change is restored. No database migration.
