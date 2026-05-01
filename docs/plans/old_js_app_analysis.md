# Old JS App — Complete Frontend Feature Analysis

> **Branch:** `feat/old-js-app` | **Target:** Compare with SolidJS app on `main`

---

## 1. Architecture Overview

### Pattern: HTML Monolith SPA
- **Single `index.html`** (~105KB) generated from 4 HTML templates via `build.js`
- **Hash-based routing** (`#dashboard`, `#transactions`, etc.) — no real URL paths
- **Global namespace** via `window.FM` singleton — all modules register onto it
- **Event delegation** via `data-action` attributes on HTML elements (click/change/keydown/submit)
- **Lazy-loading**: Features bundle loaded on first navigation, then cached

### File Structure
```
frontend/
├── build.js                  # Node build script (esbuild + template stitching)
├── index.html                # Generated output (~105KB)
├── sw.js                     # Service Worker (PWA cache)
├── favicon.ico
├── assets/favicon.svg
├── css/
│   ├── base.css              # Design system (36KB) — variables, layout, typography
│   └── components.css        # Component styles (18KB) — cards, modals, tables, etc.
├── templates/
│   ├── sidebar.html          # Navigation sidebar
│   ├── pages.html            # All page content (~61KB)
│   ├── modals.html           # All modal dialogs (~36KB)
│   └── toast.html            # Toast notification container
├── js/
│   ├── app.js                # App bootstrap + event delegation
│   ├── core.js               # Minified core (build artifact)
│   ├── core/
│   │   ├── app-singleton.js  # FM namespace, Utils, API client, Nav router
│   │   ├── auth.js           # Login/logout/session
│   │   ├── modal.js          # Generic open/close by ID
│   │   ├── profile.js        # Multi-profile management + dropdown
│   │   └── theme.js          # Light/dark theme toggle
│   └── features/
│       ├── dashboard.js      # Summary stats, charts, budget alerts, savings rate
│       ├── transactions.js   # CRUD, filters, sort, pagination, reconciliation, tags
│       ├── budgets.js        # Budget CRUD, rollover, improvement charts
│       ├── loans.js          # Loan CRUD, amortization, prepayments, rate periods
│       ├── analytics.js      # Category trends, stacked charts, pie, comparison, sankey
│       ├── heatmap.js        # D3 calendar heatmap (daily spending)
│       ├── import.js         # CSV/Excel/Google Sheets import with column mapping
│       ├── categories-accounts.js  # Category + Account CRUD, balance history
│       ├── bills.js          # Bill tracking (overdue/due-soon/upcoming)
│       ├── savingsGoals.js   # Savings goal CRUD with progress tracking
│       ├── retirement.js     # FIRE calculator + compound interest projector
│       ├── housingCalc.js    # Rent vs Buy comparison calculator
│       ├── settings-reports.js # Settings, PDF reports, data export
│       ├── quickadd.js       # Quick transaction add (Ctrl+Shift+T)
│       ├── bulkEdit.js       # Bulk select/edit/delete transactions
│       └── chartExport.js    # Export charts as PNG/SVG
```

### Build System
- **`build.js`** using **esbuild** for minification (not bundling — just `transform`)
- Concatenates core files → `js/dist/core.js`
- Concatenates feature files → `js/dist/features.js`
- Minifies `app.js` → `js/dist/app.js`
- Stitches HTML templates into `index.html`
- CSS minification via `clean-css` (optional)
- Content-hash cache busting via query params
- Service Worker cache version auto-increment
- Watch mode for development

### CDN Dependencies
| Library | Version | Usage |
|---------|---------|-------|
| Chart.js | 4.4.0 | All charts (bar, line, doughnut) |
| D3 | 7.8.5 | Heatmap + Sankey diagrams |
| d3-sankey | 0.12.3 | Budget flow sankey |
| Inter font | Google Fonts | Typography |

---

## 2. Core Modules

### 2.1 API Client (`app-singleton.js`)
- Base URL: `/api`
- Headers: `Content-Type: application/json`, `X-Profile-Id`, `X-Profile-Ids` (JSON array)
- Credentials: `include` (cookie-based auth)
- Auto-JSON serialization of body
- Returns `null` on non-OK or non-JSON responses
- **Global aliases:** `window.FM`, `FORMAT_CURRENCY`, `FORMAT_DATE`, `ESCAPE_HTML`, `TOAST`, etc.

