/**
 * Import session log handlers — IndexedDB-backed (mirrors worker migration 0014).
 * One row per successful import: counts + a JSON details blob with created names.
 */
import { getDB } from '../idb'
import { adapter, json } from './helpers'

export async function importLogsList(): Promise<Response> {
  const db = await getDB()
  const pids = adapter.getCurrentProfileIds()
  const all: Record<string, unknown>[] = []
  for (const pid of pids) {
    const rows = await db.getAllFromIndex('import_logs', 'by_profile', pid)
    all.push(...rows)
  }
  all.sort((a, b) => (b.id as number) - (a.id as number))
  return json(all.slice(0, 50))
}

export async function importLogsCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid import log' }, 400)
  const b = body as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0)
  const db = await getDB()
  const row = {
    profile_id: await adapter.getCurrentProfileId(),
    import_id: typeof b.import_id === 'string' ? b.import_id.slice(0, 64) : null,
    source: typeof b.source === 'string' ? b.source.slice(0, 200) : '',
    imported: num(b.imported),
    duplicates_skipped: num(b.duplicates_skipped),
    accounts_created: num(b.accounts_created),
    categories_created: num(b.categories_created),
    details: typeof b.details === 'string' ? b.details.slice(0, 8000) : null,
    created_at: new Date().toISOString(),
  }
  const id = (await db.add('import_logs', row)) as number
  return json({ id, ...row }, 201)
}
