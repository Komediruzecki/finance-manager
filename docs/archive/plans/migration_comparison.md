# Migration Comparison: Old JS App vs SolidJS App

> **Old app:** `feat/old-js-app` | **New app:** `main` (SolidJS + Vite + TypeScript)

---

## Architecture Comparison

| Aspect | Old JS App | SolidJS App |
|--------|-----------|-------------|
| **Framework** | Vanilla JS, global `window.FM` namespace | SolidJS + TypeScript |
| **Build** | Custom `build.js` (esbuild transform) | Vite |
| **Routing** | Hash-based, manual `.page.active` toggle | Hash-based, `Show`/`Dynamic` components |
| **State** | Global `FM` singleton + localStorage | SolidJS signals + stores (`stores/index.ts`) |
| **API Client** | `FM.api()` function | `ApiClient` class (`core/api.ts`, 915 lines) |
| **Components** | Raw HTML string templates + `innerHTML` | JSX components with CSS Modules |
| **Event Handling** | Global `data-action` delegation | Native SolidJS event binding |
| **Styling** | 2 global CSS files (54KB total) | Global CSS + 61 CSS Module files |
| **Types** | None | Full TypeScript (`types/models.ts`, `types/api.ts`) |
| **Modals** | Pre-rendered in `modals.html`, toggled by ID | Dynamic `Modal.tsx` component |
| **Toasts** | Append DOM element, auto-remove | `createToastStore()` with reactive signals |
| **PWA** | Custom `sw.js` with build cache-busting | Workbox-based SW via Vite PWA plugin |

---

## Feature Parity Checklist

### Legend
- ✅ **Fully ported** — equivalent or better functionality
- ⚠️ **Partially ported** — exists but missing sub-features  
- ❌ **Missing** — not yet implemented
- 🆕 **New** — exists only in SolidJS app

### Core Infrastructure

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 1 | Auth (login/logout) | `auth.js` | ⚠️ | `authLogin`/`authLogout` in `handlers.ts` — uses DOM-based login dialog, not a proper component |
| 2 | Multi-profile (switch, multi-select, household) | `profile.js` | ⚠️ | `createProfileStore()` has `switchTo`, `toggleProfile`, `selectAllProfiles` but dropdown in `App.tsx` is simplified — missing multi-select checkboxes, delete profile |
| 3 | Theme (light/dark) | `theme.js` | ✅ | `createThemeStore()` with `data-theme` attribute |
| 4 | Modal system | `modal.js` | ✅ | `Modal.tsx` component + `createModalStore()` |
| 5 | Toast notifications | `app-singleton.js` | ✅ | `createToastStore()` with reactive signals |
| 6 | Mobile sidebar toggle | `router.js` | ❌ | No hamburger/collapse logic in `App.tsx` |
| 7 | Zoom reset | `app.js` | ❌ | Not implemented |
| 8 | Service Worker / PWA | `sw.js` | ✅ | Workbox-based via Vite PWA plugin |

### Dashboard

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 9 | Summary stats (Income/Expenses/Balance/Net Worth) | `dashboard.js` | ✅ | Full implementation with MoM deltas |
| 10 | Month navigation (prev/next/year/month selects) | `dashboard.js` | ✅ | PeriodNavigator + PeriodPills component |
| 11 | Spending by Category chart (Doughnut) | `dashboard.js` | ✅ | ChartWrapper implementation |
| 12 | Income vs Expenses chart (Bar, 12 months) | `dashboard.js` | ✅ | ChartWrapper implementation |
| 13 | Cash Flow chart (Line, cumulative) | `dashboard.js` | ✅ | ChartWrapper implementation |
| 14 | Net Worth Over Time chart (Line) | `dashboard.js` | ✅ | ChartWrapper implementation with export |
| 15 | Recent Transactions list | `dashboard.js` | ✅ | Rendering complete |
| 16 | Budget Alerts card | `dashboard.js` | ✅ | BudgetAlertsCard component |
| 17 | Savings Rate card | `dashboard.js` | ✅ | SavingsRateCard component |
| 18 | Recurring Insights card | `dashboard.js` | ✅ | RecurringInsightsCard component |