### 2.2 Auth (`auth.js`)
- `checkLogin()` → `GET /auth/me`
- `login()` → `POST /auth/login` (username/password)
- `logout()` → `POST /auth/logout`
- `isLoggedIn()` checks DOM visibility of `#user-section`
- `updateUI(username)` toggles login/user sections, refreshes profile

### 2.3 Profile (`profile.js`)
- **Multi-profile with combined "Household View"**
- `currentId` from localStorage, `selectedIds[]` for multi-select
- `switchTo(id)`, `toggleProfile(id)`, `selectAllProfiles()`, `clearMultiSelect()`
- Dropdown rendered dynamically with checkmarks
- Profile CRUD: `createProfile()`, `confirmDelete(id, name)`
- `getProfileIds()` returns selected IDs for API headers
- API: `GET /profiles`, `POST /profiles`, `DELETE /profiles/:id`

### 2.4 Router (`router.js` + `app-singleton.js`)
- Hash-based navigation with `hashchange` listener
- `Nav.init()` binds click handlers to `.nav-item` elements
- Shows/hides `.page` elements by adding/removing `.active` class
- **Lazy loading:** First navigation triggers loading `js/dist/features.js`
- `PAGE_INIT` map calls appropriate module `.init()` or `.load()` per page
- Mobile sidebar toggle with overlay

### 2.5 Theme (`theme.js`)
- `data-theme` attribute on `<html>` (light/dark)
- Persisted in `localStorage` key `finance-theme`
- `toggle()` re-renders charts with new colors
- `chartColors()` returns theme-aware color palette

### 2.6 Modal (`modal.js`)
- Simple add/remove `.show` class on element by ID
- All modals defined in `templates/modals.html`

### 2.7 Utilities (`app-singleton.js`)
- `formatCurrency(amount, currency)` — `Intl.NumberFormat`
- `formatDate(dateStr)` — US locale short format
- `formatMonth(date)` — "January 2024" format
- `escapeHtml(str)` — via textContent/innerHTML trick
- `toast(message, type)` — append to `#toast-container`, auto-remove after 4s
- `hexToRgba(hex, alpha)` — color conversion

---

## 3. Feature Modules — Detailed Breakdown

### 3.1 Dashboard (`dashboard.js` — 688 lines)

**UI Components:**
- Year/month selector with prev/next month navigation
- 4 stat cards: Income, Expenses, Balance, Net Worth (with MoM deltas)
- Recent transactions table (last 5-10)
- Budget alerts card (current + previous month, collapsible history)
- Savings rate card (goal-based with progress bar)
- Recurring insights card (top 5 upcoming, category summary bars)

**Charts (Chart.js):**
- Spending by Category — Doughnut
- Monthly Income vs Expense — Bar (12 months)
- Cash Flow — Line (cumulative balance)
- Net Worth Over Time — Line (from account history)

**API Endpoints:**
- `GET /dashboard/summary?year=&month=` (with `prevSummary` for deltas)
- `GET /dashboard/charts?months=12`
- `GET /dashboard/net-worth`
- `GET /accounts/history/timeline`
- `GET /recurring/upcoming`
- `GET /budgets/alerts?threshold=80`
- `GET /settings` (for savings_rate_goal)
- `PUT /settings` (set savings_rate_goal)

**Special Features:**
- Month-over-month delta percentages (▲/▼ with color coding)
- Budget alerts with previous month collapsible history (dismissable via localStorage)
- Savings rate with On Track / Getting There / Below Target status

---

### 3.2 Transactions (`transactions.js` — 1045 lines)

**UI Components:**
- Filter bar: search, type, date range, year/month selects, category multi-select, tag filter
- Period presets: This Month, Last Month, This Year, Custom
- Summary bar: total amount, income, expenses, count
- Sortable table with columns: checkbox, reconcile, date, description+tags, category, beneficiary/payor, amount, type, actions
- Pagination (50 per page)
- Bulk action bar (when items selected)
- Transaction add/edit modal with full field set
- Auto-map modal for AI-based category suggestions

**Sub-modules in same file:**
- `txFilters` — filter state management, presets, category/tag multi-select
- `TxTags` — tag chip rendering, toggle, create new tag
- `Recurring` — recurring transaction CRUD + populate
- `Transactions` — main transaction CRUD
- `Actions` — action handler registry for event delegation

