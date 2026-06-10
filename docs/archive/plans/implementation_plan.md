# Detailed Migration Implementation Plan

> **Goal:** Port ALL missing features from old JS app → SolidJS while keeping all new SolidJS-only features intact.  
> **Principle:** Follow SolidJS best practices — reactive signals, proper component composition, CSS Modules, TypeScript throughout.

---

## Pre-requisites & Conventions

### SolidJS Patterns to Follow
```
Signal        → createSignal()           for local component state
Resource      → createResource()         for async data fetching with Suspense
Store         → createStore()            for complex nested state (budgets, loans)
Effect        → createEffect()           for side effects (localStorage, DOM)
Memo          → createMemo()             for derived/computed values
Show/Switch   → <Show>/<Switch>          for conditional rendering (NOT ternaries)
For           → <For each={}>            for list rendering (NOT .map())
onMount       → onMount()               for one-time initialization
onCleanup     → onCleanup()             for cleanup (event listeners, timers)
```

### File Organization Convention
```
src/features/FeatureName.tsx       → Page-level component
src/components/FeatureName/        → Sub-components (if complex)
src/components/FeatureName.module.css → Styles
src/stores/featureStore.ts         → Feature-specific store (if needed)
src/utils/charts.ts                → Shared chart utilities
```

### Existing Features to KEEP (SolidJS-only)
- ✅ Receipts system (upload/view/delete)
- ✅ Zero-based budgeting (`/api/budgets/zero-based`)
- ✅ ErrorBoundary component
- ✅ Full TypeScript type system
- ✅ Exchange Rates API integration
- ✅ Rent vs Buy Calculator (separate component)
- ✅ Emergency Fund Calculator (separate component)
- ✅ Compound Interest Calculator (separate component)
- ✅ Database storage switching (SQLite ↔ PostgreSQL)
- ✅ Import page (recently reworked — fully functional)

---

## Phase 1: Charts Foundation

> **Rationale:** Dashboard, Budgets, Loans, and Analytics pages ALL depend on chart rendering. This unblocks everything.

### Task 1.1: Install Chart.js & Create Wrapper Component

**File:** `src/components/ChartWrapper.tsx` (new)

```typescript
// Component signature
interface ChartWrapperProps {
  type: 'bar' | 'line' | 'doughnut' | 'pie'
  data: ChartData
  options?: ChartOptions
  height?: string         // CSS height, default '300px'
  class?: string
  onReady?: (chart: Chart) => void  // for export functionality
}
```

**Implementation details:**
- Use `onMount` + `onCleanup` to manage Chart.js lifecycle (create/destroy)
- Use `createEffect` to reactively update chart data when signals change
- Support `ref` forwarding for chart export (PNG/SVG)
- Register only needed Chart.js components (tree-shaking)

**Steps:**
1. `npm install chart.js` in `frontend/`
2. Create `src/utils/chartConfig.ts` — shared defaults (fonts, colors, dark mode awareness via CSS variables)
3. Create `src/components/ChartWrapper.tsx` — reactive wrapper
4. Create `src/components/ChartWrapper.module.css` — container styles (`.tall`, `.medium`, `.short` variants)
5. Update existing `src/components/Chart.tsx` (currently 67 lines, minimal) to use the new wrapper or replace it

**Complexity:** Medium | **Est:** 2-3 hours

---

### Task 1.2: Chart Theme Integration

**File:** `src/utils/chartConfig.ts` (new)

```typescript
export function getChartColors(theme: 'light' | 'dark'): ChartColorScheme
export function getChartDefaults(theme: 'light' | 'dark'): ChartOptions
export function getCategoryColors(categories: Category[]): string[]
```

**Details:**
- Read CSS variables (`--chart-income`, `--chart-expense`, `--chart-grid`, etc.) from computed styles
- Auto-update charts when theme toggles via `createEffect` on `theme()` signal
- Support the 18 color swatches from old app's color palette

**Complexity:** Low | **Est:** 1 hour

---

### Task 1.3: Chart Export Utility

**File:** `src/utils/chartExport.ts` (new)

```typescript
export function exportChartAsPNG(chart: Chart, filename: string): void
export function exportChartAsSVG(canvasEl: HTMLCanvasElement, filename: string): void
```

**Details:**
- Port logic from old `chartExport.js` (canvas → blob → download)
- Create `ExportChartButton` component for reuse

**File:** `src/components/ExportChartButton.tsx` (new)
```typescript
interface ExportChartButtonProps {
  chartRef: () => Chart | undefined
  filename: string
}
```

