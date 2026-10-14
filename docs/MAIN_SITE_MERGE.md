# Hive Run → Deep Cuts EDH merge guide (Alpha 0.3)
**Preparation only:** The game is still hosted separately, and no production Deep Cuts EDH files have been changed.

## Why this is portable
- All Hive Run modules live under `src/` and import each other by relative URL.
- `index.html` loads `./src/main.js` and `./styles.css` (no absolute root URLs).
- `src/level-background.js` imports `../assets/backgrounds/hatchery.webp` via `import.meta.url`.
- `src/integration.js` exports the game id, relative leaderboard API route and public Field Network profile builder. It is the one identity configuration file to update.
- The leaderboard server is a standard Cloudflare Pages Function, not a separate app service; scoreboard tables are isolated D1 objects under the `HIVE_DB` binding.

## Recommended main-site layout
When the owner authorizes changing `Squackle/deep-cuts-edh`, **copy** the game without rewriting its internal structure:

```
deep-cuts-edh/
  games/hive-run/index.html
  games/hive-run/styles.css
  games/hive-run/src/*.js
  games/hive-run/assets/backgrounds/hatchery.webp
  functions/games/hive-run/api/leaderboard.js
```

Copy additional art assets actually referenced by the game. Preserve all existing file names. Put game links to `/games/hive-run/`; make a separate opt-in navigation/menu change to the main site.

## Leaderboard and identity
1. Export the Game Lab D1 tables from `deep-cuts-hive-leaderboard` and import into the chosen main-site D1 (or bind `HIVE_DB` to the existing DB id if appropriate). Source SQL: `db/leaderboard.sql`; preserve `hive_scores`, `hive_sessions` and `hive_limits`.
2. On the main Pages deployment, configure `HIVE_DB` for production and preview and test `/games/hive-run/api/leaderboard`.
3. The existing main site's Field Network profile URL is `/community.html?profile=Handle`. Once merged, update `PROFILE_ORIGIN` in `games/hive-run/src/integration.js` to the main site's canonical public origin.
4. **Security / verified identity:** While sites are separate, users can type any public profile handle; game rows explicitly say **unverified**, and `profile_verified=0` in D1. Do NOT treat this as a verified login. After merge, add same-origin profile authentication to the game POST handler using the site's existing Secure/HttpOnly remembered-device cookie and DB-auth helper. Derive `profile_handle` from server-authenticated `community_profiles`, not user input. Only then set `profile_verified=1`. Never send recovery keys to the game or embed them in links.
5. Remember that account deletion should cascade or anonymize game ranking ownership after verification is introduced. Keep guest aliases independent from main profile ids.
6. Existing scores remain replay-verified **for game rules**, but are not cryptographic proof of human play. Per-IP hourly rate limiting, single-use server seeded sessions, API replay, and a 6000-step maximum are implemented; review abuse/verification before prizes or monetized rankings.
7. Before merging, QA all links, cookie scopes, score submission, cross-site navigation, origin checks, reduced-motion, and 320/375/390/768/1280px responsive screens.

## Never do silently
- Never change `Squackle/deep-cuts-edh` without explicit owner approval.
- Never guess a profile identity from a displayed handle and call it verified.
- Never copy application credentials, member keys, or recovery keys into the game.
- Never assume D1 bindings migrate automatically with copied source.

## Release 1.0 integration (2026-10-14)

Owner explicitly authorized remaining roadmap deployment including integration. The main site now carries portable files under `games/hive-run/`; `scripts/export-main-site.mjs` reproduces the asset and server-handler export. The site-owned Functions wrapper resolves the existing HttpOnly device cookie through `community-core.auth`, ignores typed handles for authenticated ownership, and resolves current public handles on leaderboard reads. Deleted profiles lose verified attribution. Public profile records are read by `/api/hive-profile` using the server-authenticated profile id stored on verified submissions. Both origins share HIVE_DB; existing alpha tables are retained and release 1.0 uses distinct mode/day/version tables. No recovery keys are copied to the game.
