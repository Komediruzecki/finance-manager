/**
 * Local API Handlers — IndexedDB-backed route handlers for serverless mode
 */
import { getDB, IndexedDBAdapter, seedDefaultCategories } from './idb'
import { getStorageMode, setStorageMode } from './storageFactory'
import type { StorageMode } from './storageFactory'

// ── Helpers ─────────────────────────────────────────────────────────────────

const adapter = new IndexedDBAdapter()

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const ok = (data: Record<string, unknown> = {}): Response => json({ ok: true, ...data })

const notFound = (what: string): Response => json({ error: `${what} not found` }, 404)

function idParam(params: Record<string, string>, key = 'p1'): number {
  return parseInt(params[key], 10)
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function authLogin(body: unknown): Promise<Response> {
  if (body && typeof body === 'object' && 'username' in body) {
    return json({ id: 1, username: (body as Record<string, unknown>).username, role: 'admin' })
  }
  return json({ error: 'Missing credentials' }, 400)
}

export async function authCheck(): Promise<Response> {
  return json({ authenticated: true, user: { id: 1, username: 'local', role: 'admin' } })
}

export async function authLogout(): Promise<Response> {
  return ok()
}

export async function authMe(): Promise<Response> {
  return json({ id: 1, username: 'local', role: 'admin' })
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function profilesList(): Promise<Response> {
  const db = await getDB()
  const profiles = await db.getAll('profiles')
  return json(profiles)
}

export async function profilesCreate(body: unknown): Promise<Response> {
  if (body && typeof body === 'object' && 'name' in body) {
    const name = (body as Record<string, unknown>).name as string
    const id = await adapter.createProfile(name)
    return json({ id, name, created_at: new Date().toISOString() }, 201)
  }
  return json({ error: 'Name required' }, 400)
}

export async function profilesGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const profile = await db.get('profiles', idParam(params))
  if (!profile) return notFound('Profile')
  return json(profile)
}

export async function profilesUpdate(params: Record<string, string>, body: unknown): Promise<Response> {
  if (body && typeof body === 'object' && 'name' in body) {
    await adapter.updateProfile(idParam(params), (body as Record<string, unknown>).name as string)
    return ok()
  }
  return json({ error: 'Name required' }, 400)
}

export async function profilesDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteProfile(idParam(params))
  return ok()
}

export async function profileResetData(): Promise<Response> {
  const db = await getDB()
  await Promise.all([
    db.clear('transactions'),
    db.clear('categories'),
    db.clear('accounts'),
    db.clear('budgets'),
    db.clear('goals'),
    db.clear('loans'),
    db.clear('balanceHistory'),
  ])
  return ok({ message: 'Profile data reset successfully' })
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function settingsGet(): Promise<Response> {
  const settings = await adapter.getSettings()
  return json(settings)
}

export async function settingsUpdate(body: unknown): Promise<Response> {
  if (body && typeof body === 'object') {
    await adapter.updateSettings(body as Record<string, unknown>)
    return ok()
  }
  return json({ error: 'Invalid settings body' }, 400)
}

export async function storageModeGet(): Promise<Response> {
  return json({ mode: getStorageMode() })
}

export async function storageModeSet(body: unknown): Promise<Response> {
  if (body && typeof body === 'object' && 'mode' in body) {
    const mode = (body as Record<string, unknown>).mode as StorageMode
    setStorageMode(mode)
    return ok({ mode })
  }
  return json({ error: 'Mode required' }, 400)
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function transactionsList(query: URLSearchParams): Promise<Response> {
  const filters: Record<string, unknown> = {}
  const df = query.get('date_from')
  const dt = query.get('date_to')
  const cat = query.get('category_id')
  const type = query.get('type')
  const search = query.get('search')
  if (df) filters.date_from = df
  if (dt) filters.date_to = dt
  if (cat) filters.category_id = parseInt(cat, 10)
  if (type) filters.type = type
  if (search) filters.search = search
  const txns = await adapter.listTransactions(filters as Parameters<typeof adapter.listTransactions>[0])
  return json(txns)
}

export async function transactionsCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid transaction data' }, 400)
  const tx = body as Record<string, unknown>
  tx.profile_id = adapter.getCurrentProfileId ? await adapter.getCurrentProfileId() : 1
  const id = await adapter.createTransaction(tx as Parameters<typeof adapter.createTransaction>[0])
  return json({ id, ...tx }, 201)
}

export async function transactionsGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const txn = await db.get('transactions', idParam(params))
  if (!txn) return notFound('Transaction')
  return json(txn)
}