**Transaction Fields:**
description, amount, date, beneficiary, payor, category_id, currency, amount_local, means_of_payment, exchange_rate, type (expense/income/transfer), notes, tags[], reconciled

**API Endpoints:**
- `GET /transactions?search=&type=&category_ids=&tag_ids=&startDate=&endDate=&reconciled=&limit=&offset=&sort=&order=`
- `GET /transactions/summary?reconciled=`
- `GET /transactions/:id`
- `POST /transactions`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`
- `PATCH /transactions/:id/reconcile`
- `PUT /transactions/:id/tags` (body: `{tagIds}`)
- `PUT /transactions/reconcile-batch` (body: `{transaction_ids}`)
- `PUT /transactions/bulk` (body: `{ids, action, data}`)
- `POST /categories/auto-map`
- `POST /categories/apply-mappings`
- `GET /tags`, `POST /tags`
- `GET /recurring`, `GET /recurring/:id`, `POST /recurring`, `PUT /recurring/:id`, `DELETE /recurring/:id`
- `POST /recurring/:id/populate`

**Special Features:**
- Reconciliation (checkbox per row, batch reconcile, filter toggle)
- Tag system (create inline, chip selection, filter by tags)
- Auto-categorization with confidence scores
- Bulk edit: change category, change type, delete, reconcile
- Column sorting with visual indicators
- Form validation with inline field errors

---

### 3.3 Budgets (`budgets.js` — 374 lines)

**UI Components:**
- Month selector (last 12 months)
- Budget items with circular SVG progress + bar + amounts
- Rollover badge with auto/manual rollover amounts
- Duplicate from last month / Set from expenses buttons
- Budget vs Spent horizontal bar chart
- Improvement tracking line chart (adherence % over time)
- Budget allocation doughnut chart

**API Endpoints:**
- `GET /budgets`, `GET /budgets/summary?year=&month=`
- `POST /budgets`, `PUT /budgets/:id`, `DELETE /budgets/:id`
- `PUT /budgets/:id/rollover`
- `POST /budgets/duplicate-last`
- `POST /budgets/from-expenses`
- `GET /budgets/improvements`

**Special Features:**
- Budget rollover (auto from previous month + manual adjustment)
- SVG circular progress indicators (color-coded: green/yellow/red)
- Adherence tracking over time

---

### 3.4 Loans (`loans.js` — 902 lines)

**UI Components:**
- Loan list with calculate/edit/delete/prepayment buttons
- Loan detail panel: summary grid (6 stats), prepayment list, rate period list
- Amortization schedule table (month, date, payment, principal, interest, balance, rate, prepay, note)
- Detailed amortization with CSV export
- Principal vs Interest stacked bar chart
- Balance over time line chart

**API Endpoints:**
- `GET /loans`, `GET /loans/:id`
- `POST /loans`, `PUT /loans/:id`, `DELETE /loans/:id`
- `POST /loans/:id/calculate`
- `POST /loans/:id/prepayments`, `DELETE /loans/:id/prepayments/:pid`
- `POST /loans/:id/rates`, `PUT /loans/:id/rates/:rid`, `DELETE /loans/:id/rates/:rid`

**Special Features:**
- Client-side cache for loan calculations (persists across tab switches)
- Variable rate periods with start/end months
- Prepayment tracking with date-to-month conversion
- Amortization CSV export
- Rate change / prepayment row highlighting

---

### 3.5 Analytics (`analytics.js` — 503 lines)

**UI Components:**
- Year/month/week filter hierarchy (drill-down)
- Expense/Income/Transfer type selector
- Stacked bar chart (category trends)
- Doughnut chart (category breakdown)
- Top 10 categories list with percentages
- Daily/weekly/monthly averages
- Period comparison toggle (overlay second dataset)
- Sankey diagram (budget → spending flow)

**API Endpoints:**
- `GET /analytics/distinct-years`
- `GET /analytics/category-trends?year=&type=&month=&week=`
- `GET /analytics/weeks?year=&month=`
- `GET /analytics/sankey?year=&month=`

**Special Features:**
- Interactive drill-down (click bar → zoom to month)
- Pie slice click → category detail toast
- Period comparison (dashed overlay dataset)
- Sankey diagram using D3 (d3-sankey)

---

### 3.6 Heatmap (`heatmap.js` — 310 lines)

**UI Components:**
- Year selector, expense/income type selector
- GitHub-style calendar heatmap (D3)
- Day/month labels, color legend
- Click → popup with day's transactions

**API Endpoints:**
- `GET /analytics/daily-heatmap?year=&type=`
- `GET /transactions?startDate=&endDate=&type=&limit=20`

---

### 3.7 Import (`import.js` — 647 lines)

**UI Components:**
- Tab: File Upload / Google Sheets
- Drag-and-drop zone for file upload
- Sheet selector (multi-sheet Excel)
- Column mapping dropdowns (12 fields)
- Smart column type detection with confidence badges
- Duplicate detection with skip toggle
- Category type review table
- Preview table (first 10 rows)
- Import limit selector (100/500/1000/All)

**API Endpoints:**
- `POST /import/upload` (multipart)
- `POST /import/file-sheet`
- `POST /import/execute`
- `POST /import/googlesheet`

**Special Features:**
- Auto-map column names by header text matching
- Column type detection (date/amount/description/category/notes/account)
- Duplicate detection (date+amount+description key)
- Category type auto-detection (expense/income/investment/account)
- Google Sheets integration with sheet selection

---

### 3.8 Categories & Accounts (`categories-accounts.js` — 345 lines)

**Categories:**
- Expense/income type tabs
- List with color dot, name, tax-deductible badge
- CRUD with color picker palette
- Delete all categories option
- API: `GET/POST/PUT/DELETE /categories`

**Accounts:**
- Grouped by type: Investment / Giro / Savings
- Account cards with balance, currency, notes
- Balance history modal with timeline
- Record current balance, delete history entries
- API: `GET/POST/PUT/DELETE /accounts`, `GET/POST/DELETE /accounts/:id/history`

---

### 3.9 Bills (`bills.js` — 187 lines)

- Sections: Overdue / Due Soon / Upcoming
- Each bill: name, due date, frequency, amount, days until due
- Mark as paid (creates transaction), edit, delete
- API: `GET /bills/upcoming`, `GET /bills`, `POST/PUT/DELETE /bills/:id`, `POST /bills/:id/mark-paid`

---

### 3.10 Savings Goals (`savingsGoals.js` — 212 lines)

- Goal cards with progress bar, current/target/remaining amounts
- Deadline tracking (overdue, days left, goal reached)
- Quick-add savings via prompt
- API: `GET/POST/PUT/DELETE /savings-goals`

---

### 3.11 Retirement Calculator (`retirement.js` — 351 lines)

**Two calculators:**
1. **FIRE Calculator**: age, savings, contribution, expenses, return rate, country
   - Results: FIRE age, FIRE number, months to FIRE, savings at retirement
   - Scenarios (conservative/moderate/aggressive)
   - Timeline chart
   - Emergency fund status (coverage tiers)
2. **Compound Interest Projector**: principal, contribution, return, years
   - Final balance, total contributions, total interest
   - Scenario cards, projection chart, PNG export

**API Endpoints:**
- `POST /calculator/retire`
- `POST /calculator/compound-interest`
- `GET /calculator/emergency-fund`

---

### 3.12 Housing Calculator (`housingCalc.js` — 391 lines)

- Rent vs Buy 30-year comparison
- Rent inputs: monthly rent, annual increase, investment return
- Buy inputs: price, down payment, term, rate, tax, insurance, maintenance, HOA
- Results: summary cards (rent/buy/verdict), comparison table, break-even year
- Net cost chart (rent vs buy over time)
- All calculations done client-side

---

### 3.13 Settings & Reports (`settings-reports.js` — 287 lines)

**Settings:**
- Currency selection
- Dark mode toggle
- App version display
- Danger zone: delete all transactions, delete all profile data, delete all categories

**Reports/Export:**
- Data export (transactions/categories) as CSV/JSON
- Monthly PDF report
- Tax summary PDF
- P&L summary PDF
- Annual PDF report

**API Endpoints:**
- `GET/PUT /settings`
- `GET /app-info`
- `DELETE /transactions` (all)
- `DELETE /profile/data` (all)
- `DELETE /categories` (all)
- `GET /export/:type?format=`
- `GET /reports/monthly-pdf?year=&month=`
- `GET /reports/tax-summary-pdf?year=`
- `GET /reports/pl-summary-pdf?year=`
- `GET /reports/annual-pdf?year=`

---

### 3.14 Quick Add (`quickadd.js` — 55 lines)
- Keyboard shortcut: `Ctrl/Cmd+Shift+T`
- Minimal modal: amount, description, date, category
- Auto-detects type from category

### 3.15 Bulk Edit (`bulkEdit.js` — 139 lines)
- Select all / individual checkboxes
- Bulk actions bar: change category, change type, delete, reconcile
- Uses `PUT /transactions/bulk`

### 3.16 Chart Export (`chartExport.js` — 195 lines)
- Export any chart as PNG or SVG
- Named exports for each chart location (dashboard, analytics, loans, retirement, etc.)
- Sankey SVG serialization export

---

## 4. CSS Design System

### `base.css` (1819 lines, 36KB)

**Theme Variables (light, 84 variables):**
- Colors: `--bg`, `--card-bg`, `--text`, `--text-secondary`, `--border`, `--primary`, `--success`, `--danger`, `--warning`, `--income`, `--expense`, `--transfer`
- Shadows: `--shadow`, `--shadow-lg`
- Charts: `--chart-income`, `--chart-expense`, `--chart-primary`, `--chart-grid`, `--chart-text`, `--chart-legend-text` + bg variants
- Badges: `--badge-income-bg/text`, `--badge-expense-bg/text`, `--badge-transfer-bg/text`
- Buttons: `--btn-secondary-bg/hover/color`, `--btn-ghost-hover`, `--btn-success-hover`, `--btn-danger-hover`
- UI: `--modal-overlay`, `--period-selector-bg`, `--toggle-slider-bg`, `--scrollbar-thumb`
- Feature-specific: `--loan-stat-bg`, `--amort-th-bg`, `--prepayment-bg`, `--col-map-bg`, `--rate-period-item-bg`
- Profile: `--profile-btn-bg/hover`, `--dropdown-bg/border/text`
- Dark mode: Full `[data-theme='dark']` override block (lines 86-144)

**Layout:**
- Sidebar: 240px fixed left, `z-index: 100`, collapsible on mobile (transform)
- Main: `margin-left: 240px`, `padding: 24px 32px`
- Mobile: sidebar collapses to 60px icon-only, main adjusts

**Component Classes:**
- `.card`, `.card-header`, `.card-title`, `.card-subtitle`
- `.stat-card` with `::before` color top-bar (income/expense/balance/networth)
- `.stat-card-delta` with `.positive`/`.negative` color variants
- `.grid-2`, `.grid-3`, `.grid-4` responsive grids
- `.chart-container` with `.tall`(320px) / `.medium`(260px) / `.short`(220px)
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-danger-outline`, `.btn-ghost`, `.btn-sm`
- `.badge`, `.badge-income`, `.badge-expense`, `.badge-transfer`
- `.form-group`, `.form-label`, `.form-control`, `.form-row`, `.form-help`
- `.form-group.is-invalid`, `.field-error` (validation)
- `.budget-item`, `.budget-bar`, `.budget-bar-fill` (`.over`/`.warning`/`.ok`)
- `.recurring-item`, `.recurring-amount`, `.recurring-freq`
- `.account-card` with hover border
- `.loan-summary-grid`, `.loan-summary-stat` (`.saved`/`.highlight`)
- `.amort-table` with sticky headers and special row highlighting
- `.import-dropzone` (`.dragover`), `.column-map`, `.import-preview`, `.import-limit-btn`
- `.color-palette`, `.color-swatch` (`.selected`)
- `.profile-selector`, `.profile-dropdown-btn/menu/item/header/add/divider`
- `.type-selector` with active states per type
- `.toggle-switch`, `.toggle-slider`
- `.loading-spinner` (`.dark`), `.btn.loading`, `.table-loading`
- `.rate-period-item`, `.prepayment-item`
- `.goals-grid`, `.goal-card`, `.goal-progress-bar/fill`, `.goal-amounts`
- `.retirement-layout` (2-column grid), `.compound-layout`
- `.sankey-link`, `.sankey-node`
- `.heatmap-cell`, `.heatmap-tooltip`, `.heatmap-scale`
- `.settings-section`, `.settings-grid`, `.danger-zone`

