# Finance Manager — Feature Audit Report

> Generated: 2026-05-11 | Version: 4.0.0

## Pages & Features

| # | Page | Route | Description | Status |
|---|------|-------|-------------|--------|
| 1 | Dashboard | `#dashboard` | Financial overview with income/expense charts, recent transactions, upcoming bills, budget alerts, savings rate, net worth timeline | Complete |
| 2 | Transactions | `#transactions` | Full transaction CRUD, bulk actions (delete, categorize, type change), sortable columns, tag filtering, reconciliation, search | Complete |
| 3 | Accounts | `#accounts` | Bank/investment/cash accounts with balances, auto-update from transactions, starting balance/date tracking, type grouping | Complete |
| 4 | Budgets | `#budgets` | Monthly category budgets, rollover support, zero-based budgeting, allocation, spending alerts, forecast | Complete |
| 5 | Bills | `#bills` | Recurring bill tracking, due dates, payment history, upcoming bills dashboard | Complete |
| 6 | Savings Goals | `#goals` | Target-based savings goals with progress tracking, contributions, deadlines | Complete |
| 7 | Loans | `#loans` | Loan tracking with amortization tables, prepayments, variable rate periods, interest calculations | Complete |
| 8 | Categories | `#categories` | Category CRUD with colors, icons, types (income/expense), tax-deductible flag, auto-categorization mappings | Complete |
| 9 | Import | `#import` | Google Sheets CSV/XLSX import with column mapping, preview, batch transaction creation, account linking | Complete |
| 10 | Counterparties | `#counterparties` | Who-owes-who tracking from beneficiary/payor fields, net position per counterparty | Complete |
| 11 | Portfolio | `#portfolio` | Stock/ETF holdings tracker with Yahoo Finance real-time prices, gain/loss, allocation pie chart | Complete |
| 12 | Analytics | `#analytics` | Spending trends, category breakdowns, daily heatmap, Sankey flow diagram, weekly summaries | Complete |
| 13 | Settings | `#settings` | Theme toggle, currency selection, storage mode (self-hosted/serverless), danger zone, log viewer | Complete |
| 14 | Retirement | `#retirement` | Retirement calculator with projections, goals, contribution tracking | Complete |
| 15 | Housing | `#housing` | Housing cost calculator, rent vs buy comparison | Complete |
| 16 | Compound Interest | `#compound` | Compound interest calculator with contribution modeling | Complete |
| 17 | Emergency Fund | `#emergency` | Emergency fund calculator based on monthly expenses | Complete |
| 18 | Rent vs Buy | `#rentBuy` | Rent vs buy financial comparison calculator | Complete |

## Cross-Cutting Features

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-Profile | 3 demo profiles (low/mid/high income) with realistic data from 2000-2026 | Complete |
| Authentication | Username/password login with session management | Complete |
| Export/Import | JSON data export/import for migration between self-hosted and serverless modes | Complete |
| Serverless Mode | Full IndexedDB adapter for client-only operation without backend | Complete |
| Reconciliation | Transaction reconciliation with bulk toggle and summary | Complete |
| Tags | Per-transaction tags with filtering | Complete |
| Receipts | File upload and attachment to transactions | Complete |
| Recurring Transactions | Scheduled recurring transactions with auto-populate | Complete |
| PDF Reports | Monthly spend, annual summary, P&L, and tax summary PDF generation | Complete |
| Dark/Light Theme | CSS variable-based theming with persistence | Complete |
| Responsive Design | Mobile-friendly layouts with collapsible sidebar | Complete |
| Quick Add | Keyboard shortcut (Ctrl+Shift+T) for rapid transaction entry | Complete |
| Chart Exports | Export individual charts as images | Complete |
| Bulk Actions | Select multiple transactions for delete, categorize, or type change | Complete |

## Technical Stack

- **Frontend**: SolidJS + TypeScript + Vite + CSS Modules
- **Backend**: Node.js + Express + better-sqlite3
- **Charts**: Chart.js + D3.js
- **Storage**: SQLite (self-hosted) / IndexedDB (serverless)
- **Auth**: bcrypt + express-session
- **External APIs**: Yahoo Finance (portfolio prices)
- **PWA**: Service Worker with offline support

## Database Schema

25 tables: profiles, users, sessions, transactions, categories, accounts, budgets, budgets_zero_based, savings_goals, retirement_goals, emergency_fund_config, loans, loan_rate_periods, loan_prepayments, bills, housings, tags, transaction_tags, category_mappings, recurring_transactions, receipts, settings, account_balance_history, portfolio_holdings, sqlite_sequence

## Recent SolidJS Anti-Pattern Fixes (2026-05-11)

- **ChartWrapper**: Added MutationObserver for theme reactivity, cancel token for async import, proper dependency tracking
- **ReconciliationModal**: Guarded Escape key handler with `isOpen()` check
- **CategoryMultiSelect, AutoCategorizeModal, QuickAddModal**: Replaced `createEffect` + `isMounted` guard with `onMount` + `onCleanup`

## Known Gaps

- No automated test suite for frontend (Playwright tests exist but limited)
- Yahoo Finance API may fail silently if Node < 22 or rate-limited
- Serverless IndexedDB mode missing some features (bills, tags, recurring transactions use stubs)
- No end-to-end migration testing between self-hosted and serverless
