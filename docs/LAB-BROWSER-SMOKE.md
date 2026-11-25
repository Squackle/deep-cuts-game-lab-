# Shared Lab browser smoke

Runs when catalog or game files change, or on demand. Local Chromium uses 1280×800 and 390×844 viewports. Both catalog routes check accessible tile names and links, decoded covers, the keyboard skip link, horizontal overflow, and uncaught JavaScript exceptions. Each game gets a fresh browser context. After clicking its catalog tile, the test checks the destination title and entry script availability, then waits for an observable game action to succeed.

| Game | Smoke interaction |
| --- | --- |
| Hive Run | Start and pause a hunt. |
| Stackbreaker | Tap a land and see mana enter the pool. |
| Mana Heist | Open Paired Sigils and advance to turn two. |
| GRAFTBOUND | Start an adventure, enter the Hollow, and see an available map node. The software WebGL renderer uses the game's performance preset. |
| ARCHEMANCY | Open Proving Grounds and start wave one. At phone size verify the rotation prompt, then play at 844×390. |

Game listeners collect uncaught exceptions and console errors from before navigation through the action check. Only native resource failures for the exact requests deliberately blocked or served a fixture 503 are ignored. The harness includes an HTTP 200 entry that logs an error and throws during initialization to verify both diagnostics.

Reproduce from repo root with Node 24:
```sh
npm install --prefix /tmp/deepcuts-smoke --no-save --no-package-lock --ignore-scripts playwright-core@1.56.1
node /tmp/deepcuts-smoke/node_modules/playwright-core/cli.js install --with-deps chromium
PLAYWRIGHT_MODULE=/tmp/deepcuts-smoke/node_modules/playwright-core/index.mjs node --test scripts/lab-browser-smoke.mjs
```

The static fixture server listens on loopback, rejects non-GET/HEAD and API requests; browser interception mocks the presence endpoint and blocks all external requests, all other API calls and mutations. No live storage, production credentials, score writes or game-specific source changes. The browser driver is pinned and isolated from application packages.

If a failure occurs, inspect the test name, viewport, action, runtime diagnostics, and any screenshot. Coordinate intentional UI or navigation changes with the owning game developer. This check supplements the mandatory engine gate. Deployed previews, physical devices, Safari, full gameplay and performance need separate verification.

## Exact-branch screenshot evidence (no Browser Rendering quota)
The browser job checks out the exact PR head (or selected workflow-dispatch SHA), separate from the required merge-ref integration gates. It captures both catalog routes and all five game entries at each viewport; no pixel-diff guarantee for animated games. On assertion failure, it attempts a failure screenshot before closing the browser and preserves the original error. Artifact `lab-browser-evidence-<SHA>` contains PNGs and manifest.json with checked-out SHA, route, viewport and failure state; retained seven days. Screenshots reflect local static fixtures, blocked external HTTP and WebSockets, mocked presence/API responses, and UTC/en-US browser settings. They are not screenshots of a Cloudflare deployment and cannot verify real Access, network assets, bindings or gameplay. No remote URL parameter is accepted. Local reproduction adds `LAB_SMOKE_ARTIFACT_DIR=/tmp/lab-evidence LAB_SMOKE_SHA="$(git rev-parse HEAD)"` to the command above. After merge, dispatch the workflow on a reviewed branch containing this workflow; record artifact SHA and separately verify authorized preview deployment. Do not repeatedly request Cloudflare Browser Rendering when it returns HTTP 429.