**Responsive Breakpoints:**
- `@media (max-width: 1200px)`: grid-4 → 2 columns
- `@media (max-width: 768px)`: full mobile layout, sidebar icon-only, grids → 1 column
- `@media (max-width: 380px)`: extra small screen adjustments

### `components.css` (908 lines, 18KB)

**Modal System:** `.modal-overlay` (fixed, centered), `.modal` (max-width variants), `.modal-header/body/footer`
**Tabs:** `.tabs`, `.tab` (`.active` with primary underline)
**Empty States:** `.empty-state` with SVG icon + message
**Filters:** `.filters-bar`, `.search-input` with SVG icon
**Transaction Summary:** `.tx-summary-bar` with `.summary-item/label/value` (`.income`/`.expense`/`.total`/`.count`)
**Pagination:** `.pagination`, `.pagination-info`, `.pagination-controls`
**Toast:** `.toast-container` (fixed bottom-right), `.toast` (`.success`/`.error`/`.info`) with slide-in animation
**Period Selector:** `.period-selector` with active pill states
**Category Multi-select:** `.tx-cat-filter`, `.tx-cat-filter-dropdown`, `.tx-cat-option`
**Sortable Headers:** `th[data-sort]` with `.sorted` state and `.sort-arrow`
**Bulk Actions:** `.bulk-action-bar`, `.th-checkbox`, `.td-checkbox`
**Auto-map:** `.automap-item`, `.confidence-badge`
**Reconciliation:** `.tr-reconciled`, `.reconcile-checkbox`, `.reconcile-toggle-btn`, `.reconciliation-badge`, `.reconcile-summary-banner`
**Housing Calc:** `.housing-calc-layout`, `.housing-summary-grid/card`, `.housing-comparison-table`, `.housing-breakeven`
**Tags:** `.tx-tag-selector`, `.tx-tag-chips`, `.tx-tag-chip` (`.selected`), `.tx-tag-pill`, `.tx-tag-filter`
**Amortization:** `.amort-detailed-table/wrap`, year markers, prepayment/rate-change row highlighting

