import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { requireAuth } from '../auth';
import { getProfileId, getProfileIds } from '../profile';
import * as db from '../db';

// Import session log (migration 0014). The Import page POSTs one row after a successful
// /api/import/execute and lists past sessions so users can audit what an import created.
export const importLogsRoutes = new Hono<AppEnv>();

interface ImportLogRow {
  id: number;
  profile_id: number;
  import_id: string | null;
  source: string;
  imported: number;
  duplicates_skipped: number;
  accounts_created: number;
  categories_created: number;
  details: string | null;
  created_at: string;
}

// ── GET /api/import-logs — latest sessions across the selected profiles ───────
importLogsRoutes.get('/api/import-logs', requireAuth, async (c) => {
  const pids = await getProfileIds(c);
  const inClause = pids.map(() => '?').join(',');
  const rows = await db.all<ImportLogRow>(
    c.env.DB,
    `SELECT * FROM import_logs WHERE profile_id IN (${inClause}) ORDER BY id DESC LIMIT 50`,
    ...pids
  );
  return c.json(rows);
});

// ── POST /api/import-logs — record one import session ─────────────────────────
importLogsRoutes.post('/api/import-logs', requireAuth, async (c) => {
  const pid = await getProfileId(c);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0);
  const res = await db.insert(c.env.DB, 'import_logs', {
    profile_id: pid,
    import_id: typeof b.import_id === 'string' ? b.import_id.slice(0, 64) : null,
    source: typeof b.source === 'string' ? b.source.slice(0, 200) : '',
    imported: num(b.imported),
    duplicates_skipped: num(b.duplicates_skipped),
    accounts_created: num(b.accounts_created),
    categories_created: num(b.categories_created),
    // Cap the JSON blob so a hostile payload can't bloat the table
    details: typeof b.details === 'string' ? b.details.slice(0, 8000) : null,
  });
  const row = await db.first<ImportLogRow>(
    c.env.DB,
    'SELECT * FROM import_logs WHERE id = ?',
    res.meta.last_row_id
  );
  return c.json(row, 201);
});
