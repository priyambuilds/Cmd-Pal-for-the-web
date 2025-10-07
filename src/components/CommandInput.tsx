import { useId, useSyncExternalStore, useState, useEffect } from 'react'
import { useCommandContext } from '@/types/context'

export interface CommandInputProps {
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * The search input for the command palette.
 * Uses local state for immediate updates, syncs to store for global state.
 */
export default function CommandInput({
  placeholder = 'Type a command or search...',
  autoFocus = false,
  className = '',
}: CommandInputProps) {
  const store = useCommandContext()

  // Generate stable IDs for accessibility
  const inputId = useId()
  const listboxId = `${inputId}-listbox`

  // Subscribe to store query (for external updates like navigation)
  const storeQuery = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view.query
  )

  // Subscribe to open state
  const open = useSyncExternalStore(
    store.subscribe,
    () => store.getState().open
  )

  // Subscribe to activeId for aria-activedescendant
  const activeId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().activeId
  )

  // LOCAL STATE: For immediate, fast typing
  const [localValue, setLocalValue] = useState(storeQuery)

  // SYNC FROM STORE: When store changes externally (navigation, back button)
  useEffect(() => {
    setLocalValue(storeQuery)
  }, [storeQuery])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Update local state immediately (no parent re-render)
    setLocalValue(newValue)

    // Update store (parent will handle this in useEffect)
    const currentView = store.getState().view
    store.setState({
      view: {
        ...currentView,
        query: newValue,
      },
    })
  }

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
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId || undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={localValue} // ✅ Use local state, not store query
        onChange={handleChange}
        placeholder={placeholder}
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