---

## 4.5 HTML Templates

### Pages (`templates/pages.html` — 1028 lines)
All page content inside `<main class="main">`, toggled via `.page.active` class:

| Page ID | Title | Key DOM Elements |
|---------|-------|------------------|
| `page-dashboard` | Dashboard | `dashboard-stats`, `chart-category`, `chart-monthly`, `chart-cashflow`, `chart-networth`, `savings-rate-card`, `budget-alerts-card`, `recurring-insights-card`, `recent-transactions` |
| `page-transactions` | Transactions | `tx-search`, filter bar, period-selector, `tx-table-body`, `tx-pagination`, `tx-bulk-bar`, `tx-reconcile-banner`, `tx-summary-bar` |
| `page-budgets` | Budgets | `budget-list`, `chart-budget`, `chart-improvement`, `chart-budget-donut`, `budget-month-select` |
| `page-loans` | Loan Calculator | `loans-list`, `amortization-table-container` |
| `page-retirement` | Retirement Calculator | `retirement-form` (2-column layout), `retirement-results`, `ret-chart`, `emergency-fund-section`, `compound-section` with `ci-chart` |
| `page-housing` | Housing Calculator | `housing-calc-form`, `housing-results`, `housing-chart` |
| `page-goals` | Savings Goals | `goals-grid` |
| `page-bills` | Bills | `bills-list` |
| `page-import` | Import Data | tabs (file/googlesheet), `import-dropzone`, `column-map`, `import-preview`, `import-duplicate-section` |
| `page-categories` | Categories | `expense-categories`, `income-categories` |
| `page-accounts` | Accounts | `accounts-content` |
| `page-analytics` | Analytics | `analytics-stacked-chart`, `analytics-pie-chart`, `analytics-top-categories`, `analytics-averages`, `sankey-chart`, `heatmap-svg` |
| `page-settings` | Settings | currency select, dark mode toggle, export buttons, PDF report selectors, danger zone |

