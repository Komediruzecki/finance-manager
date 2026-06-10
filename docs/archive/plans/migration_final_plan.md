# Migration Final Plan — Regressions, Fixes & Remaining Work

> **Old app:** `special/old-js-app-fixed` | **New app:** `fix/migration-full-plan` (SolidJS + Vite + TypeScript)  
> **Generated:** 2026-05-04

---

## Table of Contents

1. [Critical Bugs (Must Fix Immediately)](#1-critical-bugs-must-fix-immediately)
2. [SolidJS Anti-Pattern Violations](#2-solidjs-anti-pattern-violations)
3. [CSS / JS / HTML Mismatches](#3-css--js--html-mismatches)
4. [Orphan CSS Modules (Dead Code)](#4-orphan-css-modules-dead-code)
5. [ESLint Warnings Summary](#5-eslint-warnings-summary)
6. [Feature Parity Gaps (vs Old App)](#6-feature-parity-gaps-vs-old-app)
7. [Backend Issues](#7-backend-issues)
8. [Recommended Fix Order](#8-recommended-fix-order)

---

## 1. Critical Bugs (Must Fix Immediately)

### 1.1 Route Name Mismatch — Rent vs Buy page is broken

| File | Issue |
|------|-------|
| `src/App.tsx:205` | Uses `'rent-buy' as PageName` but `PageName` type only has `'rentBuy'` |
| `src/router.tsx:32` | Router maps `rentBuy: RentBuyCalculator` |
| `src/types/models.ts:36` | Type definition: `'rentBuy'` |

**Symptom:** Clicking "Rent vs Buy" in the sidebar sets hash to `#rent-buy`, but `allPages['rent-buy']` is `undefined` since the router only has `rentBuy`. The page **never renders**.

**Fix:** Change `App.tsx` line 205 from `'rent-buy'` to `'rentBuy'`, or add `'rent-buy'` to the `PageName` union and router. The `as PageName` cast hides the compile-time error.

> **CAUTION:** This is a type-safety bypass via `as PageName`. Consider removing all `as PageName` casts and letting TypeScript enforce correctness by typing the `navItems` array properly.

---

### 1.2 Transaction Save Button Calls Wrong Function

| File | Line | Issue |
|------|------|-------|
| `src/features/Transactions.tsx` | 794-796 | Save button's `onclick` calls `openTransactionModal()` instead of saving |

```typescript
// CURRENT (broken):
onclick={(_e) => {
  console.info('Save button clicked, openTransactionModal:', openTransactionModal)
  openTransactionModal()   // ← Opens modal again instead of saving!
}}
```

The button also has `data-action="transactions:save"` which relies on the old vanilla JS event delegation system that does NOT exist in the SolidJS app. Result: **clicking "Save Transaction" does nothing useful**.

**Fix:** Replace with actual save logic that reads form values, calls `api.createTransaction()` or `api.updateTransaction()`, then refreshes the list and closes the modal.

---

### 1.3 CSS Module `localsConvention: 'dashes'` Confusion

| File | Setting |
|------|---------|
| `vite.config.ts:127` | `localsConvention: 'dashes'` |

With `'dashes'`, CSS class `sidebar-logo` is available as both `styles['sidebar-logo']` and `styles.sidebar_logo` (underscore, NOT camelCase). However, the code uses `layoutStyles.sidebarLogo` (camelCase) — this resolves to `undefined`.

**Why does it "work"?** Because `src/styles/base.css` (2522 lines) has duplicate global class definitions using camelCase names (`.sidebarLogo`, `.sidebarNav`, etc.) which get applied as **global** styles. The CSS module classes are being generated but never applied.

**Impact:** The Layout.module.css file's styles are effectively dead code. All sidebar styling comes from base.css globals. This means:
- No CSS scoping/encapsulation on the sidebar
- Potential class name collisions
- Confusing maintenance story

**Fix options:**
1. Change `localsConvention` to `'camelCase'` and update all `styles['kebab-name']` bracket accesses across the codebase
2. OR rename all CSS module class names to camelCase (no dashes) to avoid the issue entirely
3. OR keep `'dashes'` and use bracket notation consistently: `styles['sidebar-logo']`

---

### 1.4 Transaction Modal Closes via Direct DOM, Misses SolidJS State

| File | Lines | Issue |
|------|-------|-------|
| `src/features/Transactions.tsx` | 162-168 | `_closeModals()` uses `document.getElementById` + `classList.remove` |

```typescript
const _closeModals = () => {
  setTransactionModalOpen(false)
  const modal = document.getElementById('tx-modal') as HTMLElement
  if (modal) modal.classList.remove('show')        // ← Direct DOM!
  const modal2 = document.getElementById('quickadd-modal') as HTMLElement
  if (modal2) modal2.classList.remove('show')      // ← Direct DOM!
}
```

The modal visibility is controlled by both a SolidJS signal (`isTransactionModalOpen()`) AND a raw CSS class (`show`). These can get out of sync.

**Fix:** Use only the SolidJS signal to control visibility. The modal JSX should use `<Show when={isTransactionModalOpen()}>` instead of adding/removing CSS classes.

---

### 1.5 Dashboard `showSettings` Uses DOM Manipulation

| File | Lines | Issue |
|------|-------|-------|
| `src/features/Dashboard.tsx` | 124-133 | `showSettings()` uses `document.getElementById()` + manual class toggle |

The settings modal should be controlled by a SolidJS signal, not direct DOM manipulation.

---

## 2. SolidJS Anti-Pattern Violations

### 2.1 Async `createEffect` in App.tsx

| File | Line | Issue |
|------|------|-------|
| `src/App.tsx` | 101 | `createEffect(async () => { ... })` |

**Problem:** SolidJS `createEffect` does not support async callbacks. The cleanup function returned on line 149 (`return () => { ... }`) is **never executed** because async functions return a Promise, not the cleanup function.

**Fix:** Split into `onMount` for initialization + separate `createEffect` for reactive dependencies:
```typescript
onMount(async () => {
  // Theme init + login check + hash parsing
})

// Separate effect for hash changes
createEffect(() => { /* reactive logic only */ })

// Manual event listener setup with onCleanup
onMount(() => {
  window.addEventListener('hashchange', handleHashChange)
  onCleanup(() => window.removeEventListener('hashchange', handleHashChange))
})
```

---

### 2.2 `.map()` Instead of `<For>` Component

| File | Lines | Issue |
|------|-------|-------|
| `src/App.tsx` | 304 | `profiles().map(...)` |
| `src/App.tsx` | 402 | `navItems.map(...)` |
| `src/App.tsx` | 425 | `Object.entries(allPages).map(...)` |
| `src/features/Dashboard.tsx` | 446 | `metrics()!.recentTransactions.slice(0,5).map(...)` |
| `src/features/Dashboard.tsx` | 486 | `metrics()!.upcomingBills.slice(0,5).map(...)` |

**Problem:** In SolidJS, `.map()` re-creates all DOM nodes when any item changes. `<For>` tracks by index/key and only updates changed items.

**Fix:** Replace with `<For each={...}>` for all reactive data lists. Static arrays like `navItems` are acceptable with `.map()`.

---

### 2.3 `data-action` Event Delegation (Legacy Pattern)

16 instances of `data-action` attributes found across:
- `src/features/Transactions.tsx` (7 instances)
- `src/components/Sidebar.tsx` (6 instances) 
- `src/components/TransactionTable.tsx` (1 instance)
- `src/components/SettingsDialog.tsx` (1 instance, different: `class="data-actions"`)

**Problem:** `data-action` is the old vanilla JS event delegation pattern. SolidJS uses native event binding (`onClick`, `onInput`, etc.). These attributes have **no effect** unless there's a global event listener parsing them — and there isn't one in the SolidJS app.

**Fix:** Replace each `data-action` with proper SolidJS event handlers:
```tsx
// Before (broken):
<button data-action="transactions:setType" data-arg="expense">Expense</button>

// After (working):
<button onClick={() => setType('expense')}>Expense</button>
```

---

### 2.4 Direct DOM Access (35 instances)

| Pattern | Count | Files |
|---------|-------|-------|
| `document.getElementById()` | ~10 | Transactions, Dashboard, Calculators |
| `document.querySelector()` | ~3 | Various |
| `classList.add/remove/contains` | ~8 | Transactions, Dashboard |
| `innerHTML` | ~2 | Various |

**Fix:** Replace all with SolidJS reactive patterns (`createSignal`, `classList` directive, `ref`).

---

## 3. CSS / JS / HTML Mismatches

### 3.1 Raw Global CSS Classes in SolidJS Components (52+ instances)

These files use raw CSS class strings instead of CSS module references, meaning styles only work if matching global CSS exists in `base.css` or `components.css`:

| File | Count | Examples |
|------|-------|---------|
| `src/features/Import.tsx` | 16 | `class="btn btn-primary"`, `class="page page-import page-enter"` |
| `src/components/SettingsDialog.tsx` | 20+ | `class="settings-dialog"`, `class="setting-group"`, `class="btn-primary"` |
| `src/features/RentBuyCalculator.tsx` | 4 | `class="breakevenIcon"`, `class="breakevenText"` |
| `src/components/PageLoader.tsx` | 2+ | Raw class strings |

**Impact:** These classes rely on global CSS definitions. If the global CSS is ever removed or refactored, these components break silently.

---

### 3.2 Template Literal Class Strings Without CSS Module References (25+ instances)

These use template literals with raw class names (not `styles.xyz`):

| File | Examples |
|------|---------|
| `src/features/Analytics.tsx` | `` `stat-value positive` ``, `` `tab ${selectedChart() === 'category' ? 'active' : ''}` `` |
| `src/features/Dashboard.tsx` | `` `transaction-amount ${tx.type === 'expense' ? 'expense' : 'income'}` `` |
| `src/features/Transactions.tsx` | `` `modal-overlay ${isTransactionModalOpen() ? 'show' : ''}` `` |
| `src/features/Loans.tsx` | `` `badge ${getStatusBadge(loan.status)}` `` |
| `src/features/Retirement.tsx` | `` `badge ${getRetirementStatus(goal.retirement_age)}` `` |
| `src/features/Housing.tsx` | `` `badge ${housing.autopay ? 'badge-success' : 'badge-default'}` `` |
| `src/features/EmergencyFundCalculator.tsx` | `` `coverage-item ${c.status}` `` |

**Fix:** For each, either:
1. Define the class in the component's CSS module and reference it via `styles.xxx`
2. Or use the SolidJS `classList` directive

---

### 3.3 Duplicate CSS Definitions (Global vs Module)

The following CSS classes exist in BOTH global `base.css`/`components.css` AND in CSS modules:

| Class | Global File | Module File |
|-------|------------|-------------|
| `.sidebar`, `.sidebarLogo`, `.sidebarNav` | `base.css` (lines 196-267) | `Layout.module.css` (lines 55-127) |
| `.transaction-amount` | `components.css` (line 424) | `DashboardPage.module.css` (line 241), `AnalyticsPage.module.css` (line 359, 703) |
| `.btn`, `.btn-primary`, `.btn-secondary` | `base.css` | `Layout.module.css`, various page modules |
| `.page-header`, `.card`, `.form-group` | `base.css` | Multiple feature CSS modules |
| `.modal-overlay`, `.modal` | `components.css` | `Modal.module.css`, page-specific modules |

**Impact:** Style conflicts, unpredictable specificity, and wasted bytes. Users see global styles because module-scoped versions generate hashed class names that don't match the raw class strings in JSX.

---

### 3.4 `Sidebar.tsx` Component Exists But Is Never Used

`src/components/Sidebar.tsx` is a full sidebar implementation (using `data-action` delegation) but is **never imported** by `App.tsx`. Instead, App.tsx has its own inline sidebar implementation. The `Sidebar.tsx` component and its CSS module (`Sidebar.module.css`) are dead code.

---

### 3.5 Page Wrapper Pattern Inconsistency

Most features use `class={`page page-xxx page-enter ${styles.xxxPage}`}`:
- This mixes raw global classes (`page`, `page-dashboard`, `page-enter`) with CSS module classes
- The `page-enter` animation class is defined in `base.css` — this is fine for global animations
- But `page-xxx` identifiers serve no purpose in the SolidJS app (they were used for the old routing toggle)

---

## 4. Orphan CSS Modules (Dead Code)

These 20 CSS module files are **never imported** by any `.tsx` or `.ts` file:

| File | Likely Intended For |
|------|-------------------|
| `src/styles/AppSidebar.module.css` | Sidebar (replaced by inline in App.tsx) |
| `src/components/Form.module.css` | Form styling (not imported) |
| `src/components/TypeSelector.module.css` | Type selector (not imported) |
| `src/components/StatCard.module.css` | Stat cards (not imported) |
| `src/components/FlowsPage.module.css` | Flows/Sankey page (not implemented) |
| `src/components/Tags/TagInput.module.css` | Tag input (uses different styling) |
| `src/components/ToastPage.module.css` | Toast (not imported) |
| `src/components/Badge.module.css` | Badges (not imported) |
| `src/components/Tabs.module.css` | Tabs (not imported) |
| `src/components/Toast.module.css` | Toast notifications (not imported) |
| `src/components/ExportButtons.module.css` | Export buttons (not imported) |
| `src/components/StatsCard.module.css` | Stats cards (not imported) |
| `src/components/DashboardStats.module.css` | Dashboard stats (not imported) |
| `src/components/DangerZone.module.css` | Danger zone (not imported) |
| `src/components/LoadingSpinner.module.css` | Loading spinner (not imported) |
| `src/components/ImportPage.module.css` | Import page (uses `Import.module.css` instead) |
| `src/components/DashboardWidgets.module.css` | Dashboard widgets (not imported) |
| `src/components/LayoutComponents.module.css` | Layout components (not imported) |
| `src/components/PeriodSelector.module.css` | Period selector (not imported) |
| `src/components/Heatmap.module.css` | Heatmap (not imported) |

**Fix:** Either import and use these, or delete them to reduce clutter.

---

## 5. ESLint Warnings Summary

**Total: 52 warnings, 0 errors**

### 5.1 Import Resolver Warnings (44 warnings)

```
warning  Resolve error: typescript with invalid interface loaded as resolver  import-x/no-named-as-default-member
```

**Affected:** Nearly all `.tsx` files (App.tsx, all features, all components)

**Root cause:** The ESLint TypeScript import resolver plugin is misconfigured or incompatible with the current `eslint-plugin-import-x` version.

**Fix:** Either:
1. Update `.eslintrc.cjs`/`eslint.config.js` to use the correct resolver settings for `eslint-plugin-import-x`
2. Or suppress this rule in config: `"import-x/no-named-as-default-member": "off"`

### 5.2 Unused ESLint Disable Directives (8 warnings, auto-fixable)

| File | Lines |
|------|-------|
| `src/components/Tags/TagFilter.tsx` | Line 20: unused `@typescript-eslint/no-explicit-any` disable |
| `src/components/Tags/TagInput.tsx` | Line 38: unused `@typescript-eslint/no-unused-vars` disable |
| `src/core/storage/localStorageAdapter.ts` | Lines 237, 246, 255, 268, 275, 669: unused `@typescript-eslint/ban-ts-comment` disables |

**Fix:** Run `npx eslint --fix src/` to auto-remove these 8 warnings.

---

## 6. Feature Parity Gaps (vs Old App)

### Implementation Status from `implementation_plan.md`

Reviewing which tasks from the plan have been implemented:

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| **1** | Chart.js + ChartWrapper | ✅ Done | `ChartWrapper.tsx` exists, chart.js installed |
| **1** | Chart theme integration | ⚠️ Partial | Hardcoded colors (e.g., `#8B5CF6`) instead of CSS variables |
| **1** | Chart export utility | ✅ Done | `chartExport.ts` + `ExportChartButton.tsx` |
| **2** | Dashboard stats with MoM | ⚠️ Partial | MoM signals exist but `_setMomMetrics` is never called with data |
| **2** | Dashboard charts (4) | ✅ Done | Net Worth, Cash Flow, Spending by Category, Income vs Expenses |
| **2** | Dashboard widget cards | ✅ Done | BudgetAlertsCard, SavingsRateCard, RecurringInsightsCard |
| **3** | Transaction tags | ⚠️ Partial | TagChips, TagFilter, TagInput components exist but integration is incomplete |
| **3** | Bulk edit | ⚠️ Partial | BulkActionBar, BulkCategoryModal, BulkTypeModal exist but wiring unclear |
| **3** | Quick Add modal | ✅ Done | `QuickAddModal.tsx` exists (keyboard shortcut not wired) |
| **3** | Auto-categorization UI | ✅ Done | `AutoCategorizeModal.tsx` exists |
| **3** | Reconciliation | ⚠️ Partial | `ReconciliationModal.tsx` exists, button wired, but actual reconcile API call is placeholder |
| **3** | Transaction Summary Bar | ✅ Done | `TransactionSummaryBar.tsx` integrated |
| **3** | Category multi-select | ✅ Done | `CategoryMultiSelect.tsx` integrated |
| **3** | Period preset pills | ✅ Done | `PeriodPills.tsx` integrated in Dashboard |
| **4** | Budget charts (3) | ❌ Missing | No chart rendering in Budgets.tsx |
| **4** | Budget utility buttons | ❌ Missing | No duplicate/from-expenses |
| **4** | Budget rollover | ❌ Missing | Not wired |
| **4** | Loan charts (2) | ❌ Missing | No chart rendering in Loans.tsx |
| **4** | Amortization CSV export | ❌ Missing | Not implemented |
| **4** | Loan rate periods UI | ❌ Missing | No UI for rate periods |
| **5** | D3 Sankey diagram | ❌ Missing | No D3 integration |
| **5** | D3 Calendar heatmap | ⚠️ Partial | CSS-based grid in Analytics, but no D3 |
| **5** | Analytics drill-down | ❌ Missing | |
| **5** | Analytics comparison | ❌ Missing | |
| **5** | Daily/weekly/monthly averages | ❌ Missing | |
| **6** | PDF report generation | ❌ Missing | |
| **6** | Data export UI | ❌ Missing | |
| **6** | Danger zone | ❌ Missing | CSS exists but no component |
| **6** | Mobile sidebar toggle | ❌ Missing | Sidebar.tsx has it but isn't used; App.tsx doesn't |
| **6** | Savings goal quick-add | ❌ Missing | |
| **6** | Profile management | ⚠️ Partial | Create profile works (via `prompt()`), delete/multi-select missing |
| **6** | Login modal | ❌ Missing | Uses `authLogin()` from handlers (DOM-based dialog) |

### New Regressions Found (Things That Worked Before But Are Now Broken)

| # | Regression | Severity | Details |
|---|-----------|----------|---------|
| R1 | Rent vs Buy page unreachable | 🔴 Critical | Route name mismatch (`rent-buy` vs `rentBuy`) |
| R2 | Transaction save does nothing | 🔴 Critical | Save button calls `openTransactionModal()` |
| R3 | Transaction type selector broken | 🔴 Critical | Uses `data-action` (no handler) |
| R4 | Tag creation in modal broken | 🟡 High | Uses `data-action` for tag input |
| R5 | Receipt upload broken | 🟡 High | Uses `data-action` for file select |
| R6 | Receipt removal broken | 🟡 High | Uses `data-action` for remove |
| R7 | Dashboard settings modal | 🟡 High | Uses DOM manipulation, may not open/close properly |
| R8 | Quick Add keyboard shortcut | 🟡 Medium | Not wired in App.tsx |
| R9 | Reconcile handler is placeholder | 🟡 Medium | `_handleReconcile` has no implementation |
| R10 | MoM delta never populated | 🟡 Medium | `_setMomMetrics` is never called with API data |
| R11 | Category dropdown in tx modal empty | 🟡 Medium | `categories` signal is `createSignal<Category[]>([])` — never loaded |

---

## 7. Backend Issues

### 7.1 Backend Lint

Backend ESLint passes cleanly (0 errors, 0 warnings).

### 7.2 Backend Observations

- `index.js` is 271KB monolith — consider modularizing
- `database.js` is 46KB — large but functional
- Backend has `puppeteer` dependency (for PDF reports) — heavy dependency, might want to lazy-load
- `package.json` is missing `"type": "module"` — causes Node.js warning about CommonJS reparsing

---

## 8. Recommended Fix Order

### Priority 1: Critical Bugs (Day 1)

| # | Task | Est. | Files |
|---|------|------|-------|
| F1 | Fix route name mismatch (`rent-buy` → `rentBuy`) | 15min | `App.tsx` |
| F2 | Fix transaction save button | 2h | `Transactions.tsx` |
| F3 | Replace all 16 `data-action` with SolidJS event handlers | 3h | `Transactions.tsx`, `Sidebar.tsx`, `TransactionTable.tsx` |
| F4 | Fix async `createEffect` in App.tsx | 1h | `App.tsx` |
| F5 | Load categories in transaction form | 30min | `Transactions.tsx` |

### Priority 2: CSS Architecture Cleanup (Day 2-3)

| # | Task | Est. | Files |
|---|------|------|-------|
| F6 | Decide and implement CSS module convention (change to `'camelCase'` or refactor class names) | 2h | `vite.config.ts`, all CSS modules |
| F7 | Replace 52+ raw class strings with CSS module references | 4h | `Import.tsx`, `SettingsDialog.tsx`, `RentBuyCalculator.tsx`, `Analytics.tsx`, etc. |
| F8 | Remove or integrate 20 orphan CSS modules | 1h | Various |
| F9 | Deduplicate global base.css and CSS modules (remove 1000+ lines of duplicate rules) | 3h | `base.css`, `Layout.module.css`, page modules |
| F10 | Remove unused `Sidebar.tsx` component or integrate it | 1h | `Sidebar.tsx`, `App.tsx` |

### Priority 3: SolidJS Patterns (Day 3-4)

| # | Task | Est. | Files |
|---|------|------|-------|
| F11 | Replace `.map()` with `<For>` for reactive lists | 1h | `App.tsx`, `Dashboard.tsx` |
| F12 | Replace all `document.getElementById` / `classList` with signals | 2h | `Transactions.tsx`, `Dashboard.tsx` |
| F13 | Move modal visibility to pure signal-based control | 2h | `Transactions.tsx`, `Dashboard.tsx` |
| F14 | Wire MoM delta calculation (call API with month params) | 1h | `Dashboard.tsx` |

### Priority 4: ESLint Fix (30 min)

| # | Task | Est. | Files |
|---|------|------|-------|
| F15 | Run `npx eslint --fix` to remove 8 unused disable directives | 5min | Auto |
| F16 | Fix import resolver config | 25min | `eslint.config.js` |

### Priority 5: Feature Gaps (Week 2+)

Continue with remaining items from `implementation_plan.md`:
- Phase 4: Budget & Loan charts
- Phase 5: Analytics enhancements (D3 Sankey, heatmap, drill-down)
- Phase 6: Reports, export, mobile sidebar, login modal

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Critical bugs (broken pages/features) | 5 | 🔴 |
| High-severity regressions | 6 | 🟡 |
| SolidJS anti-patterns | 4 categories | 🟡 |
| CSS/JS mismatches | 77+ instances | 🟠 |
| Orphan CSS modules | 20 files | 🟢 |
| ESLint warnings | 52 | 🟢 |
| Missing features (from old app) | 15+ tasks | 🟠 |

> **IMPORTANT:** The most urgent items are **F1-F5** — these represent features that are visibly broken to any user clicking through the app. The CSS cleanup (F6-F10) should follow immediately as the current architecture makes debugging styling issues extremely difficult.
