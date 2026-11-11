# Instructions for the deploying agent — GRAFTBOUND v0.5 (PREVIEW ONLY)
Repo: https://github.com/Squackle/deep-cuts-game-lab-  (the trailing hyphen is part of the name)
The zip contains two folders: `graftbound/` (the game) and `living-card/` (a redirect stub).
Follow `graftbound/HANDOFF.md` exactly. In short:
1. Branch `game/graftbound-v0.5-overhaul` from latest `main`. Read the repo AGENTS/docs first.
2. `git mv living-card graftbound`, then overwrite with the zip's `graftbound/`. Recreate `living-card/` with ONLY the zip's stub.
3. Edit the EXISTING catalog entry → title GRAFTBOUND, link `/graftbound/`. No duplicate. Update any route test expecting `/living-card/`.
4. Run: `cd graftbound && npm test` (expect 79/79), the repo's other suites (unchanged and green), the e2e suite if possible (expect 35/35), and `node tools/verify-real-pool.mjs` (needs network; fix any flagged card).
5. Open a PR and a Cloudflare PREVIEW. **Do NOT merge or deploy to production.**
6. Report: preview URL, PR link, actual test numbers, verify-real-pool output, and any console warnings.
