# TRD — ContentGrid (Social Content Calendar & Engagement Planner)

## 1. Architecture (zero → high level)

- **Level 0:** A single Node.js process serving a JSON API and a
  vanilla SPA, backed by one SQLite file. No external dependencies,
  no network calls, no API keys: only `node:http`, `node:sqlite`,
  `node:crypto`.
- **Level 1:** `backend/src/server.js` creates the HTTP server;
  `app.js` is an explicit router ([method, pattern, …handlers] route
  tables, `:param` patterns) that also serves `web/` statically and
  answers `GET /health`.
- **Level 2:** Route modules (`routes/auth.js`, `routes/content.js`,
  `routes/misc.js`) handle auth, brand/channels/posts, and
  dashboard/analytics/analysis/tasks/reports/notifications.
  Middleware provides token auth, owner-role checks and field
  validation. All analytics go through one module:
  `backend/src/marketing/engine.js`.
- **Level 3:** The engine is pure functions over post records —
  scoring, roll-ups, coverage, recommendations — so the seed, the API
  and the tests all exercise identical logic. `seed.js` runs the
  engine over the seeded dataset to produce the stored analysis run,
  recommendations, report and notifications.

## 2. Module map

| Module | Responsibility |
|---|---|
| backend/src/server.js | Process entry, PORT/HOST, graceful shutdown |
| backend/src/app.js | Router, body parsing, /health, static web serving |
| backend/src/db.js | SQLite open + schema migration (11 tables) |
| backend/src/seed-data.js | Showcase brand, channels, settings, 29 posts |
| backend/src/seed.js | Idempotent seeding, createBrand, runAnalysis, row mapping |
| backend/src/marketing/engine.js | Engagement model, roll-ups, coverage, recommendations |
| backend/src/middleware/auth.js | Bearer-session auth, owner role, myBrand scoping |
| backend/src/middleware/errors.js | Error → JSON mapping (incl. UNIQUE → 409) |
| backend/src/middleware/validate.js | Required-field validation (400) |
| backend/src/routes/auth.js | Register/login/logout/me (5 endpoints) |
| backend/src/routes/content.js | Brand + settings, channels, posts (10 endpoints) |
| backend/src/routes/misc.js | Dashboard, analytics, analysis runs, tasks, reports, notifications (13 endpoints) |
| backend/src/utils/respond.js | JSON responses + static file serving |
| backend/src/utils/tokens.js | Session tokens, reference codes, scrypt password hashing |
| web/app.js | SPA: 10 views, hash routing, all views call the API |
| tests/run-tests.js | Live HTTP test harness (fresh temp DB) |
| preview/make_screenshots.py | PIL renderer for the 10 screenshots |

## 3. Algorithms (exactly as implemented)

**Engagement score** (`engagementScore`):
```
numerator = likes×1 + comments×3 + shares×4 + saves×2
score     = reach > 0 ? round2(numerator / reach × 100) : 0
```
The response breakdown returns each weighted component, the numerator
and the reach. Worked example: (100, 10, 5, 20) at reach 2,000 →
numerator 190 → **9.5**.

**Format roll-ups** (`formatRollups`): published posts only, grouped
by format; `avgScore = round2(mean of per-post scores)`, with post
count, total reach and total numerator. Sorted by avgScore desc.

**Slot roll-ups** (`slotRollups`): published posts only, grouped by
`weekday(scheduledDate) × daypart`; weekday is derived from the date
at UTC noon to avoid timezone drift. Same measures and ordering.

**Coverage** (`coverageAnalysis(posts, {start, end, targetPostsPerWeek, targetMix})`):
calendar posts are posts with status planned or published inside the
inclusive range (drafts excluded).
```
days = end − start + 1;  weeks = days / 7
targetTotal = targetPostsPerWeek × weeks
postsPerWeek = round2(calendarPosts / weeks)
coveragePct  = round2(calendarPosts / targetTotal × 100)
gapDays      = every date in range with no calendar post (with weekday)
formatMix    = per-format count, pct of calendar posts, target pct,
               deviation = round2(pct − target)
perWeek      = counts in consecutive 7-day blocks from the range start
```

