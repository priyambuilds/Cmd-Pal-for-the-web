import { useCommandContext } from '@/types/context'
import { useCallback } from 'react'

/**
 * Back button that appears when navigated into a portal or category.
 * Clicking it returns to the previous view.
 */
export default function BackButton() {
  const store = useCommandContext()

  const handleBack = () => {
    store.goBack()
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 transition-colors dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      aria-label="Go back to previous view"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Back
    </button>
  )
}
