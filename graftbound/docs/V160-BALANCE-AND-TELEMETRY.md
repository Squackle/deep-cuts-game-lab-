# GRAFTBOUND v1.6.0 — Adaptive difficulty findings and opt-in balance telemetry design

Status: **design only. Nothing in this document is active.** No data leaves the browser in v1.6.0.

## 1. What the owner's completed run showed

"The Last Page Turns" (local, unranked, v1.5.0): Threat 11/12 at the end, 17 battles, 110 actions vs 114 par,
36 recorded damage against 290 reference, 6/17 flawless encounters, and **Toxrill (final boss) won with 0 damage**.

Diagnosis from the v1.5.0 code and simulations:

| Finding | Evidence |
|---|---|
| Threat rose correctly, but high threat only added **durability** (wards) and ordinary-fight reinforcements. | `threatModifiers`: wards + `reinforcement: boss ? 0 : …` |
| **Bosses never received reinforcements** at any threat, so a dominant build met the same boss at Threat 11 as at Threat 0 (plus a ward). | Same line. |
| No telegraphed pressure scaled with threat: a strong build could end fights before any foe acted meaningfully. | Owner's 2–4 turn wins at 0 damage. |
| Bosses defeated without damage were not treated as a stronger dominance signal than ordinary flawless wins. | `settleWorldThreat` ignored node type. |

## 2. What v1.6.0 changes (rules fingerprint `graftbound-rules-1.6.0-beta`, challenge revision 25)

All changes are deterministic, bounded and telegraphed. No hidden HP multipliers.

* **Threat Surge** (`threatTactics`, `surgeAfterAct`): from Threat 6 for elites/bosses (Threat 9 for every fight) the
  strongest foe marks a cross on the hero's tile, shown as an intent, and it resolves on that foe's next action. It deals
  10–20 % of the hero's maximum health and can be dodged by moving or reduced by Guard. Never on turn 1. Every 3 turns
  (every 2 from Threat 10).
* **Boss escorts**: Threat 8 adds 1 build-countering escort to bosses, Threat 11 adds 2.
* **Ambush placement**: after a dominant streak, up to 2 foes start on the flanks (never adjacent to the hero).
* **Settlement**: a boss won without enemy damage adds +1. One battle raises threat by at most +3. Heavy damage
  (≥ 50 % of maximum health) lowers it by 2, and serious damage (≥ 20 %) by 1.
* Ward ramp reaches full strength at Threat 12 instead of 10, so surges and escorts carry the pressure.

### Simulation results (naive bot, deterministic seeds; directional only)

Act III encounters, fixed archetypes, 12 seeds each: win % / flawless % / enemy damage as % of max health.

| Build / tier | v1.5.0 Threat 11 | v1.6.0 Threat 11 |
|---|---|---|
| melee boss | 100 / 0 / 63 % | 58 / 0 / 72 % |
| tank boss | 100 / 0 / 48 % | 83 / 0 / 59 % |
| hybrid boss | 100 / 0 / 42 % | 100 / 0 / 66 % |
| spells boss | 50 / 0 / 81 % | 17 / 0 / 93 % |
| hybrid battle | 100 / 0 / 40 % | 100 / 33 / 11 % |
| tank battle | 100 / 0 / 39 % | 100 / 0 / 14 % |

**Trade-off to review:** pressure moves from passive durability to **bosses and telegraphs**. Bosses at Threat 11 are much
harder for every build. Ordinary Threat-11 fights cost *less* health for tank/hybrid bots than in v1.5.0, because wards
are slightly lower and the bot dodges telegraphed surges. If playtests show late ordinary fights are still too easy,
the first lever is `counterWardRate` (`(n-4)/8` → `(n-4)/7`), then surge cadence (every 2 turns from Threat 9).

Full adventures, 20 seeds per policy (melee, tank, summoner, spells, greedy): win rates stay within ±10 points of
v1.5.0 (tank 50 → 40 %). Bot boss-flawless rates fell from 9/35 to 5/28 for tank and stayed near 0 elsewhere. Bots
reach Threat ≥ 11 rarely (0–25 %). The changes mainly affect **dominant** play, which is what the owner's run showed.
Bots don't play like a skilled human, so these numbers need human playtests.

## 3. Recommended initial adaptive model (for review)

Threat should respond to **dominance margin**, not only to damage taken:

```
dominance = 0.45 * (1 - enemyDamage / maxHealth)
          + 0.25 * clamp((parTurns - turns) / parTurns, 0, 1)
          + 0.15 * (boss && enemyDamage == 0)
          + 0.15 * clamp(alliesAlive / 6, 0, 1)        // army size
```

Map `dominance` to −2…+3 threat steps with hysteresis (two consecutive results needed for a second step). Keep the
existing visible reasons, and add the dominant term to the dial. The current v1.6 rules implement the first three
terms. **Army size and spell burst are not yet inputs** and should be added only after real-run data supports them.

## 4. Opt-in cross-player telemetry: proposed architecture (NOT active)

### Principles
1. **Off by default.** An explicit, revocable opt-in in Settings, with plain-language text and a link to this page.
2. **Local first.** Phase A only aggregates the player's own runs in `localStorage` (no network). Phase B uploads
   **aggregates**, never individual run histories.
3. **No identifiers.** No account id, no IP retention, no seed, no save key, no free text, no timestamps finer than a day.
4. **Versioned and bounded.** Every record carries `rulesVersion`. Balance changes ship only as reviewed, versioned
   rules releases. No model ever edits live rules. Ranked replays stay tied to their rules fingerprint.

### Phase A (local, can ship next): `src/engine/balance-log.js`
* On each concluded encounter, append a **bucketed** summary to a ring buffer (max 200):
  `{ rulesVersion, act, nodeType, threatBucket (0-3,4-7,8-10,11-12), outcome, enemyDmgPctBucket (0,1-10,11-25,26-50,51+),
    turnsBucket (1-2,3-4,5-6,7+), graftCount, buildFocus }`.
* A "Balance data" panel shows the player's own aggregates and can export them as JSON for a bug report.

### Phase B (requires owner approval and new infrastructure)
* A separate Cloudflare Worker + **new** D1 database (`graftbound-balance-telemetry`), **not** the production D1.
* The client sends daily **pre-aggregated histograms** keyed by `(rulesVersion, act, nodeType, threatBucket)`, with
  k-anonymity (buckets with < 20 contributors are never shown), and with small noise before display.
* No cookies. The Worker drops request IP and UA before writing and rate-limits by a rotating daily salt.
* Retention: 180 days per rules version, then aggregate-only.

### Phase C (analysis, never automatic)
* An offline notebook proposes bounded parameter changes (e.g. surge pct ±0.02, escort thresholds ±1). A human
  reviews them and they ship in the next `graftbound-rules-x.y.z` with a new challenge revision.

### What not to collect
Card-by-card decision logs, seeds, replays, player names, free text, precise timing, device fingerprints.
