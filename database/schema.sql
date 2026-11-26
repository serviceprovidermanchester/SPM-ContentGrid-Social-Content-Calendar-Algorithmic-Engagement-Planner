-- ContentGrid — database schema (SQLite, via node:sqlite)
-- Mirrored in backend/src/db.js so the server is self-contained.
-- 11 tables: users, sessions, brands, brand_settings, channels, posts,
-- analysis_runs, recommendations, tasks, reports, notifications.
-- Every domain row is scoped by brand_id.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','staff')),
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner_user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    sector TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS brand_settings (
    brand_id INTEGER PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
    target_posts_per_week INTEGER NOT NULL DEFAULT 5,
    target_reel_pct INTEGER NOT NULL DEFAULT 40, target_carousel_pct INTEGER NOT NULL DEFAULT 25,
    target_image_pct INTEGER NOT NULL DEFAULT 15, target_video_pct INTEGER NOT NULL DEFAULT 20,
    notify_on_gap INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, handle TEXT NOT NULL DEFAULT '', followers INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (brand_id, platform));
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram', title TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'Reel', status TEXT NOT NULL DEFAULT 'planned'
      CHECK (status IN ('draft','planned','published')),
    scheduled_date TEXT NOT NULL, daypart TEXT NOT NULL DEFAULT 'morning',
    reach INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0, shares INTEGER NOT NULL DEFAULT 0, saves INTEGER NOT NULL DEFAULT 0,
    engagement_score REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS analysis_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    reference TEXT NOT NULL UNIQUE, period_start TEXT NOT NULL DEFAULT '', period_end TEXT NOT NULL DEFAULT '',
    published_posts INTEGER NOT NULL DEFAULT 0, avg_score REAL NOT NULL DEFAULT 0,
    best_format TEXT NOT NULL DEFAULT '', best_slot TEXT NOT NULL DEFAULT '',
    coverage_pct REAL NOT NULL DEFAULT 0, gap_count INTEGER NOT NULL DEFAULT 0,
    recommendation_count INTEGER NOT NULL DEFAULT 0, triggered_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES analysis_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium', title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
    assignee TEXT NOT NULL DEFAULT '', due_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES analysis_runs(id) ON DELETE SET NULL,
    reference TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
    avg_score REAL NOT NULL DEFAULT 0, created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE INDEX IF NOT EXISTS idx_posts_brand ON posts(brand_id, scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_recs_brand ON recommendations(brand_id, run_id);
  CREATE INDEX IF NOT EXISTS idx_channels_brand ON channels(brand_id);