### Transactions

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 19 | Transaction CRUD | `transactions.js` | ✅ | `Transactions.tsx` (748 lines) with full modal |
| 20 | Filters (search, type, date, year/month) | `transactions.js` | ✅ | `FilterBar.tsx` component |
| 21 | Period presets (This Month, Last Month, etc.) | `transactions.js` | ⚠️ | Basic filter support, but no visual preset pills |
| 22 | Pagination (50 per page) | `transactions.js` | ✅ | `Pagination.tsx` component |
| 23 | Column sorting | `transactions.js` | ⚠️ | `TransactionTable.tsx` exists but sorting may be limited |
| 24 | Transaction Tags (create, filter, chips) | `transactions.js` | ❌ | No tag system in SolidJS |
| 25 | Reconciliation (checkbox, batch, filter) | `transactions.js` | ⚠️ | Referenced in types and `TransactionTable.tsx` — CSS exists, partial implementation |
| 26 | Bulk Edit (category/type/delete/reconcile) | `bulkEdit.js` | ❌ | Only CSS exists, `TaskList.tsx` is unrelated |
| 27 | Auto-categorization (AI mapping) | `transactions.js` | ❌ | API methods exist (`autoMapTransactions`) but no UI |
| 28 | Transaction Summary bar | `transactions.js` | ❌ | Not visible in `Transactions.tsx` |
| 29 | Quick Add (Ctrl+Shift+T) | `quickadd.js` | ❌ | CSS exists, referenced but no keyboard shortcut handler |
| 30 | Category multi-select filter | `transactions.js` | ❌ | Old app had rich dropdown; SolidJS has simple select |

### Budgets

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 31 | Budget CRUD | `budgets.js` | ✅ | `Budgets.tsx` (579 lines) |
| 32 | Budget progress (SVG circular + bar) | `budgets.js` | ⚠️ | Has progress bars but no SVG circular indicators |
| 33 | Rollover logic | `budgets.js` | ⚠️ | Referenced in storage types but not fully wired |
| 34 | Duplicate from Last Month | `budgets.js` | ❌ | Not implemented |
| 35 | Set from Expenses | `budgets.js` | ❌ | Not implemented |
| 36 | Budget vs Actual chart | `budgets.js` | ❌ | No chart rendering |
| 37 | Improvement tracking chart | `budgets.js` | ❌ | No chart rendering |
| 38 | Budget allocation doughnut | `budgets.js` | ❌ | No chart rendering |
| 39 | Zero-based budgeting | N/A | 🆕 | New feature: `/api/budgets/zero-based` endpoint used |

### Loans

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 40 | Loan CRUD | `loans.js` | ✅ | `Loans.tsx` (578 lines) |
| 41 | Amortization schedule table | `loans.js` | ✅ | `LoanAmortizationTable.tsx` (510 lines) — detailed implementation |
| 42 | Prepayments | `loans.js` | ✅ | API + UI in `LoanAmortizationTable.tsx` |
| 43 | Rate Periods | `loans.js` | ⚠️ | API exists, types defined, but UI unclear |
| 44 | Loan charts (Principal vs Interest, Balance) | `loans.js` | ❌ | No chart rendering |
| 45 | Amortization CSV export | `loans.js` | ❌ | Not implemented |

### Analytics

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 46 | Stacked bar chart (category trends) | `analytics.js` | ⚠️ | `Analytics.tsx` (557 lines) — calls `/api/analytics/category-trends` |
| 47 | Doughnut chart (category breakdown) | `analytics.js` | ⚠️ | Partially implemented |
| 48 | Top categories list | `analytics.js` | ⚠️ | Partially implemented |
| 49 | Daily/weekly/monthly averages | `analytics.js` | ❌ | Not visible |
| 50 | Period comparison mode | `analytics.js` | ❌ | No compare toggle |
| 51 | Drill-down (year→month→week) | `analytics.js` | ❌ | No drill-down support |
| 52 | Sankey diagram (D3) | `analytics.js` | ❌ | Only CSS exists, no D3 integration |
| 53 | Heatmap (D3 calendar) | `heatmap.js` | ⚠️ | Referenced, CSS module exists, calls `/api/analytics/daily-heatmap` |

