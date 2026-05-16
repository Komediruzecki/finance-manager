# Codebase Cleanup & Refactor Plan

## Context

Audit of `frontend/src/` revealed 74 of 81 source files have zero test coverage, dead code exists, CSS is inconsistently placed, types are duplicated, and the `utils/api.ts` vs `core/api.ts` split creates a dependency tangle across 14 feature pages.

## Tasks

### 1. Remove dead code
- `components/CategoryMultiSelect.tsx` — unused
- `components/ModalActions.tsx` — unused
- `components/ModalContent.tsx` — unused
- `components/TaskList.tsx` — unused
- `core/api.ts`: `formatMonth`, `escapeHtml`, `hexToRgba` — unused exports
- `utils/api.ts`: `apiRequest` — unused export

### 2. Consolidate duplicate types
- `ApiResponse` defined in `types/api.ts`, `utils/api.ts`, `types/models.ts` — consolidate to single definition in `types/api.ts`

### 3. Add tests for core logic
- `core/loanCalculator.ts` — amortization schedule, prepayments, summaries
- `features/Import.tsx` — `classifyCategory` function
- `core/storage/localHandlers.ts` — import handlers, counterparties, portfolio
- `core/storage/idb.ts` — profile ID helpers

### 4. Move CSS to consistent location
- All feature CSS in `components/` (named `*Page.module.css`) → move to `features/`
- Keep shared/component CSS in `components/`

### 5. Wire remaining stub routes
- `/retirement` POST
- `/accounts/history/timeline` GET
- `/accounts/:id/reconciliation-summary` GET
- `/transactions/bulk` POST
- `/transactions/:id/tags` PUT/GET
- `/transactions/by-tag` GET
- `/categories/auto-map` POST
- `/categories/apply-mappings` POST

### 6. Migrate utils/api → core/api
- 14 features import from both — reduce to `core/api` only
- Add missing typed methods to `ApiClient` as needed
- Keep `utils/api.ts` for backward compat during migration, then remove

### 7. Split large monolith files
- `localHandlers.ts` (4266 lines) → split by domain: `handlers/transactions.ts`, `handlers/import.ts`, `handlers/analytics.ts`, etc.
- `Budgets.tsx` (1501 lines) → extract sub-components
- `Import.tsx` (1267 lines) → extract tabs, preview, mapping
- `Analytics.tsx` (1253 lines) → extract chart components
