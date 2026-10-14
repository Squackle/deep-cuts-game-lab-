# Design Decision Register, Open Questions & Risk Log

## Confirmed by owner

| ID | Decision | Status |
| --- | --- | --- |
| D-001 | Create a real, playable browser game, not a static mock-up. | Implemented and deployed |
| D-002 | **Mobile is mandatory**; touch controls, phone layout and tests from the first prototype. | Confirmed |
| D-003 | Snake-inspired retro **Sliver Swarm** concept is particularly appealing. | Favored concept, working name |
| D-004 | Isolate game code in a **separate repo and test site**, not the production Deep Cuts code. | Implemented at https://deep-cuts-game-lab.pages.dev/ |
| D-005 | Maintain an ongoing dated dev log so design decisions survive between sessions. | Introduced 2026-10-13 |

## Proposals requiring real gameplay validation

| ID | Proposal | State |
| --- | --- | --- |
| P-001 | Endless Arcade first, rather than a level-based victory goal. | Recommended, not explicitly chosen |
| P-002 | Portrait phone layout, swipe-to-turn on play field; keyboard for desktop. | Proposed |
| P-003 | Five mutations: white protection, blue control, black sacrifice, red aggression, green growth. | Implemented Alpha 0.2; real-device balance testing remains |
| P-004 | Average runs 2–5 minutes. | Goal, untested |
| P-005 | Daily Challenge, bosses, online scores and accounts are later-stage features. | Roadmap proposal |
| P-006 | HTML5 Canvas/ES modules with separated simulation and rendering. | Implemented |
| P-007 | Repository **Squackle/deep-cuts-game-lab-** is the isolation boundary. | Confirmed repo existence; note trailing hyphen |

## Questions for the owner after the first demo

- Final legally safe public title and character identity.
- Does Arcade mode alone feel fun? Should levels become finite?
- One-handed swipe or virtual direction buttons?
- Initial speed, score points and mutation trigger threshold (playtest).
- Whether and how scores later connect to Field Network profiles.

## Legal/IP risk — important

The provisional **Sliver Swarm** name evokes MTG's creature type, but Wizards' Fan Content Policy restricts making other games containing its IP even when the game is free. Turning official art into pixel art or renaming characters doesn't independently license the derivative. **Use original names, character designs, sprites, sound, art and lore** unless specific authorization is obtained. Do not ship Wizards' card images or official characters as game assets. See https://company.wizards.com/en/legal/fancontentpolicy ; this is a production risk note, not a formal legal opinion.

Likewise, classic Snake-style *mechanics* are a source of inspiration; never copy protected presentation, proprietary source, sounds or levels from another arcade game.

## Other risks

- **Scope creep:** prevent premature RPG, multiplayer or boss systems.
- **Mobile input:** touch navigation versus page scrolling; provide forgiving turn rules.
- **Unfair difficulty:** long hive + speed increases must be tuned empirically.
- **Score cheating:** no trusted public leaderboard without validation / anti-abuse.
- **Asset provenance:** log license/author for every external asset, prefer original.
- **False confidence:** no claims of functionality or successful deployment without tests.
