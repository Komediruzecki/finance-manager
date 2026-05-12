# Codebase Audit Report — May 2026

## Scope

Full audit of `finance-manager/frontend` and `finance-manager/backend` against web application improvement guidelines covering architecture, state management, type safety, testing, performance, error handling, and memory management.

---

## 1. Architecture & Abstractions

### 1.1 State Separation

**Status: Severe gap — 93% inlining rate**

| Metric | Count |
|--------|-------|
| Dedicated state modules in `core/` | 3 (toastStore, confirmStore, spotlightStore) |
| Total shared signals | 7 |
| Files inlining `createSignal` in components | **45 files** |
| Total inline `createSignal` calls | **362** |
| `createStore` / `useStore` usage | **0** |
| `createResource` usage | **0** |

**Key findings:**
- SolidJS `createStore`/`useStore` API is never used — no shared reactive state
- `App.tsx` manages 12 signals inline (auth, profiles, navigation, modals)
- No shared stores for: authentication, profiles, theme, or feature-level data
- `core/auth.ts` and `core/theme.ts` are plain classes with zero reactivity

### 1.2 Backend Boundaries

**Status: No abstraction layer — 157 raw queries in route handlers**

| Metric | Count |
|--------|-------|
| Direct `db.prepare()` calls in `backend/index.js` | **157** |
| Repository/service/controller modules | **0** |
| Extracted business logic | 1 file (`models/loanCalculator.js`) |
| External service interfaces | **0** |

**Key findings:**
- All 9,284 lines of `backend/index.js` mix HTTP handling, business logic, and raw SQL
- Yahoo Finance, PDFKit, XLSX, Puppeteer are all `require()`'d inline in route handlers
- No `services/`, `repositories/`, or `controllers/` directories exist

### 1.3 Heavy Processing

**Status: All processing on main thread — zero workers**

- No Web Workers, WebAssembly, Audio/GPU workers anywhere
- `clientPdfReports.ts` generates PDFs synchronously on the UI thread
- Chart.js and D3 rendering all on main thread

---

## 2. Type Safety & Data Fetching

### 2.1 TypeScript Strictness

**`strict: true` is enabled in tsconfig.json**

| Metric | Count |
|--------|-------|
| Total `any` occurrences (non-test) | **153** |
| `as any` casts | 33 |
| Function param/return `any` | 120 |
| `apiGet<any>()` untyped calls in features | ~25 across ~8 files |
| Recurring-transaction API methods typed | **No** — all 6 use `any` |
| `import type` adoption | ~10% (41 of ~410 imports) |

**Top `any` offenders:** `Analytics.tsx` (23), `SankeyChart.tsx` (16), `clientPdfReports.ts` (15), `Budgets.tsx` (13)

**Core infrastructure `any` count:** 9 total (api.ts recurring methods + localHandlers portfolio)

### 2.2 Runtime Validation

**Status: None**

- No Zod, Yup, Valibot, or any runtime validation library installed
- HTTP request bodies are parsed as JSON and cast to `unknown`, then accessed without validation
- `ApiClient` uses TypeScript interfaces (`ApiTypes.*`) for compile-time typing only — no runtime enforcement

---

## 3. Stability & Performance

### 3.1 Code Splitting

**Status: None — all pages eagerly loaded**

- `router.tsx` statically imports all 18 feature pages — no `lazy()` usage
- No route-based code splitting
- **Heavy deps statically imported:** `d3` (~500KB), `xlsx` (~700KB), `jspdf` (~190KB)
- Only `chart.js` uses dynamic import (type-only static + runtime dynamic) — good pattern

### 3.2 Reactivity Optimization

| Metric | Count |
|--------|-------|
| `createMemo` usage | 16 (across 4 files) |
| Array `.map`/`.filter`/`.reduce` in render functions | ~448 call sites |

`createMemo` is significantly underutilized — many expensive derived computations run on every re-render.

### 3.3 Error Boundaries

**Status: Single root boundary only — no granular isolation**

- 1 `<ErrorBoundary>` wrapping the entire app in `index.tsx`
- 69 TSX component files share one catch-all
- No per-page, per-chart, or per-modal boundaries
- A single chart error crashes the entire application

---

## 4. Testing

### 4.1 Coverage

| Metric | Count |
|--------|-------|
| Test files total | 28 |
| Unit test files (`.test.ts`) | **0** |
| E2E test files (`.spec.ts`) | 28 |
| E2E test lines | ~4,930 |

### 4.2 Infrastructure

| Item | Status |
|------|--------|
| `vitest` in devDependencies | Installed (v4.x) |
| `vitest.config.ts` | **Missing** |
| `vite.config.ts` test block | **Missing** |
| `jsdom` in devDependencies | Installed (unused) |
| `test:unit` script | **Missing** |

### 4.3 Core Module Coverage

| Module | Lines | Has tests? |
|--------|-------|-------------|
| `idb.ts` | 787 | No |
| `localHandlers.ts` | 3,544 | No |
| `localApiRouter.ts` | 892 | No |
| `apiFetch.ts` | 39 | No |
| `storageFactory.ts` | 642 | No |
| `api.ts` | 1,052 | No |

**Total: 6,956 lines of core infrastructure with zero unit test coverage.**

---

## 5. Memory Management

### 5.1 Cleanup Coverage

| Metric | Count |
|--------|-------|
| `onCleanup` calls | 19 (across 10 files) |
| Missed `setTimeout` cleanup | 1 (`CategoryMultiSelect.tsx`) |
| Missed `addEventListener` cleanup | 1 (`ApiClient` singleton storage listener) |

### 5.2 Overall Assessment

**Largely adequate.** All DOM event listeners, MutationObservers, and ResizeObservers are properly cleaned up. Two minor leak risks identified — neither severe.

---

## Consolidated Scores

| Dimension | Score | Key Gap |
|-----------|-------|---------|
| **State Separation** | 2/10 | No shared stores, 93% inlining, no createResource |
| **Backend Boundaries** | 1/10 | 157 raw queries inline, no service/repo layer |
| **Type Safety** | 5/10 | Strict mode on, but 153 `any`s, no runtime validation |
| **Code Splitting** | 1/10 | No route splitting, heavy deps static |
| **Reactivity** | 4/10 | createMemo underutilized (16 vs ~448 computations) |
| **Error Boundaries** | 2/10 | Single root boundary, no granular isolation |
| **Testing** | 2/10 | No unit tests, no vitest config |
| **Memory Management** | 8/10 | Good cleanup, 2 minor leaks |
| **Overall** | **3.1/10** | |
