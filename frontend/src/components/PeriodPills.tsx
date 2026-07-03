/**
 * Period Pills Component
 * Quick-select period buttons for dashboard
 */
import { createMemo, For } from 'solid-js'
import periodPillsStyles from './PeriodPills.module.css'

export interface PeriodPill {
  id: string
  label: string
  /** Full description shown as a tooltip (the visible label stays short). */
  title?: string
  icon?: string
}

export interface PeriodPillsProps {
  value: string
  onChange: (period: string) => void
  periods?: PeriodPill[]
}

// Short labels so the selector reads as ONE compact segmented control instead of nine
// wide pills spilling across rows; the full wording lives in the tooltip.
const DEFAULT_PERIODS: PeriodPill[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week', title: 'This week' },
  { id: 'month', label: 'Month', title: 'This month' },
  { id: 'quarter', label: 'Quarter', title: 'This quarter' },
  { id: 'year', label: 'Year', title: 'This year' },
  { id: 'last7', label: '7D', title: 'Last 7 days' },
  { id: 'last30', label: '30D', title: 'Last 30 days' },
  { id: 'last90', label: '90D', title: 'Last 90 days' },
  { id: 'all', label: 'All', title: 'All time' },
]

export function PeriodPills(props: PeriodPillsProps) {
  const periods = createMemo(() => props.periods || DEFAULT_PERIODS)

  return (
    <div class={periodPillsStyles.pillsContainer} role="group" aria-label="Time period">
      <For each={periods()}>
        {(period) => (
          <button
            class={`${periodPillsStyles.pill} ${props.value === period.id ? periodPillsStyles.pillActive : ''}`}
            onClick={() => {
              props.onChange(period.id)
            }}
            type="button"
            title={period.title || period.label}
            aria-pressed={props.value === period.id}
          >
            {period.icon && <span class={periodPillsStyles.pillIcon}>{period.icon}</span>}
            <span class={periodPillsStyles.pillLabel}>{period.label}</span>
          </button>
        )}
      </For>
    </div>
  )
}

export default function PeriodPillsDefault(props: PeriodPillsProps) {
  return <PeriodPills {...props} />
}
