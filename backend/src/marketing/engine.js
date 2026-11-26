"use strict";
// ContentGrid marketing engine — deterministic social-content maths over
// seeded local data. Plain JavaScript, no network calls, no API keys.
// Every computed number ships with its breakdown so it can be reconciled
// by hand from the raw post metrics.
//
// Engagement score (exactly as implemented; see TRD.md):
//   numerator = likes + 3*comments + 4*shares + 2*saves
//   score     = reach > 0 ? round2(numerator / reach * 100) : 0
//   Worked example: reach 2,000, likes 100, comments 10, shares 5,
//   saves 20 -> numerator = 100 + 30 + 20 + 40 = 190 -> score 9.5.
//   Comments are weighted x3 and shares x4 because they signal a deeper
//   response than a like; saves (x2) signal intent to return.
//
// Roll-ups: format roll-ups group published posts by format; slot
// roll-ups group published posts by weekday (from the scheduled date)
// x daypart. Averages are the mean of the per-post scores, rounded to
// 2 decimal places, with the post count and total reach alongside.
//
// Coverage: for a date range (inclusive), calendar posts are posts with
// status "planned" or "published" scheduled inside the range (drafts do
// not count — they are not committed to the calendar).
//   days          = end - start + 1
//   weeks         = days / 7
//   targetTotal   = targetPostsPerWeek * weeks
//   postsPerWeek  = round2(calendarPosts / weeks)
//   coveragePct   = round2(calendarPosts / targetTotal * 100)
//   gapDays       = every date in the range with no calendar post
//   formatMix     = per-format share of calendar posts (%), compared
//                   with the target mix; deviation = actual - target.
//
// Recommendations are derived from the roll-ups, never stored opinions:
// the best format (highest average score, at least 1 published post),
// the best slot (same rule), the weakest format when it trails the best
// by 2+ points, a coverage recommendation when coverage is under 100%,
// and a mix recommendation for any format more than 10 percentage
// points away from its target share.

