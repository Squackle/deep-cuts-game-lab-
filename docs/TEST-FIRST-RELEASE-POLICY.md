# DeepCutsEDH — test-first deployment policy (owner instruction, Oct 15 2026)

- **All future Hive Run updates must deploy to the standalone Game Lab test server first.** Do not modify, merge, or deploy the public Deep Cuts EDH site as part of the same approval.
- After Game Lab CI and Cloudflare deployment pass, invite owner to playtest via the exact Lab URL. Report which tests passed, what was not verified, and any profile limitations.
- Only after the owner uses an explicit **Push Beacon to main** (or comparable named promotion) control / authorizes promotion in a new turn may a separate production PR be created and deployed.
- Production promotion must verify the exact tested Lab SHA, run deterministic server/client replay equivalence checks, preserve rules versions and old leaderboard data, and check concurrent website changes. A Lab merge is not production approval.
- Beacon 1.4 keeps the segment-circle HUD unchanged and improves ordinary arcade trap feedback without a separate tutorial or training mode. Codex belongs on the main website's authenticated **My Profile** page, not the game area. The Game Lab may preview its appearance separately but MUST NOT fake user accounts or unlocked achievements.
- Preserve the Lab's solo-only status and retired HTTP 410 score API. Never connect Lab to production D1, member auth, or leaderboard sessions.
- Use a separate PR for each stage.
