"use strict";
// Dashboard, analytics roll-ups, coverage, analysis runs (with the
// recommendations the engine derives), content tasks, reports and
// notifications. Every analytics number is computed live by the engine
// from the brand's stored posts, with its breakdown in the response.
const { getDb } = require("../db");
const { ok, fail } = require("../utils/respond");
const { requireAuth, myBrand } = require("../middleware/auth");
const { requireFields } = require("../middleware/validate");
const { refCode } = require("../utils/tokens");
const { formatRollups, slotRollups, coverageAnalysis, analyse } = require("../marketing/engine");
const { runAnalysis, rowToPost, settingsFor } = require("../seed");
const { postShape } = require("./content");

function allPosts(db, brandId) {
  return db.prepare("SELECT * FROM posts WHERE brand_id = ? ORDER BY scheduled_date, id").all(brandId).map(rowToPost);
}
function period(req) {
  return { start: (req.query && req.query.start) || "2026-11-02", end: (req.query && req.query.end) || "2026-11-29" };
}
const runShape = (r) => ({ id: r.id, reference: r.reference, periodStart: r.period_start, periodEnd: r.period_end,
  publishedPosts: r.published_posts, avgScore: r.avg_score, bestFormat: r.best_format, bestSlot: r.best_slot,
  coveragePct: r.coverage_pct, gapCount: r.gap_count, recommendationCount: r.recommendation_count,
  triggeredBy: r.triggered_by, createdAt: r.created_at });
const recShape = (r) => ({ id: r.id, runId: r.run_id, type: r.type, priority: r.priority, title: r.title,
  detail: r.detail, evidence: JSON.parse(r.evidence || "{}"), createdAt: r.created_at });
const taskShape = (t) => ({ id: t.id, title: t.title, detail: t.detail, status: t.status,
  assignee: t.assignee, dueDate: t.due_date, createdAt: t.created_at, updatedAt: t.updated_at });
const reportShape = (r) => ({ id: r.id, runId: r.run_id, reference: r.reference, title: r.title,
  summary: r.summary, avgScore: r.avg_score, createdBy: r.created_by, createdAt: r.created_at });

