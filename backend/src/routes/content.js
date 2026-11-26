"use strict";
// Brand profile + settings, platform channels, and content posts (the
// calendar). Post engagement scores are computed by the engine on every
// write, never taken from the client.
const { getDb } = require("../db");
const { ok, fail } = require("../utils/respond");
const { requireAuth, requireOwner, myBrand } = require("../middleware/auth");
const { requireFields } = require("../middleware/validate");
const { engagementScore, weekdayOf, FORMATS, DAYPARTS, PLATFORMS } = require("../marketing/engine");
const { rowToPost } = require("../seed");

function brandShape(db, b) {
  const st = db.prepare("SELECT * FROM brand_settings WHERE brand_id = ?").get(b.id) || {};
  return { id: b.id, name: b.name, slug: b.slug, sector: b.sector, location: b.location,
    settings: { targetPostsPerWeek: st.target_posts_per_week ?? 5,
      targetMix: { Reel: st.target_reel_pct ?? 40, Carousel: st.target_carousel_pct ?? 25,
        Image: st.target_image_pct ?? 15, Video: st.target_video_pct ?? 20 },
      notifyOnGap: !!(st.notify_on_gap ?? 1) } };
}
const postShape = (r) => { const p = rowToPost(r); const s = engagementScore(p);
  return { ...p, weekday: weekdayOf(p.scheduledDate),
    scoreBreakdown: p.status === "published" ? s : null }; };
