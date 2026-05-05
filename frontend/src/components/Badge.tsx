/**
 * Badge Component - Reusable badge component with status variants
 */

import { mergeProps } from 'solid-js'
import styles from './Badge.module.css'
import type { JSX } from 'solid-js'

interface BadgeProps {
  status?: 'ok' | 'warning' | 'over' | 'income' | 'expense' | 'transfer' | 'default'
  children: JSX.Element
  class?: string
}

const statusClassMap: Record<string, string> = {
  ok: styles['badge-ok'],
  warning: styles['badge-warning'],
  over: styles['badge-over'],
  income: styles['badge-income'],
  expense: styles['badge-expense'],
  transfer: styles['badge-transfer'],
}

export default function Badge(props: BadgeProps) {
  const merged = mergeProps({ status: 'default' }, props)

  return (
    <span class={`${styles.badge} ${statusClassMap[merged.status] ?? ''} ${merged.class ?? ''}`.trim()}>
      {merged.children}
    </span>
  )
}
