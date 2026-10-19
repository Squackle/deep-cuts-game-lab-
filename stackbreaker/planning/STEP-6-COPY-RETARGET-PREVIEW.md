# Stackbreaker — Copy & Retarget (Step 6 Preview)

**Date:** October 19, 2026  
**Owner instruction:** "continue with step 6 on stackbreaker, your my new stackbreaker dev"  
**Tracking:** [10-step Stackbreaker roadmap #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96)  
**Scope:** Game Lab repository **stackbreaker/** ONLY. No production Deep Cuts EDH account/site/leaderboard, no D1 writes, no other games.

## Current dependency / honest milestone status

The official issue still records **Steps 1–4 complete, Step 5 not started** at branch creation. Step 6 depends on typed advanced stack objects. This isolated preview builds the *minimum* typed objects and mode/target validation needed to investigate Step 6 without changing the Classic 0.3 resolver. **Do not check Step 5 or Step 6 complete solely from this PR.** Full Step 5 serialization/priority/replay compatibility, and integration of advanced cases into the regular Stackbreaker campaign, need separate review and acceptance. The owner's Step 6 request authorizes a bounded Game Lab prototype, **not** public website deployment.

## Implemented experiment

- `src/advanced-stack.js`: independent `sb-mtg-training-0.4.0-preview` response-window reducer; typed `spell|copy` entries, mode/target arrays, controlled original/copy objects, basic mana payment, atomic target validation, deterministic semantic events, bounded replay, a read-only single-target Classic projection.
- **Twincast**: copies a targeted instant/sorcery **on resolution**, with new targets chosen for the resulting copy; copies modes, X/cast-time choices without recasting or paying the original spell's cost; the original stays on stack and keeps its targets.
- **Redirect**: chooses new targets for the original spell at resolution; changed targets must be legal **for the original spell's controller**, original mode stays unchanged. Target sets are evaluated as a whole so legal Arc Trail swaps work, while duplicate target IDs fail.
- **Counterspell**: the prototype allows countering a spell copy on the stack, without moving a nonexistent physical copied card to another zone.
- **Fizzle:** when every target becomes illegal, emit `spell.fizzled`, not `spell.resolved` or any `spell.cast` event.
- Four *authored and isolated* `sa-001..sa-004` practice lessons in `data/advanced-scenarios.json`: redirected Lightning Bolt, Twincast lethal Bolt, two-target Arc Trail, and modal Abrade copy vs. Sol Ring and Arcane Signet. They do **not** modify the 250 existing `sb-/sg-` case IDs.
- **Game Lab preview route:** `/stackbreaker/advanced/`, with a responsive keyboard-usable decision board, mana/life, existing stack, optional copy/retarget choices, spell-art fallback, log, case selection and restart. **No achievements, score persistence, accounts or gameplay modifiers**.
- Source tests: deterministic legal and no-answer lines, copy ordering/isCast semantics, modal lock, multi-target final-set legality, hexproof/controller rules, atomic invalid choices, replay, Classic rule-version and compatibility projection.

## Official rules and card references

Checked the current [Wizards Comprehensive Rules](https://magic.wizards.com/en/rules) effective **September 25, 2026**:
- **115.7d–e**: when choosing new targets, unchanged choices may remain; changes must be legal, and the whole final target set is evaluated.
- **601.2**: targets and modes are casting-time choices.
- **608.2b**: resolution with all targets illegal.
- **707.2, 707.10 and 707.10c**: copied spells inherit choices but are not cast, and optional new targets are chosen for copies.
- Card records: [Twincast](https://scryfall.com/search?q=%21%22Twincast%22), [Redirect](https://scryfall.com/search?q=%21%22Redirect%22) (**UU**, not 3U), [Arc Trail](https://scryfall.com/search?q=%21%22Arc+Trail%22), [Abrade](https://scryfall.com/search?q=%21%22Abrade%22), and [Lightning Bolt](https://scryfall.com/search?q=%21%22Lightning+Bolt%22). The modal Abrade example preserves the "destroy artifact" mode; it does not choose a new "deal 3 to creature" mode on copy.
- **Forge:** not executed or integrated. All new resolution behavior is independently authored.

## Explicit non-goals and limitations

- Existing **Classic 0.3** engine, bundle, `build.py`, `dc-stackbreaker-progress-v3`, original 250 level IDs/stars, daily guest attempts, mastery local ledger, cosmetic equipped preferences, other games, and public website are not modified.
- This is **not** full Magic timing, paid cost choice windows, triggers, ward, replacement/prevention, APNAP, multiplayer, or all card/planeswalker types. It uses a two-player scripted opponent pass model and a small explicit real-card subset. For these cases, available mana is shown as a response-window snapshot (not a simulation of drawing/playing/tapping lands).
- Copies of permanents, on-stack ability copying, target changes to the spell currently resolving, X-cost casts, combat, full modal card catalog, general multi-target card clauses and all Magic edge cases still need expansion.
- Lab JSON includes authored solutions: *do not use these preview cases as secret daily competitive puzzles*. No validated server scores or verified achievements come from this preview.
- Scryfall images are best-effort, display-only external requests; rendering must work if Scryfall declines them.

## QA and release requirements

Run the full existing Game Lab tests plus `node --test stackbreaker/tests/advanced-copy-retarget.test.mjs` and check 390px mobile/1280px desktop interactions. Confirm successful CI, preview SHA, and actual browser path before claiming verified preview. No auto-merge, no public site promotion, and no milestone checkmark without explicit test evidence. Revert this isolated PR if tests fail or rules are disputed.

**Follow-on:** complete the broader Step 5 typed priority/serialization foundation, then review Step 6 integration against it before marking milestones and only then proceed to Step 7 triggers/ward.
