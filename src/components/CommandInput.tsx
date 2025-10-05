import { useId, useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'

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
    <div>
      {/* Search Icon */}
      <div>
        <svg>
          <path />
        </svg>
      </div>
      {/* Input Field */}
      <input />
    </div>
  )
}
