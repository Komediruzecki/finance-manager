# Finance Manager — Master TODO

<!-- STATUS KEY: [x] done  [~] in-progress  [ ] planned  [?] idea -->

---

## What's Built

### Backend (26 API route modules + 15 repos + 6 services)
- REST API at `localhost:3847` with Express, SQLite (better-sqlite3), bcrypt, Helmet
- Profile-based data isolation (`X-Profile-Id` header), session auth, rate limiting
- Repository pattern: `BaseRepository` + 15 domain repos (`/backend/repositories/`)
- Routes: accounts, analytics, appInfo, auth, bills, budgets, calculators, categories,
  counterparties, dashboard, export, housing, import, loans, notifications, portfolio,
  profiles, receipts, recurring, reports, retirement, savingsGoals, settings, storageMode,
  tags, tax, transactions
- Services: email (nodemailer), PDF (pdfkit + puppeteer render), spreadsheets (xlsx),
  reminders (cron-scheduled budget/spending/bills emails), Yahoo Finance (portfolio)

### Frontend (SolidJS + TypeScript + Vite)
- Full SPA with client-only Dexie (IndexedDB) mode and server-backed SQLite mode
- 30+ feature pages including calculators (compound interest, emergency fund, FIRE,
  rent-vs-buy, retirement, loan amortization), portfolio tracking, counterparties
- Dashboard with budget alerts, recurring insights, savings rate, period navigation
- Import (CSV/XLSX) with duplicate detection, export (CSV/PDF/JSON)
- Tag system, category auto-mapping from merchant patterns, bulk operations
- Dark/light mode, mobile responsive

### Testing (451 E2E + backend unit + frontend unit)
- 451 E2E backend API tests (16 spec files, `test/e2e/backend-api/`)
- Backend unit tests: auth, loans, health, security, analytics, export, retirement, etc.
- Frontend unit tests: localHandlers, components, calculators, storage

### DevOps
- Dockerfile + .dockerignore for containerized deployment
- Deploy script, nuke/reset scripts in `scripts/`
- GitHub PR workflow (branch from main, conventional commits)

---

## Backend — Next Priorities

- [ ] **API docs (OpenAPI/Swagger)** — Generate from route annotations or write by hand
- [ ] **WebSocket for real-time updates** — Push dashboard/balance changes to frontend
- [ ] **Bank feed/webhook ingestion** — Accept structured bank data via webhook
- [ ] **Multi-currency auto-conversion** — Fetch live rates and store historical conversions
- [ ] **Database migrations system** — Proper up/down migrations instead of ad-hoc ALTERs
- [ ] **Redis for rate limiting** — Replace in-memory Map for multi-process/production
- [ ] **Audit log pruning** — Auto-delete logs older than N days, add log levels filter
- [ ] **GraphQL endpoint** — Alternative to REST for complex dashboard queries
- [ ] **Server-sent events for cron progress** — Stream long-running report generation

## Frontend — Next Priorities

- [ ] **Dashboard widget customization** — Drag to reorder, show/hide individual widgets
- [ ] **Full keyboard navigation** — Tab order, shortcuts for power users
- [ ] **PWA manifest + service worker** — Installable on mobile/home screen
- [ ] **Offline-first mode hardening** — Queue mutations when offline, sync on reconnect
- [ ] **Sankey diagram for cash flow** — Visual income→expense→savings flow
- [ ] **Budget scenario planner** — What-if modeling (new job, move, baby, etc.)
- [ ] **Transaction receipt OCR** — Extract merchant/amount/date from receipt images
- [ ] **Natural language transaction input** — "coffee 4.50 yesterday at starbucks"

## Data & Analytics

- [ ] **ML category prediction** — Train on user's categorized transactions
- [ ] **Anomaly detection** — Flag unusual transactions (spike in normally flat category)
- [ ] **Year-over-year comparisons** — Same month last year side-by-side
- [ ] **Spending velocity charts** — Burn rate visualization
- [ ] **Net worth projection** — Monte Carlo simulation of future net worth
- [ ] **Tax loss harvesting tracker** — For investment portfolios

## Collaboration & Sharing

- [ ] **Multi-user household** — Invite another user to a shared profile
- [ ] **Read-only share links** — Generate expiring links to share a report/dashboard
- [ ] **Export to accounting software** — QuickBooks/Xero CSV format templates

## Infrastructure

- [ ] **CI/CD pipeline** — GitHub Actions to run tests, lint, build on PR
- [ ] **Docker Compose for dev** — One-command dev environment
- [ ] **S3-compatible backup** — Scheduled DB backups to S3/Backblaze
- [ ] **Healthcheck endpoint hardening** — Check DB write, disk space, memory
- [ ] **Prometheus metrics endpoint** — Request duration, error rates, DB pool stats

## Testing & Quality

- [ ] **Frontend E2E tests** — Playwright tests for critical user flows
- [ ] **Visual regression tests** — Screenshot comparison for UI components
- [ ] **Load testing** — Artillery/k6 scripts for API under load
- [ ] **Fuzz testing for input validation** — SQLi, XSS, oversized payloads
- [ ] **Accessibility audit** — axe-core automated + manual screen reader pass

## Docs & Community

- [ ] **API reference docs** — Every endpoint with request/response examples
- [ ] **User guide** — Screenshots, feature walkthrough
- [ ] **Self-hosting guide** — Docker, reverse proxy, env vars, backups
- [ ] **CODE_OF_CONDUCT.md**
- [ ] **CONTRIBUTING.md** — Dev setup, branch strategy, commit conventions

## Code Quality

- [ ] **Remove commented-out legacy code** — Several files have `// old approach` blocks
- [ ] **Fix implicit `any` types** — Clean up remaining TypeScript escape hatches
- [ ] **Consolidate delete confirmation patterns** — 10+ nearly identical confirm dialogs
- [ ] **Extract shared chart config** — Chart.js options repeated across Analytics/Dashboard
- [ ] **Bundle size audit** — Tree-shake unused chart.js sub-plugins
