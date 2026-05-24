# Repository Public Release Readiness Audit

**Date:** 2026-05-21

## Summary

Audit of the repository for public GitHub release readiness. Items are ordered by priority.

---

## Critical (blockers for public release)

### 1. Tracked symlink breaks on other machines
- **File:** `public/frontend` → `/var/www/finance-manager.clodhost.com/frontend`
- **Action:** Remove from git (`git rm --cached public/frontend`), add to `.gitignore`

### 2. Tracked files that should be gitignored
| File | Issue |
|------|-------|
| `dev-server.pid` | Runtime PID file |
| `.env` | Environment variables (contains only ports, but convention is to ignore) |
| `frontend/.env` | Same as above |
| `coverage/` | Coverage reports tracked at root |
| `test-results/.last-run.json` | Playwright test artifact |
| `test-output.png` | Test screenshot (root) |
| `frontend/test-output.png` | Test screenshot (frontend) |

### 3. Hardcoded domain URLs and server paths
Files containing `finance-manager.clodhost.com` or `/var/www/` paths:

| File | Issue |
|------|-------|
| `README.md` | Live site URLs, deployment paths |
| `deploy.sh` | Absolute server paths |
| `docs/apache-setup.md` | Server-specific paths |
| `docs/cl_workflow.md` | Server-specific paths |
| `public/cl_workflow.md` | Server-specific paths |
| `docs/bugs.md` | Server-specific paths |
| `docs/issues/pdf-export-charts-not-rendering.md` | Server-specific paths |
| `docs/deploy.sh` | Duplicate deploy script |
| `test-pdf-export.js` | Hardcoded `/var/www/` path |
| `test-account-balance.sh` | Hardcoded `/tmp/` path |
| `frontend/run-tests-summary.sh` | Hardcoded `/tmp/` path |
| `backend/check-db.js` | Hardcoded `/tmp/finance-manager-2/` path |

---

## High Priority

### 4. Missing package.json metadata
All three `package.json` files are missing standard public repo fields:

| Field | Root | frontend/ | backend/ |
|-------|------|-----------|----------|
| `author` | ✗ | ✗ | ✗ |
| `license` | ✗ | ✗ | ✗ |
| `repository` | ✗ | ✗ | ✗ |
| `bugs` | ✗ | ✗ | ✗ |
| `homepage` | ✗ | ✗ | ✗ |

### 5. .gitignore gaps
Missing patterns to add:
```
.env
*.pid
coverage/
test-results/
test-output.png
*.swp
*.swo
.DS_Store
```

### 6. Cluttered root directory
One-off scripts that should move to `scripts/` or be removed:
- `insert-bills-api.js` — Seed script
- `test-pdf-export.js` — One-off test
- `test-account-balance.sh` — One-off test
- `test-portfolio.sh` — One-off test
- `bench-sankey.mjs` — Performance benchmark
- `frontend/fix-selectors.sh` — Fix script
- `frontend/run-tests-summary.sh` — Utility script

Root-level log files:
- `backend.log`, `dev-server.log`, `api-test-results.log`
- `categories-test-results.log`, `full-test-results.log`, `test-results.log`

Root clutter:
- `CLEANUP_PLAN.md`, `CODE_QUALITY_REPORT.md`, `SECURITY_AUDIT_REPORT.md` — move to `docs/reports/`
- `todo.md` (root) and `frontend/todo.md` — consolidate
- `icon-192.png`, `icon-512.png` — duplicates of `public/` icons
- `manifest.json`, `index.html` — should be in `public/` only

---

## Medium Priority

### 7. Missing community docs
- No `SECURITY.md` (how to report vulnerabilities)
- No `CODE_OF_CONDUCT.md`
- No `CONTRIBUTING.md` (contributing guide is inline in README)

### 8. Duplicate/overlapping docs files
Five files about GitHub issues with overlapping content:
- `docs/github-issues-analysis.md`
- `docs/github-issues-assessment.md`
- `docs/github-issues-state.md`
- `docs/github-issues-status.md`
- `docs/github-issues-summary.md`

### 9. Backend monolith
`backend/index.js` is ~9,000 lines. Should eventually be split into route modules.

### 10. Duplicate deployment files
- `docs/deploy.sh` duplicates `deploy.sh`
- `docs/Dockerfile` and `docs/docker-compose.yml` duplicate root versions

### 11. Two test directories
`test/` and `tests/` at root — should be consolidated.

### 12. Archive-ready docs
Migration-complete reports that can be moved to `docs/archive/`:
- `docs/solidjs-migration-report.md`
- `docs/migration-comparison-report.md`
- `docs/plans/` — 9 plan files, many likely completed

---

## Low Priority / Nice to Have

- Add VSCode/IDE patterns to `.gitignore` (`.vscode/`, `.idea/`)
- Add editor backup patterns (`.DS_Store`, `*.swp`, `*.swo`, `Thumbs.db`)
- `D3HeatmapChart.tsx:130` uses `innerHTML` — consider `textContent` instead
- Coverage tooling (`@vitest/coverage-v8`) not installed
- `README.md` deployment section should use generic placeholders
- Hardcoded demo password in `backend/database.js:552` — add comment noting it's a seed value

---

## Verification Checklist

- [ ] Remove tracked symlink from git
- [ ] Remove tracked `.env`, `dev-server.pid`, coverage, test artifacts from git
- [ ] Update `.gitignore` with missing patterns
- [ ] Replace hardcoded URLs/paths with placeholders in docs
- [ ] Add metadata to all `package.json` files
- [ ] Clean up root directory (scripts → `scripts/`, reports → `docs/reports/`)
- [ ] Consolidate duplicate docs
- [ ] Add `SECURITY.md` and `CODE_OF_CONDUCT.md`
- [ ] Review and archive completed plan files
