/**
 * Global Window Type Declarations
 */

declare global {
  interface Window {
    transactionsSetType?: (type: string) => void
    transactionsLoad?: () => Promise<void>
    transactionsLoadType?: () => Promise<void>
    transactionsSetFilterType?: (type: string) => void
    transactionsSetFilterMonth?: (month: string) => void
    transactionsSetSearchTerm?: (term: string) => void
    transactionsSetSelectedTxId?: (id: number | null) => void
    transactionsSetLoading?: (loading: boolean) => void
    transactionsSave?: () => Promise<void>
  }
}

export {}
