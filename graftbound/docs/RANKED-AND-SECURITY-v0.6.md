# Ranked Expedition, replay format and security report (v0.6)

## Fairness

`src/engine/ranked.js → RANKED_CHALLENGES['gb-expedition-01']` (revision 1) pins all of the following, so every competitor gets the same:
- seed `0x5eedcafe` and tutorial on
- rules version `graftbound-rules-0.6.0`, card pool `real-pool-63-v1` and scoring `gb-score-1`
- maps, encounters and reward packs, which are all derived deterministically from the seed and node seeds
- the starting Blank 1/1

The engine has no `Math.random` and no clock input. `startedAt` is zeroed for ranked runs.

Rules for the server:
- It never accepts a client-chosen seed.
- New seeds or rules mean a new challenge id or revision.
- There's no daily reset. Challenges stay active until retired.
- Free Adventure runs keep varied seeds and are **never** mixed into the global ranking.

## Replay format (`REPLAY_VERSION 1`)

A ranked run is a list of the player's **accepted decisions** only:

```json
{ "seq": 17, "type": "move", "x": 3, "y": 5 }
```

Allowed types and their exact keys:

| Type | Keys |
|---|---|
| `node` | `node` |
| `move` | `x`, `y` |
| `attack` | `uid` |
| `cast` | `id`, `x`, `y` |
| `interact` | `x`, `y` |
| `end` | none |
| `reward` | `card`, optional `release` |
| `skip` | none |
| `shrine` | `choice`, optional `arg` |
| `event` | `choice`, optional `arg` |

The replay never contains damage, health, scores, rewards, RNG outcomes or a profile id. `validDecision` rejects:
- unknown keys or wrong types
- a non-contiguous `seq`
- logs longer than 4,000 decisions or segments longer than 400

`applyDecision` sends each decision through the real engine functions, which throw on anything illegal. That covers:
- movement reach and blocking
- attack range and attacks remaining
- mana and spell cost (including Null Warden tax), once-per-turn casting and targets
- crystal charge
- reward membership, graft capacity and release
- shrine and event availability

Enemy turns, damage, healing, boss phases, rewards and victory are all **recomputed**, never read from the client.

## Server lifecycle (main website — see `deep-cuts-edh` → `functions/api/graftbound.js`)

1. **`start`.**
   - Requires the existing Community session (bearer key or the `__Host-dc_device` cookie).
   - Creates an attempt with an **authoritative checkpoint** (`startRanked()`).
   - A unique partial index allows only one open attempt per profile per challenge revision.
   - `start` on an open attempt **resumes** it from the server checkpoint. `restart:true` abandons it (still recorded) and starts fresh.
2. **`segment {attemptId, fromSeq, decisions[]}`.**
   - `fromSeq` must equal the server's accepted count.
   - The server replays the segment from the stored checkpoint (`applySegment`), then atomically writes the segment (its primary key blocks duplicates and races), the new checkpoint and any new encounter rows.
   - On completion it also writes the best-score upsert (tie-broken) and achievements.
   - Every dependent write is conditional on the attempt having advanced to this exact sequence.
3. **Finish.** Reaching `won` or `lost` closes the attempt. Further segments are rejected (404 for a closed attempt).

## How each exploit is handled

| Exploit | Result |
|---|---|
| Restoring an older save | The server checkpoint has already advanced; `fromSeq` is stale → 409. |
| Editing damage or health | Not in the replay; recomputed. |
| Deleting unfavourable actions | `seq` gap → 422. Different decisions also produce a different, verified outcome. |
| Changing the seed | Not accepted. |
| Repeating reward nodes | The engine allows each node once; encounter keys are unique. |
| Fabricated victory or score | Recomputed; extra keys → 422. |
| Submitting only the best part of a run | A run must start from `startRanked()`. |
| Mixing rules versions | `rulesVersion`/`buildId` must match the attempt and the server pin → 409. The rules-file digest is pinned. |
| Client-supplied profile id | Ignored; identity comes from the session only. |
| Oversized or flooding requests | 42 KB body cap (community-core), segment/decision caps, and per-profile + per-IP daily quotas. |

## Evidence (this sandbox)

Unit tests (`tests/v06-scoring.test.mjs`) confirm:
- A full bot replay is byte-identical to the original run.
- Segment-by-segment replay equals a full replay.
- Forged scores, duplicated, skipped or modified decisions, wrong rules or challenge revision, rollback and over-length logs are all rejected.

In the browser (`tests/e2e_v06.py`), a run recorded through the real UI replays to the exact same state, and a tampered move is rejected.

Main-site tests (`deep-cuts-edh/tests/graftbound-api.test.mjs`, run against the real migration on an in-memory SQLite D1 shim) confirm:
- the launch flag, 401, 403 and 409 responses
- segmented verification
- anti-cheat rejection
- that another profile can't use your attempt id
- resume with a bearer key **and** with a device cookie
- restart and abandon
- two independent players, one leaderboard row per profile and deterministic ties
- public output with no ids, keys or checkpoints
- migration and rollback

**Not verified:**
- real Cloudflare Workers or D1, including CPU limits (a full 160-decision replay takes ≈30 ms in Node; per-segment replays are much smaller)
- a real signed-in browser session on the production origin
- load or rate-limit behaviour at scale

None of these can be claimed until they're tested in a staging deployment.
