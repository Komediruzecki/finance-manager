/**
 * Main App Component - Root component for the application
 */

import { createMemo, createSignal, onMount, Suspense } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import layoutStyles from './components/Layout.module.css'
import { handlers, receipts, transactions } from './core/handlers.js'
import { pages as allPages } from './router.tsx'
import sidebarStyles from './styles/AppSidebar.module.css'

// Mount handlers to window for legacy code compatibility
window.receipts = receipts
window.transactions = transactions
window.handlers = handlers

export function App() {
  const [_currentPage, _setCurrentPage] = createSignal<PageName>('dashboard')
  const [_isLoading, _setIsLoading] = createSignal(false)
  const [activePage, setActivePage] = createSignal<PageName>('dashboard')

  createMemo(() => {
    const page = allPages[activePage()]
    if (page) {
      _setIsLoading(false)
    }
  })

  onMount(() => {
    setActivePage('dashboard')
  })

  // Navigation items with icons for sidebar
  const navItems = [
    { name: 'dashboard' as PageName, icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    )},
    { name: 'transactions' as PageName, icon: (
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    )},
    { name: 'budgets' as PageName, icon: (
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    )},
    { name: 'loans' as PageName, icon: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    )},
    { name: 'goals' as PageName, icon: (
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    )},
    { name: 'bills' as PageName, icon: (
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    )},
    { name: 'rent-buy' as PageName, icon: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    )},
    { name: 'compound' as PageName, icon: (
      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    )},
    { name: 'emergency' as PageName, icon: (
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    )},
    { name: 'import' as PageName, icon: (
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    )},
    { name: 'accounts' as PageName, icon: (
      <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    )},
    { name: 'retirement' as PageName, icon: (
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    )},
    { name: 'housing' as PageName, icon: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    )},
    { name: 'analytics' as PageName, icon: (
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    )},
    { name: 'categories' as PageName, icon: (
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    )},
    { name: 'settings' as PageName, icon: (
      <>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  ]

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <main class={`${layoutStyles.main} ${sidebarStyles.sidebar}`}>
        <nav class={sidebarStyles.sidebar}>
          <div class={sidebarStyles.logo}>
            <h1>Finance Manager</h1>
          </div>
          <ul class={sidebarStyles.nav}>
            {navItems.map((item) => (
              <li key={item.name}>
                <a
                  href={`#${item.name}`}
                  class={activePage() === item.name ? sidebarStyles.navLinkActive : sidebarStyles.navLink}
                  onClick={(e) => {
                    e.preventDefault()
                    setActivePage(item.name)
                    window.location.hash = item.name
                  }}
                >
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  <span>{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div class={layoutStyles.content}>
          {Object.entries(allPages).map(([name, page]) => (
            <Dynamic
              key={name}
              component={page}
              data-page={name}
              data-testid={`page-${name}`}
              class={{
                [layoutStyles.page]: true,
              }}
            />
          ))}
        </div>
      </main>
    </Suspense>
  )
}
