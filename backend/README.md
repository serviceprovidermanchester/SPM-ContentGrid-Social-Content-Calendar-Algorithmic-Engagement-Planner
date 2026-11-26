# ContentGrid — backend

Zero-dependency Node.js backend (`node:http`, `node:sqlite`, `node:crypto` only).

```bash
node src/server.js        # PORT env, default 4000
```

- API base: `/api/v1/` — 28 endpoints (see the root README's API table).
- Health: `GET /health`.
- The web console in `../../web` is served at `/`.
- On first start the database is created and seeded with the showcase
  business (Northern Quarter Hospitality Group) from `src/seed-data.js`.
- The marketing engine lives in `src/marketing/engine.js` — engagement
  scoring, format/slot roll-ups, calendar coverage and recommendations,
  all deterministic and offline.
- Data file: `data/contentgrid.sqlite` (override with `DB_PATH`).
