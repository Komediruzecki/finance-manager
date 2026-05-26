# Codebase Audit Report: Frontend, Backend, and Deployment Modes

**Date:** 2026-05-26
**Target:** Finance Manager Codebase (`/home/maff/foss/finance-manager`)

## 1. Executive Summary

This comprehensive audit covers the frontend, backend, serverless architecture planning, and overall code quality of the Finance Manager project.

**Key Findings:**
1. **Frontend Quality**: The frontend is exceptionally clean in terms of static analysis. A recent massive cleanup has brought the TypeScript errors down to `0` and ESLint errors down to `0`. 
2. **Backend Quality**: The backend is highly monolithic. The main `backend/index.js` file is over **9,000 lines long (308KB)** and contains routing, validation, business logic, and security middleware tightly coupled. 
3. **Backend Tests**: The backend E2E tests are **currently failing completely** (all throwing `AggregateError`). This points to an underlying configuration, database connection, or test setup issue rather than syntax errors, as ESLint passes successfully.
4. **Serverless vs Self-Hosted Mode**: There is a well-documented plan (`serverless-vs-selfhosted-plan.md`) to support a "Serverless" mode using `localStorage`/`IndexedDB` alongside the existing "Self-Hosted" mode using SQLite. The architecture relies on abstracting storage operations behind a `StorageAdapter` interface.

---

## 2. Frontend Architecture & Quality

**Tech Stack**: SolidJS, TypeScript, Vite, CSS Modules.

### 2.1 Component & Code Level Observations

- **`src/App.tsx`**: 
  - Central routing and state management. 
  - **Issue:** Uses `window.location.reload()` to force data updates after profile switching and logout (e.g. `setTimeout(() => { window.location.reload() }, 50)`). This breaks the Single Page Application (SPA) paradigm and provides a jittery user experience. It should be refactored to rely purely on SolidJS reactivity (`createResource` or signals).
  - Uses inline styles mixed with CSS modules. While functional, migrating inline layout styles into CSS modules will reduce component bloat.
- **Components & Features**:
  - The codebase has been strictly typed. The `package.json` contains `tsc --noEmit` and `eslint` which pass with flying colors.
  - The previous issues mentioned in `CODE_QUALITY_REPORT.md` (dated 2026-04-24) regarding `any` types in Chart components and unhandled fetch promises have been successfully addressed.
- **Dependencies**: 
  - `chart.js` and `d3` are used for analytics.
  - `idb` (IndexedDB) and `fake-indexeddb` are included, indicating progress toward the serverless mode data adapter.

### 2.2 Visual & UI Observations
- The UI relies heavily on standard DOM elements with CSS modules.
- The presence of `Playwright` in the dependencies suggests UI testing is implemented, although a full cross-browser visual regression suite isn't explicitly configured.

### 2.3 Deep Dive: Code Smells & SolidJS Best Practices

A file-by-file unit analysis of the frontend codebase revealed several critical anti-patterns, specifically relating to SolidJS idioms and test coverage:

1. **Zero Test Coverage for UI Components**: 
   - A `vitest` coverage run shows that `src/core` is well-tested (~81% line coverage) and `src/core/storage` is partially tested (~37%).
   - However, **`src/components` and `src/features` have exactly 0% unit test coverage**. The business logic inside these files is entirely untested and reliant on the E2E suite.
2. **Missing `createResource` (React-Think Anti-Pattern)**: 
   - The entire codebase avoids Solid's asynchronous data-loading primitive (`createResource`).
   - Instead, every feature component (e.g., `Dashboard.tsx`, `Analytics.tsx`, `Transactions.tsx`) manually fetches data inside an asynchronous `createEffect` or `onMount` block and stores the result in standard signals, manually toggling a `loading` boolean. This is a severe anti-pattern in SolidJS, as it bypasses Suspense, Error Boundaries, and Transitions.
3. **Array `.map()` inside JSX**: 
   - Instead of using SolidJS's `<For>` or `<Index>` components (which use a keyed reconciliation algorithm to optimize DOM updates), the codebase relies heavily on `Array.prototype.map()` directly inside JSX.
   - For example, `Dashboard.tsx` uses `.map()` for timeline labels, and `Analytics.tsx` contains dozens of `.map()` calls within its view template. This causes the framework to indiscriminately recreate all DOM nodes on every update instead of efficiently patching them.