**Complexity:** Low | **Est:** 1 hour

---

## Phase 2: Dashboard Completeness

### Task 2.1: Dashboard Stats with MoM Deltas

**File:** `src/features/Dashboard.tsx` (modify)

**Current state:** Calls `api.getDashboard()`, renders basic stats.  
**Missing:** Month-over-month delta indicators, period navigation.

**New sub-components:**
- `src/components/Dashboard/StatCard.tsx` — stat card with delta badge (`.positive`/`.negative`)
- `src/components/Dashboard/PeriodNavigator.tsx` — month/year navigation controls

```typescript
// StatCard
interface StatCardProps {
  label: string
  value: number
  currency: string
  delta?: number        // percentage change
  deltaLabel?: string   // "vs last month"
  variant: 'income' | 'expense' | 'balance' | 'networth'
}

// PeriodNavigator
interface PeriodNavigatorProps {
  month: () => number
  year: () => number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onPrev: () => void
  onNext: () => void
}
```

**API:** Dashboard endpoint already returns the needed data. Add month/year query params:
```
GET /api/dashboard?month=5&year=2026
```

**Complexity:** Medium | **Est:** 3 hours

---

### Task 2.2: Dashboard Charts (4 charts)

**File:** `src/features/Dashboard.tsx` (modify)

Port these 4 charts using `<ChartWrapper>`:

| Chart | Type | Data Source | Old ID |
|-------|------|------------|--------|
| Spending by Category | Doughnut | `expenseByCategory` from dashboard API | `chart-category` |
| Income vs Expenses (12 mo) | Bar | Monthly aggregation from dashboard API | `chart-monthly` |
| Cash Flow (cumulative) | Line | Derived from monthly data | `chart-cashflow` |
| Net Worth Over Time | Line | Account balances over time | `chart-networth` |

**Steps:**
1. Add chart signals: `const [chartData, setChartData] = createSignal<ChartData>(null)`
2. Transform API response into Chart.js data format in `createEffect`
3. Render 4 `<ChartWrapper>` components in a 2x2 grid
4. Add `<ExportChartButton>` to each chart card header

**Complexity:** Medium-High | **Est:** 4 hours

---

### Task 2.3: Dashboard Widget Cards

**File:** `src/components/Dashboard/` (new directory)

Create 4 widget components:

#### `BudgetAlertsCard.tsx`
```typescript
// Shows budgets that are over/warning threshold
interface BudgetAlert {
  categoryName: string
  budgeted: number
  spent: number
  percentUsed: number
  status: 'ok' | 'warning' | 'over'
}
```
- Fetch from `/api/budgets` and compute alerts client-side
- Show top 5 most-over budgets with progress bars

#### `SavingsRateCard.tsx`
```typescript
// Shows (Income - Expenses) / Income as percentage
// With trend sparkline
```

#### `RecurringInsightsCard.tsx`
```typescript
// Shows upcoming recurring transactions
// "3 bills due this week" style summary
```

#### `RecentTransactionsCard.tsx`
```typescript
// Already partially exists — just needs proper table rendering
// Show last 5 transactions with category color dots
```

**Complexity:** Medium | **Est:** 3 hours

---

## Phase 3: Transaction Power Features

### Task 3.1: Transaction Tags System

**New files:**
- `src/components/Tags/TagChips.tsx` — tag display/selection chips
- `src/components/Tags/TagInput.tsx` — inline tag creation input  
- `src/components/Tags/TagFilter.tsx` — tag filter for transaction list

```typescript
// TagChips — shows selected tags with remove button
interface TagChipsProps {
  tags: () => string[]
  onRemove: (tag: string) => void
  editable?: boolean
}

// TagInput — create new tags inline
interface TagInputProps {
  existingTags: () => string[]
  onAdd: (tag: string) => void
  placeholder?: string
}

// TagFilter — filter transactions by tags
interface TagFilterProps {
  availableTags: () => string[]
  selectedTags: () => string[]
  onToggle: (tag: string) => void
}
```

**Backend dependency:** The backend already supports tags (stored in transactions table). Verify API accepts/returns `tags` field.

**Integration points:**
1. Add tag chips to transaction modal (`Transactions.tsx`)
2. Add tag pills to transaction table rows (`TransactionTable.tsx`)
3. Add tag filter dropdown to filter bar (`FilterBar.tsx`)

**Complexity:** Medium | **Est:** 3-4 hours

---

### Task 3.2: Bulk Edit Operations

