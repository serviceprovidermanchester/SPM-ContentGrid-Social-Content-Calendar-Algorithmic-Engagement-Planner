"use strict";
/* ContentGrid console — single-page planner wired to the ContentGrid API.
   Views: dashboard, calendar, posts, post detail, compose, formats,
   slots, coverage, recommendations, reports & help. */
const app = document.getElementById("app");
let token = localStorage.getItem("cg_token") || "";
let me = null, myBrandInfo = null;
async function api(method, path, body) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json.error && json.error.message) || ("HTTP " + res.status));
  return json.data;
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
async function loadSession() {
  if (!token) return false;
  try {
    me = (await api("GET", "/api/v1/auth/me")).user;
    myBrandInfo = (await api("GET", "/api/v1/brand")).brand;
    document.getElementById("who").textContent = me.fullName + " · " + myBrandInfo.name;
    return true;
  } catch { token = ""; localStorage.removeItem("cg_token"); return false; }
}
document.getElementById("signout").addEventListener("click", async (e) => {
  e.preventDefault();
  try { await api("POST", "/api/v1/auth/logout"); } catch {}
  token = ""; localStorage.removeItem("cg_token"); location.hash = "#/dashboard"; route();
});
function signinView() {
  document.getElementById("mainnav").style.display = "none";
  app.innerHTML = `<h1>Sign in to ContentGrid</h1>
  <div class="row"><div class="col card"><h3>Sign in</h3>
    <label>Email <input id="li-email" type="email"></label>
    <label>Password <input id="li-pass" type="password"></label>
    <p><button class="btn" onclick="doLogin()">Sign in</button></p>
    <p class="small muted">Showcase brand owner: owner@nqhospitality.co.uk</p></div>
  <div class="col card"><h3>Plan a new brand</h3>
    <label>Your name <input id="rg-name"></label>
    <label>Email <input id="rg-email" type="email"></label>
    <label>Password <input id="rg-pass" type="password"></label>
    <label>Brand name <input id="rg-biz"></label>
    <label>Location <input id="rg-loc" placeholder="Northern Quarter, Manchester"></label>
    <p><button class="btn accent" onclick="doRegister()">Create account &amp; brand workspace</button></p>
    <p class="small muted">A new workspace starts empty — add channels and posts, then run your first analysis.</p></div></div>`;
}
async function doLogin() {
  try {
    const d = await api("POST", "/api/v1/auth/login", { email: document.getElementById("li-email").value, password: document.getElementById("li-pass").value });
    token = d.token; localStorage.setItem("cg_token", token); await loadSession(); route();
  } catch (e) { alert(e.message); }
}
async function doRegister() {
  try {
    const d = await api("POST", "/api/v1/auth/register", { fullName: document.getElementById("rg-name").value,
      email: document.getElementById("rg-email").value, password: document.getElementById("rg-pass").value,
      brandName: document.getElementById("rg-biz").value, location: document.getElementById("rg-loc").value });
    token = d.token; localStorage.setItem("cg_token", token); await loadSession(); route();
  } catch (e) { alert(e.message); }
}
function pill(t) { return `<span class="pill">${esc(t)}</span>`; }
function prioPill(p) { return `<span class="pill ${esc(p)}">${esc(p)}</span>`; }
const VIEWS = {
  async dashboard() {
    const d = await api("GET", "/api/v1/dashboard");
    const c = d.coverage;
    app.innerHTML = `<section class="hero"><h1>${esc(d.brand.name)}</h1>
      <p>${esc(d.brand.sector)} · ${esc(d.brand.location)} — engagement at a glance.</p>
      <div class="score">${d.avgScore}</div>
      <p>Average engagement score across ${d.stats.published} published posts · best format
      ${d.bestFormat ? esc(d.bestFormat.format) + " (" + d.bestFormat.avgScore + ")" : "n/a"} · best slot
      ${d.bestSlot ? esc(d.bestSlot.slot) + " (" + d.bestSlot.avgScore + ")" : "n/a"}</p></section>
      <div class="grid">
        <div class="card"><div class="stat">${d.stats.published}</div><div class="muted">Published posts</div></div>
        <div class="card"><div class="stat">${d.stats.planned}</div><div class="muted">Planned posts</div></div>
        <div class="card"><div class="stat">${d.stats.totalFollowers}</div><div class="muted">Followers across ${d.stats.channels} channels</div></div>
        <div class="card"><div class="stat">${c ? c.coveragePct + "%" : "—"}</div><div class="muted">November calendar coverage (${c ? c.calendarPosts + " of " + c.targetTotal : ""} target posts)</div></div>
      </div>
      <h2>Top posts by engagement score</h2>
      <table><tr><th>Post</th><th>Format</th><th>Slot</th><th class="num">Reach</th><th class="num">Score</th></tr>
      ${d.topPosts.map((p) => `<tr><td><a href="#/post/${p.id}">${esc(p.title)}</a></td><td>${pill(p.format)}</td>
        <td>${esc(p.weekday)} ${esc(p.daypart)}</td><td class="num">${p.reach}</td><td class="num">${p.engagementScore}</td></tr>`).join("")}</table>`;
  },
  async calendar() {
    const cov = (await api("GET", "/api/v1/analytics/coverage")).coverage;
    const posts = (await api("GET", "/api/v1/posts?from=2026-11-02&to=2026-11-29")).posts;
    app.innerHTML = `<h1>Calendar — November 2026</h1>
      <p class="muted">${cov.calendarPosts} calendar posts · ${cov.postsPerWeek}/week against a target of ${cov.targetPostsPerWeek} · ${cov.gapCount} gap days</p>
      <div class="gauge" style="max-width:520px"><i style="width:${Math.min(100, cov.coveragePct)}%"></i></div>
      <h2>By week</h2><table><tr><th>Week</th><th class="num">Posts</th><th class="num">Target</th></tr>
      ${cov.perWeek.map((w) => `<tr><td class="mono">${w.weekStart} → ${w.weekEnd}</td><td class="num">${w.posts}</td><td class="num">${w.target}</td></tr>`).join("")}</table>
      <h2>Scheduled posts</h2><table><tr><th>Date</th><th>Post</th><th>Format</th><th>Platform</th><th>Daypart</th><th>Status</th></tr>
      ${posts.map((p) => `<tr><td class="mono">${p.scheduledDate} (${esc(p.weekday)})</td><td><a href="#/post/${p.id}">${esc(p.title)}</a></td>
        <td>${pill(p.format)}</td><td>${esc(p.platform)}</td><td>${esc(p.daypart)}</td><td>${pill(p.status)}</td></tr>`).join("")}</table>`;
  },
  async posts() {
    const posts = (await api("GET", "/api/v1/posts")).posts;
    app.innerHTML = `<h1>Posts</h1><p class="muted">${posts.length} posts — published scores are computed by the engine from reach, likes, comments, shares and saves.</p>
      <table><tr><th>Date</th><th>Post</th><th>Format</th><th>Platform</th><th>Status</th><th class="num">Reach</th><th class="num">Score</th></tr>
      ${posts.map((p) => `<tr><td class="mono">${p.scheduledDate}</td><td><a href="#/post/${p.id}">${esc(p.title)}</a></td>
        <td>${pill(p.format)}</td><td>${esc(p.platform)}</td><td>${pill(p.status)}</td><td class="num">${p.reach}</td><td class="num">${p.status === "published" ? p.engagementScore : "—"}</td></tr>`).join("")}</table>`;
  },
  async post(id) {
    const p = (await api("GET", "/api/v1/posts/" + id)).post;
    const b = p.scoreBreakdown;
    app.innerHTML = `<h1>${esc(p.title)}</h1>
      <p>${pill(p.format)} ${pill(p.platform)} ${pill(p.status)} <span class="muted">${esc(p.weekday)} ${p.scheduledDate} · ${esc(p.daypart)}</span></p>
      <div class="row"><div class="col card"><h3>Engagement score</h3><div class="stat">${p.status === "published" ? p.engagementScore : "—"}</div>
      ${b ? `<p class="mono small">(${p.likes} + 3×${p.comments} + 4×${p.shares} + 2×${p.saves}) ÷ ${p.reach} × 100<br>
        = ${b.numerator} ÷ ${b.reach} × 100 = ${p.engagementScore}</p>
      <p class="small muted">Likes ${b.breakdown.likesPoints} · comments weighted ${b.breakdown.commentsWeighted} · shares weighted ${b.breakdown.sharesWeighted} · saves weighted ${b.breakdown.savesWeighted}</p>` : `<p class="muted">Scores are computed when a post is published with its platform metrics.</p>`}</div>
      <div class="col card"><h3>Metrics</h3><table>
      <tr><td>Reach</td><td class="num">${p.reach}</td></tr><tr><td>Likes</td><td class="num">${p.likes}</td></tr>
      <tr><td>Comments</td><td class="num">${p.comments}</td></tr><tr><td>Shares</td><td class="num">${p.shares}</td></tr>
      <tr><td>Saves</td><td class="num">${p.saves}</td></tr></table>
      <p class="small muted">${esc(p.caption)}</p></div></div>`;
  },
  async compose() {
    const channels = (await api("GET", "/api/v1/channels")).channels;
    app.innerHTML = `<h1>Compose &amp; Channels</h1>
      <div class="row"><div class="col card"><h3>Plan or publish a post</h3>
      <label>Title <input id="cp-title"></label>
      <label>Format <select id="cp-format"><option>Reel</option><option>Carousel</option><option>Image</option><option>Video</option><option>Story</option><option>Text</option></select></label>
      <label>Platform <select id="cp-platform"><option>Instagram</option><option>TikTok</option><option>LinkedIn</option></select></label>
      <label>Status <select id="cp-status"><option>planned</option><option>published</option><option>draft</option></select></label>
      <label>Date <input id="cp-date" type="date" value="2026-11-30"></label>
      <label>Daypart <select id="cp-daypart"><option>morning</option><option>midday</option><option>afternoon</option><option>evening</option><option>late</option></select></label>
      <label>Reach <input id="cp-reach" type="number" value="0"></label>
      <label>Likes <input id="cp-likes" type="number" value="0"></label>
      <label>Comments <input id="cp-comments" type="number" value="0"></label>
      <label>Shares <input id="cp-shares" type="number" value="0"></label>
      <label>Saves <input id="cp-saves" type="number" value="0"></label>
      <p><button class="btn accent" onclick="doCreatePost()">Save post</button></p>
      <p class="small muted">Published posts are scored by the engine as soon as they are saved.</p></div>
      <div class="col card"><h3>Channels</h3>
      ${channels.map((c) => `<p><strong>${esc(c.platform)}</strong> · ${esc(c.handle)} · ${c.followers} followers</p>`).join("") || "<p class='muted'>No channels yet.</p>"}
      <label>Platform <select id="ch-platform"><option>Instagram</option><option>TikTok</option><option>LinkedIn</option></select></label>
      <label>Handle <input id="ch-handle"></label>
      <label>Followers <input id="ch-followers" type="number" value="0"></label>
      <p><button class="btn" onclick="doCreateChannel()">Add channel</button></p></div></div>`;
  },
  async formats() {
    const d = await api("GET", "/api/v1/analytics/formats");
    app.innerHTML = `<h1>Format Performance</h1><p class="muted">${esc(d.model)}</p>
      <table><tr><th>Format</th><th class="num">Posts</th><th class="num">Avg score</th><th class="num">Total reach</th><th class="num">Weighted interactions</th><th></th></tr>
      ${d.formats.map((f) => `<tr><td><strong>${esc(f.format)}</strong></td><td class="num">${f.posts}</td><td class="num">${f.avgScore}</td>
        <td class="num">${f.totalReach}</td><td class="num">${f.totalNumerator}</td>
        <td style="min-width:180px"><div class="bar"><i style="width:${Math.min(100, f.avgScore * 8)}%"></i></div></td></tr>`).join("")}</table>`;
  },
  async slots() {
    const d = await api("GET", "/api/v1/analytics/slots");
    app.innerHTML = `<h1>Slot Performance</h1><p class="muted">${esc(d.model)}</p>
      <table><tr><th>Slot</th><th>Weekday</th><th>Daypart</th><th class="num">Posts</th><th class="num">Avg score</th><th class="num">Total reach</th></tr>
      ${d.slots.map((s) => `<tr><td><strong>${esc(s.slot)}</strong></td><td>${esc(s.weekday)}</td><td>${esc(s.daypart)}</td>
        <td class="num">${s.posts}</td><td class="num">${s.avgScore}</td><td class="num">${s.totalReach}</td></tr>`).join("")}</table>`;
  },
  async coverage() {
    const cov = (await api("GET", "/api/v1/analytics/coverage")).coverage;
    app.innerHTML = `<h1>Coverage &amp; Gaps — ${cov.start} → ${cov.end}</h1>
      <div class="grid">
        <div class="card"><div class="stat">${cov.coveragePct}%</div><div class="muted">Coverage (${cov.calendarPosts} of ${cov.targetTotal} target posts)</div></div>
        <div class="card"><div class="stat">${cov.postsPerWeek}</div><div class="muted">Posts per week (target ${cov.targetPostsPerWeek})</div></div>
        <div class="card"><div class="stat">${cov.gapCount}</div><div class="muted">Gap days with no post</div></div>
      </div>
      <h2>Format mix vs target</h2><table><tr><th>Format</th><th class="num">Posts</th><th class="num">Actual %</th><th class="num">Target %</th><th class="num">Deviation</th></tr>
      ${cov.formatMix.map((m) => `<tr><td><strong>${esc(m.format)}</strong></td><td class="num">${m.posts}</td><td class="num">${m.pct}</td><td class="num">${m.targetPct ?? "—"}</td><td class="num">${m.deviation ?? "—"}</td></tr>`).join("")}</table>
      <h2>Gap days</h2><p>${cov.gapDays.map((g) => `<span class="pill">${g.date} (${esc(g.weekday)})</span>`).join(" ") || "No gaps."}</p>`;
  },
  async recommendations() {
    const d = await api("GET", "/api/v1/dashboard");
    let recs = [], runRef = "";
    if (d.latestRun) { const detail = await api("GET", "/api/v1/analysis-runs/" + d.latestRun.id); recs = detail.recommendations; runRef = detail.run.reference; }
    app.innerHTML = `<h1>Recommendations</h1>
      <p class="muted">Derived by the engine from the format and slot roll-ups and the calendar coverage — never stored opinions.</p>
      <p><button class="btn accent" onclick="doRunAnalysis()">Run analysis now</button> ${runRef ? `<span class="mono small">latest run ${esc(runRef)}</span>` : ""}</p>
      ${recs.map((r) => `<div class="card"><p>${prioPill(r.priority)} ${pill(r.type)}</p><h3>${esc(r.title)}</h3>
        <p class="muted">${esc(r.detail)}</p><p class="mono small">${esc(JSON.stringify(r.evidence))}</p></div>`).join("") || "<p>No analysis run yet.</p>"}`;
  },
  async reports() {
    const reports = (await api("GET", "/api/v1/reports")).reports;
    const notes = (await api("GET", "/api/v1/notifications")).notifications;
    const brand = (await api("GET", "/api/v1/brand")).brand;
    app.innerHTML = `<h1>Reports &amp; Help</h1>
      ${reports.map((r) => `<div class="card"><p><span class="pill">${esc(r.reference)}</span></p><h3>${esc(r.title)}</h3>
        <p class="muted">${esc(r.summary)}</p><p class="small muted">By ${esc(r.createdBy)} · ${esc(r.createdAt)}</p></div>`).join("")}
      <p><button class="btn" onclick="doCreateReport()">Generate report from latest run</button></p>
      <div class="card"><h3>How ContentGrid scores a post</h3>
      <p class="muted">score = (likes + 3×comments + 4×shares + 2×saves) ÷ reach × 100. Comments and shares are
      weighted highest because they signal a deeper response than a like; saves signal intent to return. Format and slot
      averages are the mean of the per-post scores, and calendar coverage compares planned posts per week with the
      brand's cadence target (${brand.settings.targetPostsPerWeek}/week) and format-mix targets.</p></div>
      <div class="card"><h3>About the data</h3>
      <p class="muted">ContentGrid works on seeded local datasets for fictional Manchester businesses so every workflow
      runs offline. In a production engagement the same datasets are refreshed from the Meta, TikTok and LinkedIn
      platform APIs — that integration is the documented backlog, not part of this build.</p></div>
      <div class="card"><h3>Notifications</h3>
      ${notes.map((n) => `<p><strong>${esc(n.title)}</strong><br><span class="muted small">${esc(n.body)}</span></p>`).join("") || "<p class='muted'>None.</p>"}
      <p><button class="btn small ghost" onclick="doMarkRead()">Mark all read</button></p></div>`;
  },
};
async function doCreatePost() {
  try {
    const p = await api("POST", "/api/v1/posts", { title: document.getElementById("cp-title").value,
      format: document.getElementById("cp-format").value, platform: document.getElementById("cp-platform").value,
      status: document.getElementById("cp-status").value, scheduledDate: document.getElementById("cp-date").value,
      daypart: document.getElementById("cp-daypart").value, reach: Number(document.getElementById("cp-reach").value),
      likes: Number(document.getElementById("cp-likes").value), comments: Number(document.getElementById("cp-comments").value),
      shares: Number(document.getElementById("cp-shares").value), saves: Number(document.getElementById("cp-saves").value) });
    location.hash = "#/post/" + p.post.id;
  } catch (e) { alert(e.message); }
}
async function doCreateChannel() {
  try {
    await api("POST", "/api/v1/channels", { platform: document.getElementById("ch-platform").value,
      handle: document.getElementById("ch-handle").value, followers: Number(document.getElementById("ch-followers").value) });
    route();
  } catch (e) { alert(e.message); }
}
async function doRunAnalysis() {
  try { await api("POST", "/api/v1/analysis-runs", {}); route(); } catch (e) { alert(e.message); }
}
async function doCreateReport() {
  try { await api("POST", "/api/v1/reports", {}); route(); } catch (e) { alert(e.message); }
}
async function doMarkRead() {
  try { await api("PATCH", "/api/v1/notifications/read"); route(); } catch (e) { alert(e.message); }
}
async function route() {
  const signed = await loadSession();
  if (!signed) return signinView();
  document.getElementById("mainnav").style.display = "";
  const hash = location.hash.replace(/^#\//, "") || "dashboard";
  const [name, arg] = hash.split("/");
  const view = VIEWS[name] || VIEWS.dashboard;
  try { await view(arg); } catch (e) { app.innerHTML = `<div class="error">${esc(e.message)}</div>`; }
}
window.addEventListener("hashchange", route);
route();
