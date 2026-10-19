# Stackbreaker — Copy & Retarget (Step 6 Preview)

**Date:** October 19, 2026  
**Owner instruction:** "continue with step 6 on stackbreaker, your my new stackbreaker dev"  
**Tracking:** [10-step Stackbreaker roadmap #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96)  
**Scope:** Game Lab repository **stackbreaker/** ONLY. No production Deep Cuts EDH account/site/leaderboard, no D1 writes, no other games.

## Step 5 dependency resolved / Step 6 integrated

Step 5 [PR #111](https://github.com/Squackle/deep-cuts-game-lab-/pull/111) merged into Game Lab main as `20508953dd56929e18d3039e8d1c26da88ba5191`. It introduced `src/advanced-foundation.js` with canonical typed spell/ability/trigger/copy entries, modal and multi-target validation, two-player priority, and deterministic serialization. This Step 6 preview now **imports and uses** that actual shared foundation rather than acting as a parallel ad-hoc priority engine. It still makes no edits to the 250 Classic puzzle engine.

Owner on 2026-10-19 explicitly requested **"deploy next step"** (Step 6 only). This is Game Lab authorization, not public Deep Cuts EDH website or D1/verified-score authorization. Do not mark Step 7 started or Step 9 authorized.

## Implemented experiment

- `src/advanced-stack.js`: `sb-mtg-training-0.4.0-preview` response-window reducer integrated with Step 5 `advanced-foundation.js` typed entries, modal/target-slot rules, canonical priority window and serialized replay. The game maintains its own effect/state model while the foundation governs casting priority and two-pass top-of-stack selection; the opponent's `alwaysPass` policy is explicit and deterministic. Spell copies are not casts; copy source remains in semantic events. Classic `targetId` remains a compatibility projection.
- **Twincast**: copies a targeted instant/sorcery **on resolution**, with new targets chosen for the resulting copy; copies modes, X/cast-time choices without recasting or paying the original spell's cost; the original stays on stack and keeps its targets.
- **Redirect**: chooses new targets for the original spell at resolution; changed targets must be legal **for the original spell's controller**, original mode stays unchanged. Target sets are evaluated as a whole so legal Arc Trail swaps work, while duplicate target IDs fail.
- **Counterspell**: the prototype allows countering a spell copy on the stack, without moving a nonexistent physical copied card to another zone.
- **Fizzle:** when every target becomes illegal, emit `spell.fizzled`, not `spell.resolved` or any `spell.cast` event.
- Four *authored and isolated* `sa-001..sa-004` practice lessons in `data/advanced-scenarios.json`: redirected Lightning Bolt, Twincast lethal Bolt, two-target Arc Trail, and modal Abrade copy vs. Sol Ring and Arcane Signet. They do **not** modify the 250 existing `sb-/sg-` case IDs.
- **Game Lab preview route:** `/stackbreaker/advanced/`, with a responsive keyboard-usable decision board, mana/life, existing stack, optional copy/retarget choices, spell-art fallback, log, case selection and restart. **No achievements, score persistence, accounts or gameplay modifiers**.
- Source tests: deterministic legal/no-answer lines, copy ordering/isCast semantics, mode locking, Arc Trail final-set legality, hexproof/controller rules, atomic invalid choices, current Step 5 priority snapshots and two-pass windows, deterministic replay, live browser module compilation, Classic rule-version and compatibility projection.

## Official rules and card references

Checked the current [Wizards Comprehensive Rules](https://magic.wizards.com/en/rules) effective **September 25, 2026** and Wizards' [October 19, 2026 update bulletin](https://magic.wizards.com/en/news/announcements/mystery-booster-commander-edition-update-bulletin): the bulletin announces unrelated copy/target-rule changes (none to 115.7 or 707.10), although it updates 608.2g about casting spells during resolution. This preview does not implement casting spells during another spell's resolution. Exact published official TXT remains effective September 25 at this time:
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

Run the full existing Game Lab tests plus `node --test stackbreaker/tests/advanced-copy-retarget.test.mjs`, compile-check browser modules and inspect mobile/desktop browser output where provider capacity permits. Confirm successful CI, preview SHA, and actual browser path before claiming verified preview. Only merge after both required GitHub checks are green, exact-SHA Cloudflare preview succeeds and no conflicting newer main changes exist. Do not promote the public website or claim verified account scores. If Cloudflare Browser Rendering returns 429/timeout, explicitly record visual QA as limited rather than claiming a completed interactive session. Revert this isolated PR if tests fail or rules are disputed.

**Follow-on:** after verified Step 6 Game Lab release, await owner's next authorization for Step 7 triggers/ward. No additional Stackbreaker workstream or website changes are implied.
