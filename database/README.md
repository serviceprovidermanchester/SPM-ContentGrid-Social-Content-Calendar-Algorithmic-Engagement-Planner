# ContentGrid — database

SQLite (via Node's built-in `node:sqlite`). `schema.sql` holds the full
schema — 11 tables — and is mirrored in `backend/src/db.js` so the server
is self-contained. `seed.sql` mirrors the seeded showcase dataset
(channels, settings and posts) that the server inserts from
`backend/src/seed-data.js` on first start; user accounts, the
engine-produced analysis run, recommendations, tasks and the report are
generated at seed time and cannot be expressed as plain static SQL.

Every domain row is scoped by `brand_id`; reads for another brand's data
return 404.