### Modals (`templates/modals.html` — 729 lines)

| Modal ID | Purpose | Key Fields |
|----------|---------|------------|
| `profile-modal` | Create Profile | `profile-name-input` |
| `tx-modal` | Add/Edit Transaction | type selector, description, amount, currency, date, category, tags, beneficiary, payor, amount_local, exchange_rate, means_of_payment, notes |
| `quickadd-modal` | Quick Add Transaction | amount, category, description, date |
| `cat-modal` | Add/Edit Category | type, name, color palette (18 swatches), tax-deductible checkbox |
| `budget-modal` | Add/Edit Budget | category, amount, period, start/end dates, rollover toggle + manual amount |
| `loan-modal` | New/Edit Loan | name, principal, start date, term, rate, rate change periods |
| `goal-modal` | Savings Goal | name, target amount, current amount, deadline, notes |
| `prepay-modal` | Add Prepayment | date, amount, note |
| `recurring-modal` | Recurring Transaction | description, amount, frequency, day of month, next date, category, type, notes |
| `login-modal` | Sign In | username, password |
| `account-modal` | Add/Edit Account | name, type (giro/ib/savings), currency, balance, notes |
| `rate-period-modal` | Rate Period | rate, start month, end month |
| `bulk-category-modal` | Bulk Change Category | category select |
| `bulk-type-modal` | Bulk Change Type | type select (income/expense/transfer) |
| `balance-history-modal` | Account Balance History | list + record balance button |
| `automap-modal` | Auto-categorize | mapping list with checkboxes |
| `bills-modal` | Add/Edit Bill | name, amount, frequency, day, category, notes |