**New files:**
- `src/components/BulkActions/BulkActionBar.tsx`
- `src/components/BulkActions/BulkCategoryModal.tsx`
- `src/components/BulkActions/BulkTypeModal.tsx`

```typescript
// BulkActionBar — floating bar when items selected
interface BulkActionBarProps {
  selectedCount: () => number
  onChangeCategory: () => void
  onChangeType: () => void
  onReconcile: () => void
  onDelete: () => void
  onDeselectAll: () => void
}
```

**Integration:**
1. Add checkbox column to `TransactionTable.tsx` (first column)
2. Add `selectedIds` signal to `Transactions.tsx`
3. Show `<BulkActionBar>` when `selectedIds().size > 0`
4. Add `<BulkCategoryModal>` and `<BulkTypeModal>` modals
5. Implement batch API calls: `PUT /api/transactions/bulk` (verify endpoint exists)

**Complexity:** Medium-High | **Est:** 4 hours

---

### Task 3.3: Quick Add Modal (Ctrl+Shift+T)

**New file:** `src/components/QuickAddModal.tsx`

```typescript
interface QuickAddModalProps {
  isOpen: () => boolean
  onClose: () => void
  categories: () => Category[]
  onSave: (tx: Partial<Transaction>) => void
}
```

**Implementation:**
1. Minimal modal: amount, category, description, date (defaults to today)
2. Register global keyboard shortcut in `App.tsx`:
   ```typescript
   onMount(() => {
     const handler = (e: KeyboardEvent) => {
       if (e.ctrlKey && e.shiftKey && e.key === 'T') {
         e.preventDefault()
         setQuickAddOpen(true)
       }
     }
     document.addEventListener('keydown', handler)
     onCleanup(() => document.removeEventListener('keydown', handler))
   })
   ```
3. Auto-focus amount field on open
4. Submit on Enter

**Complexity:** Low-Medium | **Est:** 2 hours

---

### Task 3.4: Auto-categorization UI

**New file:** `src/components/AutoCategorizeModal.tsx`

```typescript
interface AutoMapSuggestion {
  transactionId: number
  description: string
  suggestedCategory: string
  confidence: number  // 0-1
  accepted: boolean
}
```

**Implementation:**
1. Button in transactions page header: "Auto-categorize"
2. Calls `api.getCategoryMappings()` and `api.autoMapTransactions()`
3. Shows list of suggestions with confidence badges (high/medium/low)
4. User can accept/reject each suggestion
5. "Apply Selected" button commits changes

**Complexity:** Medium | **Est:** 3 hours

---

### Task 3.5: Full Reconciliation Workflow

**Modify:** `src/features/Transactions.tsx` + `src/components/TransactionTable.tsx`

**Current state:** Types and CSS exist, partial implementation.

**Missing:**
1. Reconciliation mode toggle button in header
2. Checkbox column per row (separate from bulk select)
3. Reconciliation summary banner: "X of Y reconciled | Balance: $Z"
4. Filter: "Show unreconciled only"
5. Batch reconcile/unreconcile via API

**Complexity:** Medium | **Est:** 3 hours

---

### Task 3.6: Transaction Summary Bar

**New file:** `src/components/TransactionSummary.tsx`

```typescript
interface TransactionSummaryProps {
  income: () => number
  expenses: () => number
  count: () => number
  currency: string
}
```

Sticky bar below filters showing: Total Income | Total Expenses | Net | Count

**Complexity:** Low | **Est:** 1 hour

---

### Task 3.7: Category Multi-Select Filter

**Modify:** `src/components/FilterBar.tsx`

Replace single `<select>` for category with a custom multi-select dropdown:
- Checkboxes per category with color dots
- "Select All" / "Clear" buttons
- Shows count badge: "3 categories"

**Complexity:** Medium | **Est:** 2 hours

---

### Task 3.8: Period Preset Pills

**New file:** `src/components/PeriodSelector.tsx`

```typescript
type PeriodPreset = 'this-month' | 'last-month' | 'last-3' | 'last-6' | 'this-year' | 'last-year' | 'all'

interface PeriodSelectorProps {
  active: () => PeriodPreset
  onChange: (preset: PeriodPreset) => void
}
```

Visual pill buttons (like the old `.period-selector`). Selecting a preset auto-fills date filters.

**Complexity:** Low | **Est:** 1 hour

---

## Phase 4: Budget & Loan Charts

### Task 4.1: Budget Charts (3 charts)

**Modify:** `src/features/Budgets.tsx`

