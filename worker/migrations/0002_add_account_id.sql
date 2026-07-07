-- Migration: add account_id to recurring_transactions and bills
-- This enables atomic account balance updates when populating recurring
-- transactions or marking bills as paid.
ALTER TABLE recurring_transactions ADD COLUMN account_id INTEGER;
ALTER TABLE bills ADD COLUMN account_id INTEGER;
