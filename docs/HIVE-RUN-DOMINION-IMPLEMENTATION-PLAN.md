# Hive Run 2.0 — Dominion: implementation and release plan

**Plan recorded:** 2026-10-19. **Owner decision:** approve the existing seven-segment Predator Hunt balance in standalone Game Lab, `hive-1.5.3`. This is **not** authorization to deploy to the public website. **Other milestones remain planned**, and major code promotions require the separate approvals in `docs/TEST-FIRST-RELEASE-POLICY.md`.

## Final scope / game identity

Dominion is a finished **two-mode arcade game**: Brood Trail grows the swarm until the playable arena is filled; Predator Hunt uses a **seven-segment baseline** to trap enemies and defeats the existing **fifth/final boss, Broodmother**. No sixth boss, new biome, campaign, multiplayer, or new color family. Four biomes, five bosses, five WUBRG mutation families. After release, maintenance rather than content expansion.

**Source split:** `Squackle/deep-cuts-game-lab-` is standalone solo-only testing. Public `Squackle/deep-cuts-edh` owns authenticated ranked score submissions, server-side replay, profiles and existing historical leaderboards. Lab's `director/**` is strictly internal and **must never be copied or imported into production**.

## Task 1 — Seven-segment Predator Hunt balance — APPROVED / COMPLETE IN LAB

**Owner approved 2026-10-19** the Predator Hunt fixed-length balance as currently implemented in `hive-1.5.3`. Stop treating seven as an unresolved choice or repeatedly comparing it to long-body variants unless a real regression is demonstrated.

Acceptance specification:
- Ordinary Predator Hunt begins with seven segments; orbs, prey captures and boss captures provide score/evolution energy but **no permanent tail growth**.
- Green Rapid Brood: next four qualifying Hunt rewards add +1 evolution energy; the White+Green Hatchling Ward still consumes one Green charge with a White shield. The Black+Green synergy keeps its existing discounted molt effect.
- Black Emergency Molt: temporarily sheds three tail segments for defense and regrows the temporarily removed segments over safe subsequent steps (two with a charged Black+Green synergy); this **temporary** departure from seven is permitted. Recovery fallback is a separate defensive safety case.
- Brood Trail's original growing Snake gameplay and Green growth mechanic remain unchanged. Director's unranked `1`-key cheeseburger is an explicit LAB-ONLY stress-test exception and can lengthen the Hunt body.
- Keep deterministic `hive-1.5.3` Lab tests green; only fix proven bugs from mobile/desktop regression, not change the chosen balance. Signoff on a number does not waive later release QA.

**Status:** owner decision locked; balance code already implemented/tested in Game Lab. No new Task 1 implementation needed unless tests expose a defect.

## Task 2 — Implement TWO legitimate final victory endings — 2A + 2B BUILT IN GAME LAB; OWNER VISUAL ACCEPTANCE PENDING

### 2A. Engine event contract, separate from UI — LAB IMPLEMENTED (hive-1.5.4)

**Delivery 2026-10-19:** Game Lab's deterministic engine now distinguishes `perfect_clear`, `broodmother_defeated`, `step_limit`, `death`, and separate unranked `lair_practice` completions. The legitimate Hunt finale triggers at the Broodmother's final capture at evolution 12, once, without another draft. The real classic board-fill checks occupied enterable cells, excluding permanent rock but not temporary hazard tiles. The 6,000-step boundary ends without claiming perfect clear. The local replay regression verifier validates an explicitly claimed outcome and emits the actual one; public integration must require that field and server replay equivalence. Task 2B's high-quality victory art/audio is NOT part of this release.

**Do not mistake Task 2A's temporary text overlay for the completed two-cinematic finale.**

### 2A. Acceptance specification (implemented)

