# GRAFTBOUND — publish directly to the shared Game Lab

**Owner release direction (November 13, 2026):** Game Lab is GRAFTBOUND's default deployment target, not a separate final staging site. The public playtest URL is **https://deep-cuts-game-lab.pages.dev/graftbound/** and the shared catalog is **https://deep-cuts-game-lab.pages.dev/lab/**. This repo is `Squackle/deep-cuts-game-lab-` (trailing hyphen intentional).

## Release a requested GRAFTBOUND update

1. Read `AGENTS.md` and `graftbound/AGENTS.md`; inspect current Game Lab `main`, relevant open PRs and overlapping branches. Work only in `graftbound/**` on a fresh `game/graftbound-*` branch.
2. Preserve `deepcutsedh.livingcard.*` local save keys, rules/replay version isolation, original graphics and local-unranked score behavior. Add a deterministic regression test for gameplay changes.
3. Run `cd graftbound && npm test`, the strict sprite audit where applicable, live Scryfall verification where card facts changed, and required GitHub Unified Game Lab / Release coordination checks. Attempt browser/mobile QA and report any limitations truthfully.
4. A successful Cloudflare branch deployment is a **preview**, useful for manual QA but **not** the final Game Lab URL. For an owner-requested playable Game Lab release, merge the verified PR into **this repository's `main`** as soon as required checks permit. The Cloudflare Pages project `deep-cuts-game-lab` publishes that branch automatically.
5. Check Cloudflare **production-environment** deployment status and exact merge SHA. Confirm `/graftbound/` loads, the game shows the expected beta/version, and title/pause navigation can return to `/lab/`. Report the main Game Lab link, actual CI evidence, and outstanding issues.

**Expedited Game Lab beta:** The owner may request immediate Game Lab playtesting of a labeled beta while non-security visual/balance acceptance remains incomplete. Disclose those known limitations; do not bypass failing required checks, publish misleading verified scores, or claim a full browser/device sign-off.

**Separate boundary:** Publishing to Game Lab is **not** promotion to `Squackle/deep-cuts-edh` (main Deep Cuts EDH Arcade). Do not merge into that repo, wire profile/D1 scores, or change sibling games without a separate explicit release order.

A previous v0.5 instruction file said "preview only" and named the old `living-card/` migration. Those steps are obsolete; the migrated GRAFTBOUND route and catalog entry already exist.
