-- Profile names must be unique PER USER, not globally.
--
-- 0001 declared `profiles.name TEXT NOT NULL UNIQUE`, a global unique constraint. That makes a
-- second user signing up (Google or email) — or a demo reseed — collide on the default
-- 'Personal Profile' name:
--   D1_ERROR: UNIQUE constraint failed: profiles.name
-- SQLite can't drop a column-level UNIQUE in place, so recreate the table with UNIQUE(user_id, name).

CREATE TABLE profiles_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

INSERT INTO profiles_new (id, name, user_id, created_at)
  SELECT id, name, user_id, created_at FROM profiles;

DROP TABLE profiles;
ALTER TABLE profiles_new RENAME TO profiles;
