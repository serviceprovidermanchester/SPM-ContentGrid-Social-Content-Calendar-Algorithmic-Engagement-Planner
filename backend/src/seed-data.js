"use strict";
// Seed data for ContentGrid. The showcase business is the Northern
// Quarter Hospitality Group, a fictional hospitality group in
// Manchester's Northern Quarter running bars and kitchens and posting
// across Instagram, TikTok and LinkedIn. Its post metrics, calendar and
// targets below are seeded local data: the engagement figures a social
// platform export would carry. Scores are NOT stored here — the engine
// computes them, and the seeded fixtures are built so the scores and
// roll-ups reconcile by hand (see tests and VERIFICATION.md).
const PRODUCT = {
  name: "ContentGrid", tagline: "Post what earns engagement, at the time it earns it",
  serviceId: "spm-ads-contentgrid-calendar-api",
  ownerName: "Maya Patel", ownerEmail: "owner@nqhospitality.co.uk", ownerPassword: "Owner2026!",
  staffName: "Leo Carter", staffEmail: "team@nqhospitality.co.uk", staffPassword: "Team2026!",
};
const BRAND = {
  name: "Northern Quarter Hospitality Group", slug: "northern-quarter-hospitality-group",
  sector: "Hospitality group — bars & kitchens", location: "Northern Quarter, Manchester",
};
// Target mix for the four primary formats (percentages, sum 100).
const SETTINGS = { targetPostsPerWeek: 5, targetReelPct: 40, targetCarouselPct: 25,
  targetImagePct: 15, targetVideoPct: 20, notifyOnGap: 1 };
const CHANNELS = [
  { platform: "Instagram", handle: "@nqhospitality", followers: 18400 },
  { platform: "TikTok", handle: "@nqhospitalitymcr", followers: 32600 },
  { platform: "LinkedIn", handle: "Northern Quarter Hospitality Group", followers: 5400 },
];
// Published posts (October 2026). reach is 2,000 throughout so each
// score is numerator/20: e.g. post 1 numerator 190 -> 9.5.
// title, platform, format, date, daypart, reach, likes, comments, shares, saves
const PUBLISHED = [
  { title: "Cocktail masterclass highlights", platform: "Instagram", format: "Reel", scheduledDate: "2026-10-05", daypart: "morning", reach: 2000, likes: 100, comments: 10, shares: 5, saves: 20 },
  { title: "Behind the bar: Friday service", platform: "TikTok", format: "Reel", scheduledDate: "2026-10-07", daypart: "evening", reach: 2000, likes: 120, comments: 10, shares: 10, saves: 15 },
  { title: "New seasonal menu teaser", platform: "Instagram", format: "Reel", scheduledDate: "2026-10-12", daypart: "evening", reach: 2000, likes: 80, comments: 10, shares: 5, saves: 10 },
  { title: "Meet the chefs — five slides", platform: "Instagram", format: "Carousel", scheduledDate: "2026-10-06", daypart: "midday", reach: 2000, likes: 60, comments: 5, shares: 5, saves: 25 },
  { title: "Sunday roast, step by step", platform: "Instagram", format: "Carousel", scheduledDate: "2026-10-08", daypart: "evening", reach: 2000, likes: 70, comments: 10, shares: 5, saves: 20 },
  { title: "Cocktail garnishes guide", platform: "Instagram", format: "Carousel", scheduledDate: "2026-10-09", daypart: "midday", reach: 2000, likes: 50, comments: 5, shares: 0, saves: 20 },
  { title: "Terrace in the morning sun", platform: "Instagram", format: "Image", scheduledDate: "2026-10-07", daypart: "morning", reach: 2000, likes: 40, comments: 5, shares: 0, saves: 5 },
  { title: "Saturday brunch spread", platform: "Instagram", format: "Image", scheduledDate: "2026-10-10", daypart: "afternoon", reach: 2000, likes: 60, comments: 5, shares: 5, saves: 10 },
  { title: "Sunday kitchen portrait", platform: "Instagram", format: "Image", scheduledDate: "2026-10-11", daypart: "morning", reach: 2000, likes: 50, comments: 0, shares: 5, saves: 10 },
  { title: "Venue hire walkthrough", platform: "LinkedIn", format: "Video", scheduledDate: "2026-10-08", daypart: "evening", reach: 2000, likes: 90, comments: 15, shares: 10, saves: 10 },
  { title: "Supplier story: local brewery", platform: "LinkedIn", format: "Video", scheduledDate: "2026-10-13", daypart: "evening", reach: 2000, likes: 70, comments: 10, shares: 5, saves: 15 },
  { title: "Live music night recap", platform: "TikTok", format: "Video", scheduledDate: "2026-10-17", daypart: "evening", reach: 2000, likes: 80, comments: 10, shares: 10, saves: 5 },
];
// Planned calendar (2–29 Nov 2026, 4 full weeks Mon–Sun): 17 posts —
// Reel 6, Carousel 4, Image 3, Video 4 — against a target of 5/week
// (20 posts), so coverage is 85% with 11 gap days.
const PLANNED = [
  ["2026-11-02", "Reel", "Instagram", "morning", "November menu launch reel"],
  ["2026-11-03", "Carousel", "Instagram", "midday", "Bonfire Night drinks — five slides"],
  ["2026-11-05", "Image", "Instagram", "evening", "Bonfire Night terrace photo"],
  ["2026-11-07", "Reel", "TikTok", "evening", "Saturday service behind the bar"],
  ["2026-11-09", "Video", "LinkedIn", "morning", "Christmas party venue tour"],
  ["2026-11-11", "Carousel", "Instagram", "midday", "Festive set menu — five slides"],
  ["2026-11-13", "Reel", "TikTok", "evening", "Cocktail of the week"],
  ["2026-11-14", "Image", "Instagram", "afternoon", "Brunch board flat-lay"],
  ["2026-11-15", "Video", "TikTok", "evening", "Live music Sunday recap"],
  ["2026-11-16", "Reel", "Instagram", "morning", "Meet the team Monday"],
  ["2026-11-18", "Carousel", "Instagram", "midday", "Gift voucher guide"],
  ["2026-11-20", "Video", "LinkedIn", "evening", "Supplier story: coffee roaster"],
  ["2026-11-23", "Image", "Instagram", "morning", "Winter terrace at dawn"],
  ["2026-11-25", "Reel", "TikTok", "evening", "Black Friday voucher push"],
  ["2026-11-27", "Carousel", "Instagram", "midday", "December events round-up"],
  ["2026-11-28", "Video", "TikTok", "afternoon", "Kitchen pass: Saturday lunch"],
  ["2026-11-29", "Reel", "Instagram", "evening", "Month in 30 seconds"],
].map(([scheduledDate, format, platform, daypart, title]) =>
  ({ title, platform, format, scheduledDate, daypart, status: "planned", reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 }));
const POSTS = [
  ...PUBLISHED.map((p) => ({ ...p, status: "published", caption: p.title + " — Northern Quarter Hospitality Group, Manchester." })),
  ...PLANNED.map((p) => ({ ...p, caption: p.title + " — planned for the November calendar." })),
];
module.exports = { PRODUCT, BRAND, SETTINGS, CHANNELS, POSTS, PUBLISHED };
