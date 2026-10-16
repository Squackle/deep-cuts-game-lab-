# P01 — Artwork, brands, API and rights decision register

**Snapshot:** 2026-10-15 · **Decision state: PENDING OWNER APPROVAL AND QUALIFIED REVIEW**.
This is a planning and risk document. **No one has granted or independently verified the rights required for public distribution of the current Mana Heist prototype.** The Game Lab is already web-accessible, but "Lab-only" is a development scope, **not a legal exemption**. Do not interpret this record as a license or as advice that existing distribution is legally compliant.

## Rights decision for the owner

**Route A — Written rights/permission**: retain authentic Magic card names, complete card scans, frames, symbols and card text **only if** the relevant rights holders grant documented permissions expressly covering an interactive standalone game, its delivery channels, any ads/monetization, and the precise artwork/data used. Scryfall API access is not permission from Wizards or artists to distribute a new game. If A is selected, record license parties, scope, dates, approved imagery, limitations and renewal/termination conditions. Budget and likelihood have **not** been established.

**Route B — Independently reviewed original presentation (recommended for feasibility)**: replace real-card identities, artwork, names, trademarked visual presentation and protected material with independently designed fantasy lands, original art/assets and original UI, under an expert-reviewed product design. Preserve *high-level pedagogical questions* (planning land/resource choices) only after verifying that the actual independent mechanics/presentation are rights-cleared. This is **not** a legal claim that simply renaming a Magic game makes it safe. Requires owner direction, work estimate, new art budget, trademark/title review and qualified counsel sign-off.

**Owner decision form (do not fill on user's behalf):**

- [ ] **Choose Route A:** pursue written authorization/licensing.
- [ ] **Choose Route B:** commission/author original, rights-reviewed Mana Heist art/card assets.
- [ ] **Other:** owner supplies a rights-cleared strategy and documentation.
- [ ] **Title review:** `Mana Heist` cleared or a replacement title chosen.
- [ ] **Publication plan:** noncommercial public game vs monetized public Arcade decided and reviewed.
- [ ] **Qualified legal/IP reviewer and sign-off date recorded.**

**Decision status: BLOCKED.** Future agents must ask the owner rather than silently choosing or treating this P01 audit as permission to modify the assets.

## Asset and technology exposure register

| Asset / surface | Current implementation | Concern | P01 status and required decision |
|---|---|---|---|
| 24 real land names and gameplay model | `src/engine.js` `CARDS`, `src/card-references.js` and `src/levels.js` | Genuine Magic card identities and trade dress may be protected | **RIGHTS OPEN**; A permission or B original design |
| Real card frames and printed art | `src/printing-art.js` fetches randomized real card printings through browser image URLs | Third-party copyrighted art, frames, text and logos used inside a game | **RIGHTS OPEN**; do not claim API license |
| Fallback exact named images | `src/scryfall-cards.js` / `src/card-references.js` | Copyright and possibly unexpected artwork versioning | **RIGHTS OPEN** |
| Scryfall random-image service | `https://api.scryfall.com/cards/random?q=...` | API usage, uptime, policy, image rights, traffic/privacy exposure | **SERVICE TERMS REVIEW OPEN**; test request behavior; no bulk live requests |
| Scryfall named images | `https://api.scryfall.com/cards/named?exact=...` | Same constraints; service may block/redirect or return variant frames | **SERVICE TERMS REVIEW OPEN** |
| External reference hyperlinks | `scryfall.com/search` | External navigation and trademark/trade dress context | Document and review as external educational linking, not a game-asset license |
| WUBRGC letters, cost icons and circles | `index.html`, `styles.css`, `src/ward-charge.js` | A particular reproduction of Mana symbology/trademarked assets may require review | **DESIGN/RIGHTS OPEN** |
| Landfall/heist terms, title and chapter names | `index.html`, `README.md`, `src/levels.js` | Similarity and title/trademark diligence required; not automatically cleared | **BRAND OPEN** |
| Chromatic Cauldron / stirring implementation | `src/fluid-ward.js`, `src/pigment-mixer.js` | Original code's licensing/asset dependencies still need build-time inspection | **INVENTORIED**, rights of contributions to verify |
| Backgrounds, fonts, other styles | `styles.css`, any local files referenced by HTML/CSS | Audit external font/media licensing and attribution before public use | **FURTHER INVENTORY OPEN** |
| Source dependencies/hosting | Cloudflare Pages and GitHub, direct Scryfall browser image redirects | Platform usage/availability/security/privacy and public release costs | **REVIEW OPEN**, separate from Magic permissions |
| Personal progress | Browser `localStorage` guest medals and stage | User data export/loss, version migration, privacy if analytics added | **NO DATA SHARING AUTHORIZED**; P13 review |

## Policy sources and direct observations

- [Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy): specifically restricts use of Wizards IP "in other games ... regardless of whether it is distributed for free." It also restricts logos/trademarks; being free or displaying a fan disclaimer does **not** waive the game restriction. Page last-updated line showed 2017-11-15 when examined.
- [Wizards Terms of Use](https://company.wizards.com/en/legal/terms): reserves use of game/content IP absent express permissions. More recent terms may apply; re-read before launch.
- [Wizards official rules hub](https://magic.wizards.com/en/rules): gameplay rule reference; **does not grant artwork or game distribution permissions**.
- [Scryfall API](https://scryfall.com/docs/api), [Scryfall image guidelines](https://scryfall.com/docs/api/images): primary intended API policy references. Direct retrieval returned HTTP 403 during this audit. **Policy terms not verified**; do not attribute unstated rights or usage permission to these pages.
- [Scryfall request/rate-limit guidance](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17): Scryfall requests under 10 per second, respect caching/service restrictions. That is a technical usage guideline, **not** a card IP license.

## Sign-off evidence required before P15

1. Owner's explicit A/B selection and intended public distribution/monetization status.
2. Written, reviewable permissions for every retained third-party protected component, **or** a documented and counsel-reviewed set of original replacements.
3. Trademark/title search and reviewer outcome; appropriate attribution/disclosures for the chosen rights path.
4. Written review of Scryfall service use and fallback if requests fail or must be removed.
5. Privacy/data handling notes and opt-in policy for any analytics or user account features introduced later.
6. A separate owner-approved public-site integration PR, exact reviewed Lab SHA, website maintainer verification and rollback test.

**Do not mark this register cleared automatically when this package merges.** A safer architecture choice is not a legal opinion. P01 technical documentation may ship to the Lab while public launch remains BLOCKED.
