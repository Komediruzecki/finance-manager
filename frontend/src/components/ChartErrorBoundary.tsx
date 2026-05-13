import { ErrorBoundary } from 'solid-js'
import type { Component, JSX } from 'solid-js'

interface Props {
  children: JSX.Element
  title?: string
}

export const ChartErrorBoundary: Component<Props> = (props) => {
  return (
    <ErrorBoundary
      fallback={(_err) => (
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            padding: '2rem',
            'min-height': '150px',
            'background-color': 'var(--bg-card-secondary, #f9fafb)',
            border: '1px solid var(--border, #e5e7eb)',
            'border-radius': '8px',
            color: 'var(--text-secondary, #6b7280)',
            'font-size': '0.875rem',
          }}
        >
          {props.title ? `${props.title} failed to load` : 'Chart failed to load'}
        </div>
      )}
    >
      {props.children}
    </ErrorBoundary>
  )
}
