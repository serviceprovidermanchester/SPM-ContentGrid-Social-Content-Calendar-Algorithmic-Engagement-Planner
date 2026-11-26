"use strict";
// Seeds ContentGrid on first start (idempotent): the showcase business
// (Northern Quarter Hospitality Group, Manchester), its owner and staff
// accounts, three platform channels, 12 published posts with seeded
// metrics, a 17-post November planned calendar, one analysis run
// produced by the real engine over those posts, starter tasks, a
// summary report and notifications. createBrand() is also used by
// registration, so a new account gets its own empty brand workspace
// with default cadence and mix targets.
const { getDb } = require("./db");
const { PRODUCT, BRAND, SETTINGS, CHANNELS, POSTS } = require("./seed-data");
const { engagementScore, analyse } = require("./marketing/engine");
const { hashPassword, refCode } = require("./utils/tokens");

function slugify(s) {
  return String(s || "my-brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "my-brand";
}
function uniqueSlug(db, base) {
  let slug = base, n = 2;
  while (db.prepare("SELECT id FROM brands WHERE slug = ?").get(slug)) slug = base + "-" + (n++);
  return slug;
}
function createBrand(db, ownerUserId, fields) {
  const info = db.prepare(`INSERT INTO brands (owner_user_id, name, slug, sector, location)
    VALUES (?, ?, ?, ?, ?)`)
    .run(ownerUserId, fields.name, uniqueSlug(db, slugify(fields.slug || fields.name)),
      fields.sector || "", fields.location || "");
  const brandId = info.lastInsertRowid;
  db.prepare("UPDATE users SET brand_id = ? WHERE id = ?").run(brandId, ownerUserId);
  db.prepare(`INSERT INTO brand_settings (brand_id, target_posts_per_week, target_reel_pct,
    target_carousel_pct, target_image_pct, target_video_pct, notify_on_gap) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(brandId, SETTINGS.targetPostsPerWeek, SETTINGS.targetReelPct, SETTINGS.targetCarouselPct,
      SETTINGS.targetImagePct, SETTINGS.targetVideoPct, SETTINGS.notifyOnGap);
  return db.prepare("SELECT * FROM brands WHERE id = ?").get(brandId);
}
function settingsFor(db, brandId) {
  const s = db.prepare("SELECT * FROM brand_settings WHERE brand_id = ?").get(brandId);
  if (!s) return { targetPostsPerWeek: 5, targetMix: { Reel: 40, Carousel: 25, Image: 15, Video: 20 } };
  return { targetPostsPerWeek: s.target_posts_per_week,
    targetMix: { Reel: s.target_reel_pct, Carousel: s.target_carousel_pct,
      Image: s.target_image_pct, Video: s.target_video_pct } };
}
function rowToPost(r) {
  return { id: r.id, brandId: r.brand_id, channelId: r.channel_id, platform: r.platform,
    title: r.title, caption: r.caption, format: r.format, status: r.status,
    scheduledDate: r.scheduled_date, daypart: r.daypart, reach: r.reach, likes: r.likes,
    comments: r.comments, shares: r.shares, saves: r.saves, engagementScore: r.engagement_score };
}
function insertPost(db, brandId, p, channelByPlatform) {
  const score = p.status === "published" ? engagementScore(p).score : 0;
  return db.prepare(`INSERT INTO posts (brand_id, channel_id, platform, title, caption, format, status,
      scheduled_date, daypart, reach, likes, comments, shares, saves, engagement_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(brandId, channelByPlatform ? (channelByPlatform[p.platform] || null) : null,
      p.platform, p.title, p.caption || "", p.format, p.status || "planned",
      p.scheduledDate, p.daypart, p.reach || 0, p.likes || 0, p.comments || 0,
      p.shares || 0, p.saves || 0, score);
}
// Run the engine over a brand's stored posts and persist the run +
// recommendations. Shared by the seed and POST /api/v1/analysis-runs.
function runAnalysis(db, brand, triggeredBy, period) {
  const rows = db.prepare("SELECT * FROM posts WHERE brand_id = ? ORDER BY scheduled_date, id").all(brand.id);
  const posts = rows.map(rowToPost);
  const st = settingsFor(db, brand.id);
  const start = (period && period.start) || "2026-11-02";
  const end = (period && period.end) || "2026-11-29";
  const result = analyse(posts, { start, end, targetPostsPerWeek: st.targetPostsPerWeek, targetMix: st.targetMix });
  const reference = refCode("ANA");
  const info = db.prepare(`INSERT INTO analysis_runs (brand_id, reference, period_start, period_end,
      published_posts, avg_score, best_format, best_slot, coverage_pct, gap_count,
      recommendation_count, triggered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(brand.id, reference, start, end, result.publishedPosts, result.avgScore,
      result.formats[0] ? result.formats[0].format : "", result.slots[0] ? result.slots[0].slot : "",
      result.coverage ? result.coverage.coveragePct : 0, result.coverage ? result.coverage.gapCount : 0,
      result.recommendations.length, triggeredBy || "");
  const runId = info.lastInsertRowid;
  const ins = db.prepare(`INSERT INTO recommendations (brand_id, run_id, type, priority, title, detail, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const r of result.recommendations)
    ins.run(brand.id, runId, r.type, r.priority, r.title, r.detail, JSON.stringify(r.evidence));
  return { run: db.prepare("SELECT * FROM analysis_runs WHERE id = ?").get(runId), result };
}
function seed() {
  const db = getDb();
  if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) return;
  const owner = db.prepare("INSERT INTO users (full_name, email, role, password_hash) VALUES (?, ?, 'owner', ?)")
    .run(PRODUCT.ownerName, PRODUCT.ownerEmail, hashPassword(PRODUCT.ownerPassword));
  const ownerId = owner.lastInsertRowid;
  const brand = createBrand(db, ownerId, BRAND);
  const bid = brand.id;
  db.prepare("INSERT INTO users (full_name, email, role, brand_id, password_hash) VALUES (?, ?, 'staff', ?, ?)")
    .run(PRODUCT.staffName, PRODUCT.staffEmail, bid, hashPassword(PRODUCT.staffPassword));
  const channelByPlatform = {};
  for (const c of CHANNELS) {
    const info = db.prepare("INSERT INTO channels (brand_id, platform, handle, followers) VALUES (?, ?, ?, ?)")
      .run(bid, c.platform, c.handle, c.followers);
    channelByPlatform[c.platform] = info.lastInsertRowid;
  }
  for (const p of POSTS) insertPost(db, bid, p, channelByPlatform);
  const { run, result } = runAnalysis(db, brand, PRODUCT.ownerName);
  const taskSeeds = [
    ["Film the November menu launch reel", "Best format is Reel — shoot for the Monday morning slot.", "in_progress", PRODUCT.staffName, "2026-11-02"],
    ["Close 3 coverage gaps in week 3", "Week of 16 Nov has 3 posts against a target of 5.", "open", "", "2026-11-16"],
    ["Rework the Image format creative", "Image averages the lowest engagement of the four formats.", "open", PRODUCT.staffName, "2026-11-20"],
  ];
  for (const [title, detail, status, assignee, due] of taskSeeds)
    db.prepare(`INSERT INTO tasks (brand_id, title, detail, status, assignee, due_date) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(bid, title, detail, status, assignee, due);
  db.prepare(`INSERT INTO reports (brand_id, run_id, reference, title, summary, avg_score, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(bid, run.id, refCode("RPT"), "Content performance summary — " + BRAND.name,
      "Average engagement score " + result.avgScore + " across " + result.publishedPosts + " published posts. " +
      "Best format: " + (result.formats[0] ? result.formats[0].format + " (" + result.formats[0].avgScore + ")" : "n/a") +
      ". Best slot: " + (result.slots[0] ? result.slots[0].slot + " (" + result.slots[0].avgScore + ")" : "n/a") +
      ". November calendar coverage " + result.coverage.coveragePct + "% (" + result.coverage.calendarPosts +
      " of " + result.coverage.targetTotal + " target posts) with " + result.coverage.gapCount + " gap days.",
      result.avgScore, PRODUCT.ownerName);
  db.prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'analysis', ?, ?)")
    .run(ownerId, "Analysis " + run.reference + " complete",
      BRAND.name + " averages " + result.avgScore + " engagement; best slot " +
      (result.slots[0] ? result.slots[0].slot : "n/a") + ".");
  db.prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system', ?, ?)")
    .run(ownerId, "Welcome to ContentGrid", "Your November calendar for " + BRAND.name + " is ready to review.");
}
module.exports = { seed, createBrand, slugify, runAnalysis, rowToPost, insertPost, settingsFor };
