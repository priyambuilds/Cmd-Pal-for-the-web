import { useId, useSyncExternalStore, useRef, useCallback } from 'react'
import { useCommandContext } from '@/types/context'

export interface CommandInputProps {
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * The search input for the command palette.
 * Uses store as single source of truth - no local state.
 *
 * Performance: Store updates are synchronous and batched by React.
 * This prevents the race condition from dual state management.
 */
export default function CommandInput({
  placeholder = 'Type a command or search...',
  autoFocus = false,
  className = '',
}: CommandInputProps) {
  const store = useCommandContext()

  // refs for DOM management
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate stable IDs for accessibility
  const inputId = useId()
  const listboxId = `${inputId}-listbox`

  // ============================================
  // SUBSCRIBE TO STORE (Single Source of Truth)
  // ============================================

  // Get query directly from store - no local state
  const query = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view.query
  )

  // Subscribe to open state
  const open = useSyncExternalStore(
    store.subscribe,
    () => store.getState().open
  )

  // Subscriber to activeId for aria-activedescendant
  const activeId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().activeId
  )

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle input changes
   * Updates store directly - React batches the re-render
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      const currentView = store.getState().view

      // Single update to store
      // React will batch this with any other state updates
      store.setState({
        view: {
          ...currentView,
          query: newValue,
        },
      })
    },
    [store]
  )

  /**
   * Handle key presses for special behavior
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent arrow keys from moving cursor when navigating list
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
      }

      // Clear input on Escape
      if (e.key === 'Escape') {
        const currentView = store.getState().view

        if (currentView.query) {
          // Clear query first
          e.stopPropagation()
          store.setState({
            view: {
              ...currentView,
              query: '',
            },
          })
        } else {
          // If query is already empty, close the palette
          store.setState({ open: false })
        }
      }
    },
    [store]
  )

  /**
   * Auto-focus when palette opens
   */
  const handleFocus = useCallback(() => {
    if (autoFocus && inputRef.current && open) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [autoFocus, open])

  // Focus input when palette opens
  useSyncExternalStore(store.subscribe, () => {
    handleFocus()
    return open
  })

  return (
    <div className="relative flex items-center border-b border-gray-200 dark:border-gray-800">
      {/* Search Icon */}
      <div className="pl-4 pr-3 text-gray-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input Field */}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeId || undefined}
        aria-label="Command palette search"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`
          flex-1
          py-4 pr-4
          text-lg
          bg-transparent
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          outline-none
          ${className}
        `}
      />
    </div>
  )
}