module.exports = [
  // ---- Dashboard ----
  ["GET", "/api/v1/dashboard", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const posts = allPosts(db, b.id);
    const st = settingsFor(db, b.id);
    const p = period(req);
    const a = analyse(posts, { ...p, targetPostsPerWeek: st.targetPostsPerWeek, targetMix: st.targetMix });
    const run = db.prepare("SELECT * FROM analysis_runs WHERE brand_id = ? ORDER BY id DESC LIMIT 1").get(b.id) || null;
    return ok(res, { brand: { id: b.id, name: b.name, slug: b.slug, sector: b.sector, location: b.location },
      stats: { posts: posts.length, published: posts.filter((x) => x.status === "published").length,
        planned: posts.filter((x) => x.status === "planned").length,
        channels: db.prepare("SELECT COUNT(*) AS n FROM channels WHERE brand_id = ?").get(b.id).n,
        totalFollowers: db.prepare("SELECT COALESCE(SUM(followers),0) AS n FROM channels WHERE brand_id = ?").get(b.id).n,
        openTasks: db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE brand_id = ? AND status != 'done'").get(b.id).n,
        reports: db.prepare("SELECT COUNT(*) AS n FROM reports WHERE brand_id = ?").get(b.id).n },
      avgScore: a.avgScore, bestFormat: a.formats[0] || null, bestSlot: a.slots[0] || null,
      coverage: a.coverage, latestRun: run ? runShape(run) : null,
      topPosts: db.prepare("SELECT * FROM posts WHERE brand_id = ? AND status = 'published' ORDER BY engagement_score DESC LIMIT 5")
        .all(b.id).map(postShape) });
  }],
  // ---- Analytics roll-ups ----
  ["GET", "/api/v1/analytics/formats", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const formats = formatRollups(allPosts(getDb(), b.id));
    return ok(res, { formats, model: "score = (likes + 3*comments + 4*shares + 2*saves) / reach * 100; averages are the mean of per-post scores" });
  }],
  ["GET", "/api/v1/analytics/slots", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const slots = slotRollups(allPosts(getDb(), b.id));
    return ok(res, { slots, model: "slots are weekday (from the scheduled date) x daypart, published posts only" });
  }],
  ["GET", "/api/v1/analytics/coverage", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb(); const st = settingsFor(db, b.id); const p = period(req);
    const coverage = coverageAnalysis(allPosts(db, b.id),
      { ...p, targetPostsPerWeek: st.targetPostsPerWeek, targetMix: st.targetMix });
    return ok(res, { coverage });
  }],
  // ---- Analysis runs ----
  ["POST", "/api/v1/analysis-runs", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    if (!db.prepare("SELECT COUNT(*) AS n FROM posts WHERE brand_id = ? AND status = 'published'").get(b.id).n)
      return fail(res, 400, "NO_POSTS", "Add at least one published post before running an analysis");
    const per = { start: (req.body && req.body.start) || "2026-11-02", end: (req.body && req.body.end) || "2026-11-29" };
    const { run, result } = runAnalysis(db, b, req.user.full_name, per);
    const recs = db.prepare("SELECT * FROM recommendations WHERE run_id = ? ORDER BY id").all(run.id).map(recShape);
    return ok(res, { run: runShape(run), result: { publishedPosts: result.publishedPosts, avgScore: result.avgScore,
      formats: result.formats, slots: result.slots, coverage: result.coverage }, recommendations: recs }, 201);
  }],
  ["GET", "/api/v1/analysis-runs/:id", requireAuth, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const run = db.prepare("SELECT * FROM analysis_runs WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!run) return fail(res, 404, "RUN_NOT_FOUND", "Analysis run not found");
    const recs = db.prepare("SELECT * FROM recommendations WHERE run_id = ? ORDER BY id").all(run.id).map(recShape);
    return ok(res, { run: runShape(run), recommendations: recs });
  }],
  // ---- Content tasks ----
  ["GET", "/api/v1/tasks", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    let rows = getDb().prepare("SELECT * FROM tasks WHERE brand_id = ? ORDER BY id DESC").all(b.id);
    if (req.query.status) rows = rows.filter((t) => t.status === req.query.status);
    const counts = { open: 0, in_progress: 0, done: 0 };
    for (const t of getDb().prepare("SELECT status, COUNT(*) AS n FROM tasks WHERE brand_id = ? GROUP BY status").all(b.id))
      counts[t.status] = t.n;
    return ok(res, { tasks: rows.map(taskShape), counts });
  }],
  ["POST", "/api/v1/tasks", requireAuth, async (req, res) => {
    requireFields(req.body, ["title"]);
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const info = db.prepare("INSERT INTO tasks (brand_id, title, detail, assignee, due_date) VALUES (?, ?, ?, ?, ?)")
      .run(b.id, req.body.title, req.body.detail || "", req.body.assignee || "", req.body.dueDate || "");
    return ok(res, { task: taskShape(db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid)) }, 201);
  }],
  ["PATCH", "/api/v1/tasks/:id", requireAuth, async (req, res, params) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const t = db.prepare("SELECT * FROM tasks WHERE id = ? AND brand_id = ?").get(Number(params.id), b.id);
    if (!t) return fail(res, 404, "TASK_NOT_FOUND", "Task not found");
    if (req.body.status !== undefined && !["open", "in_progress", "done"].includes(req.body.status))
      return fail(res, 400, "BAD_STATUS", "Status must be open, in_progress or done");
    db.prepare("UPDATE tasks SET status = ?, assignee = ?, updated_at = datetime('now') WHERE id = ?")
      .run(req.body.status ?? t.status, req.body.assignee ?? t.assignee, t.id);
    return ok(res, { task: taskShape(db.prepare("SELECT * FROM tasks WHERE id = ?").get(t.id)) });
  }],
  // ---- Reports ----
  ["GET", "/api/v1/reports", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const rows = getDb().prepare("SELECT * FROM reports WHERE brand_id = ? ORDER BY id DESC").all(b.id);
    return ok(res, { reports: rows.map(reportShape) });
  }],
  ["POST", "/api/v1/reports", requireAuth, async (req, res) => {
    const b = myBrand(req); if (!b) return fail(res, 404, "NO_BRAND", "No brand is attached to this account");
    const db = getDb();
    const run = db.prepare("SELECT * FROM analysis_runs WHERE brand_id = ? ORDER BY id DESC LIMIT 1").get(b.id);
    if (!run) return fail(res, 404, "NO_RUN", "No analysis run exists for this brand yet");
    const summary = "Average engagement score " + run.avg_score + " across " + run.published_posts +
      " published posts. Best format: " + run.best_format + ". Best slot: " + run.best_slot +
      ". Calendar coverage for " + run.period_start + " to " + run.period_end + ": " + run.coverage_pct +
      "% with " + run.gap_count + " gap days.";
    const info = db.prepare(`INSERT INTO reports (brand_id, run_id, reference, title, summary, avg_score, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(b.id, run.id, refCode("RPT"), req.body.title || ("Content performance summary — " + b.name),
        summary, run.avg_score, req.user.full_name);
    return ok(res, { report: reportShape(db.prepare("SELECT * FROM reports WHERE id = ?").get(info.lastInsertRowid)) }, 201);
  }],
  // ---- Notifications ----
  ["GET", "/api/v1/notifications", requireAuth, async (req, res) =>
    ok(res, { notifications: getDb().prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(req.user.id) })],
  ["PATCH", "/api/v1/notifications/read", requireAuth, async (req, res) => {
    getDb().prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user.id);
    return ok(res, { markedRead: true });
  }],
];
module.exports.runShape = runShape;
