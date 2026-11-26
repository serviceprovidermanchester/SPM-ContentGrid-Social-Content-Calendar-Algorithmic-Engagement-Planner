# 09 — Digital Product & Ads Management: 10 Complete Products

**Series status: ✅ Complete — all 10 products built, live-verified, zipped and uploaded to Google Drive ("SPManchester Portfolio Projects / 09 - Digital Product & Ads").**

Service #9 in SPManchester's portfolio programme (after 01 Web Development, 02 Mobile App Development, 03 Software Development, 04 eCommerce, 05 Artificial Intelligence, 06 Graphic Design & UI/UX, 07 SEO, 08 IT Consultancy — 80/100 before this series, **90/100 after**). Every product is a complete product built by SPManchester: a working web console (10 views, every view wired to the API) served by its own zero-dependency Node.js backend (node:http / node:sqlite / node:crypto only) + SQLite database, with the marketing/product logic implemented **locally in code** — saturation-curve budget allocation and ROAS forecasting, a pooled two-proportion z-test for A/B significance, pacing projection, launch readiness and runway maths, constant-elasticity pricing, funnel leak costing, engagement and list-health scoring, and cohort retention/LTV — over **seeded local datasets** for fictional Manchester businesses, so every behaviour is verified offline against labelled test cases with hand-computed expected outputs. In a production engagement the tools connect to the real platform APIs (Meta Marketing API, Google Ads API, GA4, TikTok, email platforms such as Klaviyo/Mailchimp, affiliate networks, product analytics — listed in each PRD backlog); no product claims a live ad-platform connection or real client campaign results. Series plan: SERIES-PLAN.md.

| # | Product | Folder / ZIP | Views = Screenshots | Endpoints | Tables | Live tests |
|---|---------|--------------|--------------------|-----------|--------|------------|
| 1 | SpendPilot — ads budget allocator & ROAS forecaster | spm-ads-spendpilot-budget-allocator | 10 = 10 | 26 | 11 | 53/53 |
| 2 | SplitLens — A/B creative test analyser | spm-ads-splitlens-ab-analyser | 10 = 10 | 27 | 11 | 84/84 |
| 3 | PaceGuard — campaign performance & pacing dashboard | spm-ads-paceguard-campaign-dashboard | 10 = 10 | 28 | 11 | 58/58 |
| 4 | LaunchBoard — product launch planner | spm-product-launchboard-planner | 10 = 10 | 28 | 11 | 51/51 |
| 5 | PriceLab — pricing & offer experiment planner | spm-product-pricelab-experiments | 10 = 10 | 28 | 12 | 51/51 |
| 6 | FunnelScope — marketing funnel analyser | spm-ads-funnelscope-analyser | 10 = 10 | 27 | 12 | 59/59 |
| 7 | ContentGrid — social content calendar & engagement planner | spm-ads-contentgrid-calendar | 10 = 10 | 28 | 11 | 62/62 |
| 8 | InboxPulse — email campaign planner & list-health checker | spm-ads-inboxpulse-email-planner | 10 = 10 | 27 | 11 | 56/56 |
| 9 | CohortCurve — product retention & cohort analyser | spm-product-cohortcurve-retention | 10 = 10 | 28 | 11 | 47/47 |
| 10 | PartnerTrack — influencer & affiliate campaign tracker | spm-ads-partnertrack-affiliate | 10 = 10 | 27 | 11 | 50/50 |

**Series totals: 413 files, 100 views = 100 screenshots, 274 endpoints, 112 tables, 571 live tests passing (571/571).**

## Product summaries

1. **SpendPilot** — Fern & Flint Homeware (Didsbury) across Meta/Google/TikTok/Pinterest/Email: seeded totals £17,000 spend / £59,000 revenue reconcile to **ROAS 3.47, CPA £16.19**; the saturation forecast puts Meta at exactly **£20,000 at spend = K**; a £10,000 budget allocates Meta 4,000 / Google 3,000 / TikTok 1,000 / Pinterest 1,000 / Email 1,000, sums exactly, and forecasts **£51,083.33**; the optimised split beats the current split by exactly **£589.61 (0.91%)** at £17,000.
2. **SplitLens** — Vale & Thread (Northern Quarter) creative tests: the canonical A 1,000/100 vs B 1,000/130 gives pooled p̂ 0.115, SE 0.014267, **z = 2.1027, p = 0.035488**, CI [+0.002068, +0.057932], winner B; a 500/50 vs 500/55 test is correctly not significant (p = 0.606); 10%→13% needs **1,772 visitors/variant**.
3. **PaceGuard** — Pennine Homes Group (Salford Quays), 8 campaigns at day 10 of 30: flagship £900 of £3,000 → expected £1,000, pacing **90.0%**, projected £2,700; band edges proven at 89.9 UNDER / 110.0 ON TRACK / 110.1 OVER; account roll-up budget £24,000, pacing **101.1%**, exactly **7 alerts**.
4. **LaunchBoard** — Alder & Ash Wellness (Altrincham): readiness exactly **75.0%** from weighted phase contributions 32+12+16+5+10; runway **£120,000 ÷ £15,000 = 8.0 months** with the launch 122 days inside the buffered deadline; risk band edges proven from 4 (low) to 25 (critical).
5. **PriceLab** — Chorlton Roast Co. subscriptions: at 1,000 units @ £50, cost £30, elasticity −1.5, the £40–£60 grid returns **profit-optimal £60 (£22,821.77)** and **revenue-optimal £40 (£55,901.70)**; a 20% discount needs **+100% volume** to break even, 50% off is correctly unrecoverable; experiment sizing 196/variant and 8,146/variant cases proven.
6. **FunnelScope** — SkillForge Training (MediaCity): 10,000 → 4,000 → 1,000 → 250 at £80 gives conversions **40/25/25%** and leak costs **£30,000 / £60,000 / £60,000 = £150,000 recoverable**, with fix-priority order 2 → 3 → 1 and benchmark gaps −10/−5/+5 pts.
7. **ContentGrid** — Northern Quarter Hospitality Group: the documented engagement fixture scores exactly **9.5**; Reel averages **9.33** vs Image 4.5; best slot Wednesday evening (11); November coverage **17 of 20 target posts (85%)** with 11 gap days.
8. **InboxPulse** — Willow & Grey Homeware (Didsbury), 25k list: main list health exactly **55 (At risk)** from components 10+12+20+3; risk edges pinned at 29 LOW / 30 MEDIUM / 59 MEDIUM / 60 HIGH; the +50% warm-up ramp reaches 25,000 in exactly **9 weeks**; roll-up revenue **£0.2357/send**.
9. **CohortCurve** — PulseFit (Salford): the Jul 2025 cohort (200 signups) reads exactly **100/75/55/40/30/27%**; period averages **100/80/60/45/36/27** under the age rule; expected lifetime **3.48 months** and LTV **£34.80** to the penny (1,250p × 80% × 3.48).
10. **PartnerTrack** — Velvet Rose Beauty (Altrincham), 10 creators: the top partner's £10,000 at 12% yields £1,200 commission + £250 tier bonus − £60 clawback = **£1,390 net payout**, profit £4,610, ROI 85.53%; the seeded statement totals exactly **£6,308.00** across 10 lines and reconciles; tier edges proven at £4,999/£5,000/£24,999/£25,000.

GitHub: packages are git-ready; proposed repo names/descriptions/topics are in PUBLISH-QUEUE.md for Ali's own upload. Each product's PROJECT-DETAILS.md holds its LinkedIn draft with a [GitHub link] placeholder to fill once its repo is live.
