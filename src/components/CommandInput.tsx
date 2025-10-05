import { useId, useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'

/**
User types "calc"
     ↓
handleChange() called
     ↓
store.setState({ search: "calc", open: true })
     ↓
Store notifies subscribers
     ↓
Input re-renders with new value
     ↓
CommandList (next component) re-filters items
 */

export interface CommandInputProps {
  placeholder?: string
  autofocus?: boolean
  className?: string
}

/**
 * The search input for the command palette.
 * Handles user text input and updates the store.
 */

export default function CommandInput({
  placeholder = 'Type a command or search...',
  autofocus = false,
  className = '',
}: CommandInputProps) {
  const store = useCommandContext()

  // Generate stable IDs for accessibility
  const inputId = useId()
  const listboxId = `${inputId}-listbox`

  // Subscribe to search value from store
  const search = useSyncExternalStore(
    store.subscribe,
    () => store.getState().search
  )
  // Subscribe to open state to set aria-expanded
  const open = useSyncExternalStore(
    store.subscribe,
    () => store.getState().open
  )
  // Subscribe to activeId for aria-activedescendant
  const activeId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().activeId
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    store.setState({
      search: newValue,
      open: newValue.length > 0, // Open list when typing
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
        autoFocus={autofocus}
        value={search}
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
