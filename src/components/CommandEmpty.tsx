import { useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'

export interface CommandEmptyProps {
  children?: React.ReactNode
  className?: string
}

export default function CommandEmpty({
  children = 'No results found',
  className = '',
}: CommandEmptyProps) {
  const store = useCommandContext()
  // Subscribe to seach to know if user is searching
  const search = useSyncExternalStore(
    store.subscribe,
    () => store.getState().search
  )

  // Count visible items by querying the DOM
  // This runs on every render when search changes
  const hasItems =
    typeof document !== 'undefined' &&
    document.querySelectorAll('[data-command-item]').length > 0

  // Only show when there's a search but no results
  if (!search || hasItems) return null

  return (
    <div
      role="presentation"
      className={`
        px-4 py-8
        text-center
        text-sm
        text-gray-500 dark:text-gray-400
        ${className}
      `}
    >
      {children}
    </div>
  )
}
