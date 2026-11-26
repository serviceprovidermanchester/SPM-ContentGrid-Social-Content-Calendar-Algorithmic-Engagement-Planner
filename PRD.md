# PRD — ContentGrid (Social Content Calendar & Engagement Planner)

## 1. Problem

Social posting in small teams is random: whoever has time posts
whatever format was easiest, at whatever hour. Afterwards nobody can
answer three basic questions — which format earns engagement, which
time slot earns engagement, and whether the forward calendar actually
delivers the intended cadence and format mix. Platform analytics bury
the answers per-post and per-platform, so the calendar never improves.

## 2. Users

- **Brand owner / marketing lead** — owns the cadence and mix targets,
  reads the roll-ups and recommendations, signs off the calendar.
- **Content staff** — plan and publish posts, work the task list,
  add channels, run analyses.
- **Agency operator (SPManchester)** — runs the same workflow across
  client brands, one workspace per brand.

Showcase business: Northern Quarter Hospitality Group, a fictional
hospitality group in Manchester's Northern Quarter, posting across
Instagram, TikTok and LinkedIn.

## 3. Functional requirements (with acceptance criteria)

- **FR1 Accounts & workspaces.** Register creates an owner account and
  an empty brand workspace with default targets (5 posts/week; mix
  Reel 40 / Carousel 25 / Image 15 / Video 20). Acceptance: duplicate
  email → 409; sign-in with a wrong password → 401; unauthenticated
  API access → 401.
- **FR2 Owner scoping & roles.** Every domain row is brand-scoped.
  Acceptance: another brand reading a post or analysis run gets 404;
  staff cannot update brand settings or delete posts/channels (403).
- **FR3 Channels.** One channel per platform per brand (Instagram,
  TikTok, LinkedIn) with handle and followers. Acceptance: duplicate
  platform → 409; dashboard follower total sums the channels (seeded:
  56,400).
- **FR4 Posts.** Create/read/update/delete posts with platform, format
  (Reel, Carousel, Image, Video, Story, Text), status (draft, planned,
  published), scheduled date, daypart and metrics. Acceptance: invalid
  format/platform/daypart/status/date or negative metrics → 400; the
  weekday shown for a post is derived from its scheduled date.
- **FR5 Engagement scoring.** Published posts are scored by the engine
  on every write, never by the client. Acceptance: the documented
  fixture (reach 2,000, likes 100, comments 10, shares 5, saves 20)
  scores exactly 9.5 with numerator 190; zero reach scores 0; updating
  likes to 200 on that fixture recomputes the score to 14.5.
- **FR6 Format & slot roll-ups.** Published-only averages with counts,
  total reach and total weighted interactions. Acceptance: seeded Reel
  9.33, Video 8.42, Carousel 6.83, Image 4.5; Thursday evening slot
  8.88 across its 2 posts.
- **FR7 Coverage analysis.** For a date range: calendar posts vs
  target, posts/week, per-week counts, gap days, format mix vs target.
  Acceptance: seeded November = 17/20 posts, 85%, 4.25/week, 11 gap
  days, mix 35.29/23.53/17.65/23.53; drafts never count; published
  posts do count; changing the cadence target to 4/week re-derives
  coverage (fixture: 112.5%).
- **FR8 Analysis runs & recommendations.** A run persists the roll-ups
  and the derived recommendations with their evidence. Acceptance:
  re-running the seeded analysis reproduces average 7.27 and Reel 9.33
  exactly; a fixture brand's run recommends its best format (10.25),
  best slot (Wednesday evening, 11), weakest format (gap 7 points) and
  its coverage shortfall (0 of 20, 28 gap days).
- **FR9 Tasks, reports, notifications.** Task workflow
  (open → in_progress → done, bad status → 400), reports generated
  from the latest run quoting its real average score, notifications
  listed and markable as read.

## 4. Model behaviour requirements

- The engagement model, weights (likes ×1, comments ×3, shares ×4,
  saves ×2), rounding (2 dp) and the recommendation thresholds
  (weakest-format gap ≥ 2 points; mix deviation > 10 points; coverage
  recommendation below 100%) are exactly as documented in TRD.md and
  implemented in `backend/src/marketing/engine.js`. Any change to a
  weight or threshold is a model change: docs, tests and seeded
  expectations must move together.
- Every computed response carries its breakdown (score components,
  roll-up counts/reach, coverage components, recommendation evidence)
  so a user can reconcile each number by hand.

## 5. KPIs for a production engagement

- Calendar coverage % per month per brand (target: ≥ 95%).
- Share of posts published in the brand's best three slots.
- Average engagement score trend per format, month on month.
- Gap days per month (target: 0 in launch weeks).

## 6. Data honesty

All platform, audience and campaign data in this build is seeded local
data for a fictional Manchester business. No live platform connection
or real client result is claimed anywhere in the product or its docs.

## 7. Backlog (production)

- Live platform integrations: Meta Marketing/Instagram API, TikTok
  API, LinkedIn API for automatic metric refresh (plus Google Ads API,
  GA4, email-platform and affiliate-network APIs for sibling products
  in this series).
- Multi-brand agency console and client read-only sharing links.
- Best-slot auto-scheduling (draft posts placed into the top slots).
- Image/video asset library and approval workflow for posts.
- Export of the calendar and analysis to CSV/PDF for client reporting.
