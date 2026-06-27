-- Import idempotency (migration 0008).
--
-- POST /api/import/execute does several non-atomic stages (create accounts/categories, then insert
-- transactions in chunks, then recompute balances), so a mid-request failure or a lost response can
-- leave a partial import — and a naive retry would duplicate transactions. The client now sends a
-- stable import_id stamped on every row it creates; on a retry the worker deletes any rows already
-- inserted for that id before re-inserting, making the import safe to re-run. (Balances are then
-- recomputed from the surviving rows, so they stay correct either way.)
ALTER TABLE transactions ADD COLUMN import_id TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_import_id ON transactions(import_id);
