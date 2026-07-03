-- Per-import session log: what each import created and skipped, so users can audit
-- past imports from the Import page (counts + a JSON details blob with the created
-- account/category names). Written by the client after a successful /api/import/execute.
CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  import_id TEXT,
  source TEXT NOT NULL DEFAULT '',
  imported INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  accounts_created INTEGER NOT NULL DEFAULT 0,
  categories_created INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_import_logs_profile ON import_logs(profile_id);