1. Introduce an explicit deterministic terminal outcome/event, distinguishing `perfect_clear`, `broodmother_defeated`, `step_limit`, `death`, and `lair_practice` without relying on an `endReason` string. Keep score, seed, ticks and replay results consistent; avoid repeated victory events.
2. **Predator Hunt:** ONLY the third, actual captured phase of the Broodmother during ordinary Arcade Hunt awards the final boss score/energy **once** and ends the run immediately as an authentic win. Do not open a new mutation draft, spawn new prey, run a new boss cycle or process additional steps after the victory. The Lair's unranked practice completion must stay separate.
3. **Brood Trail:** Only genuinely filling the eligible arena tiles triggers the perfect-clear win. Distinguish ordinary death and the existing 6,000-step run limit, which must **not** show the same perfect-clear finale; retain honest labels and legitimate score records under the appropriate result type. Audit spawn-eligibility vs inaccessible terrain/borders and the no-free-tile edge case before coding.
4. Freeze movement, enemy AI, clocks, score and input on terminal results, but allow replay / new game; ensure draft-state and collision events cannot override a win. Handle rapid final capture, shield rescue and score-timing edge cases.
5. Version the changed simulation as a NEW Lab replay rules version (later than `hive-1.5.3`); update `src/replay-verification.js` expectations and seed/event regression tests. Do not make Director's forced wins authoritative.

**Acceptance tests:** earn a genuine Brood Trail full clear in a small deterministic simulation; hit 6,000 steps without triggering that celebration; capture actual Broodmother phase three through the real engine; award boss points once; do not continue; lose normally; Lair practice remains unranked; replay identical inputs yields identical final type, score and tick count. Tests should make the terminal condition feasible quickly without requiring a real 30-minute playthrough.

### 2B. Finale presentation — GAME LAB IMPLEMENTED (presentation only, hive-1.5.4 unchanged)

**Delivered 2026-10-19:** real earned Hunt wins now trigger an independent full-screen 1200x675/576x1024 pixel-art Sliver village finale from game-owned `src/victory-art.js`, **not a Director Mode import**. True Brood Trail perfect clears trigger an original layered, animated WUBRG spiral-swarm pixel-canvas finale with its own title. Both include final score/captures or orbs/evolutions, play again, return to arcade and replay-celebration buttons; one-shot original chiptune fanfares play only when music is enabled, the Web Audio context is already unlocked and the page is visible. Mobile portrait artwork/controls respect safe area; reduced-motion mode freezes animation; death, 6000-step boundary and Lair practice do not trigger cinematic victories.