export async function transactionsUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateTransaction(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function transactionsDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteTransaction(idParam(params))
  return ok()
}

export async function transactionsExport(query: URLSearchParams): Promise<Response> {
  const filters: Record<string, unknown> = {}
  const df = query.get('date_from')
  const dt = query.get('date_to')
  if (df) filters.date_from = df
  if (dt) filters.date_to = dt
  const txns = await adapter.listTransactions(filters as Parameters<typeof adapter.listTransactions>[0] | undefined)
  const csv = ['date,type,description,amount,currency,category_id,notes']
  for (const t of txns) {
    csv.push(
      [t.date, t.type, `"${t.description}"`, t.amount, t.currency || 'EUR', t.category_id || '', `"${t.notes || ''}"`].join(','),
    )
  }
  return new Response(csv.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=transactions.csv' },
  })
}

export async function transactionsSummary(): Promise<Response> {
  const txns = await adapter.listTransactions()
  const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return json({ income, expense, count: txns.length })
}

// ── Reconciliation ───────────────────────────────────────────────────────────

export async function reconcileToggle(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const txn = await db.get('transactions', idParam(params))
  if (!txn) return notFound('Transaction')
  const now = new Date().toISOString()
  txn.reconciled = txn.reconciled ? 0 : 1
  txn.reconciled_at = txn.reconciled ? now : null
  await db.put('transactions', txn)
  return json({ reconciled: txn.reconciled, reconciled_at: txn.reconciled_at })
}

export async function reconcileBulk(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const { date_from, date_to } = body as Record<string, unknown>
  const txns = await adapter.listTransactions({
    date_from: date_from as string | undefined,
    date_to: date_to as string | undefined,
  })
  const db = await getDB()
  const now = new Date().toISOString()
  let count = 0
  for (const t of txns) {
    if (!t.reconciled) {
      t.reconciled = 1
      t.reconciled_at = now
      await db.put('transactions', t)
      count++
    }
  }
  return json({ message: `${count} transactions reconciled`, count })
}

export async function reconcileSummary(): Promise<Response> {
  const txns = await adapter.listTransactions()
  const reconciled = txns.filter((t) => t.reconciled)
  const unreconciled = txns.filter((t) => !t.reconciled)
  return json({
    reconciled_count: reconciled.length,
    unreconciled_count: unreconciled.length,
    reconciled_total: reconciled.reduce((s, t) => s + t.amount, 0),
    unreconciled_total: unreconciled.reduce((s, t) => s + t.amount, 0),
  })
}

export async function reconcileBatch(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const ids = (body as Record<string, unknown>).transaction_ids as number[]
  if (!Array.isArray(ids)) return json({ error: 'transaction_ids array required' }, 400)
  const db = await getDB()
  const now = new Date().toISOString()
  let updated = 0
  for (const id of ids) {
    const txn = await db.get('transactions', id)
    if (txn && !txn.reconciled) {
      txn.reconciled = 1
      txn.reconciled_at = now
      await db.put('transactions', txn)
      updated++
    }
  }
  return json({ message: `${updated} transactions reconciled`, updated })
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function categoriesList(query: URLSearchParams): Promise<Response> {
  const type = query.get('type') as 'income' | 'expense' | undefined
  const cats = await adapter.listCategories(type)
  return json(cats)
}

export async function categoriesCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid category data' }, 400)
  const cat = body as Record<string, unknown>
  cat.profile_id = await adapter.getCurrentProfileId()
  const id = await adapter.createCategory(cat as Parameters<typeof adapter.createCategory>[0])
  return json({ id, ...cat }, 201)
}