### Import

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 54 | File upload (CSV/XLSX) | `import.js` | ✅ | `Import.tsx` (782 lines) — recently reworked with `Import.module.css` |
| 55 | Google Sheets import | `import.js` | ✅ | Calls `/api/import/googlesheet` |
| 56 | Column mapping | `import.js` | ✅ | Full mapping UI |
| 57 | Duplicate detection | `import.js` | ⚠️ | Unclear if fully ported |
| 58 | Smart column type detection | `import.js` | ⚠️ | Unclear if confidence badges ported |

### Other Features

| # | Feature | Old Module | SolidJS Status | Notes |
|---|---------|-----------|----------------|-------|
| 59 | Categories CRUD (with color palette) | `categories-accounts.js` | ✅ | `Categories.tsx` (501 lines) |
| 60 | Accounts CRUD (grouped by type) | `categories-accounts.js` | ✅ | `Accounts.tsx` (392 lines) |
| 61 | Account balance history | `categories-accounts.js` | ✅ | API + types exist |
| 62 | Bills (upcoming/overdue/mark paid) | `bills.js` | ✅ | `Bills.tsx` (602 lines) |
| 63 | Savings Goals CRUD | `savingsGoals.js` | ✅ | `Goals.tsx` (383 lines) |
| 64 | Savings Goals quick-add | `savingsGoals.js` | ❌ | No quick contribution prompt |
| 65 | FIRE Calculator | `retirement.js` | ✅ | `Retirement.tsx` (686 lines) |
| 66 | Emergency Fund tracker | `retirement.js` | ✅ | `EmergencyFundCalculator.tsx` (175 lines) — separate component |
| 67 | Compound Interest Projector | `retirement.js` | ✅ | `CompoundInterestCalculator.tsx` (348 lines) — separate component |
| 68 | Housing Rent vs Buy | `housingCalc.js` | ✅ | `RentBuyCalculator.tsx` (514 lines) + `Housing.tsx` (371 lines) |
| 69 | Chart Export (PNG/SVG) | `chartExport.js` | ❌ | CSS module exists but no implementation |
| 70 | Settings (currency, theme) | `settings-reports.js` | ✅ | `Settings.tsx` + `SettingsDialog.tsx` |
| 71 | PDF reports (monthly/annual/tax/P&L) | `settings-reports.js` | ❌ | No PDF generation UI — only file names referenced |
| 72 | Data Export (CSV/JSON) | `settings-reports.js` | ⚠️ | `SettingsDialog.tsx` references export, storage adapter has export methods |
| 73 | Danger Zone (delete all data) | `settings-reports.js` | ⚠️ | `DangerZone.module.css` exists, `resetProfileData()` API exists |
| 74 | Receipts (upload/view/delete) | N/A | 🆕 | New feature in SolidJS: `api.uploadReceipt()`, `handlers.ts` receipt system |

---

## Gap Summary

### Critical Gaps (Core Functionality)
1. ~~**Dashboard charts**~~ — ✅ All charts implemented (Net Worth, Cash Flow, Category, Income vs Expenses)
2. ~~**Dashboard month navigation**~~ — ✅ PeriodNavigator + PeriodPills component
3. ~~**Dashboard MoM deltas**~~ — ✅ MoM delta calculations with visual indicators
4. **Transaction Tags** — Entire tag system missing
5. **Bulk Edit** — No multi-select operations
6. **Budget charts** — No visual charts (3 charts missing)
7. **Loan charts** — No visual charts (2 charts missing)
8. **PDF Reports** — 4 report types not available
9. **Mobile responsive sidebar** — No collapse/toggle

