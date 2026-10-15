# Stackbreaker — Live Game Lab playtest 0.1

**URL after approved merge:** https://deep-cuts-game-lab.pages.dev/stackbreaker/

**Preview:** Open the commit-specific Cloudflare Pages preview shown in the corresponding deployment record.

## Scope
- Solo, guest-playable experimental tactical stack-and-priority trainer (restricted, original ruleset `sb-core-0.1.0`).
- Two authored one-turn survival cases: **The Last Shelter** and **One Breath Left**.
- Select a response, pay costs, pass priority, and observe deterministic last-in-first-out stack resolution. Undo, restart, keyboard shortcuts and accessibility narration are included.
- The opponent uses a predefined always-pass policy. No full Magic rules engine, combat, live accounts, real scores, D1, external services, or payments.
- This is **not the main Deep Cuts EDH Arcade**, and the independent Stackbreaker incubator source remains at `Squackle/deep-cuts-edh` branch `game/stackbreaker-incubator-20261015` for further development.

## How to play
Open `/stackbreaker/` and choose a puzzle. Select a legal response (buttons or number keys), then use **Pass priority** to advance the stack. Stack objects resolve top-first after consecutive player/opponent passes. Try passing without a response to see the failure explanation. Undo and restart are available.

## Testing / limitations
- Reference source engine/schema suite: 12/12 local Node.js tests passed on October 15, 2026 (`npm test` in the stand-alone `stackbreaker-m0` source package).
- JavaScript syntax checks passed for the engine/controller/schema modules and the self-contained HTML module bundle.
- Cloudflare preview deployment was confirmed successful for the test branch; run-time gameplay in a real remote browser and physical-device testing are **not independently verified** in this release conversation because browser navigation was blocked by the local environment.
- No main-site gameplay, verified scores, user identities, or storage bindings changed.
- No content or API route outside this `stackbreaker/` directory should change as part of this PR.

## Rollback
Revert the Stackbreaker PR / remove only `stackbreaker/`. Do not revert or overwrite other Game Lab releases (including Hive Run / Matriarch) to remove this isolated page.
