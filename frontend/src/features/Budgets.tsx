/**
 * Budgets Component
 * Includes traditional budgeting view and zero-based budgeting (envelope-style)
 */

import { createSignal, createEffect, onMount, For } from 'solid-js'
import { theme } from '../core/theme'

type AllocationStatus = 'ok' | 'warning' | 'over'

interface CategoryAllocation {
  category_id: number
  category_name: string
  category_color: string
  category_icon: string
  amount: number
  spent: number
  remaining_budget: number
  percent_used: number
  is_budgeted: boolean
  can_allocate: boolean
}

interface ZeroBasedSummary {
  categories: CategoryAllocation[]
  remaining_income: number
  already_budgeted: number
  unassigned_budget: number
  period: string
  can_allocate: boolean
  total_budget: number
  total_spent: number
  remaining: number
  zero_based_remaining: number
  income: number
}

export default function Budgets() {
  const [activeTab, setActiveTab] = createSignal<'traditional' | 'zero-based'>('zero-based')
  const [month, setMonth] = createSignal(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [allocations, setAllocations] = createSignal<CategoryAllocation[]>([])
  const [summary, setSummary] = createSignal<ZeroBasedSummary | null>(null)
  const [showAllocateModal, setShowAllocateModal] = createSignal(false)
  const [selectedCategory, setSelectedCategory] = createSignal<CategoryAllocation | null>(null)
  const [allocateAmount, setAllocateAmount] = createSignal<number>(0)
  const [budgetMessage, setBudgetMessage] = createSignal<string>('')
  const [toastMessage, setToastMessage] = createSignal<string | null>(null)

  // Get current allocations and summary
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [allocationsRes, summaryRes] = await Promise.all([
        fetch(`/api/budgets/zero-based?month=${month()}`),
        fetch(`/api/budgets/zero-based/summary?month=${month()}`),
      ])

      if (!allocationsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to load budget data')
      }

      const allocationsData: CategoryAllocation[] = await allocationsRes.json()
      const summaryData: ZeroBasedSummary = await summaryRes.json()

      setAllocations(allocationsData)
      setSummary(summaryData)
      setBudgetMessage(summaryData.zero_based_remaining > 0
        ? `Unallocated: $${summaryData.zero_based_remaining.toFixed(2)}`
        : `All income allocated!`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  // Allocate budget to a category
  const allocateBudget = async () => {
    if (!selectedCategory() || allocateAmount() <= 0) {
      return
    }

    try {
      const res = await fetch('/api/budgets/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCategory()!.category_id,
          amount: allocateAmount(),
          period: 'monthly',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to allocate budget')
      }

      setShowAllocateModal(false)
      setAllocateAmount(0)
      setToastMessage('Budget allocated successfully!')
      setTimeout(() => setToastMessage(null), 3000)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to allocate budget')
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Get status class
  const getStatusClass = (status: AllocationStatus) => {
    switch (status) {
      case 'over': return 'status-over'
      case 'warning': return 'status-warning'
      default: return 'status-ok'
    }
  }

  // Show allocate modal for a category
  const openAllocateModal = (category: CategoryAllocation) => {
    setSelectedCategory(category)
    setAllocateAmount(0)
    setBudgetMessage('')
    setShowAllocateModal(true)
  }

  // Initialize
  onMount(() => {
    loadData()
  })

  // Refresh on month change
  createEffect(() => {
    loadData()
  })

  return (
    <div class="page page-budgets page-enter">
      <div class="page-header">
        <div class="header-top">
          <h1>Budgets</h1>
          <div class="month-selector">
            <button
              class="btn btn-ghost"
              onclick={() => {
                const date = new Date(`${month()}-01`)
                date.setMonth(date.getMonth() - 1)
                setMonth(date.toISOString().slice(0, 7))
              }}
              aria-label="Previous month"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="month-display">{month()}</span>
            <button
              class="btn btn-ghost"
              onclick={() => {
                const date = new Date(`${month()}-01`)
                date.setMonth(date.getMonth() + 1)
                setMonth(date.toISOString().slice(0, 7))
              }}
              aria-label="Next month"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <p class="page-subtitle">Zero-based budgeting: allocate every dollar to a category</p>
      </div>

      {/* Budget Summary Cards */}
      <div class="budget-summary">
        <div class="summary-card">
          <div class="summary-label">Income</div>
          <div class="summary-value positive">{formatCurrency(summary()?.income || 0)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Allocated</div>
          <div class="summary-value">{formatCurrency(summary()?.total_budget || 0)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Spent</div>
          <div class="summary-value negative">{formatCurrency(summary()?.total_spent || 0)}</div>
        </div>
        <div class="summary-card highlighted">
          <div class="summary-label">Remaining</div>
          <div class="summary-value status-ok">
            {formatCurrency(summary()?.remaining || 0)}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Unallocated</div>
          <div class="summary-value">
            {formatCurrency(summary()?.zero_based_remaining || 0)}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage() && (
        <div class="toast toast-success">
          {toastMessage()}
        </div>
      )}

      {/* Error */}
      {error() && (
        <div class="toast toast-error">
          {error()}
        </div>
      )}

      {/* Allocation Table */}
      <div class="budget-allocations">
        <div class="table-header">
          <h2>Category Allocations</h2>
          <div class="actions">
            <button
              class="btn btn-primary"
              onclick={() => {
                const firstUnallocated = allocations().find(a => !a.is_budgeted && a.can_allocate)
                if (firstUnallocated) {
                  openAllocateModal(firstUnallocated)
                }
              }}
              disabled={!summary()?.can_allocate}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Allocation
            </button>
          </div>
        </div>

        {loading() ? (
          <div class="empty-state">Loading budgets...</div>
        ) : allocations().length === 0 ? (
          <div class="empty-state">
            <p>No allocations for this month yet.</p>
            <p>Start by allocating income to expense categories.</p>
            <button
              class="btn btn-primary"
              onClick={() => {
                const firstUnallocated = allocations().find(a => !a.is_budgeted && a.can_allocate)
                if (firstUnallocated) {
                  openAllocateModal(firstUnallocated)
                }
              }}
            >
              Create First Allocation
            </button>
          </div>
        ) : (
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Allocated</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>% Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={allocations()}>
                  {(item) => (
                    <tr class={getStatusClass(item.status as AllocationStatus)}>
                      <td>
                        <div class="category-cell">
                          <div class="category-icon" style={`--bg-color: ${item.category_color}`}>
                            {item.category_icon}
                          </div>
                          <span class="category-name">{item.category_name}</span>
                        </div>
                      </td>
                      <td class="amount-col">{formatCurrency(item.allocated)}</td>
                      <td class="amount-col">{formatCurrency(item.spent)}</td>
                      <td class="amount-col status-ok">
                        {formatCurrency(item.remaining_budget)}
                      </td>
                      <td class="percent-col">
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            style={`width: ${item.percent_used}%; --color: ${item.category_color}`}
                          />
                        </div>
                        <span class="percent-value">{Math.round(item.percent_used)}%</span>
                      </td>
                      <td class="status-col">
                        {item.status === 'over' && (
                          <span class="badge badge-over">Over Budget</span>
                        )}
                        {item.status === 'warning' && (
                          <span class="badge badge-warning">Near Limit</span>
                        )}
                        {item.status === 'ok' && (
                          <span class="badge badge-ok">On Track</span>
                        )}
                        {item.is_fully_allocated && (
                          <span class="badge badge-ok">Fully Allocated</span>
                        )}
                      </td>
                      <td class="actions-col">
                        {item.can_allocate && !item.is_budgeted ? (
                          <button
                            class="btn btn-sm btn-ghost"
                            onClick={() => openAllocateModal(item)}
                          >
                            Allocate
                          </button>
                        ) : (
                          <span class="budget-message">{budgetMessage()}</span>
                        )}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {showAllocateModal() && selectedCategory() && (
        <div class="modal-overlay" onclick={(e) => {
          if (e.target === e.currentTarget) setShowAllocateModal(false)
        }}>
          <div class="modal modal-small" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h3>Allocate Budget</h3>
              <button
                class="btn-close"
                onClick={() => setShowAllocateModal(false)}
                aria-label="Close modal"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="modal-text">
                Allocate budget to <strong>{selectedCategory().category_name}</strong>
              </p>
              <label class="form-label">Amount</label>
              <input
                type="number"
                class="form-input"
                step="0.01"
                min="0.01"
                value={allocateAmount()}
                oninput={(e) => setAllocateAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                autoFocus
              />
              <p class="help-text">
                Available unallocated: {formatCurrency(summary()?.unassigned_budget || 0)}
              </p>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-ghost"
                onClick={() => setShowAllocateModal(false)}
              >
                Cancel
              </button>
              <button
                class="btn btn-primary"
                onClick={allocateBudget}
                disabled={allocateAmount() <= 0}
              >
                Allocate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Traditional View (placeholder) */}
      <div class="budget-traditional">
        <div class="empty-state">
          <p>Traditional view coming soon</p>
          <p>View budget vs actual reports and past budgets.</p>
        </div>
      </div>
    </div>
  )
}