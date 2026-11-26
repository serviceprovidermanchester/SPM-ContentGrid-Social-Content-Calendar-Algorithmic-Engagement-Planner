"use strict";
/* Live end-to-end tests for ContentGrid. Starts the real server against a
   FRESH temporary database and exercises the product over HTTP: accounts,
   the seeded showcase brand with exact expected values, and labelled
   expected-output cases (CG-01…) where fixture posts are built so their
   scores reconcile by hand — e.g. reach 2,000, likes 100, comments 10,
   shares 5, saves 20 -> numerator 100 + 30 + 20 + 40 = 190 -> score 9.5.
   Run: node tests/run-tests.js — non-zero on failure. */
const { spawn } = require("node:child_process");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const PORT = 4739;
const BASE = "http://127.0.0.1:" + PORT;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "contentgrid-test-"));
const DB = path.join(tmp, "test.sqlite");
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("PASS  " + name + (detail ? " - " + detail : "")); }
  else { failed++; console.log("FAIL  " + name + (detail ? " - " + detail : "")); }
}
async function req(method, p, token, body) {
  const res = await fetch(BASE + p, { method, headers: { "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function makeBrand(email) {
  const reg = await req("POST", "/api/v1/auth/register", null,
    { fullName: "Fixture Owner", email, password: "Owner2026!", brandName: "Fixture Brand " + email });
  return reg.json.data.token;
}
async function addPost(token, post) {
  const r = await req("POST", "/api/v1/posts", token, post);
  if (r.status !== 201) throw new Error("addPost failed: " + JSON.stringify(r.json));
  return r.json.data.post;
}
const pub = (over) => ({ platform: "Instagram", status: "published", reach: 2000,
  likes: 0, comments: 0, shares: 0, saves: 0, ...over });
(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, "..", "backend", "src", "server.js")],
    { env: { ...process.env, PORT: String(PORT), DB_PATH: DB }, stdio: "pipe" });
  let up = false;
  for (let i = 0; i < 50 && !up; i++) { try { const r = await fetch(BASE + "/health"); up = r.ok; } catch { await sleep(200); } }
  if (!up) { console.log("FAIL  server did not start"); process.exit(1); }
  try {
    // ---- Seeded showcase brand: exact expected values ----
    const health = await req("GET", "/health");
    check("health reports the seeded brand, 29 posts and 3 channels",
      health.json.data.brandsLoaded === 1 && health.json.data.postsLoaded === 29 && health.json.data.channelsLoaded === 3,
      "brands=1, posts=29, channels=" + health.json.data.channelsLoaded);
    const login = await req("POST", "/api/v1/auth/login", null, { email: "owner@nqhospitality.co.uk", password: "Owner2026!" });
    check("seeded owner can sign in", login.status === 200, "owner@nqhospitality.co.uk");
    const T = login.json.data.token;
    check("wrong password rejected", (await req("POST", "/api/v1/auth/login", null, { email: "owner@nqhospitality.co.uk", password: "nope" })).status === 401, "HTTP 401");
    check("posts need sign-in", (await req("GET", "/api/v1/posts")).status === 401, "HTTP 401");
    const dash = (await req("GET", "/api/v1/dashboard", T)).json.data;
    check("CG-S1 seeded dashboard: 12 published, 17 planned, average score 7.27 (87.25/12)",
      dash.stats.published === 12 && dash.stats.planned === 17 && dash.avgScore === 7.27 && dash.stats.totalFollowers === 56400,
      "avg=" + dash.avgScore + ", followers=" + dash.stats.totalFollowers);
    check("CG-S2 seeded best format is Reel at 9.33 ((9.5+11+7.5)/3) and best slot Wednesday evening at 11",
      dash.bestFormat.format === "Reel" && dash.bestFormat.avgScore === 9.33 &&
      dash.bestSlot.slot === "Wednesday evening" && dash.bestSlot.avgScore === 11,
      dash.bestFormat.format + "=" + dash.bestFormat.avgScore + ", " + dash.bestSlot.slot + "=" + dash.bestSlot.avgScore);
    const formats = (await req("GET", "/api/v1/analytics/formats", T)).json.data.formats;
    const byFmt = Object.fromEntries(formats.map((f) => [f.format, f]));
    check("CG-S3 seeded format roll-ups: Reel 9.33, Video 8.42, Carousel 6.83, Image 4.5 (3 posts each, reach 6,000 each)",
      byFmt.Reel.avgScore === 9.33 && byFmt.Video.avgScore === 8.42 && byFmt.Carousel.avgScore === 6.83 &&
      byFmt.Image.avgScore === 4.5 && formats.every((f) => f.posts === 3 && f.totalReach === 6000),
      formats.map((f) => f.format + "=" + f.avgScore).join(", "));
    const cov = (await req("GET", "/api/v1/analytics/coverage", T)).json.data.coverage;
    check("CG-S4 seeded November coverage: 17 of 20 target posts = 85%, 4.25/week, 11 gap days",
      cov.calendarPosts === 17 && cov.targetTotal === 20 && cov.coveragePct === 85 && cov.postsPerWeek === 4.25 && cov.gapCount === 11,
      "posts=" + cov.calendarPosts + ", coverage=" + cov.coveragePct + "%, gaps=" + cov.gapCount);
    const mix = Object.fromEntries(cov.formatMix.map((m) => [m.format, m]));
    check("CG-S5 seeded format mix: Reel 35.29% (6/17), Carousel 23.53% (4/17), Image 17.65% (3/17), Video 23.53% (4/17)",
      mix.Reel.pct === 35.29 && mix.Carousel.pct === 23.53 && mix.Image.pct === 17.65 && mix.Video.pct === 23.53 &&
      mix.Reel.deviation === -4.71 && mix.Video.deviation === 3.53,
      cov.formatMix.map((m) => m.format + "=" + m.pct + "%").join(", "));
    check("CG-S6 seeded per-week calendar counts are 4, 5, 3, 5 against a target of 5",
      cov.perWeek.map((w) => w.posts).join(",") === "4,5,3,5" && cov.perWeek.every((w) => w.target === 5),
      cov.perWeek.map((w) => w.posts).join(","));
    const slots = (await req("GET", "/api/v1/analytics/slots", T)).json.data.slots;
    const thuEve = slots.find((s) => s.slot === "Thursday evening");
    check("CG-S7 Thursday evening slot averages 8.88 across 2 posts ((8 + 9.75)/2 = 8.875)",
      !!thuEve && thuEve.avgScore === 8.88 && thuEve.posts === 2, thuEve && (thuEve.slot + "=" + thuEve.avgScore));
    const seededPosts = (await req("GET", "/api/v1/posts?status=published", T)).json.data.posts;
    const first = seededPosts.find((p) => p.title === "Cocktail masterclass highlights");
    check("CG-S8 the showcase Reel scores exactly 9.5 with numerator 190 (100 + 3*10 + 4*5 + 2*20)",
      first.engagementScore === 9.5 && first.scoreBreakdown.numerator === 190 && first.weekday === "Monday",
      "score=" + first.engagementScore + ", numerator=" + first.scoreBreakdown.numerator);
    const seededRun = dash.latestRun;
    check("seeded analysis run is stored with its real coverage and recommendation count",
      !!seededRun && seededRun.coveragePct === 85 && seededRun.gapCount === 11 && seededRun.bestFormat === "Reel",
      seededRun && seededRun.reference);

    // ---- Accounts, scoping, roles ----
    const staffLogin = await req("POST", "/api/v1/auth/login", null, { email: "team@nqhospitality.co.uk", password: "Team2026!" });
    const ST = staffLogin.json.data.token;
    check("staff cannot update the brand profile (owner only)", (await req("PUT", "/api/v1/brand", ST, { name: "Nope" })).status === 403, "HTTP 403");
    check("staff cannot delete a post (owner only)", (await req("DELETE", "/api/v1/posts/" + first.id, ST)).status === 403, "HTTP 403");
    const TA = await makeBrand("fixtures-a@example.co.uk");
    check("register creates an owner with an empty brand workspace", !!TA, "token issued");
    check("duplicate email rejected", (await req("POST", "/api/v1/auth/register", null,
      { fullName: "Copy", email: "fixtures-a@example.co.uk", password: "Owner2026!", brandName: "Copy Brand" })).status === 409, "HTTP 409 EMAIL_TAKEN");
    check("another brand cannot read the seeded brand's post", (await req("GET", "/api/v1/posts/" + first.id, TA)).status === 404, "HTTP 404");
    check("analysis with no published posts is a 400", (await req("POST", "/api/v1/analysis-runs", TA, {})).status === 400, "HTTP 400 NO_POSTS");
    check("post without a title is a 400", (await req("POST", "/api/v1/posts", TA, { format: "Reel", scheduledDate: "2026-10-05" })).status === 400, "HTTP 400");
    check("post with an unknown format is a 400", (await req("POST", "/api/v1/posts", TA,
      { title: "x", format: "Hologram", scheduledDate: "2026-10-05" })).status === 400, "HTTP 400 BAD_POST");

    // ---- Brand A: exact scores and roll-ups ----
    const r1 = await addPost(TA, pub({ title: "A1", format: "Reel", scheduledDate: "2026-10-05", daypart: "morning", likes: 100, comments: 10, shares: 5, saves: 20 }));
    check("CG-01 documented example scores exactly 9.5: (100 + 3*10 + 4*5 + 2*20) / 2000 * 100, numerator 190",
      r1.engagementScore === 9.5 && r1.scoreBreakdown.numerator === 190 &&
      r1.scoreBreakdown.breakdown.commentsWeighted === 30 && r1.scoreBreakdown.breakdown.sharesWeighted === 20 &&
      r1.scoreBreakdown.breakdown.savesWeighted === 40,
      "score=" + r1.engagementScore + ", numerator=" + r1.scoreBreakdown.numerator);
    check("CG-02 weekday is derived from the scheduled date: 2026-10-05 is a Monday",
      r1.weekday === "Monday", r1.weekday);
    const zero = await addPost(TA, pub({ title: "A-zero", format: "Story", scheduledDate: "2026-10-06", daypart: "morning", reach: 0, likes: 50, comments: 5, shares: 5, saves: 5 }));
    check("CG-03 a post with zero reach scores exactly 0 (no division by zero)",
      zero.engagementScore === 0 && zero.scoreBreakdown.numerator === 95, "score=" + zero.engagementScore);
    // Remove the zero-reach Story so Brand A roll-ups stay on the designed set.
    check("owner deletes a post", (await req("DELETE", "/api/v1/posts/" + zero.id, TA)).status === 200, "HTTP 200");
    const commentsOnly = await addPost(TA, pub({ title: "A-comments", format: "Text", platform: "LinkedIn", scheduledDate: "2026-10-06", daypart: "midday", reach: 1000, comments: 10 }));
    check("CG-04 comments alone: 3*10 / 1000 * 100 = exactly 3.0",
      commentsOnly.engagementScore === 3 && commentsOnly.scoreBreakdown.numerator === 30, "score=" + commentsOnly.engagementScore);
    check("owner deletes the comments-only post", (await req("DELETE", "/api/v1/posts/" + commentsOnly.id, TA)).status === 200, "HTTP 200");
    await addPost(TA, pub({ title: "A2", format: "Reel", platform: "TikTok", scheduledDate: "2026-10-07", daypart: "evening", likes: 120, comments: 10, shares: 10, saves: 15 }));
    await addPost(TA, pub({ title: "A3", format: "Reel", scheduledDate: "2026-10-12", daypart: "evening", likes: 80, comments: 10, shares: 5, saves: 10 }));
    await addPost(TA, pub({ title: "A4", format: "Carousel", scheduledDate: "2026-10-06", daypart: "midday", likes: 60, comments: 5, shares: 5, saves: 25 }));
    await addPost(TA, pub({ title: "A5", format: "Carousel", scheduledDate: "2026-10-08", daypart: "evening", likes: 70, comments: 10, shares: 5, saves: 20 }));
    await addPost(TA, pub({ title: "A6", format: "Carousel", scheduledDate: "2026-10-09", daypart: "midday", likes: 50, comments: 5, shares: 0, saves: 20 }));
    await addPost(TA, pub({ title: "A7", format: "Video", platform: "LinkedIn", scheduledDate: "2026-10-08", daypart: "evening", likes: 90, comments: 15, shares: 10, saves: 10 }));
    const fa = (await req("GET", "/api/v1/analytics/formats", TA)).json.data.formats;
    const faBy = Object.fromEntries(fa.map((f) => [f.format, f]));
    check("CG-05 Reel roll-up: (9.5 + 11 + 7.5) / 3 = 9.33, 3 posts, numerator 560, reach 6,000",
      faBy.Reel.avgScore === 9.33 && faBy.Reel.posts === 3 && faBy.Reel.totalNumerator === 560 && faBy.Reel.totalReach === 6000,
      "Reel=" + faBy.Reel.avgScore);
    check("CG-06 Carousel roll-up: (7.25 + 8 + 5.25) / 3 = 6.83; single Video post averages its own 9.75",
      faBy.Carousel.avgScore === 6.83 && faBy.Video.avgScore === 9.75 && faBy.Video.posts === 1,
      "Carousel=" + faBy.Carousel.avgScore + ", Video=" + faBy.Video.avgScore);
    const sa = (await req("GET", "/api/v1/analytics/slots", TA)).json.data.slots;
    check("CG-07 best slot is Wednesday evening at 11 (the 11.0 Reel is the only post in that slot)",
      sa[0].slot === "Wednesday evening" && sa[0].avgScore === 11 && sa[0].posts === 1, sa[0].slot + "=" + sa[0].avgScore);
    const thuA = sa.find((s) => s.slot === "Thursday evening");
    check("CG-08 Thursday evening slot: (8 + 9.75) / 2 = 8.875 -> 8.88 across Carousel + Video",
      !!thuA && thuA.avgScore === 8.88 && thuA.posts === 2, thuA && (thuA.slot + "=" + thuA.avgScore));
    const dashA = (await req("GET", "/api/v1/dashboard", TA)).json.data;
    check("CG-09 Brand A overall average: (28 + 20.5 + 9.75) / 7 = 58.25 / 7 = 8.32",
      dashA.avgScore === 8.32 && dashA.stats.published === 7, "avg=" + dashA.avgScore);
    const upd = await req("PUT", "/api/v1/posts/" + r1.id, TA, { likes: 200 });
    check("CG-10 updating likes to 200 recomputes the score: (200 + 30 + 20 + 40) / 2000 * 100 = 14.5",
      upd.status === 200 && upd.json.data.post.engagementScore === 14.5, "score=" + upd.json.data.post.engagementScore);
    await req("PUT", "/api/v1/posts/" + r1.id, TA, { likes: 100 });

    // ---- Brand B: coverage, gaps, mix ----
    const TB = await makeBrand("fixtures-b@example.co.uk");
    const planned = (d, f) => ({ title: "B " + d + " " + f, format: f, platform: "Instagram", status: "planned", scheduledDate: d, daypart: "morning" });
    for (const [d, f] of [["2026-11-02", "Reel"], ["2026-11-03", "Reel"], ["2026-11-04", "Carousel"], ["2026-11-05", "Image"],
      ["2026-11-09", "Reel"], ["2026-11-10", "Video"], ["2026-11-11", "Carousel"], ["2026-11-14", "Reel"]])
      await addPost(TB, planned(d, f));
    const covB = (await req("GET", "/api/v1/analytics/coverage?start=2026-11-02&end=2026-11-15", TB)).json.data.coverage;
    check("CG-11 coverage over 2 weeks: 8 posts against a target of 10 = 80%, 4 posts/week",
      covB.calendarPosts === 8 && covB.targetTotal === 10 && covB.coveragePct === 80 && covB.postsPerWeek === 4 && covB.days === 14,
      "posts=" + covB.calendarPosts + ", coverage=" + covB.coveragePct + "%");
    check("CG-12 gap days are exactly 2026-11-06, 07, 08, 12, 13, 15 (6 gaps)",
      covB.gapCount === 6 && covB.gapDays.map((g) => g.date).join(",") === "2026-11-06,2026-11-07,2026-11-08,2026-11-12,2026-11-13,2026-11-15",
      covB.gapDays.map((g) => g.date).join(","));
    const mixB = Object.fromEntries(covB.formatMix.map((m) => [m.format, m]));
    check("CG-13 format mix: Reel 50% (4/8, +10 vs 40% target), Carousel 25% (2/8, on target), Image 12.5%, Video 12.5%",
      mixB.Reel.pct === 50 && mixB.Reel.deviation === 10 && mixB.Carousel.pct === 25 && mixB.Carousel.deviation === 0 &&
      mixB.Image.pct === 12.5 && mixB.Video.pct === 12.5,
      covB.formatMix.map((m) => m.format + "=" + m.pct + "%").join(", "));
    check("CG-14 per-week counts are 4 and 4 against a target of 5",
      covB.perWeek.map((w) => w.posts).join(",") === "4,4", covB.perWeek.map((w) => w.posts).join(","));
    await addPost(TB, { title: "B draft", format: "Reel", platform: "Instagram", status: "draft", scheduledDate: "2026-11-06", daypart: "morning" });
    const covB2 = (await req("GET", "/api/v1/analytics/coverage?start=2026-11-02&end=2026-11-15", TB)).json.data.coverage;
    check("CG-15 a draft on a gap day does not count: coverage stays 8 posts and 2026-11-06 stays a gap",
      covB2.calendarPosts === 8 && covB2.gapDays.some((g) => g.date === "2026-11-06"), "posts=" + covB2.calendarPosts);
    await addPost(TB, pub({ title: "B published gap filler", format: "Reel", scheduledDate: "2026-11-15", daypart: "evening", likes: 100, comments: 10, shares: 5, saves: 20 }));
    const covB3 = (await req("GET", "/api/v1/analytics/coverage?start=2026-11-02&end=2026-11-15", TB)).json.data.coverage;
    check("CG-16 a published post counts toward the calendar: 9 posts = 90% coverage, 5 gaps, 4.5/week",
      covB3.calendarPosts === 9 && covB3.coveragePct === 90 && covB3.gapCount === 5 && covB3.postsPerWeek === 4.5,
      "posts=" + covB3.calendarPosts + ", coverage=" + covB3.coveragePct + "%");
    const brandPut = await req("PUT", "/api/v1/brand", TB, { settings: { targetPostsPerWeek: 4 } });
    check("owner can lower the cadence target to 4 posts/week", brandPut.status === 200 && brandPut.json.data.brand.settings.targetPostsPerWeek === 4, "target=4");
    const covB4 = (await req("GET", "/api/v1/analytics/coverage?start=2026-11-02&end=2026-11-15", TB)).json.data.coverage;
    check("CG-17 with a 4/week target the same 9 posts give 9/8 = 112.5% coverage",
      covB4.targetTotal === 8 && covB4.coveragePct === 112.5, "coverage=" + covB4.coveragePct + "%");

    // ---- Brand C: analysis run and recommendations ----
    const TC = await makeBrand("fixtures-c@example.co.uk");
    await addPost(TC, pub({ title: "C1", format: "Reel", scheduledDate: "2026-10-05", daypart: "morning", likes: 100, comments: 10, shares: 5, saves: 20 }));
    await addPost(TC, pub({ title: "C2", format: "Reel", platform: "TikTok", scheduledDate: "2026-10-07", daypart: "evening", likes: 120, comments: 10, shares: 10, saves: 15 }));
    await addPost(TC, pub({ title: "C3", format: "Image", scheduledDate: "2026-10-07", daypart: "morning", likes: 40, comments: 5, shares: 0, saves: 5 }));
    const runC = await req("POST", "/api/v1/analysis-runs", TC, {});
    check("analysis run is created with 201", runC.status === 201, "HTTP " + runC.status);
    const recs = runC.json.data.recommendations;
    const byType = (t, titlePart) => recs.find((r) => r.type === t && r.title.includes(titlePart));
    check("CG-18 analysis average: (9.5 + 11 + 3.25) / 3 = 23.75 / 3 = 7.92",
      runC.json.data.run.avgScore === 7.92 && runC.json.data.result.avgScore === 7.92, "avg=" + runC.json.data.run.avgScore);
    const bestFmt = byType("format", "Lead with Reel");
    check("CG-19 best-format recommendation: Reel averages (9.5 + 11) / 2 = 10.25 across 2 posts",
      !!bestFmt && bestFmt.evidence.avgScore === 10.25 && bestFmt.evidence.posts === 2, bestFmt && bestFmt.title);
    const bestSlot = byType("slot", "Wednesday evening");
    check("CG-20 best-slot recommendation: Wednesday evening at 11 from the single 11.0 Reel",
      !!bestSlot && bestSlot.evidence.avgScore === 11 && bestSlot.evidence.weekday === "Wednesday", bestSlot && bestSlot.title);
    const weak = byType("format", "Rework or retire Image");
    check("CG-21 weakest-format recommendation: Image trails Reel by 10.25 - 3.25 = 7 points",
      !!weak && weak.evidence.gapToBest === 7 && weak.evidence.avgScore === 3.25, weak && weak.title);
    const covRec = recs.find((r) => r.type === "coverage");
    check("CG-22 coverage recommendation: an empty November calendar is 0 of 20 posts, 0%, 28 gap days",
      !!covRec && covRec.evidence.calendarPosts === 0 && covRec.evidence.targetTotal === 20 &&
      covRec.evidence.coveragePct === 0 && covRec.evidence.gapCount === 28,
      covRec && JSON.stringify(covRec.evidence));
    const runDetail = (await req("GET", "/api/v1/analysis-runs/" + runC.json.data.run.id, TC)).json.data;
    check("analysis run detail returns the stored recommendations",
      runDetail.recommendations.length === recs.length && runDetail.run.reference === runC.json.data.run.reference,
      runDetail.recommendations.length + " recommendations");
    check("another brand cannot read this analysis run", (await req("GET", "/api/v1/analysis-runs/" + runC.json.data.run.id, TA)).status === 404, "HTTP 404");

    // ---- Channels, tasks, reports, notifications ----
    const ch = await req("POST", "/api/v1/channels", TA, { platform: "TikTok", handle: "@fixturebrand", followers: 1200 });
    check("a channel can be added", ch.status === 201 && ch.json.data.channel.followers === 1200, "HTTP " + ch.status);
    check("a duplicate platform channel is a 409", (await req("POST", "/api/v1/channels", TA, { platform: "TikTok", handle: "@again", followers: 1 })).status === 409, "HTTP 409");
    check("owner deletes a channel", (await req("DELETE", "/api/v1/channels/" + ch.json.data.channel.id, TA)).status === 200, "HTTP 200");
    const task = await req("POST", "/api/v1/tasks", T, { title: "Shoot the December launch reel", assignee: "Leo Carter" });
    check("a content task can be created", task.status === 201, "HTTP " + task.status);
    const patched = await req("PATCH", "/api/v1/tasks/" + task.json.data.task.id, ST, { status: "in_progress" });
    check("staff workflow: a task moves to in_progress", patched.status === 200 && patched.json.data.task.status === "in_progress", patched.json.data.task.status);
    check("bad task status is a 400", (await req("PATCH", "/api/v1/tasks/" + task.json.data.task.id, T, { status: "banana" })).status === 400, "HTTP 400 BAD_STATUS");
    check("another brand's task is a 404", (await req("PATCH", "/api/v1/tasks/" + task.json.data.task.id, TA, { status: "done" })).status === 404, "HTTP 404");
    const rep = await req("POST", "/api/v1/reports", T, {});
    check("report generation summarises the latest run with its real average score",
      rep.status === 201 && /7\.27/.test(rep.json.data.report.summary) && /^RPT-/.test(rep.json.data.report.reference),
      rep.json.data.report && rep.json.data.report.reference);
    const reports = (await req("GET", "/api/v1/reports", T)).json.data.reports;
    check("reports list holds the seeded report plus the new one", reports.length >= 2, reports.length + " reports");
    const notes = (await req("GET", "/api/v1/notifications", T)).json.data.notifications;
    check("notifications record the seeded analysis", notes.length >= 2, notes.length + " notifications");
    check("notifications can be marked read", (await req("PATCH", "/api/v1/notifications/read", T)).status === 200, "HTTP 200");
    const rerun = await req("POST", "/api/v1/analysis-runs", T, {});
    check("re-running the seeded analysis reproduces average 7.27 and Reel 9.33 exactly (deterministic engine)",
      rerun.json.data.run.avgScore === 7.27 && rerun.json.data.result.formats[0].avgScore === 9.33,
      "avg=" + rerun.json.data.run.avgScore);
    const brandInfo = (await req("GET", "/api/v1/brand", T)).json.data.brand;
    check("brand profile carries the ContentGrid cadence and mix targets",
      brandInfo.settings.targetPostsPerWeek === 5 && brandInfo.settings.targetMix.Reel === 40 &&
      brandInfo.settings.targetMix.Video === 20 && brandInfo.location === "Northern Quarter, Manchester", brandInfo.location);
  } catch (e) { failed++; console.log("FAIL  unexpected error - " + e.message + "\n" + e.stack); }
  finally { server.kill(); }
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
