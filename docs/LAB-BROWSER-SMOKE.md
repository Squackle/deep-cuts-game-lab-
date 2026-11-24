# Shared Lab browser navigation smoke
Runs on catalog and game-entry PRs, or manually. Local-only Chromium at 1280×800 and 390×844, no live game requests. The shared catalog asserts five accessible tile names and URLs, visible decoded cover images, keyboard skip link, no horizontal overflow and no uncaught catalog JS errors. Click every tile and validate the destination title plus first-party entry script availability (Stackbreaker's existing inline engine is intentionally supported). Both canonical and legacy catalogs are checked. Not a full engine playthrough, performance benchmark, accessibility conformance audit, or physical-device test.

Reproduce from repo root with Node 24:
```sh
npm install --prefix /tmp/deepcuts-smoke --no-save --no-package-lock --ignore-scripts playwright-core@1.56.1
node /tmp/deepcuts-smoke/node_modules/playwright-core/cli.js install --with-deps chromium
PLAYWRIGHT_MODULE=/tmp/deepcuts-smoke/node_modules/playwright-core/index.mjs node --test scripts/lab-browser-smoke.mjs
```

The static fixture server listens on loopback, rejects non-GET/HEAD and API requests; browser interception mocks the presence endpoint and blocks all external requests, all other API calls and mutations. No live storage, production credentials, score writes or game-specific source changes. The browser driver is pinned and isolated from application packages.

If a failure occurs, inspect the test name, desktop/mobile viewport, failing tile/route, cover or script. Fix genuine regressions in the relevant developer lane; don't relax assertions to obtain green. An intentional navigation rename must update the shared contract with its owning change. This optional path-triggered check supplements the mandatory engine gate; assess stability before making it required.
