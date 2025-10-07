import { useCommandContext } from '@/types/context'
import { useSyncExternalStore } from 'react'

/**
 * Back button that appears when navigated into a portal or category.
 * Clicking it returns to the previous view.
 *
 * Only visible when:
 * - NOT on root view
 * - There is navigation history
 */
export default function BackButton() {
  const store = useCommandContext()

  // Subscribe to view state
  const view = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view
  )

  // Subscribe to history state
  const hasHistory = useSyncExternalStore(
    store.subscribe,
    () => store.getState().history.length > 0
  )

  // Don't render if on root view or no history
  if (view.type === 'root' || !hasHistory) {
    return null
  }

  const handleBack = () => {
    try {
      store.goBack()
    } catch (error) {
      console.error('Failed to go back:', error)
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 px-4 py-3 w-full text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      aria-label="Go back to previous view"
    >
      <span className="text-gray-500 dark:text-gray-400">←</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Back
      </span>
    </button>
  )
}