**Still requires owner acceptance:** actual artwork framing on PC/mobile (including the gold-framed controls below the Hunt's embedded victory text), generated pixel composition of the Brood Trail finale, music/mute behavior on devices, keyboard/touch buttons and game-only mode. This is **not** public production approval.

### 2B. Original acceptance specification

- **Brood Trail:** **HIVE COMPLETE!** An animated, original pixel-art swarm filling the burrow, celebratory particles and music sting, real score/milestone recap, play again. No outside-village attack scene needed for this mode.
- **Predator Hunt:** **THE HIVE REIGNS — YOU WIN**. Show the approved scythe-armed giant Sliver, smaller Slivers and soldiers confronting the swarm outside the village, with original, high-quality pixel artwork and a readable, tactfully framed button tray below the win copy. Desktop fills the available screen intentionally; mobile has its own portrait composition with safe-area buttons. Maintain accurate pixelated typography and avoid doubling text already baked into art. Use a **production-reviewed original art asset in normal game assets**, not any `director/**` import or game-cheat logic.
- Both: score + run recap, clear play-again / exit actions, back/escape where applicable, high-contrast pixel UI, appropriate celebratory original audio that honors the music toggle and browser autoplay policy, no motion for users requesting reduced motion. Avoid repeatedly firing finale effects every animation frame.
- **Director Mode:** continue using test-only preview/forced outcomes to inspect animation/art rapidly, but the normal Arcade game only displays the full finale after the REAL terminal event.

**Release increments:** separate Game Lab PRs for (a) deterministic terminal rules + unit tests and (b) original art/audio/UI + responsive integration. Merge only when full CI passes and Cloudflare matches the tested commit. Provide the exact Game Lab URL for owner approval of the real endings.

**Owner checkpoint:** review/approve both actual endings in Game Lab before moving to Task 3 signoff or requesting production promotion.

## Task 3 — Final gameplay, UX, and accessibility QA — AUTOMATED RELEASE-CANDIDATE QA IN PROGRESS; OWNER DEVICE ACCEPTANCE PENDING

No additional bosses or gameplay systems. Run a release-candidate matrix on Game Lab. Track the automated checks and still-required physical tests in [DOMINION-2.0-QA-SIGNOFF.md](DOMINION-2.0-QA-SIGNOFF.md). The Task 3 QA pass includes a visual-only 24fps cap for the pixel finale and reduced-motion single-frame draw; gameplay rules stay hive-1.5.4:
- **Hunt:** all five bosses with the approved seven-segment length, safe spawn / phase transitions, hatchling chase and contact, ability warnings, White/Blue/Black/Red/Green effects and all existing synergies. Validate defensive temporary shortening returns to seven; no unfair boss softlocks, invisible hazards, repeated awards or accidental terminal screens.
- **Brood Trail:** growth to an actual full-clear, collisions when very long, Green-growth effects, tiny remaining-free-space edge cases, music and honest 6,000-step result.
- **Inputs/devices:** physical iPhone Safari and Android Chrome in portrait/landscape; desktop Chrome/Edge/Firefox if available; swipe/keyboard; pause/focus/background; Game Only; draft selection; touch hit targets; viewport widths 320/375/390/768/1280+; safe-area and reduced-motion/mute behavior.
- **UI/audio:** no clipped Sliver scene or unreadable buttons; avoid first-frame audio autoplay; check immersive mode, performance on low-end phones, keyboard focus and screen-reader outcome announcements.
- **Integrity:** verify Lab Director remains unranked/no network writes; test normal win and score replay paths; run automated deterministic CI and a documented manual checklist. Fix **only bugs and measurable balance defects**, then rerun tests.

**Acceptance gate:** no blocking problems, owner accepts desktop/mobile game feel and both endings, all CI green. Save tested exact Lab SHA and pass/fail notes. A green CI alone is not a substitute for device playtests.

## Task 4 — Separate, owner-approved Dominion 2.0 public promotion — NOT AUTHORIZED YET

1. Wait for **explicit owner approval for production** in a new turn; Game Lab testing/approval of Task 1 does not authorize this.
2. Freeze one exact known-good Lab SHA and document all changes between public `hive-1.3` (Beacon) and tested Dominion, not just the most recent PR. Check concurrent public/ Lab work and website coordination issues.
3. Open **separate public-repository PR** (`Squackle/deep-cuts-edh`, `Workstream: Game Lab Promotion`), with **`Lab source SHA:`**, **`Rules version:`**, and **`Score/replay validation:`**. Do not bulk-copy the Game Lab project; selectively integrate approved `src/**`, art and UI, and rebuild server-side replay verification to run the exact same NEW deterministic rules.
4. Explicitly **exclude all `director/**`** assets/code/routes, including super-orb key 1, invulnerability, phase skips, forced wins and cheat legend. Add negative tests for their absence in the public bundle.
5. Preserve historical `HIVE_DB` scores and profile ownership, legacy rules-version tagging, account-cookie verification, and three-character score initials. Never relabel old `hive-1.3` records as new, silently alter scores, or bypass server replay; test valid/invalid/forged run submissions and both terminal outcome types.
6. Pass public CI / auth-security / site integration / genuine browser tests, verify no regressions to unrelated Deep Cuts EDH pages or games, obtain the final go/no-go, merge, then verify the **exact Cloudflare public deployment SHA**. Prepare single-PR rollback route that retains all score data.
7. Announce **Hive Run 2.0 — Dominion** (one thematic word per release naming policy). Mark feature development finished; transition to bug, accessibility and maintenance work only.

**Public gate:** never claim Dominion publicly shipped until an authorized PR is merged and Cloudflare confirms the exact production SHA, plus score/auth smoke tests.

## Work order and handoffs

| Sequence | Work item | State | Evidence to close |
| --- | --- | --- | --- |
| 1 | Lock seven-segment Hunt | **Owner approved / already in Game Lab** | Lab `hive-1.5.3`; scope frozen |
| 2A | Earned terminal conditions + replay tests | Pending separate Lab PR | deterministic real wins distinct from step cap/loss |
| 2B | Original finale artwork, pixel UI, audio, mobile | Pending separate Lab PR | owner sees full endings outside Director and approves |
| 3 | Full regression/physical device signoff | Pending | documented device matrix and no blocking defects |
| 4 | Public integration / Dominion 2.0 | **Not authorized** | owner-approved production PR, versioned server/client replay, historical scores safe |

**Stop condition:** once these four tasks are accepted and Dominion 2.0 is verified in public, freeze major Hive Run gameplay content. Don't begin new bosses/biomes/campaign or other expansions by default.