4. **`setTimeout` without `onCleanup` (Memory/Effect Leaks)**: 
   - In calculators like `RentBuyCalculator.tsx` and `CompoundInterestCalculator.tsx`, debouncing timers are set using `window.setTimeout`, but the timer references are never cleaned up via `onCleanup()`. This can lead to memory leaks or rogue state updates if the component is unmounted while the timer is still running.
5. **Forced Location Reloading**: 
   - In `App.tsx`, `window.location.reload()` is used inside `setTimeout` blocks to force a full-page reload when auth state or profiles change. This circumvents the reactivity engine entirely and breaks the SPA paradigm.

---

## 3. Backend Architecture & Quality

**Tech Stack**: Node.js, Express, SQLite (`better-sqlite3`), Jest.

### 3.1 Architecture Issues (The Monolith)
- **`backend/index.js`**:
  - Contains over 9,000 lines of code.
  - Mixes server initialization, Express middleware, rate-limiting logic, massive helper functions (e.g., `calculateRetirementProjection`), and all route handlers.
  - **Recommendation**: This file desperately needs to be refactored using an MVC or Controller-Service-Repository pattern. Routes should be split into individual files (e.g., `routes/auth.js`, `routes/transactions.js`).
- **Module System**:
  - The backend uses CommonJS (`require`), but Node.js complains that `eslint.config.js` is parsed as ES Module. The `package.json` should specify `"type": "module"` or strictly enforce CJS across all tooling.

### 3.2 Security & Middleware
- Uses `helmet` for security headers, `cors`, and custom in-memory rate limiting for APIs and Auth endpoints.
- Basic input sanitization is present (`sanitizeInput` function), trying to block SQL/Command injections. However, manual sanitization is brittle. Using parameterized queries (which `better-sqlite3` supports natively) is the best defense against SQL injection.

---

## 4. Serverless vs Server-Side Architecture

The application is moving towards a dual-deployment model:

### 4.1 Serverless Mode (Client-Side Only)
- Designed to run entirely in the browser without a backend.
- **Implementation Status**: The frontend `package.json` includes `idb` and `fake-indexeddb`, showing that the abstract `StorageAdapter` is likely being built around IndexedDB rather than just `localStorage` to avoid the 5MB quota limit.
- **Pros**: Zero hosting costs, complete user privacy, offline capabilities via PWA (`vite-plugin-pwa` is installed).
- **Cons**: User device storage limits, difficult cross-device synchronization.

### 4.2 Self-Hosted Mode (Server-Side)
- The traditional Node.js/SQLite backend approach.
- **Implementation Status**: Currently fully functional (minus the test configuration issues).
- **Pros**: Easy data backups, centralized data, cross-device synchronization.

### 4.3 Migration Strategy
The plan details a solid approach to migrate data from Serverless to Self-Hosted by generating an `ExportData` JSON payload and importing it into the server's SQLite database.

---

## 5. Testing & CI/CD Status

### 5.1 Frontend
- Frameworks: `vitest` (Unit), `playwright` (E2E).
- Execution: `npm run typecheck` and `npm run lint` execute with **0 errors**.

### 5.2 Backend
- Frameworks: `jest`, `supertest`.
- Execution: `eslint` completes with only a minor module-type warning.
- **CRITICAL ISSUE**: Running `NODE_ENV=test jest` results in **100% test failure**. Every test throws an `AggregateError`.
  - *Cause*: This is typically caused by the test runner failing to bind to the port (e.g., port 3847 is already in use), failing to connect to the test SQLite database, or an unhandled exception in `index.js` during import. 

---

## 6. Actionable Recommendations

### Priority 1: High
1. **Fix Backend Test Suite**: Investigate the `AggregateError` causing the Jest tests to fail. Ensure the test database is properly instantiated and the server properly mocked or started on a dynamic port during testing.
2. **Refactor Backend Monolith**: Break `backend/index.js` (9000+ lines) into modular routes and controllers. It is currently unmaintainable.

### Priority 2: Medium
1. **Remove `window.location.reload()` from Frontend**: Refactor SolidJS state management in `App.tsx` to handle profile switching gracefully without triggering full page reloads.
2. **Fix Module System Warning**: Explicitly define `"type": "module"` in the backend `package.json` or rename `eslint.config.js` to `eslint.config.mjs` to resolve Node warnings.

### Priority 3: Low
1. **Consolidate Styling**: Move inline CSS out of `App.tsx` and into the dedicated CSS module files.
2. **Database Abstraction**: Validate that all database queries use prepared statements strictly, rather than relying on the custom regex-based `sanitizeInput` function, which can be prone to bypasses.