### Data Export Types (Settings Page)
The export section supports these entity types: `transactions`, `categories`, `accounts`, `budgets`, `loans`, `recurring` — in CSV or JSON format.

---

## 5. Service Worker (PWA)

- Cache-first strategy for static assets
- Network-only for API requests (with offline JSON error fallback)
- Auto-cleanup of old caches on activate
- `SKIP_WAITING` message support

---

## 6. Migration Comparison Plan

### Phase 1: Inventory SolidJS App (on `main`)
> **Action needed:** Check out `main` branch and map all SolidJS components/pages

Compare against this checklist:

| # | Feature | Old JS Module | Status in SolidJS |
|---|---------|--------------|-------------------|
| 1 | Dashboard (stats, 4 charts, budget alerts, savings rate, recurring insights) | `dashboard.js` | ❓ |
| 2 | Transactions (CRUD, filters, sort, pagination, reconciliation) | `transactions.js` | ❓ |
| 3 | Transaction Tags (create, filter, chips) | `transactions.js` (TxTags) | ❓ |
| 4 | Recurring Transactions (CRUD, populate) | `transactions.js` (Recurring) | ❓ |
| 5 | Bulk Edit (select, category/type change, delete, reconcile) | `bulkEdit.js` | ❓ |
| 6 | Auto-categorization (AI mapping with confidence) | `transactions.js` | ❓ |
| 7 | Budgets (CRUD, rollover, duplicate, from-expenses) | `budgets.js` | ❓ |
| 8 | Budget improvement charts | `budgets.js` | ❓ |
| 9 | Loans (CRUD, calculate, amortization) | `loans.js` | ❓ |
| 10 | Loan Prepayments + Rate Periods | `loans.js` | ❓ |
| 11 | Amortization CSV export | `loans.js` | ❓ |
| 12 | Analytics (stacked bar, doughnut, top categories, averages) | `analytics.js` | ❓ |
| 13 | Analytics comparison mode | `analytics.js` | ❓ |
| 14 | Analytics drill-down (year→month) | `analytics.js` | ❓ |
| 15 | Sankey diagram | `analytics.js` | ❓ |
| 16 | Heatmap (D3 calendar) | `heatmap.js` | ❓ |
| 17 | Import (file + Google Sheets) | `import.js` | ❓ |
| 18 | Import duplicate detection | `import.js` | ❓ |
| 19 | Import smart column detection | `import.js` | ❓ |
| 20 | Categories (CRUD, color picker, tax deductible) | `categories-accounts.js` | ❓ |
| 21 | Accounts (CRUD, balance history, grouped by type) | `categories-accounts.js` | ❓ |
| 22 | Net Worth chart (from account history) | `dashboard.js` | ❓ |
| 23 | Bills (upcoming, overdue, mark paid) | `bills.js` | ❓ |
| 24 | Savings Goals (CRUD, progress, quick-add) | `savingsGoals.js` | ❓ |
| 25 | Retirement/FIRE Calculator | `retirement.js` | ❓ |
| 26 | Emergency Fund tracker | `retirement.js` | ❓ |
| 27 | Compound Interest Projector | `retirement.js` | ❓ |
| 28 | Housing Rent vs Buy Calculator | `housingCalc.js` | ❓ |
| 29 | Quick Add (Ctrl+Shift+T) | `quickadd.js` | ❓ |
| 30 | Chart Export (PNG/SVG) | `chartExport.js` | ❓ |
| 31 | Settings (currency, theme) | `settings-reports.js` | ❓ |
| 32 | Monthly/Annual/Tax/P&L PDF reports | `settings-reports.js` | ❓ |
| 33 | Data Export (CSV/JSON) | `settings-reports.js` | ❓ |
| 34 | Delete all data (transactions, profile, categories) | `settings-reports.js` | ❓ |
| 35 | Multi-profile (switch, multi-select, household view) | `profile.js` | ❓ |
| 36 | Auth (login/logout) | `auth.js` | ❓ |
| 37 | Theme (light/dark) | `theme.js` | ❓ |
| 38 | Service Worker / PWA | `sw.js` | ❓ |
| 39 | Mobile sidebar toggle | `router.js` | ❓ |
| 40 | Zoom reset | `app.js` | ❓ |

