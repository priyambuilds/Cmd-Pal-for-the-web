import { useId, useMemo, useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'
import type { CommandItemProps } from '@/types/types'
import commandScore from 'command-score'
/**
User clicks item OR presses Enter
     ↓
handleClick() called (or CommandList triggers click)
     ↓
onSelect(value) called
     ↓
Parent component handles action
     ↓
(Example: close palette, open settings, run command)
 */

/**
 * A single command/action in the palette.
 * Handles filtering, selection, and keyboard navigation.
 */
export default function CommandItem({
  id: providedId,
  value,
  keywords = [],
  disabled = false,
  onSelect,
  children,
}: CommandItemProps) {
  const store = useCommandContext()

  // Generate stable ID if not provided
  const generatedId = useId()
  const id = providedId || generatedId

  // Subscribe to query text for filtering
  const query = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view.query
  )

  // Subscribe to activeId to know if this item is selected
  const activeId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().activeId
  )

  const isActive = activeId === id

  // Calculate match score
  // For now, simple contains check - we'll add command-score later
  const score = useMemo(() => {
    if (!query) return 1

    // Score the main value using command-score
    let maxScore = commandScore(value, query)

    // Also check keywords and take the best score
    keywords.forEach(kw => {
      const keywordScore = commandScore(kw, query)
      maxScore = Math.max(maxScore, keywordScore)
    })

    return maxScore
  }, [query, value, keywords])

  // Hide if no match
  if (score === 0) return null

  const handleClick = () => {
    if (disabled) return
    onSelect?.(value)
  }

  const handleMouseEnter = () => {
    if (disabled) return
    // Update activeId when hovering
    store.setState({ activeId: id })
  }

  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-command-item=""
      data-disabled={disabled ? '' : undefined}
      data-selected={isActive ? '' : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`
        px-4 py-3
        flex items-center gap-3
        cursor-pointer
        text-sm
        transition-colors
        ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
            : 'text-gray-700 dark:text-gray-300'
        }
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      {children}
    </div>
  )
}
