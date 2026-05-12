# Improvement Plan — May 2026

Based on the [codebase audit](./codebase-audit-2026-05.md), organized by priority (impact × effort).

---

## Phase 1: Quick Wins (Low Effort, High Impact)

### 1.1 Vitest + Unit Tests for Core Modules
**Files:** New `vitest.config.ts`, new test files in `src/core/storage/__tests__/`

- Add `vitest.config.ts` with `jsdom` environment
- Add `"test:unit": "vitest run"` to `package.json`
- Write unit tests for: `idb.ts` (mock IndexedDB), `localApiRouter.ts` (route matching), `apiFetch.ts` (mode routing)
- Target: 60% coverage on core storage modules

### 1.2 Error Boundaries at Key Points
**Files:** `src/router.tsx`, `src/features/Dashboard.tsx`, `src/features/Analytics.tsx`

- Wrap each route page in its own `<ErrorBoundary>` (per-route recovery)
- Wrap chart-heavy sections in Dashboard/Analytics with isolated boundaries
- A broken chart should show "Chart failed to load" instead of crashing the entire app

### 1.3 Dynamic Import for Heavy Dependencies
**Files:** `src/core/storage/localHandlers.ts`, `src/components/SankeyChart.tsx`, `src/components/D3HeatmapChart.tsx`

- Change `xlsx` from static `import * as XLSX` to `await import('xlsx')` — shaves ~700KB from the main bundle
- Change `d3` from static `import * as d3` to dynamic `import('d3')` — shaves ~500KB
- Change `jspdf` in `clientPdfReports.ts` to dynamic import — shaves ~190KB
- **Total bundle reduction: ~1.4MB**

### 1.4 Route-Based Code Splitting
**Files:** `src/router.tsx`

- Replace 18 static page imports with SolidJS `lazy()` + `<Suspense>`
- Each page becomes its own chunk, loaded on demand
- Add a `<PageLoader>` fallback component

---

## Phase 2: Structural Improvements (Medium Effort)

### 2.1 Typed Recurring Transactions
**Files:** `src/types/models.ts`, `src/core/api.ts`, `src/components/RecurringSection.tsx`

- Add `RecurringTransaction` interface to `models.ts`
- Replace 6 `Promise<any>` methods in `ApiClient` with proper generics
- Remove all `any` casts in `RecurringSection.tsx`

### 2.2 Reduce `any` in Feature Pages
**Files:** Top 5 offenders from audit

- `Analytics.tsx` (23 `any`): Define interfaces for analytics API responses
- `SankeyChart.tsx` (16 `any`): Define D3 node/link interfaces
- `clientPdfReports.ts` (15 `any`): Type the filter callbacks
- `Budgets.tsx` (13 `any`): Use typed API responses
- `Loans.tsx` (12 `any`): Import typed models

### 2.3 useStore for App-Level State
**Files:** New `src/core/appStore.ts`, modified `src/App.tsx`

- Extract 12 signals from `App.tsx` into a shared `createStore`
- Create `useAppStore()` hook exporting: `{ page, loading, profiles, currentProfile, auth, modals, sidebar }`
- Components import only the slices they need — avoids 12-prop drilling

### 2.4 Runtime Validation with Zod
**Files:** New `src/core/validation.ts`, `src/core/storage/localApiRouter.ts`

- Install `zod`
- Define schemas for: TransactionCreate, CategoryCreate, AccountCreate, BudgetCreate
- Validate `ctx.body` in `localApiRouter.ts` routeApiRequest before passing to handlers
- Return 400 with field-level errors on validation failure

---

## Phase 3: Backend & Deep Improvements (High Effort)

### 3.1 Backend Repository Layer
**Files:** New `backend/repositories/` directory

- Extract DB access into repository modules: `profilesRepo.js`, `transactionsRepo.js`, etc.
- Each module exports typed query functions — route handlers import from repos instead of writing raw SQL
- Target: move 80% of the 157 `db.prepare()` calls behind repository interfaces

### 3.2 Backend Service Layer
**Files:** New `backend/services/` directory

- Extract external service wrappers: `yahooFinanceService.js`, `pdfReportService.js`, etc.
- Each service wraps the third-party library behind an interface
- Enables mocking in tests, swapping implementations

### 3.3 Web Workers for Heavy Processing
**Files:** New `src/workers/pdf.worker.ts`

- Move `clientPdfReports.ts` chart rendering into a Web Worker
- Worker receives data, generates chart PNGs offscreen, returns to main thread
- Prevents PDF generation from blocking the UI

---

## Verification Checklist

After each phase, verify:
1. `npm run build` passes
2. `npm run lint` passes
3. `npm run test:unit` (once Phase 1 is done)
4. Manual smoke test on dashboard, budgets, analytics, settings pages
5. Bundle size report: `ls -la dist/assets/` — should decrease after Phase 1.3
