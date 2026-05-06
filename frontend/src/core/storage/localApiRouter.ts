import type { StorageMode } from './storageFactory'

// ── Route types ──────────────────────────────────────────────────────────────

interface RouteContext {
  method: string
  path: string
  params: Record<string, string>
  query: URLSearchParams
  body: unknown
}

type Handler = (ctx: RouteContext) => Promise<Response>

interface RouteDef {
  pattern: RegExp
  methods: string[]
  handler: Handler
}

// ── Response helpers ─────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function notImplemented(method: string, path: string): Response {
  return json({ error: `Not implemented: ${method} ${path}` }, 501)
}

function methodNotAllowed(method: string, path: string): Response {
  return json({ error: `Method not allowed: ${method} ${path}` }, 405)
}

function notFound(path: string): Response {
  return json({ error: `Not found: ${path}` }, 404)
}

// ── Route builder ────────────────────────────────────────────────────────────

function r(pattern: RegExp, methods: string[]): RouteDef {
  return {
    pattern,
    methods,
    handler: (ctx: RouteContext) => Promise.resolve(notImplemented(ctx.method, ctx.path)),
  }
}

// ── Route table ──────────────────────────────────────────────────────────────

const routes: RouteDef[] = [
  // Health & app info
  r(/^\/health$/, ['GET']),
  r(/^\/app-info$/, ['GET']),

  // Auth
  r(/^\/auth\/login$/, ['POST']),
  r(/^\/auth\/check$/, ['GET']),
  r(/^\/auth\/logout$/, ['POST']),
  r(/^\/auth\/me$/, ['GET']),

  // Profiles
  r(/^\/profiles$/, ['GET', 'POST']),
  r(/^\/profiles\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/profile\/data$/, ['DELETE']),

  // Settings
  r(/^\/settings$/, ['GET', 'PUT']),
  r(/^\/settings\/set-storage$/, ['POST']),
  r(/^\/storage-mode$/, ['GET', 'POST']),

  // Dashboard
  r(/^\/dashboard$/, ['GET']),
  r(/^\/dashboard\/(charts|net-worth|summary)$/, ['GET']),

  // Analytics
  r(/^\/analytics$/, ['GET']),
  r(/^\/analytics\/(category-trends|daily-heatmap|sankey|weeks|distinct-years)$/, ['GET']),

  // Transactions
  r(/^\/transactions$/, ['GET', 'POST', 'DELETE']),
  r(/^\/transactions\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/transactions\/(\d+)\/reconcile$/, ['PATCH']),
  r(/^\/transactions\/(\d+)\/tags$/, ['GET', 'POST', 'PUT']),
  r(/^\/transactions\/by-tag\/(\d+)$/, ['GET']),
  r(/^\/transactions\/reconcile\/bulk$/, ['POST']),
  r(/^\/transactions\/reconcile\/summary$/, ['GET']),
  r(/^\/transactions\/reconcile-batch$/, ['PUT']),
  r(/^\/transactions\/export$/, ['GET']),
  r(/^\/transactions\/summary$/, ['GET']),
  r(/^\/transactions\/bulk$/, ['PUT']),

  // Categories
  r(/^\/categories$/, ['GET', 'POST', 'DELETE']),
  r(/^\/categories\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/categories\/mappings$/, ['GET', 'POST']),
  r(/^\/categories\/mappings\/(\d+)$/, ['DELETE']),
  r(/^\/categories\/auto-map$/, ['POST']),
  r(/^\/categories\/apply-mappings$/, ['POST']),

  // Accounts
  r(/^\/accounts$/, ['GET', 'POST']),
  r(/^\/accounts\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/accounts\/(\d+)\/history$/, ['GET', 'POST']),
  r(/^\/accounts\/(\d+)\/history\/(\d+)$/, ['DELETE']),
  r(/^\/accounts\/history\/timeline$/, ['GET']),
  r(/^\/accounts\/(\d+)\/reconciliation-summary$/, ['GET']),

  // Budgets
  r(/^\/budgets$/, ['GET', 'POST']),
  r(/^\/budgets\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/budgets\/(\d+)\/rollover$/, ['PUT']),
  r(/^\/budgets\/(alerts|forecast|history|improvements|summary|zero-based)$/, ['GET']),
  r(/^\/budgets\/zero-based\/summary$/, ['GET']),
  r(/^\/budgets\/allocate$/, ['POST']),
  r(/^\/budgets\/duplicate-last$/, ['POST']),
  r(/^\/budgets\/from-expenses$/, ['POST']),

  // Savings goals
  r(/^\/savings-goals$/, ['GET', 'POST']),
  r(/^\/savings-goals\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/savings-goals\/(\d+)\/contribute$/, ['POST']),

  // Loans
  r(/^\/loans$/, ['GET', 'POST']),
  r(/^\/loans\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/loans\/(\d+)\/rate-periods$/, ['GET']),
  r(/^\/loans\/(\d+)\/rate$/, ['PUT']),
  r(/^\/loans\/(\d+)\/rates$/, ['GET', 'POST']),
  r(/^\/loans\/(\d+)\/rates\/(\d+)$/, ['PUT', 'DELETE']),
  r(/^\/loans\/(\d+)\/prepayment$/, ['POST']),
  r(/^\/loans\/(\d+)\/prepayments$/, ['GET', 'POST']),
  r(/^\/loans\/(\d+)\/prepayments\/(\d+)$/, ['DELETE']),
  r(/^\/loans\/(\d+)\/calculate$/, ['POST']),

  // Bills
  r(/^\/bills$/, ['GET', 'POST']),
  r(/^\/bills\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/bills\/upcoming$/, ['GET']),
  r(/^\/bills\/(\d+)\/pay$/, ['POST']),
  r(/^\/bills\/(\d+)\/mark-paid$/, ['POST']),

  // Tags
  r(/^\/tags$/, ['GET', 'POST']),
  r(/^\/tags\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/tags\/(\d+)\/transactions$/, ['GET']),

  // Recurring
  r(/^\/recurring$/, ['GET', 'POST']),
  r(/^\/recurring\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/recurring\/upcoming$/, ['GET']),
  r(/^\/recurring\/(\d+)\/populate$/, ['POST']),

  // Receipts
  r(/^\/receipts$/, ['POST']),
  r(/^\/receipts\/upload$/, ['POST']),
  r(/^\/receipts\/(\d+)$/, ['GET', 'DELETE']),
  r(/^\/receipts\/(\d+)\/file$/, ['GET']),
  r(/^\/receipts\/transaction\/(\d+)$/, ['GET']),
  r(/^\/receipts\/file\/(.+)$/, ['GET']),

  // Import/Export
  r(/^\/import$/, ['POST']),
  r(/^\/import\/upload$/, ['POST']),
  r(/^\/import\/googlesheet$/, ['POST']),
  r(/^\/import\/file-sheet$/, ['POST']),
  r(/^\/import\/execute$/, ['POST']),
  r(/^\/import\/preview$/, ['POST']),
  r(/^\/export$/, ['GET']),
  r(/^\/export\/([a-z-]+)$/, ['GET']),
  r(/^\/clear-all$/, ['DELETE']),

  // Exchange rates
  r(/^\/exchange-rates$/, ['GET']),
  r(/^\/exchange-rates\/([A-Z]{3})\/([A-Z]{3})$/, ['GET']),

  // Calculators
  r(/^\/retirement$/, ['POST']),
  r(/^\/retirement\/projection$/, ['GET']),
  r(/^\/retirement-goals$/, ['GET']),
  r(/^\/housing$/, ['GET', 'POST']),
  r(/^\/housing\/(\d+)$/, ['GET', 'PUT', 'DELETE']),
  r(/^\/housing\/calculate$/, ['POST']),
  r(/^\/calculator\/compound-interest$/, ['POST']),
  r(/^\/calculator\/retire$/, ['POST']),
  r(/^\/calculator\/emergency-fund$/, ['GET']),

  // Reports
  r(/^\/reports\/annual-pdf$/, ['GET']),
  r(/^\/reports\/monthly-pdf$/, ['GET']),
  r(/^\/reports\/pl-summary$/, ['GET']),
  r(/^\/reports\/pl-summary-pdf$/, ['GET']),
  r(/^\/reports\/tax-summary$/, ['GET']),
  r(/^\/reports\/tax-summary-pdf$/, ['GET']),
  r(/^\/reports\/custom$/, ['POST']),

  // Stats
  r(/^\/stats\/monthly$/, ['GET']),

  // Logs
  r(/^\/logs$/, ['GET', 'POST']),
  r(/^\/logs\/clear$/, ['POST']),
]