const WEIGHTS = { likes: 1, comments: 3, shares: 4, saves: 2 };
const FORMATS = ["Reel", "Carousel", "Image", "Video", "Story", "Text"];
const DAYPARTS = ["morning", "midday", "afternoon", "evening", "late"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PLATFORMS = ["Instagram", "TikTok", "LinkedIn"];
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function weekdayOf(dateStr) {
  const d = new Date(String(dateStr) + "T12:00:00Z");
  return WEEKDAYS[d.getUTCDay()];
}
function engagementScore(m) {
  const likes = Number(m.likes || 0), comments = Number(m.comments || 0);
  const shares = Number(m.shares || 0), saves = Number(m.saves || 0);
  const reach = Number(m.reach || 0);
  const breakdown = {
    likesPoints: likes * WEIGHTS.likes,
    commentsWeighted: comments * WEIGHTS.comments,
    sharesWeighted: shares * WEIGHTS.shares,
    savesWeighted: saves * WEIGHTS.saves,
  };
  const numerator = breakdown.likesPoints + breakdown.commentsWeighted
    + breakdown.sharesWeighted + breakdown.savesWeighted;
  const score = reach > 0 ? round2(numerator / reach * 100) : 0;
  return { score, numerator, reach, breakdown };
}
function scorePost(post) {
  const r = engagementScore(post);
  return { ...post, weekday: weekdayOf(post.scheduledDate), engagementScore: r.score,
    scoreBreakdown: r };
}
function publishedOnly(posts) { return posts.filter((p) => p.status === "published"); }

function groupAvg(items, keyFn) {
  const groups = new Map();
  for (const p of items) {
    const key = keyFn(p);
    if (!groups.has(key)) groups.set(key, { posts: 0, totalScore: 0, totalReach: 0, totalNumerator: 0 });
    const g = groups.get(key);
    const r = engagementScore(p);
    g.posts++; g.totalScore += r.score; g.totalReach += r.reach; g.totalNumerator += r.numerator;
  }
  return groups;
}
function formatRollups(posts) {
  const groups = groupAvg(publishedOnly(posts), (p) => p.format);
  return [...groups.entries()].map(([format, g]) => ({
    format, posts: g.posts, avgScore: round2(g.totalScore / g.posts),
    totalReach: g.totalReach, totalNumerator: g.totalNumerator,
  })).sort((a, b) => b.avgScore - a.avgScore || b.posts - a.posts || a.format.localeCompare(b.format));
}
function slotRollups(posts) {
  const groups = groupAvg(publishedOnly(posts), (p) => weekdayOf(p.scheduledDate) + "|" + p.daypart);
  return [...groups.entries()].map(([key, g]) => {
    const [weekday, daypart] = key.split("|");
    return { weekday, daypart, slot: weekday + " " + daypart, posts: g.posts,
      avgScore: round2(g.totalScore / g.posts), totalReach: g.totalReach, totalNumerator: g.totalNumerator };
  }).sort((a, b) => b.avgScore - a.avgScore || b.posts - a.posts || a.slot.localeCompare(b.slot));
}

function dateList(start, end) {
  const out = [];
  const d = new Date(start + "T12:00:00Z");
  const last = new Date(end + "T12:00:00Z");
  while (d <= last) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
function coverageAnalysis(posts, opts) {
  const o = opts || {};
  const start = o.start, end = o.end;
  const targetPerWeek = Number(o.targetPostsPerWeek || 5);
  const targetMix = o.targetMix || {};
  const days = dateList(start, end);
  const inRange = posts.filter((p) => (p.status === "planned" || p.status === "published")
    && p.scheduledDate >= start && p.scheduledDate <= end);
  const weeks = days.length / 7;
  const targetTotal = round2(targetPerWeek * weeks);
  const withPosts = new Set(inRange.map((p) => p.scheduledDate));
  const gapDays = days.filter((d) => !withPosts.has(d))
    .map((d) => ({ date: d, weekday: weekdayOf(d) }));
  const counts = {};
  for (const p of inRange) counts[p.format] = (counts[p.format] || 0) + 1;
  const formatMix = FORMATS.filter((f) => counts[f] || targetMix[f] !== undefined).map((f) => {
    const count = counts[f] || 0;
    const pct = inRange.length ? round2(count / inRange.length * 100) : 0;
    const target = targetMix[f] !== undefined ? Number(targetMix[f]) : null;
    return { format: f, posts: count, pct, targetPct: target,
      deviation: target === null ? null : round2(pct - target) };
  });
  // Whole weeks inside the range, Monday-anchored by list position in
  // 7-day blocks from the range start.
  const perWeek = [];
  for (let i = 0; i + 7 <= days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    perWeek.push({ weekStart: slice[0], weekEnd: slice[6],
      posts: inRange.filter((p) => slice.includes(p.scheduledDate)).length,
      target: targetPerWeek });
  }
  return { start, end, days: days.length, weeks: round2(weeks),
    targetPostsPerWeek: targetPerWeek, targetTotal,
    calendarPosts: inRange.length,
    postsPerWeek: weeks ? round2(inRange.length / weeks) : 0,
    coveragePct: targetTotal ? round2(inRange.length / targetTotal * 100) : 0,
    gapCount: gapDays.length, gapDays, formatMix, perWeek };
}

function buildRecommendations(input) {
  const recs = [];
  const formats = input.formats || [], slots = input.slots || [], coverage = input.coverage || null;
  if (formats.length) {
    const best = formats[0];
    recs.push({ type: "format", priority: "high",
      title: "Lead with " + best.format,
      detail: best.format + " averages " + best.avgScore + " engagement across " + best.posts +
        " published post(s) and " + best.totalReach + " reach — schedule more of this format first.",
      evidence: { format: best.format, avgScore: best.avgScore, posts: best.posts, totalReach: best.totalReach } });
    const worst = formats[formats.length - 1];
    if (formats.length > 1 && round2(best.avgScore - worst.avgScore) >= 2) {
      recs.push({ type: "format", priority: "medium",
        title: "Rework or retire " + worst.format,
        detail: worst.format + " averages " + worst.avgScore + ", trailing " + best.format + " by " +
          round2(best.avgScore - worst.avgScore) + " points. Rework the creative or move its slots to " + best.format + ".",
        evidence: { format: worst.format, avgScore: worst.avgScore, posts: worst.posts, gapToBest: round2(best.avgScore - worst.avgScore) } });
    }
  }
  if (slots.length) {
    const best = slots[0];
    recs.push({ type: "slot", priority: "high",
      title: "Best slot: " + best.slot,
      detail: best.slot + " averages " + best.avgScore + " engagement across " + best.posts +
        " published post(s). Anchor the calendar's strongest post there each week.",
      evidence: { slot: best.slot, weekday: best.weekday, daypart: best.daypart, avgScore: best.avgScore, posts: best.posts } });
  }
  if (coverage) {
    if (coverage.coveragePct < 100) {
      recs.push({ type: "coverage", priority: "high",
        title: "Close the coverage gap",
        detail: coverage.calendarPosts + " posts planned against a target of " + coverage.targetTotal +
          " (" + coverage.coveragePct + "% coverage) with " + coverage.gapCount + " gap day(s) in the period. " +
          "Add " + round2(coverage.targetTotal - coverage.calendarPosts) + " post(s), starting on the gap days.",
        evidence: { calendarPosts: coverage.calendarPosts, targetTotal: coverage.targetTotal,
          coveragePct: coverage.coveragePct, gapCount: coverage.gapCount } });
    }
    for (const m of coverage.formatMix || []) {
      if (m.deviation !== null && Math.abs(m.deviation) > 10) {
        recs.push({ type: "mix", priority: "medium",
          title: (m.deviation > 0 ? "Trim " : "Add more ") + m.format,
          detail: m.format + " is " + m.pct + "% of planned posts against a " + m.targetPct +
            "% target (deviation " + (m.deviation > 0 ? "+" : "") + m.deviation + " points).",
          evidence: { format: m.format, pct: m.pct, targetPct: m.targetPct, deviation: m.deviation } });
      }
    }
  }
  return recs;
}
function analyse(posts, opts) {
  const formats = formatRollups(posts);
  const slots = slotRollups(posts);
  const coverage = opts && opts.start ? coverageAnalysis(posts, opts) : null;
  const published = publishedOnly(posts);
  const avgScore = published.length
    ? round2(published.reduce((s, p) => s + engagementScore(p).score, 0) / published.length) : 0;
  return { publishedPosts: published.length, avgScore, formats, slots, coverage,
    recommendations: buildRecommendations({ formats, slots, coverage }) };
}
module.exports = { WEIGHTS, FORMATS, DAYPARTS, WEEKDAYS, PLATFORMS, round2, weekdayOf,
  engagementScore, scorePost, formatRollups, slotRollups, coverageAnalysis,
  buildRecommendations, analyse, dateList };
