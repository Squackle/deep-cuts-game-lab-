# Step 7 — Triggered Abilities, Ward and APNAP
**2026-10-19 | Owner request: "deploy next step" | Tracking:** [Game Lab Stackbreaker roadmap #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96)

## Scope and canonical boundaries
- **Authorized**: Stackbreaker Step 7 **in isolated Game Lab only**. This is NOT the public Deep Cuts EDH website, not a full Commander simulator and not an authenticated reward system.
- **New engine:** `stackbreaker/src/trigger-ward.js` uses Step 5's `advanced-foundation.js` typed `spell`/`trigger` stack entries, priority pass window, replay envelope and bounded deterministic state. Distinct from the still-working Step 6 `advanced-stack.js` copy/retarget scenarios. Classic 0.3 untouched.
- **New authored cases:** `stackbreaker/data/ward-scenarios.json`, six isolated `tw-001..tw-006` lessons with replayable solutions and negative routes. These are PUBLIC practice scenarios and **must not be treated as secret competitive dailies**.
- **UI:** `/stackbreaker/ward/` supports touchscreen and keyboard selected targets, optional ward payment, an explicit upkeep trigger action, live priority stack/effects and accessible status feedback. No localStorage, account or D1 use. Step 6's Copy & Retarget route links to the new lesson; no Classic runtime modification.

## Grounded Magic Rules, 2026-10-19
Official source: [Wizards Comprehensive Rules](https://magic.wizards.com/en/rules), published [Sept 25, 2026 TXT](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt); [Oct 19, 2026 update bulletin](https://magic.wizards.com/en/news/announcements/mystery-booster-commander-edition-update-bulletin) reviewed. **Rules 603.1–603.7** (triggering, placing on stack and special `if` conditions), **117.3–117.5** (priority passes), **702.21a–b** (ward), **608.2**, **704** (SBA), **113.7a** (source leaves trigger). Official [Strixhaven ward release notes](https://magic.wizards.com/en/news/feature/strixhaven-school-mages-and-commander-2021-edition-release-notes-2021-04-16) confirm ward {2} on real `Waterfall Aerialist` and that ward counters rather than forbids targeting.
- **Ward is a triggered ability**, **not hexproof**. It triggers once when an opponent's controlled spell first targets the ward permanent, then is stacked above the spell. When it resolves, the **targeted spell's controller** pays or that spell is countered. The ward ability itself does NOT target its protected spell (the ability merely refers to it). Changing/losing the ward source does not erase the already-stacked trigger; source LKI is snapshotted. `Stifle` (U) can counter the triggered ability, but `Counterspell` would not.
- **APNAP**: active player's simultaneous triggered abilities stacked first, nonactive next, nonactive resolve first. Within each owner's group, an explicitly supplied ordering is validated, otherwise deterministic source order serves as the training case's default; we DO NOT imply no owner ordering exists in actual Magic.
- **Intervening-if**: actual `Test of Endurance` checks 50+ life at upkeep trigger time and again on resolution. Changing life in between may remove its effect without countering the trigger.
- Real-card mini-subset: `Lightning Bolt` (R), `Shock` (R), `Stifle` (U), `Diabolic Edict` (1B, target player sacrifice a creature), `Raise the Alarm` (1W create 2 1/1 Soldier creature tokens), `Soul Warden`, `Impact Tremors`, `Test of Endurance`, `Waterfall Aerialist`. Small teaching subsets, **not generalized Oracle/card interaction parsing**.
- Forge: **not run**, and no GPL source imported. Wizards rules remain authoritative.

## Six case definitions
1. **tw-001 — Pay the Toll:** player casts Bolt targeting opposing Waterfall Aerialist; ward goes on top. Paying {2} at resolution preserves Bolt and kills the 3/1 flyer (2 life? Aerialist 3/1).
2. **tw-002 — Stifle the Ward:** player has insufficient mana for ward but counters the ward *triggered ability* with Stifle, then Bolt resolves.
3. **tw-003 — Ward Is Not Hexproof:** pre-existing opponent Bolt targeting player's own Waterfall; player-controlled ward trigger counters it when scripted opponent doesn't pay.
4. **tw-004 — The Ward Remains:** Diabolic Edict makes opponent sacrifice the *only* creature (Waterfall Aerialist) after ward already triggered, but the trigger still counters the original Bolt.
5. **tw-005 — APNAP on the Stack:** Raise the Alarm enters two tokens with Soul Warden on both teams plus your Impact Tremors; deterministic six triggers are stacked by controller/active-player order; ability owners can order their own triggers in the engine.
6. **tw-006 — The If Check Happens Twice:** your Test of Endurance triggers at your upkeep only if 50+ life, checks again when resolving.

## Test and release checklist
- [x] New bounded pure deterministic engine, separate route, 6 authored cases and comprehensive node tests added.
- [ ] Unified **GitHub CI** and **Release Coordination** at final branch SHA, including all 250 Classic case checks.
- [ ] **Cloudflare preview** exact SHA, browser mobile **390px** and desktop **1280px** real actions; no unperformed hardware/mobile screenshots claimed.
- [ ] **Merge to Game Lab main and exact-SHA Cloudflare production deployment**, then post-release smoke of live route.
- [ ] Tick roadmap **Step 7** only after tests and deployment evidence; no automatic start of Step 8.

### Limitations and safety
This intentionally constrained **two-player, scripted always-pass opponent** model does not include every game phase, spell, combat, every source of ward, ward-by-discard costs, general alternative costs, Commander multiplayer, all priority timings or complete state-based action sequencing. `Diabolic Edict` only simulates an opponent with *exactly one sacrificial creature* in its curated case; generalized sacrifice choice is outside this prototype. Trigger ordering by one controller can be supplied to the engine, while the UI displays deterministic default ordering (not a universal owner-priority GUI). Copy/retarget semantics remain Step 6's own engine and continue to work unchanged; Step 8 replacement/prevention integration is future work.

Rollback: revert only the Step 7 GitHub PR and restore the previously deployed Game Lab SHA; avoid overwriting unrelated Mana Heist/Hive Run merges. No existing browser storage versions or 250 Classic IDs are modified.
