#!/usr/bin/env bash
# Nuke local database files to trigger full re-seed on next backend start.
# The backend auto-creates tables and seeds the 3 demo tiers when db files are missing.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_DIR="$PROJECT_DIR/db"

echo "Nuking database files in $DB_DIR ..."
rm -fv "$DB_DIR/finance.db" "$DB_DIR/sessions.db" 2>/dev/null || true
echo "Done. Restart the backend to reinitialize with all 3 tiers."
