# 09 — Digital Product & Ads Management — Progress

All 10 products built 2026-11-11, each live-verified by its own suite against a fresh database, then personally re-verified by the coordinator (all 10 test suites re-run: **571 passed, 0 failed**; file counts; views == screenshots for every product; `node --check` on every JS file — 173 files, 0 failures; endpoint counts taken from route registrations as reported by builders and stated in each TRD; table counts from schema.sql; smallest screenshot ~38 KB across the series; forbidden-word scan across the whole series — clean), zipped, and uploaded to Google Drive folder "09 - Digital Product & Ads" under "SPManchester Portfolio Projects" (Drive listing verified afterwards — see the delivery report for the folder link and counts).

| # | Product | Files | Views = Screenshots | Endpoints | Tables | Tests | ZIP | Drive |
|---|---------|-------|-------|-----------|--------|-------|-----|-------|
| 1 | SpendPilot — budget allocator | 42 | 10 = 10 | 26 | 11 | 53/53 ✅ | 0.60 MB | ✅ |
| 2 | SplitLens — A/B test analyser | 41 | 10 = 10 | 27 | 11 | 84/84 ✅ | 0.51 MB | ✅ |
| 3 | PaceGuard — pacing dashboard | 41 | 10 = 10 | 28 | 11 | 58/58 ✅ | 0.63 MB | ✅ |
| 4 | LaunchBoard — launch planner | 40 | 10 = 10 | 28 | 11 | 51/51 ✅ | 0.52 MB | ✅ |
| 5 | PriceLab — pricing experiments | 42 | 10 = 10 | 28 | 12 | 51/51 ✅ | 0.52 MB | ✅ |
| 6 | FunnelScope — funnel analyser | 41 | 10 = 10 | 27 | 12 | 59/59 ✅ | 0.54 MB | ✅ |
| 7 | ContentGrid — content calendar | 40 | 10 = 10 | 28 | 11 | 62/62 ✅ | 0.52 MB | ✅ |
| 8 | InboxPulse — email planner | 42 | 10 = 10 | 27 | 11 | 56/56 ✅ | 0.53 MB | ✅ |
| 9 | CohortCurve — retention cohorts | 41 | 10 = 10 | 28 | 11 | 47/47 ✅ | 0.47 MB | ✅ |
| 10 | PartnerTrack — affiliate tracker | 43 | 10 = 10 | 27 | 11 | 50/50 ✅ | 0.58 MB | ✅ |

Totals: 413 files, 100 views = 100 screenshots, 274 endpoints, 112 tables, 571 live tests passing (571/571). Every suite includes a block of labelled expected-output cases with concrete hand-computed values (16–30 per product — ROAS and saturation forecasts, allocation sums under caps, z-statistics and p-values matching the exact normal CDF to 6dp, pacing projections and band edges, elasticity grid winners and break-even uplifts, funnel leak costs, engagement and health scores, cohort matrix cells and LTV, payout statements reconciling to the penny); each product's VERIFICATION.md gives its own count and full PASS list.

Notes:
- Each product has its own engine module (`backend/src/marketing/engine.js`) implementing a different deterministic technique; the shared parts are the platform patterns (auth, routing, persistence, screenshot pipeline) from the earlier series.
- Screenshots are desktop 1440×900 PIL renders in each product's own design system with its real seeded data and engine output; builders visually spot-checked renders and fixed defects found during the build (clipped tables, subtitle/title overlaps were corrected and re-rendered).
- Frontend JS was syntax-checked and structurally verified; the marketing engines and business rules were fully live-tested over HTTP against fresh databases, which is where the logic lives.
- Environment note: mid-build, suites intermittently reported "server did not start" — root cause was the shared /tmp tmpfs (512 MB) reaching 100% from parallel test databases (SQLITE_FULL). Stale test artefacts from earlier series were cleared (100% → 28% used) and every suite was then re-run clean by the coordinator.
- Honesty: no product uses live platform data or any external API. All campaigns, audiences, lists and sales are seeded locally for fictional Manchester businesses; the production integrations (Meta Marketing API, Google Ads API, GA4, TikTok, Klaviyo/Mailchimp, affiliate networks, product analytics) are documented backlog items in every PRD.
- GitHub publishing is Ali's own step: PUBLISH-QUEUE.md lists the proposed repo name, description and topics for every product.