export async function categoriesGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const cat = await db.get('categories', idParam(params))
  if (!cat) return notFound('Category')
  return json(cat)
}

export async function categoriesUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateCategory(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function categoriesDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteCategory(idParam(params))
  return ok()
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function accountsList(): Promise<Response> {
  const accts = await adapter.listAccounts()
  return json(accts)
}

export async function accountsCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid account data' }, 400)
  const acct = body as Record<string, unknown>
  acct.profile_id = await adapter.getCurrentProfileId()
  const id = await adapter.createAccount(acct as Parameters<typeof adapter.createAccount>[0])
  return json({ id, ...acct }, 201)
}

export async function accountsGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const acct = await db.get('accounts', idParam(params))
  if (!acct) return notFound('Account')
  return json(acct)
}

export async function accountsUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateAccount(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function accountsDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteAccount(idParam(params))
  return ok()
}

export async function accountsHistory(params: Record<string, string>): Promise<Response> {
  const history = await adapter.getBalanceHistory(idParam(params))
  return json(history)
}

export async function accountsHistoryRecord(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const balance = (body as Record<string, unknown>).balance as number
  if (typeof balance !== 'number') return json({ error: 'Balance required' }, 400)
  const id = await adapter.recordBalance(idParam(params), balance)
  return json({ id, account_id: idParam(params), balance, date: new Date().toISOString() }, 201)
}

export async function accountsHistoryDelete(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  await db.delete('balanceHistory', idParam(params, 'p2'))
  return ok()
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export async function budgetsList(): Promise<Response> {
  const budgets = await adapter.listBudgets()
  return json(budgets)
}

export async function budgetsCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid budget data' }, 400)
  const budget = body as Record<string, unknown>
  budget.profile_id = await adapter.getCurrentProfileId()
  const id = await adapter.createBudget(budget as Parameters<typeof adapter.createBudget>[0])
  return json({ id, ...budget }, 201)
}

export async function budgetsGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const budget = await db.get('budgets', idParam(params))
  if (!budget) return notFound('Budget')
  return json(budget)
}

export async function budgetsUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateBudget(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function budgetsDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteBudget(idParam(params))
  return ok()
}

// ── Goals ────────────────────────────────────────────────────────────────────

export async function goalsList(): Promise<Response> {
  const goals = await adapter.listGoals()
  return json(goals)
}

export async function goalsCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid goal data' }, 400)
  const goal = body as Record<string, unknown>
  goal.profile_id = await adapter.getCurrentProfileId()
  const id = await adapter.createGoal(goal as Parameters<typeof adapter.createGoal>[0])
  return json({ id, ...goal }, 201)
}

export async function goalsGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const goal = await db.get('goals', idParam(params))
  if (!goal) return notFound('Goal')
  return json(goal)
}

export async function goalsUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateGoal(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function goalsDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteGoal(idParam(params))
  return ok()
}

export async function goalsContribute(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  const db = await getDB()
  const goal = await db.get('goals', idParam(params))
  if (!goal) return notFound('Goal')
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const amount = (body as Record<string, unknown>).amount as number
  goal.current_amount = (goal.current_amount || 0) + amount
  await db.put('goals', goal)
  return json({ ok: true, current_amount: goal.current_amount })
}

// ── Loans ────────────────────────────────────────────────────────────────────

export async function loansList(): Promise<Response> {
  const loans = await adapter.listLoans()
  return json(loans)
}

export async function loansCreate(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid loan data' }, 400)
  const loan = body as Record<string, unknown>
  loan.profile_id = await adapter.getCurrentProfileId()
  loan.rate_periods = loan.rate_periods || []
  loan.prepayments = loan.prepayments || []
  const id = await adapter.createLoan(loan as Parameters<typeof adapter.createLoan>[0])
  return json({ id, ...loan }, 201)
}