### Moderate Gaps (UX Polish)
10. **Quick Add** (Ctrl+Shift+T shortcut)
11. **Auto-categorization UI** (API exists, no frontend)
12. **Reconciliation** (partial — needs full workflow)
13. **Chart Export** (PNG/SVG export buttons)
14. **Sankey diagram** (D3 integration)
15. **Analytics drill-down** (year→month→week)
16. **Analytics comparison mode**
17. **Budget rollover** (partially wired)
18. **Budget duplicate/from-expenses** buttons
19. **Transaction Summary bar**
20. **Category multi-select filter**

### Minor Gaps
21. **Zoom reset** button
22. **Savings Goals quick-add** prompt
23. **Amortization CSV export**
24. **Net Worth Over Time** chart
25. **Recurring Insights** card
26. **Savings Rate Goal** card

### New in SolidJS (Not in Old App)
1. **Receipts** — Upload/view/delete receipt images per transaction
2. **Zero-based budgeting** — New budget allocation mode
3. **ErrorBoundary** — Graceful error handling component
4. **TypeScript** — Full type safety
5. **Exchange Rates API** — Currency conversion support
6. **Rent vs Buy Calculator** — Separated into its own page/component

---

## EARS Specifications

All feature components now include EARS (GIVEN/WHEN/THEN) specifications at the top of each file. This provides testable acceptance criteria for automated testing.

| Feature | Has EARS | Test Cases |
|---------|----------|------------|
| Dashboard.tsx | ✅ | 6 test cases covering metrics, charts, widgets, and navigation |
| Transactions.tsx | ✅ | 6 test cases covering listing, CRUD, receipts, and reconciliation |
| Accounts.tsx | ✅ | 6 test cases covering CRUD and balance display |
| Budgets.tsx | ✅ | 6 test cases covering budget creation, progress, rollover, etc. |
| Categories.tsx | ✅ | 6 test cases covering CRUD operations |
| Goals.tsx | ✅ | 6 test cases covering progress tracking |
| Loans.tsx | ✅ | 6 test cases covering loans and amortization |
| Housing.tsx | ✅ | 5 test cases covering housing expenses |
| Retirement.tsx | ✅ | 6 test cases covering retirement goals |
| Import.tsx | ✅ | 6 test cases covering file/import workflows |
| Settings.tsx | ✅ | 5 test cases covering configuration |
| Analytics.tsx | ✅ | 5 test cases covering charts and data |
| CompoundInterestCalculator.tsx | ✅ | 4 test cases covering projections |
| EmergencyFundCalculator.tsx | ✅ | 3 test cases covering coverage |
| RentBuyCalculator.tsx | ✅ | 4 test cases comparing rent vs buy |
| Bills.tsx | ✅ | 7 test cases covering bills CRUD |

### Phase 1: Charts Foundation
> All chart-dependent features are blocked on this
- Integrate Chart.js (or chart library) into SolidJS
- Create reusable `<Chart>` wrapper component (one exists at `Chart.tsx` but it's minimal)
- Port dashboard charts first (Doughnut, Bar, Line)

### Phase 2: Dashboard Completeness  
- Month navigation controls
- MoM delta calculations
- Budget alerts card
- Savings rate card
- Recurring insights card
- Net Worth chart
- Recent transactions with proper rendering

### Phase 3: Transaction Power Features
- Tag system (create, assign, filter)
- Bulk edit operations
- Auto-categorization UI
- Full reconciliation workflow
- Quick Add modal + keyboard shortcut
- Category multi-select filter
- Transaction summary bar

### Phase 4: Budget & Loan Charts
- Budget vs Actual chart
- Improvement tracking chart
- Loan Principal vs Interest chart
- Loan Balance Over Time chart
- Amortization CSV export

### Phase 5: Analytics Enhancements
- Sankey diagram (D3)
- Full heatmap implementation
- Analytics drill-down
- Period comparison mode
- Daily/weekly/monthly averages

### Phase 6: Reports & Polish
- PDF report generation (4 types)
- Chart export (PNG/SVG)
- Data export UI completion
- Mobile sidebar toggle
- Zoom reset
