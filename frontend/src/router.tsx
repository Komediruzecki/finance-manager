/**
 * Router - Simplified routing for SolidJS
 */

import Accounts from './features/Accounts'
import Analytics from './features/Analytics'
import Bills from './features/Bills'
import Budgets from './features/Budgets'
import Categories from './features/Categories'
// Page components
import Dashboard from './features/Dashboard'
import Goals from './features/Goals'
import Housing from './features/Housing'
import Import from './features/Import'
import Loans from './features/Loans'
import Retirement from './features/Retirement'
import Settings from './features/Settings'
import Transactions from './features/Transactions'
import type { PageName } from './types/models'

export type { PageName }

export const pages: Record<PageName, typeof Dashboard> = {
  dashboard: Dashboard,
  transactions: Transactions,
  budgets: Budgets,
  loans: Loans,
  goals: Goals,
  bills: Bills,
  import: Import,
  accounts: Accounts,
  categories: Categories,
  settings: Settings,
  retirement: Retirement,
  housing: Housing,
  analytics: Analytics,
}
