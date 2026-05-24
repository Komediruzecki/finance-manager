# Frontend Audit Report & Refactoring Plan

## Audit Summary

A comprehensive audit of the frontend storage layer, SolidJS components, and CSS modules was performed.
The storage layer spans **7,125 lines across 4 files**, with `localHandlers.ts` alone at **4,376 lines / ~109 exported functions**.

---

## Bugs Found

> [!CAUTION]
> These are real bugs that should be fixed before release.

### BUG-1: Broken IDB upgrade path (Critical)

[upgradeSchema](file:///home/maff/foss/finance-manager/frontend/src/core/storage/idb.ts#L25-L91) unconditionally creates stores (`profiles`, `transactions`, `categories`, etc.) at L26-60 without checking `oldVersion`. Only the v2-v6 additions are guarded. This means any future schema bump to v7 would throw `ConstraintError` for existing users because those stores already exist.

**Fix:** Wrap all store creation in `if (oldVersion < 1)` guards. The current code works only because fresh installs start from `oldVersion=0`.

---

### BUG-2: `categoryMappings` store never created in IDB schema

The store is referenced in `categoryMappingsList` (L1115), `categoryMappingsCreate` (L1133), `categoryMappingsDelete` (L1147), but `upgradeSchema()` in [idb.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/idb.ts) never creates it. The `db.objectStoreNames.contains()` guards prevent crashes, but the entire category mappings feature is silently a no-op.

Additionally, [categoriesAutoMap](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts#L4116) and [categoriesApplyMappings](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts#L4276) reference the store as `category_mappings` (snake_case), which would be wrong even if the store existed (it would be camelCase `categoryMappings`).

**Fix:** Add `categoryMappings` store creation in a new schema version (v7), and fix the snake_case references.

---

### BUG-3: CSV export missing `category_id` column

[exportByType](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts#L1369-L1382): The CSV header declares 7 columns (`date,type,description,amount,currency,category_id,notes`) but the data row at L1373 only emits 6 values, skipping `category_id`. This produces misaligned CSV output.

**Fix:** Add `t.category_id ?? ''` to the data row array.

---

### BUG-4: `detectStorageMode()` always returns `self-hosted`

[storageFactory.ts L39-40](file:///home/maff/foss/finance-manager/frontend/src/core/storage/storageFactory.ts#L39-L40):
```typescript
const apiBase = window.location.pathname.replace(/\/$/, '')
return apiBase === '/' ? 'serverless' : 'self-hosted'
```
After stripping trailing slash from `'/'`, `apiBase` becomes `''`, which never equals `'/'`. Masked in practice by env var / localStorage overrides.

**Fix:** Change to `return apiBase === '' || apiBase === '/' ? 'serverless' : 'self-hosted'`

---

### BUG-5: `portfolioHoldingsCreate` bypasses adapter for profile ID

[L3828](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts#L3828) reads `localStorage` directly instead of `adapter.getCurrentProfileId()`. Inconsistent with every other handler.

---

## Inconsistencies Found

> [!WARNING]
> These are not crashes but maintenance hazards that should be addressed.

### INC-1: Three competing mechanisms for profile IDs

| Mechanism | Type | Usage count |
|---|---|---|
| `adapter.getCurrentProfileId()` | async, validates profile exists | ~22 uses |
| `adapter.getCurrentProfileIds()` | sync, reads localStorage | ~12 uses |
| `getProfileIdsFromStorage()` (private L2571) | sync, duplicates the above | ~6 uses |

`getProfileIdsFromStorage()` is a copy-paste duplicate of `adapter.getCurrentProfileIds()`.

### INC-2: `transactionsCreate` has dead code guard

[L293](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts#L293): `adapter.getCurrentProfileId ? await adapter.getCurrentProfileId() : 1` -- the existence check is always true.

### INC-3: Inconsistent error handling

- Bills/housing/dashboard/analytics: `try/catch` returning `json({error}, 500)` or empty arrays
- Basic CRUD (goals, categories, accounts): No `try/catch` at all
- Some handlers silently swallow errors, user never knows something failed

### INC-4: Inconsistent delete response shapes

- Most: `return ok()` -> `{ok: true}`
- Some verify existence before delete, others do not

---

## Code Smells & Duplication

### DUP-1: Repeated "fetch all from profile IDs" pattern (~20 occurrences)

```typescript
const pids = adapter.getCurrentProfileIds()
const all = []
for (const pid of pids) {
  const rows = await db.getAllFromIndex(STORE, 'by_profile', pid)
  all.push(...rows)
}
```

### DUP-2: Category map construction repeated 6+ times

```typescript
const catMap = new Map(cats.map(c => [c.id, c]))
```

### DUP-3: `getAmount` cast `(t as unknown as Record<string, unknown>)` appears 30+ times

### DUP-4: Date range construction (end-of-month string) repeated in dashboard/analytics

### DUP-5: Receipt MIME type detection duplicated in two functions

---

## Proposed Changes

### Phase 1: Bug Fixes (no refactoring)

> [!IMPORTANT]
> These can be done independently and should ship first.

#### [MODIFY] [idb.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/idb.ts)

- Wrap all store creation in `if (oldVersion < 1)` guards
- Bump DB_VERSION to 7
- Add `categoryMappings` store creation in `if (oldVersion < 7)` block

#### [MODIFY] [localHandlers.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts)

- Fix CSV export at L1373: add `category_id` to data row
- Fix `categoriesAutoMap` (L4116) and `categoriesApplyMappings` (L4276): change `category_mappings` to `categoryMappings`
- Fix `portfolioHoldingsCreate` (L3828): use `adapter.getCurrentProfileId()`
- Fix `transactionsCreate` (L293): remove dead ternary guard

#### [MODIFY] [storageFactory.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/storageFactory.ts)

- Fix `detectStorageMode()` L40: `return apiBase === '' || apiBase === '/' ? 'serverless' : 'self-hosted'`

---

### Phase 2: Split `localHandlers.ts` into domain modules

The 4376-line monolith should be split into focused handler modules under `src/core/storage/handlers/`, following the pattern already established by `handlers/budgets.ts` (which is already extracted).

#### [NEW] Handler modules to create:

Each module exports its handler functions and imports shared helpers from `./helpers.ts`.

| New file | Source lines | Functions |
|---|---|---|
| `handlers/auth.ts` | L51-68 | `authLogin`, `authCheck`, `authLogout`, `authMe` |
| `handlers/profiles.ts` | L72-225 | `profilesList`, `profilesCreate`, `profilesGet`, `profilesUpdate`, `profilesDelete`, `profileResetData`, `reseedDemoData` |
| `handlers/settings.ts` | L229-253 | `settingsGet`, `settingsUpdate`, `storageModeGet`, `storageModeSet` |
| `handlers/transactions.ts` | L257-423 | Transaction CRUD + reconciliation + export/summary |
| `handlers/categories.ts` | L427-474 + L4099-4316 | Category CRUD + auto-map + apply-mappings |
| `handlers/accounts.ts` | L478-534 + L4320-4376 | Account CRUD + timeline + reconciliation summary |
| `handlers/goals.ts` | L538-584 | Goals CRUD + contribute |
| `handlers/loans.ts` | L588-780 | Loans CRUD + rates + prepayments + calculate |
| `handlers/housing.ts` | L784-940 | Housing CRUD + calculate |
| `handlers/bills.ts` | L942-1107 | Bills CRUD + upcoming + pay |
| `handlers/tags.ts` | L1109-1232 | Tags CRUD + category mappings + transaction tags (L3956-4020) |
| `handlers/recurring.ts` | L1234-1352 | Recurring CRUD + upcoming + populate |
| `handlers/importExport.ts` | L1354-1419 | Export/import/clear/delete/reseed |
| `handlers/dashboard.ts` | L1421-1713 | Dashboard main/summary/charts/netWorth |
| `handlers/analytics.ts` | L1715-2120 | Analytics + stats |
| `handlers/calculators.ts` | L2131-2567 | Compound interest, retirement, emergency fund |
| `handlers/receipts.ts` | L2569-2990 | Receipt upload/get/delete |
| `handlers/import.ts` | L2992-3714 | Advanced import (upload, file sheet, google sheet, execute, bulk) |
| `handlers/portfolio.ts` | L3775-3951 | Portfolio CRUD + summary + prices |
| `handlers/counterparties.ts` | L3718-3771 | Counterparties |

#### [MODIFY] [localHandlers.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/localHandlers.ts)

Becomes a thin barrel file that re-exports everything from the handler modules (like it already does for budgets and logs):

```typescript
export * from './handlers/auth.js'
export * from './handlers/profiles.js'
export * from './handlers/transactions.js'
// ... etc
```

---

### Phase 3: Shared helpers & deduplication

#### [MODIFY] [handlers/helpers.ts](file:///home/maff/foss/finance-manager/frontend/src/core/storage/handlers/helpers.ts)

Add shared utilities to eliminate the repeated patterns:

```typescript
// Fetch all records from a store for current profile IDs
export async function getAllForProfiles(storeName: string): Promise<Record<string, unknown>[]>

// Build a category lookup map
export async function buildCategoryMap(): Promise<Map<number, Category>>

// Build end-of-month date string
export function monthEnd(y: number, m: number): string

// MIME type detection for receipts
export function getMimeType(filename: string): string
```

- Remove `getProfileIdsFromStorage()` from localHandlers.ts -- use `adapter.getCurrentProfileIds()` everywhere
- Eliminate the ~30 `getAmount` casts by making `getAmount` accept `Transaction` directly

---

### Phase 4: SolidJS & CSS Fixes

#### SolidJS Reactivity Bugs

> [!CAUTION]
> These are real reactivity bugs -- computed values that will not update when props change.

**Critical: Props read outside tracking scope (computed once, never re-evaluated)**

| File | Line | Issue |
|---|---|---|
| [TransactionSummaryBar.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/TransactionSummaryBar.tsx#L27-L28) | L27-28 | `currency` and `isPositive` computed once from props |
| [TagChips.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/Tags/TagChips.tsx#L17-L18) | L17-18 | `props.tags()` called once at creation, never re-tracked |
| [PeriodPills.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/PeriodPills.tsx#L32) | L32 | `periods` computed once from props |
| [ChartWrapper.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/ChartWrapper.tsx#L161-L168) | L161-168 | `heightClass` and `heightStyle` computed once |
| [BulkActionBar.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/BulkActions/BulkActionBar.tsx#L31) | L31 | `if (props.selectedCount === 0) return null` -- early return only runs once |
| [Button.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/Button.tsx#L22-L23) | L22-23 | `variantClass` and `sizeClass` derived once from merged props |

**Fix:** Move these derivations into `createMemo`, inline JSX expressions, or wrap conditional renders with `<Show>`.

**Critical: `onMount` return used for cleanup (React pattern, not SolidJS)**

[Settings.tsx L432-438](file:///home/maff/foss/finance-manager/frontend/src/features/Settings.tsx#L432-L438): Uses `return () => removeEventListener(...)` from `onMount`, which is a React pattern. SolidJS `onMount` ignores the return value. This event listener **will never be cleaned up**.

**Fix:** Use `onCleanup()` inside `onMount()` instead of returning a cleanup function.

#### CSS Module Issues

| File | Issue |
|---|---|
| [ReconciliationModal.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/ReconciliationModal.tsx) | 267-line component with ONLY inline styles -- no CSS module at all. Also injects global `<style>` tag with `@keyframes spin` |
| [ErrorBoundary.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/ErrorBoundary.tsx) | Full-screen error fallback with only inline styles |
| [Button.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/Button.tsx) | Uses global classes (`btn`, `btn-primary`) without a CSS module |
| [Settings.tsx](file:///home/maff/foss/finance-manager/frontend/src/features/Settings.tsx) | 50+ inline style usages despite having a CSS module |

#### Lower-Priority SolidJS Items

- **`.map()` instead of `<For>`**: Used in [Analytics.tsx](file:///home/maff/foss/finance-manager/frontend/src/features/Analytics.tsx), [Budgets.tsx](file:///home/maff/foss/finance-manager/frontend/src/features/Budgets.tsx), [Settings.tsx](file:///home/maff/foss/finance-manager/frontend/src/features/Settings.tsx) for dropdown options. Acceptable for small static arrays but should use `<For>` for signal-derived lists.
- **Chart.tsx race condition**: [Chart.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/Chart.tsx) `createEffect` does async Chart.js import without a `cancelled` flag, risking chart leaks. [ChartWrapper.tsx](file:///home/maff/foss/finance-manager/frontend/src/components/ChartWrapper.tsx) handles this correctly with a `cancelled` flag.
- **D3HeatmapChart.tsx**: Tooltip element created twice (in `onMount` and `ensureTooltip()`), potential duplicate DOM elements.

---

## Open Questions

> [!IMPORTANT]
> Please clarify these before we proceed.

1. **Phase ordering**: Should we do Phase 1 (bug fixes) first as a separate commit, then Phase 2 (refactor) as a follow-up? Or bundle them together?

2. **Scope of Phase 2**: The refactor is mechanical (move code into separate files, update imports) but touches every handler. Do you want all ~20 modules extracted in one go, or incrementally (e.g., 5 at a time)?

3. **Router refactor**: The `localApiRouter.ts` (918 lines, 80+ routes) has its own duplication and fragility (route ordering matters). Should we include a router cleanup in this plan, or defer it?

4. **Test updates**: The existing 144 tests import from `localHandlers.ts`. After Phase 2, they should still work since `localHandlers.ts` becomes a barrel re-export. Want me to verify this or do you prefer updating imports to point at specific handler modules?

---

## Verification Plan

### Automated Tests
- Run `npx vitest run` after each phase to ensure all 144 tests pass
- Run `npx tsc --noEmit` to verify type correctness
- Run `npx vitest run --coverage` to confirm coverage is maintained

### Manual Verification
- Test serverless mode end-to-end in browser after Phase 1 bug fixes
- Verify CSV export produces correct columns after fix
- Verify category auto-mapping works after store creation fix