**Recommendations** (`buildRecommendations`), in order:
1. Best format (highest avgScore) — priority high.
2. Weakest format — only when best − worst ≥ 2 points — medium.
3. Best slot (highest avgScore) — high.
4. Coverage — only when coveragePct < 100 — high; evidence carries
   posts, target, pct and gap count, and the detail states how many
   posts to add.
5. Mix — one per format with |deviation| > 10 points — medium.

**Analysis runs** persist avgScore (mean of published scores, 2 dp),
best format/slot, coverage % and gap count for the run's period
(default 2026-11-02 → 2026-11-29), plus every recommendation with its
evidence JSON.

## 4. Data model (11 tables, database/schema.sql)

users, sessions, brands, brand_settings (cadence + mix targets),
channels (unique per brand+platform), posts (metrics + stored
engine score), analysis_runs, recommendations (evidence JSON), tasks,
reports, notifications. Every domain row carries `brand_id`; reads for
another brand's rows return 404. Passwords are scrypt-hashed with a
per-user salt (`utils/tokens.js`); sessions are opaque 32-byte tokens
with 30-day expiry.

## 5. Endpoint inventory (28 under /api/v1, plus GET /health)

Auth 5 (register, login, logout, GET me, PUT me) · Brand 2 (GET, PUT)
· Channels 3 (GET, POST, DELETE :id) · Posts 5 (GET, POST, GET :id,
PUT :id, DELETE :id) · Analytics 4 (dashboard, analytics/formats,
analytics/slots, analytics/coverage) · Analysis 2 (POST
analysis-runs, GET analysis-runs/:id) · Tasks 3 (GET, POST, PATCH :id)
· Reports 2 (GET, POST) · Notifications 2 (GET, PATCH read).

## 6. File inventory (40 files)

```
README.md  PRD.md  TRD.md  VERIFICATION.md  PROJECT-DETAILS.md
backend/README.md  backend/package.json
backend/src/server.js  backend/src/app.js  backend/src/db.js
backend/src/seed-data.js  backend/src/seed.js
backend/src/marketing/engine.js
backend/src/middleware/auth.js  backend/src/middleware/errors.js  backend/src/middleware/validate.js
backend/src/routes/auth.js  backend/src/routes/content.js  backend/src/routes/misc.js
backend/src/utils/respond.js  backend/src/utils/tokens.js
database/README.md  database/schema.sql  database/seed.sql
web/index.html  web/app.js  web/styles.css
tests/run-tests.js
preview/make_screenshots.py  preview/shot-config.json
screenshots/01-dashboard.png … 10-reports-help.png (10 PNGs, 1440×900)
```

## 7. Testing approach

`tests/run-tests.js` spawns the real server on a fresh temporary
SQLite database (port 4739) and drives it over HTTP: seeded-value
checks, auth/role/scoping checks, CRUD, and 30 labelled
expected-output cases (CG-S1…CG-S8, CG-01…CG-22) whose expected values
are computed by hand from the fixtures — scores from the weighting
formula, roll-up means from the fixture scores, coverage/gap/mix
figures from the fixture calendars — not copied from engine output.
`node --check` passes on every JS file.

## 8. Production notes

- Refresh post metrics from the Meta, TikTok and LinkedIn platform
  APIs on a schedule (the documented backlog); the engine and schema
  need no change — only the ingestion path.
- Put the process behind HTTPS, rotate session tokens on password
  change, and back up the SQLite file (or move to a managed Postgres
  with the same schema shape) for multi-brand scale.
- Rate-limit auth endpoints; add CSRF protection if cookie sessions
  replace bearer tokens.