const channelShape = (c) => ({ id: c.id, platform: c.platform, handle: c.handle, followers: c.followers });
function channelFor(db, brandId, platform) {
  return db.prepare("SELECT * FROM channels WHERE brand_id = ? AND platform = ?").get(brandId, platform) || null;
}
function validPost(body, existing) {
  const fmt = body.format ?? (existing && existing.format);
  if (fmt !== undefined && !FORMATS.includes(fmt)) return "Format must be one of " + FORMATS.join(", ");
  const dp = body.daypart ?? (existing && existing.daypart);
  if (dp !== undefined && !DAYPARTS.includes(dp)) return "Daypart must be one of " + DAYPARTS.join(", ");
  const pf = body.platform ?? (existing && existing.platform);
  if (pf !== undefined && !PLATFORMS.includes(pf)) return "Platform must be one of " + PLATFORMS.join(", ");
  const st = body.status ?? (existing && existing.status);
  if (st !== undefined && !["draft", "planned", "published"].includes(st)) return "Status must be draft, planned or published";
  const date = body.scheduledDate ?? (existing && existing.scheduled_date);
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return "scheduledDate must be YYYY-MM-DD";
  for (const f of ["reach", "likes", "comments", "shares", "saves"]) {
    if (body[f] !== undefined && (!Number.isFinite(Number(body[f])) || Number(body[f]) < 0))
      return f + " must be a non-negative number";
  }
  return null;
}
module.exports = [
  // ---- Brand profile + cadence/mix settings ----
  ["GET", "/api/v1/brand", requireAuth, async (req, res) => {
    const b = myBrand(req);
    if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    return ok(res, { brand: brandShape(getDb(), b) });
  }],
  ["PUT", "/api/v1/brand", requireOwner, async (req, res) => {
    const b = myBrand(req);
    if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    db.prepare("UPDATE brands SET name = ?, sector = ?, location = ? WHERE id = ?")
      .run(req.body.name || b.name, req.body.sector ?? b.sector, req.body.location ?? b.location, b.id);
    const st = req.body.settings;
    if (st && typeof st === "object") {
      const cur = db.prepare("SELECT * FROM brand_settings WHERE brand_id = ?").get(b.id);
      const num = (v, fallback) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback; };
      const mix = st.targetMix || {};
      db.prepare(`UPDATE brand_settings SET target_posts_per_week = ?, target_reel_pct = ?, target_carousel_pct = ?,
          target_image_pct = ?, target_video_pct = ?, notify_on_gap = ? WHERE brand_id = ?`)
        .run(num(st.targetPostsPerWeek, cur.target_posts_per_week),
          num(mix.Reel, cur.target_reel_pct), num(mix.Carousel, cur.target_carousel_pct),
          num(mix.Image, cur.target_image_pct), num(mix.Video, cur.target_video_pct),
          st.notifyOnGap === undefined ? cur.notify_on_gap : (st.notifyOnGap ? 1 : 0), b.id);
    }
    return ok(res, { brand: brandShape(db, db.prepare("SELECT * FROM brands WHERE id = ?").get(b.id)) });
  }],
  // ---- Channels ----
  ["GET", "/api/v1/channels", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const rows = getDb().prepare("SELECT * FROM channels WHERE brand_id = ? ORDER BY followers DESC").all(b.id);
    return ok(res, { channels: rows.map(channelShape),
      totalFollowers: rows.reduce((s, c) => s + c.followers, 0) });
  }],
  ["POST", "/api/v1/channels", requireAuth, async (req, res) => {
    requireFields(req.body, ["platform", "handle"]);
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    if (!PLATFORMS.includes(req.body.platform))
      return fail(res, 400, "BAD_PLATFORM", "Platform must be one of " + PLATFORMS.join(", "));
    const db = getDb();
    if (channelFor(db, b.id, req.body.platform))
      return fail(res, 409, "CHANNEL_EXISTS", "A channel for that platform already exists");
    const info = db.prepare("INSERT INTO channels (brand_id, platform, handle, followers) VALUES (?, ?, ?, ?)")
      .run(b.id, req.body.platform, req.body.handle, Math.max(0, Number(req.body.followers || 0) || 0));
    return ok(res, { channel: channelShape(db.prepare("SELECT * FROM channels WHERE id = ?").get(info.lastInsertRowid)) }, 201);
  }],
  ["DELETE", "/api/v1/channels/:id", requireOwner, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const c = db.prepare("SELECT * FROM channels WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!c) return fail(res, 404, "CHANNEL_NOT_FOUND", "Channel not found");
    db.prepare("DELETE FROM channels WHERE id = ?").run(c.id);
    return ok(res, { deleted: true });
  }],
  // ---- Posts ----
  ["GET", "/api/v1/posts", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    let rows = getDb().prepare("SELECT * FROM posts WHERE brand_id = ? ORDER BY scheduled_date, id").all(b.id);
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    if (req.query.format) rows = rows.filter((r) => r.format === req.query.format);
    if (req.query.from) rows = rows.filter((r) => r.scheduled_date >= req.query.from);
    if (req.query.to) rows = rows.filter((r) => r.scheduled_date <= req.query.to);
    return ok(res, { posts: rows.map(postShape) });
  }],
  ["POST", "/api/v1/posts", requireAuth, async (req, res) => {
    requireFields(req.body, ["title", "format", "scheduledDate"]);
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const bad = validPost(req.body, null);
    if (bad) return fail(res, 400, "BAD_POST", bad);
    const db = getDb();
    const platform = req.body.platform || "Instagram";
    const ch = channelFor(db, b.id, platform);
    const status = req.body.status || "planned";
    const metrics = { reach: Number(req.body.reach || 0), likes: Number(req.body.likes || 0),
      comments: Number(req.body.comments || 0), shares: Number(req.body.shares || 0), saves: Number(req.body.saves || 0) };
    const score = status === "published" ? engagementScore(metrics).score : 0;
    const info = db.prepare(`INSERT INTO posts (brand_id, channel_id, platform, title, caption, format, status,
        scheduled_date, daypart, reach, likes, comments, shares, saves, engagement_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(b.id, ch ? ch.id : null, platform, req.body.title, req.body.caption || "", req.body.format,
        status, req.body.scheduledDate, req.body.daypart || "morning",
        metrics.reach, metrics.likes, metrics.comments, metrics.shares, metrics.saves, score);
    return ok(res, { post: postShape(db.prepare("SELECT * FROM posts WHERE id = ?").get(info.lastInsertRowid)) }, 201);
  }],
  ["GET", "/api/v1/posts/:id", requireAuth, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const r = getDb().prepare("SELECT * FROM posts WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!r) return fail(res, 404, "POST_NOT_FOUND", "Post not found");
    return ok(res, { post: postShape(r) });
  }],
  ["PUT", "/api/v1/posts/:id", requireAuth, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const r = db.prepare("SELECT * FROM posts WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!r) return fail(res, 404, "POST_NOT_FOUND", "Post not found");
    const bad = validPost(req.body, r);
    if (bad) return fail(res, 400, "BAD_POST", bad);
    const merged = { platform: req.body.platform ?? r.platform, title: req.body.title ?? r.title,
      caption: req.body.caption ?? r.caption, format: req.body.format ?? r.format,
      status: req.body.status ?? r.status, scheduledDate: req.body.scheduledDate ?? r.scheduled_date,
      daypart: req.body.daypart ?? r.daypart, reach: Number(req.body.reach ?? r.reach),
      likes: Number(req.body.likes ?? r.likes), comments: Number(req.body.comments ?? r.comments),
      shares: Number(req.body.shares ?? r.shares), saves: Number(req.body.saves ?? r.saves) };
    const ch = channelFor(db, b.id, merged.platform);
    const score = merged.status === "published" ? engagementScore(merged).score : 0;
    db.prepare(`UPDATE posts SET channel_id = ?, platform = ?, title = ?, caption = ?, format = ?, status = ?,
        scheduled_date = ?, daypart = ?, reach = ?, likes = ?, comments = ?, shares = ?, saves = ?,
        engagement_score = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(ch ? ch.id : null, merged.platform, merged.title, merged.caption, merged.format, merged.status,
        merged.scheduledDate, merged.daypart, merged.reach, merged.likes, merged.comments,
        merged.shares, merged.saves, score, r.id);
    return ok(res, { post: postShape(db.prepare("SELECT * FROM posts WHERE id = ?").get(r.id)) });
  }],
  ["DELETE", "/api/v1/posts/:id", requireOwner, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const r = db.prepare("SELECT * FROM posts WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!r) return fail(res, 404, "POST_NOT_FOUND", "Post not found");
    db.prepare("DELETE FROM posts WHERE id = ?").run(r.id);
    return ok(res, { deleted: true });
  }],
];
module.exports.shape = brandShape;
module.exports.postShape = postShape;