export async function loansGet(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  return json(loan)
}

export async function loansUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  await adapter.updateLoan(idParam(params), body as Record<string, unknown>)
  return ok()
}

export async function loansDelete(params: Record<string, string>): Promise<Response> {
  await adapter.deleteLoan(idParam(params))
  return ok()
}

// Loan rate periods
export async function loanRates(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  return json(loan.rate_periods || [])
}

export async function loanRatesAdd(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const rates = loan.rate_periods || []
  rates.push(body as Record<string, unknown>)
  loan.rate_periods = rates
  await db.put('loans', loan)
  return json({ ok: true }, 201)
}

export async function loanRateUpdate(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const rateId = idParam(params, 'p2') // p2 is the rateId
  const rates = loan.rate_periods || []
  if (rateId >= 0 && rateId < rates.length) {
    rates[rateId] = { ...rates[rateId], ...(body as Record<string, unknown>) }
    loan.rate_periods = rates
    await db.put('loans', loan)
    return ok()
  }
  return notFound('Rate period')
}

export async function loanRateDelete(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  const rateId = idParam(params, 'p2')
  const rates = loan.rate_periods || []
  if (rateId >= 0 && rateId < rates.length) {
    rates.splice(rateId, 1)
    loan.rate_periods = rates
    await db.put('loans', loan)
    return ok()
  }
  return notFound('Rate period')
}

// Loan prepayments
export async function loanPrepayments(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  return json(loan.prepayments || [])
}

export async function loanPrepaymentAdd(
  params: Record<string, string>,
  body: unknown,
): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  if (!body || typeof body !== 'object') return json({ error: 'Invalid data' }, 400)
  const prepayments = loan.prepayments || []
  prepayments.push(body as Record<string, unknown>)
  loan.prepayments = prepayments
  await db.put('loans', loan)
  return json({ ok: true }, 201)
}

export async function loanPrepaymentsDelete(params: Record<string, string>): Promise<Response> {
  const db = await getDB()
  const loan = await db.get('loans', idParam(params))
  if (!loan) return notFound('Loan')
  const prepayId = idParam(params, 'p2')
  const prepayments = loan.prepayments || []
  if (prepayId >= 0 && prepayId < prepayments.length) {
    prepayments.splice(prepayId, 1)
    loan.prepayments = prepayments
    await db.put('loans', loan)
    return ok()
  }
  return notFound('Prepayment')
}

// ── Export / Import / Clear ──────────────────────────────────────────────────

export async function exportAll(): Promise<Response> {
  const data = await adapter.exportData()
  return json(data)
}

export async function exportByType(params: Record<string, string>, query: URLSearchParams): Promise<Response> {
  const type = params.p1
  const fmt = query.get('format') || 'json'
  const data = await adapter.exportData()

  if (fmt === 'csv' && type === 'transactions') {
    const csv = ['date,type,description,amount,currency,category_id,notes']
    for (const t of data.transactions) {
      csv.push(
        [t.date, t.type, `"${t.description}"`, t.amount, t.currency, `"${t.notes || ''}"`].join(','),
      )
    }
    return new Response(csv.join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=${type}.csv` },
    })
  }

  return json(data)
}

export async function importData(body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return json({ error: 'Invalid import data' }, 400)
  await adapter.importData(body as Parameters<typeof adapter.importData>[0])
  return ok({ message: 'Data imported successfully' })
}

export async function clearAll(): Promise<Response> {
  await adapter.clearAllData()
  return ok({ message: 'All data cleared' })
}

// ── Seed default categories ──────────────────────────────────────────────────

export async function seedCategories(): Promise<Response> {
  const pid = await adapter.getCurrentProfileId()
  await seedDefaultCategories(pid)
  const cats = await adapter.listCategories()
  return json({ ok: true, categories: cats.length })
}
