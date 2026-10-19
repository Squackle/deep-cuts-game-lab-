# Hive Run Dominion 2.0 — Final QA and release acceptance

**Baseline:** Game Lab `hive-1.5.4` with **Task 1 approved** seven-segment Predator Hunt, Task 2A genuine terminal outcomes, and Task 2B earned-only cinematic screens. No new bosses, mutation colors, maps or modes. No public authorization.

## Verified by automation (not a substitute for physical play)

These regression checks belong to the current Game Lab tests and must pass on the exact final SHA:
- `tests/dominion-hunt-balance.test.mjs`: fixed seven-segment Hunt reward/capture, all existing bosses capturable, temporary Black molt/regrowth, Green bonus EV, untouched Brood Trail growth and unranked Director cheeseburger.
- `tests/dominion-authentic-endings.test.mjs`: genuine Broodmother third-phase earned win, real full-board Brood Trail clear, 6,000-step limit not a victory, death, Lair practice and deterministic anti-forgery.
- `tests/dominion-finale-presentation.test.mjs`: normal-game earned-only scenes, approved original 1200px/576px Sliver artwork, independent animated WUBRG scene, toggle-aware chiptune audio, Director preview isolation and artwork stability under reduced motion.
- `tests/dominion-release-candidate.test.mjs`: final scope, key accessible controls, no public submissions, version isolation, responsive CSS breakpoints and mobile pixel-art render cap of 24fps.
- Existing gameplay/audio/input/boss tests (the full Hive Run CI), combined Game Lab CI, strengthened release coordination security gate, and exact commit Cloudflare verification.

**Task 3 technical improvement:** The actual Brood Trail pixel artwork drew ~6,849 pixel rectangles every animation frame. The renderer now draws at most **24 frames/s**, and **once** when OS reduced motion is requested. This is visual-only; gameplay/replay rules and scoring remain unchanged. No other balance changes.

## REQUIRED owner/browser acceptance — pending (never mark passed from CI)

| Device and workflow | What to examine | Status |
| --- | --- | --- |
| Desktop Edge or Chrome, 1280–1920px | **Predator Hunt → Director Mode → Victory Showcase**: crisp full-bleed scythe-armed Sliver and village; gold-frame buttons immediately below embedded win text; no duplicate title; contrast and return behavior | PENDING |
| Desktop, normal Arcade real win | Third real Broodmother capture triggers `THE HIVE REIGNS`, not merely Director forced preview; score + captures + evolutions; Replay Celebration, Play Again, Return | PENDING |
| Desktop, Brood Trail → Director Victory Showcase | Original multi-color coiled swarm is visible; `HIVE COMPLETE!` and pixel-art sparkles legible; preview unranked; repeat and return | PENDING |
| Desktop, genuine Brood Trail board clear | **Only** real filled board triggers full-screen celebratory ending; step limit/ordinary loss never does | PENDING |
| iPhone Safari 320/375/390px portrait | Hunt portrait art framing, safe area and home indicator, button tray tap targets 48px+, no cut-off text, replay and return | PENDING |
| Android Chrome 360/412px portrait | Both scenes, safe area, button spacing, scrolling disabled only while victory overlay is open | PENDING |
| Phone landscape and tablet ~768px | Both scenes, touch targets, no horizontal scrolling/overlapping titles | PENDING |
| Game Only full-screen | Victory exits/Play Again work without trapping scrolling, orientation/layout works and focus returns | PENDING |
| Keyboard focus and access | Tab cycles among victory actions, Shift+Tab reverses, Escape returns to Arcade, screen reader announces appropriate text | PENDING |
| Sound behavior | Victory sting played only after prior user gesture when **Music ON**; no sting with Music OFF, stops when tab hidden or mute toggled, no background autoplay | PENDING |
| Reduced motion | Classic animation remains a complete static pixel picture, not blank; no distracting transitions | PENDING |
| Normal gameplay/long runs | All five bosses doable with seven segments; hatchlings warning/contacts readable; five mutation colors useful; classic growth works late game; no softlock or impossible respawn | PENDING |
| Final score/account promotion | Current standalone Lab has no online leaderboard. On public release validate client/server identical new replay rule version, historical scores and profile ownership before approval | PENDING / TASK 4 |

## Stop/go criteria

**Task 3 candidate is complete only when** (1) all deterministic and repo release-security tests pass on the exact deployed Game Lab SHA, (2) no material issues in desktop/mobile controls, accessibility or winner art remain, and (3) owner approves BOTH visual finales. Owner can attach screenshots and concise issue reports; fix regressions only, not add features.

**Task 4 production promotion remains BLOCKED:** requires separate explicit owner instruction, selective promotion without any `director/**`, server and client replay `hive-1.5.4` (or later verified version) alignment, historic `hive-1.3` score retention, authenticated submission regression, no score reset and verified public Cloudflare SHA.

Once public Dominion 2.0 passes the separate signoff, stop new gameplay expansion and switch to maintenance.
