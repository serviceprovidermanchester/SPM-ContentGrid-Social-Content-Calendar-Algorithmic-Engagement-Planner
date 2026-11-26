# VERIFICATION — ContentGrid

## Method

1. `node --check` on every JavaScript file — all pass.
2. `node tests/run-tests.js` — boots the real server on a fresh
   temporary SQLite database (port 4739) and drives it over HTTP:
   seeded showcase values, auth/roles/scoping, CRUD, and 30 labelled
   expected-output cases (CG-S1…CG-S8, CG-01…CG-22) whose expected
   values were computed by hand from the fixtures (scores from the
   weighting formula, roll-up means from the fixture scores,
   coverage/gap/mix figures from the fixture calendars).
3. `python3 preview/make_screenshots.py` — renders the 10 views at
   1440×900 in the product palette from the seeded data; dashboard
   and coverage renders were visually inspected against the live API
   output (values match; no overlaps or defects).
4. Forbidden-word scan over the whole folder — clean.

## Result

```
62 passed, 0 failed
```

## Key evidence (real values from the live run)

- Health: 1 brand, 29 posts, 3 channels loaded.
- CG-S1 seeded average engagement **7.27** (87.25 / 12 published
  posts); channel followers total **56,400**.
- CG-S2/CG-S3 format roll-ups: **Reel 9.33** ((9.5+11+7.5)/3),
  **Video 8.42**, **Carousel 6.83**, **Image 4.5** — 3 posts and
  6,000 reach each; best slot **Wednesday evening 11**.
- CG-S4–CG-S6 November coverage: **17 of 20 target posts = 85%**,
  4.25/week, **11 gap days**; per-week counts 4, 5, 3, 5; mix Reel
  35.29% / Carousel 23.53% / Image 17.65% / Video 23.53%.
- CG-S7 Thursday evening slot **8.88** across 2 posts ((8 + 9.75)/2).
- CG-01 the documented fixture scores exactly **9.5**, numerator
  **190** (100 + 3×10 + 4×5 + 2×20); CG-10 updating its likes to 200
  recomputes to **14.5**; CG-03 zero reach scores **0**.
- CG-11–CG-17 coverage fixtures: 8 posts over 2 weeks = **80%** with
  gaps exactly on 2026-11-06/07/08/12/13/15; a draft does not count;
  a published post lifts it to **90%**; lowering the cadence target
  to 4/week re-derives **112.5%**.
- CG-18–CG-22 analysis fixtures: average **7.92**; best-format
  evidence Reel **10.25** over 2 posts; best slot Wednesday evening
  **11**; weakest-format gap **7** points; coverage recommendation
  evidence 0 of 20 posts, 0%, 28 gap days.
- Seeded analysis run (live check): avgScore 7.27, bestFormat Reel,
  bestSlot Wednesday evening, coveragePct 85, gapCount 11,
  recommendationCount **4** (Lead with Reel; Rework or retire Image;
  Best slot: Wednesday evening; Close the coverage gap).
- Re-running the seeded analysis reproduces 7.27 and 9.33 exactly
  (deterministic engine).

## Test output (excerpt)

```
PASS  health reports the seeded brand, 29 posts and 3 channels - brands=1, posts=29, channels=3
PASS  CG-S1 seeded dashboard: 12 published, 17 planned, average score 7.27 (87.25/12)
PASS  CG-S3 seeded format roll-ups: Reel 9.33, Video 8.42, Carousel 6.83, Image 4.5 (3 posts each, reach 6,000 each)
PASS  CG-S4 seeded November coverage: 17 of 20 target posts = 85%, 4.25/week, 11 gap days
PASS  CG-01 documented example scores exactly 9.5: (100 + 3*10 + 4*5 + 2*20) / 2000 * 100, numerator 190
PASS  CG-05 Reel roll-up: (9.5 + 11 + 7.5) / 3 = 9.33, 3 posts, numerator 560, reach 6,000
PASS  CG-12 gap days are exactly 2026-11-06, 07, 08, 12, 13, 15 (6 gaps)
PASS  CG-13 format mix: Reel 50% (4/8, +10 vs 40% target), Carousel 25% (2/8, on target), Image 12.5%, Video 12.5%
PASS  CG-17 with a 4/week target the same 9 posts give 9/8 = 112.5% coverage
PASS  CG-19 best-format recommendation: Reel averages (9.5 + 11) / 2 = 10.25 across 2 posts
PASS  CG-22 coverage recommendation: an empty November calendar is 0 of 20 posts, 0%, 28 gap days
PASS  re-running the seeded analysis reproduces average 7.27 and Reel 9.33 exactly (deterministic engine)

62 passed, 0 failed
```

## Artefacts

- 40 files · 10 views · 10 screenshots (1440×900, 38–74 KB each) ·
  28 API endpoints + GET /health · 11 SQLite tables.
- Screenshots rendered from `preview/shot-config.json`, which carries
  the same seeded values the API returns (avg 7.27, Reel 9.33,
  coverage 85%, 11 gap days, mix percentages as above).