### Phase 2: Gap Analysis
For each ❓ above, mark as:
- ✅ **Fully ported** — feature exists with equivalent functionality
- ⚠️ **Partially ported** — exists but missing sub-features
- ❌ **Missing** — not yet implemented in SolidJS

### Phase 3: Port Missing Features
Priority order:
1. Core functionality gaps (transactions, dashboard, budgets)
2. Financial calculators (loans, retirement, housing)
3. Data management (import, export, reports)
4. UX features (quick-add, bulk edit, chart export)
5. Infrastructure (PWA, service worker)

---

## 7. API Endpoint Master List

All endpoints used by the old frontend (for verifying backend compatibility):

```
Auth:       GET /auth/me, POST /auth/login, POST /auth/logout
Profiles:   GET /profiles, POST /profiles, DELETE /profiles/:id
Settings:   GET /settings, PUT /settings
App:        GET /app-info

Dashboard:  GET /dashboard/summary, GET /dashboard/charts, GET /dashboard/net-worth

Transactions: GET/POST/DELETE /transactions, GET/PUT/DELETE /transactions/:id
              PATCH /transactions/:id/reconcile
              PUT /transactions/:id/tags
              PUT /transactions/reconcile-batch
              PUT /transactions/bulk
              GET /transactions/summary

Categories: GET/POST/DELETE /categories, PUT/DELETE /categories/:id
            POST /categories/auto-map, POST /categories/apply-mappings

Accounts:   GET/POST /accounts, PUT/DELETE /accounts/:id
            GET/POST /accounts/:id/history, DELETE /accounts/:id/history/:hid
            GET /accounts/history/timeline

Tags:       GET /tags, POST /tags

Budgets:    GET/POST /budgets, PUT/DELETE /budgets/:id
            GET /budgets/summary, GET /budgets/alerts
            PUT /budgets/:id/rollover
            POST /budgets/duplicate-last, POST /budgets/from-expenses
            GET /budgets/improvements

Loans:      GET/POST /loans, GET/PUT/DELETE /loans/:id
            POST /loans/:id/calculate
            POST /loans/:id/prepayments, DELETE /loans/:id/prepayments/:pid
            POST/PUT/DELETE /loans/:id/rates (rate periods)

Bills:      GET /bills, GET /bills/upcoming
            POST/PUT/DELETE /bills/:id, POST /bills/:id/mark-paid

Goals:      GET/POST /savings-goals, PUT/DELETE /savings-goals/:id

Recurring:  GET /recurring, GET/POST /recurring/:id
            PUT/DELETE /recurring/:id, POST /recurring/:id/populate
            GET /recurring/upcoming

Analytics:  GET /analytics/distinct-years
            GET /analytics/category-trends
            GET /analytics/weeks
            GET /analytics/sankey
            GET /analytics/daily-heatmap

Calculators: POST /calculator/retire
             POST /calculator/compound-interest
             GET /calculator/emergency-fund

Import:     POST /import/upload, POST /import/file-sheet
            POST /import/execute, POST /import/googlesheet

Export:     GET /export/:type?format=
Reports:    GET /reports/monthly-pdf, GET /reports/tax-summary-pdf
            GET /reports/pl-summary-pdf, GET /reports/annual-pdf

Profile:    DELETE /profile/data
```
