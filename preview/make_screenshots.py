#!/usr/bin/env python3
"""Renders a PNG of every console view of ContentGrid at desktop 1440x900
into ../screenshots/. The drawings replicate the console's real design
system (web/styles.css): deep violet #2B1055 header, vivid pink #FF5C8A
accent, #FDF4F8 page background — with the showcase brand's seeded data
(Northern Quarter Hospitality Group, Manchester) and its real seeded
engine results from preview/shot-config.json."""
import json, os
from PIL import Image, ImageDraw, ImageFont
W, H = 1440, 900
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "screenshots")
os.makedirs(OUT, exist_ok=True)
CFG = json.loads(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shot-config.json")).read())
def hx(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
BRAND = hx(CFG["header"]); ACCENT = hx(CFG["accent"]); BG = hx(CFG["bg"])
WHITE = (255, 255, 255); INK = (42, 26, 46); MUTED = (122, 100, 114); LINE = (240, 217, 228)
GOOD = (21, 128, 61); WARN = (180, 83, 9); PINK_INK = (255, 255, 255)
FD = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"; FMB = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
def F(s, b=False, mono=False):
    return ImageFont.truetype((FMB if b else FM) if mono else (FB if b else FD), int(s))
def wrap(d, t, f, mw):
    ws, lines, cur = str(t).split(), [], ""
    for w in ws:
        tt = (cur + " " + w).strip()
        if d.textlength(tt, font=f) <= mw: cur = tt
        elif cur: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines
NAV = ["Dashboard", "Calendar", "Posts", "Compose", "Formats", "Slots", "Coverage", "Recommendations", "Reports"]
class Page:
    def __init__(self, title, active=""):
        self.img = Image.new("RGB", (W, H), BG); self.d = ImageDraw.Draw(self.img)
        d = self.d
        d.rectangle([0, 0, W, 64], fill=BRAND)
        d.text((28, 20), CFG["name"] + "_", font=F(20, True, mono=True), fill=WHITE)
        x = 268
        for n in NAV:
            col = ACCENT if n == active else (243, 232, 255)
            d.text((x, 25), n, font=F(11.5, n == active), fill=col); x += d.textlength(n, font=F(11.5)) + 15
        d.text((W - 250, 24), CFG["owner"] + " · NQ Hospitality", font=F(11.5), fill=WHITE)
        d.rectangle([0, 64, W, 96], fill=ACCENT)
        d.text((W // 2, 72), CFG["name"] + " — " + CFG["tagline"].lower() + " · " + CFG["business"] + ", " + CFG["location"],
               font=F(11.5, True, mono=True), fill=PINK_INK, anchor="ma")
        self.y = 128
        d.text((40, self.y), title, font=F(27, True), fill=INK); self.y += 48
    def save(self, name): self.img.save(os.path.join(OUT, name)); print("wrote", name)
    def card(self, x, y, w, h, fill=WHITE):
        self.d.rounded_rectangle([x, y, x + w, y + h], 14, fill=fill, outline=LINE, width=1)
    def text(self, x, y, s, size=14, bold=False, color=INK, mono=False):
        self.d.text((x, y), str(s), font=F(size, bold, mono), fill=color)
    def para(self, x, y, s, size=13, color=MUTED, maxw=520, lh=19):
        for ln in wrap(self.d, s, F(size), maxw): self.d.text((x, y), ln, font=F(size), fill=color); y += lh
        return y
    def pill(self, x, y, label, hot=False):
        w = self.d.textlength(label, font=F(11, True, mono=True)) + 20
        self.d.rounded_rectangle([x, y, x + w, y + 24], 12, fill=(253, 242, 248) if not hot else ACCENT, outline=LINE)
        self.d.text((x + 10, y + 5), label, font=F(11, True, mono=True), fill=WHITE if hot else BRAND); return x + w + 8
    def btn(self, x, y, label, accent=False, w=None):
        w = w or (self.d.textlength(label, font=F(13.5, True)) + 34)
        self.d.rounded_rectangle([x, y, x + w, y + 38], 10, fill=ACCENT if accent else BRAND)
        self.d.text((x + w / 2, y + 10), label, font=F(13.5, True), fill=WHITE, anchor="ma")
        return x + w + 10
    def field(self, x, y, label, value, w=560):
        self.text(x, y, label.upper(), 11, True, MUTED)
        self.d.rounded_rectangle([x, y + 20, x + w, y + 58], 9, outline=LINE)
        self.text(x + 12, y + 30, value, 13)
        return y + 74
    def table(self, x, y, cols, rows, widths, mono_cols=()):
        d = self.d; cx = x
        for h, wd in zip(cols, widths): d.text((cx, y), h.upper(), font=F(11, True), fill=MUTED); cx += wd
        y += 24; d.line([x, y, x + sum(widths), y], fill=BRAND, width=2); y += 10
        for row in rows:
            cx = x; lines = 1
            for ci, (v, wd) in enumerate(zip(row, widths)):
                f = F(12.5, mono=ci in mono_cols)
                ls = wrap(d, str(v), f, wd - 12); lines = max(lines, len(ls))
                for j, ln in enumerate(ls): d.text((cx, y + j * 17), ln, font=f, fill=INK)
                cx += wd
            y += 17 * lines + 13; d.line([x, y - 6, x + sum(widths), y - 6], fill=LINE, width=1)
        return y
    def stat_cards(self, items, y=None):
        y = y or self.y; x = 40
        for v, l in items:
            self.card(x, y, 322, 104); self.text(x + 18, y + 14, v, 28, True, BRAND, mono=True); self.text(x + 18, y + 58, l, 13, False, MUTED); x += 340
        return y + 128

def dashboard():
    p = Page(CFG["business"], "Dashboard"); s = CFG["stats"]
    p.card(40, p.y, 1360, 150, fill=BRAND)
    p.text(64, p.y + 16, CFG["business"], 23, True, WHITE)
    p.text(64, p.y + 52, "Hospitality group — bars & kitchens · " + CFG["location"] + " — engagement at a glance.", 13, False, (243, 232, 255))
    p.text(64, p.y + 82, str(CFG["avgScore"]), 34, True, ACCENT, mono=True)
    p.text(230, p.y + 96, "average engagement · best format " + CFG["bestFormat"] + " · best slot " + CFG["bestSlot"], 12.5, False, (243, 232, 255), mono=True)
    y = p.stat_cards([(str(s["published"]), "Published posts"), (str(s["planned"]), "Planned posts"),
                       (str(s["followers"]), "Followers across 3 channels"), (str(s["coverage"]) + "%", "November calendar coverage")], p.y + 174)
    p.text(40, y, "Top posts by engagement score", 19, True); y += 38
    p.card(40, y, 1360, 300)
    p.table(64, y + 18, ["Post", "Format", "Score"], [[r[1], r[2], r[6]] for r in sorted(CFG["posts"], key=lambda r: -float(r[6]))[:6]], [700, 260, 200], mono_cols=(2,))
    return p
def calendar():
    p = Page("Calendar — November 2026", "Calendar"); c = CFG["coverage"]
    p.text(40, p.y, c["posts"] + " target posts · " + str(c["perWeek"]) + "/week against a target of 5 · " + str(c["gaps"]) + " gap days", 14, False, MUTED); p.y += 34
    p.d.rounded_rectangle([40, p.y, 40 + int(1100 * c["pct"] / 100), p.y + 16], 8, fill=ACCENT); p.y += 44
    p.text(40, p.y, "By week", 19, True); y = p.y + 36
    p.card(40, y, 900, 190)
    p.table(64, y + 18, ["Week", "Posts", "Target"], [list(r) for r in CFG["weeks"]], [420, 200, 200], mono_cols=(0, 1, 2))
    y += 220; p.text(40, y, "Scheduled posts (first week and a half)", 19, True); y += 36
    p.card(40, y, 1360, 300)
    p.table(64, y + 18, ["Date", "Post", "Format", "Platform", "Daypart"], [list(r) for r in CFG["planned"]], [210, 520, 170, 220, 160], mono_cols=(0,))
    return p
def posts():
    p = Page("Posts", "Posts")
    p.text(40, p.y, "29 posts — published scores are computed by the engine from reach, likes, comments, shares and saves.", 13.5, False, MUTED); p.y += 36
    p.card(40, p.y, 1360, 430)
    p.table(64, p.y + 18, ["Date", "Post", "Format", "Platform", "Status", "Reach", "Score"],
            [list(r) for r in CFG["posts"]], [130, 430, 130, 150, 150, 110, 90], mono_cols=(0, 5, 6))
    return p
def post_detail():
    p = Page("Post Detail", "Posts"); d = CFG["postDetail"]
    x = 40; x = p.pill(x, p.y, d["format"]); x = p.pill(x, p.y, d["platform"]); x = p.pill(x, p.y, "published", hot=True)
    p.text(x + 8, p.y + 3, d["slot"], 13, False, MUTED); y = p.y + 44
    p.text(40, y, d["title"], 21, True); y += 44
    p.card(40, y, 640, 260)
    p.text(64, y + 18, "Engagement score", 16.5, True)
    p.text(64, y + 52, str(d["score"]), 40, True, BRAND, mono=True)
    p.para(64, y + 118, d["breakdown"], 13, INK, 560, 20)
    p.para(64, y + 176, d["weights"], 12.5, MUTED, 560, 19)
    p.card(720, y, 680, 260)
    p.text(744, y + 18, "Metrics", 16.5, True)
    p.table(744, y + 54, ["Metric", "Value"], [["Reach", d["reach"]], ["Likes", d["likes"]], ["Comments", d["comments"]], ["Shares", d["shares"]], ["Saves", d["saves"]]], [300, 200], mono_cols=(1,))
    return p
def compose():
    p = Page("Compose & Channels", "Compose")
    p.card(40, p.y, 800, 560)
    p.text(64, p.y + 18, "Plan or publish a post", 16.5, True)
    y = p.y + 56
    y = p.field(64, y, "Title", "December menu launch reel", 700)
    y = p.field(64, y, "Format / platform / status", "Reel · Instagram · planned", 700)
    y = p.field(64, y, "Date / daypart", "2026-11-30 · morning", 700)
    y = p.field(64, y, "Reach / likes / comments / shares / saves", "0 / 0 / 0 / 0 / 0", 700)
    p.btn(64, y + 8, "Save post", accent=True)
    p.para(64, y + 66, "Published posts are scored by the engine as soon as they are saved.", 12.5, MUTED, 640)
    p.card(880, p.y, 520, 330)
    p.text(904, p.y + 18, "Channels", 16.5, True)
    yy = p.y + 56
    for plat, handle, fol in CFG["channels"]:
        p.text(904, yy, plat, 14, True); p.text(904, yy + 22, handle + " · " + fol + " followers", 12.5, False, MUTED); yy += 58
    p.btn(904, yy + 10, "Add channel")
    return p
def formats():
    p = Page("Format Performance", "Formats")
    p.para(40, p.y, "score = (likes + 3x comments + 4x shares + 2x saves) / reach x 100; averages are the mean of per-post scores.", 13, MUTED, 1200); p.y += 40
    p.card(40, p.y, 1360, 260)
    p.table(64, p.y + 18, ["Format", "Posts", "Avg score", "Total reach", "Weighted interactions"],
            [list(r) for r in CFG["formats"]], [280, 160, 220, 260, 300], mono_cols=(1, 2, 3, 4))
    y = p.y + 300; p.text(40, y, "Reel leads — the format recommendation follows this table", 15, True)
    return p
def slots():
    p = Page("Slot Performance", "Slots")
    p.para(40, p.y, "Slots are weekday (from the scheduled date) x daypart, published posts only.", 13, MUTED, 1200); p.y += 40
    p.card(40, p.y, 1360, 400)
    p.table(64, p.y + 18, ["Slot", "Weekday", "Daypart", "Posts", "Avg score", "Total reach"],
            [list(r) for r in CFG["slots"]], [280, 200, 180, 130, 200, 200], mono_cols=(3, 4, 5))
    return p
def coverage():
    p = Page("Coverage & Gaps — 2026-11-02 to 2026-11-29", "Coverage"); c = CFG["coverage"]
    y = p.stat_cards([(str(c["pct"]) + "%", "Coverage (" + c["posts"] + " target posts)"), (str(c["perWeek"]), "Posts per week (target 5)"), (str(c["gaps"]), "Gap days with no post"), ("28", "Days in the period")], p.y)
    p.text(40, y, "Format mix vs target", 19, True); y += 36
    p.card(40, y, 1360, 240)
    p.table(64, y + 18, ["Format", "Posts", "Actual %", "Target %", "Deviation"],
            [list(r) for r in CFG["mix"]], [280, 160, 220, 220, 220], mono_cols=(1, 2, 3, 4))
    y += 276; p.text(40, y, "Gap days", 19, True); y += 34
    p.para(40, y, c["gapList"], 12.5, MUTED, 1300, 20)
    return p
def recommendations():
    p = Page("Recommendations", "Recommendations")
    p.para(40, p.y, "Derived by the engine from the format and slot roll-ups and the calendar coverage — from the latest analysis run.", 13, MUTED, 1200)
    p.btn(40, p.y + 30, "Run analysis now", accent=True); y = p.y + 92
    for prio, typ, title, detail in CFG["recs"]:
        p.card(40, y, 1360, 118)
        x = p.pill(64, y + 14, prio, hot=(prio == "high")); p.pill(x, y + 14, typ)
        p.text(64, y + 50, title, 15.5, True); p.para(64, y + 78, detail, 12.5, MUTED, 1250, 18); y += 132
    return p
def reports():
    p = Page("Reports & Help", "Reports"); r = CFG["report"]
    p.card(40, p.y, 1360, 150)
    x = p.pill(64, p.y + 16, "summary report")
    p.text(64, p.y + 50, r["title"], 16.5, True)
    p.para(64, p.y + 80, r["summary"], 13, MUTED, 1250, 19)
    y = p.y + 172
    cards = [("How ContentGrid scores a post", "score = (likes + 3x comments + 4x shares + 2x saves) / reach x 100. Comments and shares are weighted highest because they signal a deeper response than a like; saves signal intent to return. Format and slot averages are the mean of per-post scores, and coverage compares planned posts per week with the brand's cadence target (5/week) and format-mix targets."),
             ("About the data", "ContentGrid works on seeded local datasets for fictional Manchester businesses so every workflow runs offline. In a production engagement the same datasets are refreshed from the Meta, TikTok and LinkedIn platform APIs — that integration is the documented backlog, not part of this build."),
             ("Recommendations", "Recommendations are derived from the roll-ups on every analysis run: the best format and slot, the weakest format when it trails by 2+ points, coverage shortfalls, and any format more than 10 points away from its target mix.")]
    for t, b in cards:
        p.card(40, y, 1240, 118); p.text(62, y + 14, t, 15.5, True); p.para(62, y + 44, b, 12.5, MUTED, 1180, 18); y += 132
    return p

dashboard().save("01-dashboard.png")
calendar().save("02-calendar.png")
posts().save("03-posts.png")
post_detail().save("04-post-detail.png")
compose().save("05-compose.png")
formats().save("06-formats.png")
slots().save("07-slots.png")
coverage().save("08-coverage.png")
recommendations().save("09-recommendations.png")
reports().save("10-reports-help.png")
print("10 screenshots written")