| Chart | Type | Description |
|-------|------|-------------|
| Budget vs Actual | Horizontal Bar | Category-by-category comparison |
| Improvement Tracking | Line | Spending trend over last 6 months per category |
| Budget Allocation | Doughnut | How total budget is split across categories |

**Steps:**
1. Add chart section below budget list
2. Fetch monthly spending data (already available from budget API)
3. Render 3 `<ChartWrapper>` instances
4. Add month selector (reuse `PeriodNavigator` from Phase 2)

**Complexity:** Medium | **Est:** 3 hours

---

### Task 4.2: Budget Utility Buttons

**Modify:** `src/features/Budgets.tsx`

Add two action buttons:
1. **"Duplicate from Last Month"** — copies all budgets from previous month
2. **"Set from Expenses"** — creates budgets based on actual spending

```typescript
const duplicateFromLastMonth = async () => {
  const lastMonth = /* compute */
  const budgets = await api.getBudgets()
  // Filter to last month, create copies for current month
}
```

**Complexity:** Low-Medium | **Est:** 2 hours

---

### Task 4.3: Budget Rollover

**Modify:** `src/features/Budgets.tsx` + budget modal

Wire the rollover toggle that already exists in types/storage:
1. Add "Enable Rollover" checkbox to budget create/edit modal
2. Show rollover amount in budget card when enabled
3. Calculate: `rollover = budgeted - spent` from previous period

**Complexity:** Medium | **Est:** 2 hours

---

### Task 4.4: Loan Charts (2 charts)

**Modify:** `src/features/Loans.tsx`

| Chart | Type | Description |
|-------|------|-------------|
| Principal vs Interest | Stacked Bar | Monthly breakdown over loan life |
| Remaining Balance | Line | Balance decreasing over time |

**Data source:** Derive from amortization schedule (already computed in `LoanAmortizationTable.tsx`)

**Steps:**
1. Add chart container below loan details
2. Pass amortization data up from `LoanAmortizationTable` via props/callback
3. Render 2 `<ChartWrapper>` instances

**Complexity:** Medium | **Est:** 2 hours

---

### Task 4.5: Amortization CSV Export

**Modify:** `src/components/LoanAmortizationTable.tsx`

Add "Export CSV" button to table header:
```typescript
const exportAmortizationCSV = () => {
  const rows = schedule()  // amortization rows
  const csv = [
    'Month,Payment,Principal,Interest,Balance',
    ...rows.map(r => `${r.month},${r.payment},${r.principal},${r.interest},${r.balance}`)
  ].join('\n')
  downloadBlob(csv, `${loanName}-amortization.csv`, 'text/csv')
}
```

**Complexity:** Low | **Est:** 30 min

---

### Task 4.6: Loan Rate Periods UI

**Modify:** `src/features/Loans.tsx`

The API exists (`api.getLoanRatePeriods`, `api.updateLoanRate`) but the UI needs:
1. Rate period list in loan detail view
2. "Add Rate Period" button → modal with: rate %, start month, end month
3. Show rate change markers in amortization table (already supported in CSS)

**Complexity:** Medium | **Est:** 2 hours

---

## Phase 5: Analytics Enhancements

### Task 5.1: D3 Sankey Diagram

**New files:**
- `src/components/Analytics/SankeyDiagram.tsx`
- `src/components/Analytics/SankeyDiagram.module.css`

```bash
npm install d3-sankey d3-selection
```

```typescript
interface SankeyDiagramProps {
  data: {
    nodes: { name: string }[]
    links: { source: number; target: number; value: number }[]
  }
}
```

**Implementation:**
- Use `onMount` with D3 to render SVG
- Flow: Income sources → Categories → Sub-categories
- Tooltip on hover showing amounts
- Responsive width via `ResizeObserver`

**Complexity:** High | **Est:** 4-5 hours

---

### Task 5.2: D3 Calendar Heatmap (Complete)

**Modify:** `src/features/Analytics.tsx`

**Current state:** Calls `/api/analytics/daily-heatmap`, CSS module exists.

**Missing implementation:**
1. D3 calendar grid (52 weeks × 7 days)
2. Color scale (green gradient for amounts)
3. Year/type selector (Expenses vs Income)
4. Tooltip on cell hover
5. Click cell → show day's transactions

```bash
npm install d3-scale d3-selection  # d3 already partially referenced
```

**Complexity:** High | **Est:** 4 hours

---

### Task 5.3: Analytics Drill-Down

**Modify:** `src/features/Analytics.tsx`