// ── Router ───────────────────────────────────────────────────────────────────

function extractParams(pattern: RegExp, path: string): Record<string, string> | null {
  const match = path.match(pattern)
  if (!match) return null

  // Collect named groups from numbered captures (positional params)
  const params: Record<string, string> = {}
  // Skip match[0] (full match), extract capture groups
  for (let i = 1; i < match.length; i++) {
    if (match[i] !== undefined) {
      params[`p${i}`] = match[i]
    }
  }
  return params
}

export async function routeApiRequest(url: string, init?: RequestInit): Promise<Response> {
  const urlObj = new URL(url, window.location.origin)
  const method = init?.method ?? 'GET'
  const path = urlObj.pathname.replace(/^\/api/, '') || '/'

  // Parse query string
  const query = urlObj.searchParams

  // Parse body
  let body: unknown = null
  if (init?.body) {
    if (typeof init.body === 'string') {
      try { body = JSON.parse(init.body) } catch { body = init.body }
    } else {
      body = init.body
    }
  }

  // Find matching route
  for (const route of routes) {
    const params = extractParams(route.pattern, path)
    if (params === null) continue

    if (!route.methods.includes(method)) {
      return methodNotAllowed(method, `/api${path}`)
    }

    return route.handler({
      method,
      path: `/api${path}`,
      params,
      query,
      body,
    })
  }

  return notFound(`/api${path}`)
}

export function setStorageMode(_mode: StorageMode): void {
  // Will be wired in LS15 (data migration)
}