Add drill-down capability:
1. Click year → shows months
2. Click month → shows weeks
3. Click week → shows individual days/transactions
4. Breadcrumb navigation: "2026 > May > Week 18"

Use `createSignal<'year' | 'month' | 'week'>('year')` for drill level.

**Complexity:** Medium-High | **Est:** 3 hours

---

### Task 5.4: Analytics Comparison Mode

**Modify:** `src/features/Analytics.tsx`

Add "Compare" toggle:
- Select two periods (e.g., "April 2026 vs March 2026")
- Side-by-side or overlay charts
- Delta indicators per category

**Complexity:** Medium | **Est:** 3 hours

---

### Task 5.5: Daily/Weekly/Monthly Averages

**Modify:** `src/features/Analytics.tsx`

Add averages card below charts:
```typescript
interface AverageStats {
  dailyAvg: number
  weeklyAvg: number
  monthlyAvg: number
  medianTransaction: number
  largestExpense: { amount: number; description: string }
}
```

Compute from transaction data client-side.

**Complexity:** Low | **Est:** 1.5 hours

---

## Phase 6: Reports & Polish

### Task 6.1: PDF Report Generation (4 types)

**New files:**
- `src/components/Settings/ReportGenerator.tsx`
- `src/components/Settings/ReportGenerator.module.css`

**Reports to port:**

| Report | API Endpoint | Parameters |
|--------|-------------|-----------|
| Monthly Summary | `GET /api/reports/monthly-pdf` | `?month=05&year=2026` |
| Annual Financial | `GET /api/reports/annual-pdf` | `?year=2026` |
| Tax Summary | `GET /api/reports/tax-pdf` | `?year=2026` |
| P&L Summary | `GET /api/reports/pl-pdf` | `?year=2026` |

**Implementation:**
```typescript
const downloadReport = async (type: string, params: Record<string, string>) => {
  const query = new URLSearchParams(params)
  const response = await fetch(`/api/reports/${type}?${query}`, {
    headers: { 'X-Profile-Id': profileId.toString() }
  })
  const blob = await response.blob()
  downloadBlob(blob, `${type}-report.pdf`, 'application/pdf')
}
```

**UI:** Year/month selectors + download buttons (port from old Settings page layout).

**Complexity:** Medium | **Est:** 3 hours

---

### Task 6.2: Data Export UI

**Modify:** `src/features/Settings.tsx`

Add export section (port from old app):

```typescript
const exportTypes = ['transactions', 'categories', 'accounts', 'budgets', 'loans', 'recurring'] as const
const exportFormats = ['csv', 'json'] as const

// For each type, call appropriate export API endpoint
const handleExport = async (type: string, format: string) => {
  const response = await fetch(`/api/export/${type}?format=${format}`, { ... })
  const blob = await response.blob()
  downloadBlob(blob, `${type}-export.${format}`, ...)
}
```

**UI:** Grid of entity buttons + format selector dropdown.

**Complexity:** Low-Medium | **Est:** 2 hours

---

### Task 6.3: Danger Zone

**Modify:** `src/features/Settings.tsx`

Add danger zone section at bottom:
- "Delete All Transactions" button → confirmation dialog → `DELETE /api/profile/transactions`
- "Delete All Profile Data" button → confirmation → `DELETE /api/profile/data`
- "Delete All Categories" button → confirmation → `DELETE /api/profile/categories`

Each with a `<ConfirmDialog>` component:
```typescript
interface ConfirmDialogProps {
  title: string
  message: string
  confirmText: string
  variant: 'danger'
  isOpen: () => boolean
  onConfirm: () => void
  onCancel: () => void
}
```

**Complexity:** Low-Medium | **Est:** 2 hours

---

### Task 6.4: Mobile Sidebar Toggle

**Modify:** `src/App.tsx`

1. Add `sidebarOpen` signal
2. Add hamburger button (visible only on mobile)
3. Sidebar gets `transform: translateX(-100%)` when closed on mobile
4. Overlay backdrop when sidebar open on mobile
5. Close sidebar on nav item click (mobile)

```typescript
const [sidebarOpen, setSidebarOpen] = createSignal(false)

// In App JSX:
<button class={layoutStyles.hamburger} onClick={() => setSidebarOpen(true)}>
  <svg>...</svg>
</button>
<div class={sidebarOpen() ? layoutStyles.sidebarOpen : layoutStyles.sidebar}>
  ...
</div>
<Show when={sidebarOpen()}>
  <div class={layoutStyles.overlay} onClick={() => setSidebarOpen(false)} />
</Show>
```

**Complexity:** Low-Medium | **Est:** 1.5 hours

---

### Task 6.5: Savings Goal Quick-Add

**Modify:** `src/features/Goals.tsx`

Add "Add Funds" button to each goal card that opens a small prompt:
```typescript
const handleQuickAdd = (goalId: number) => {
  const amount = prompt('Enter amount to add:')
  if (amount && !isNaN(parseFloat(amount))) {
    api.addGoalContribution(goalId, parseFloat(amount))
  }
}
```

Better UX: Use an inline input that expands on click instead of `prompt()`.

**Complexity:** Low | **Est:** 1 hour

---

### Task 6.6: Profile Management Completion

**Modify:** `src/App.tsx` profile dropdown

Missing from old app:
1. Create new profile (modal with name input)
2. Delete profile (with confirmation)
3. Multi-select checkboxes for household mode
4. "All Profiles" toggle

**Complexity:** Medium | **Est:** 2 hours

---

### Task 6.7: Login Modal (Proper Component)

**New file:** `src/components/LoginModal.tsx`

Replace the DOM-based `showLoginDialog()` in `handlers.ts` with a proper SolidJS component:

```typescript
interface LoginModalProps {
  isOpen: () => boolean
  onClose: () => void
  onLogin: (username: string, password: string) => Promise<void>
}
```

**Complexity:** Low | **Est:** 1 hour

---

## Import Page Status

The Import page (`Import.tsx`, 782 lines) is **mostly complete**. Minor gaps vs old app:

| Feature | Old App | SolidJS | Gap |
|---------|---------|---------|-----|
| File upload (CSV/XLSX) | ✅ | ✅ | — |
| Google Sheets | ✅ | ✅ | — |
| Column auto-detection | ✅ | ✅ | — |
| 12-field mapping | ✅ | ✅ | — |
| Category type review | ✅ | ✅ | — |
| Duplicate detection | ✅ | ✅ | — |
| Preview with pagination | ✅ | ✅ | — |
| Import modes (all/new/selected) | ✅ | ✅ | — |
| Row count limit buttons (100/500/All) | ✅ | ❌ | Minor |
| Smart column confidence badges | ✅ | ❌ | Minor |
| Sample template download | ✅ | ⚠️ | Button exists but non-functional |

**Verdict:** Import is ~95% complete. The gaps are cosmetic/minor.

---

## Technical Debt: Serverless Storage Architecture

The app has remnants of a **"Serverless" (Browser LocalStorage) vs "Self-Hosted" (Backend SQLite)** storage toggle. 

While the UI toggle in `Settings.tsx` is now active and sets the state correctly, the entire application remains hardcoded to use the backend network.

**Current State:**
- `src/core/storage/localStorageAdapter.ts` contains 1,200+ lines of offline database logic.
- `src/core/storage/storageFactory.ts` manages the switching and provides a `StorageAdapter` interface.
- ⚠️ **Critical Block:** `src/core/api.ts` directly uses `fetch()` for all 50+ API calls, completely bypassing the `StorageAdapter` interface. 

**Future Refactoring Required:**
To make the app truly work offline in "Serverless" mode, a massive refactoring task is needed to rewrite `src/core/api.ts` to route all queries through `await getStorageAdapter()` instead of the network. This is **not included** in the immediate phase estimates below, as it requires a foundational architectural rewrite.

---

## Summary Timeline Estimate

| Phase | Description | Tasks | Est. Hours |
|-------|-------------|-------|-----------|
| **1** | Charts Foundation | 3 tasks | 4-5h |
| **2** | Dashboard Completeness | 3 tasks | 10h |
| **3** | Transaction Power Features | 8 tasks | 16-18h |
| **4** | Budget & Loan Charts | 6 tasks | 11-12h |
| **5** | Analytics Enhancements | 5 tasks | 15-16h |
| **6** | Reports & Polish | 7 tasks | 12-13h |
| | **Total** | **32 tasks** | **~68-74h** |

### Recommended Execution Order
1. **Phase 1** first (blocks Phase 2, 4, 5)
2. **Phase 2** immediately after (highest user impact)
3. **Phase 3** next (most feature-dense, high user value)
4. **Phase 4 & 5** can run in parallel
5. **Phase 6** last (polish & edge cases)

> [!IMPORTANT]
> Each task should be committed independently with descriptive commit messages. Run `npm run dev` after each task to verify no regressions. All new components must have TypeScript types and use CSS Modules.
