import { useId, useEffect, useRef } from 'react'
import { CommandContext } from '@/types/context'
import { createStore } from '@/types/store'
import type { CommandProps, CommandState } from '@/types/types'

/**
┌─────────────────────────────────────┐
│         <Command>                   │
│                                     │
│  1. Creates store (useRef)          │
│  2. Syncs controlled value          │
│  3. Provides store via Context      │
└─────────────┬───────────────────────┘
              │
              │ CommandContext
              ▼
┌─────────────────────────────────────┐
│         Child Components            │
│                                     │
│  <CommandInput />                   │
│  useCommandContext() → get store    │
│                                     │
│  <CommandList>                      │
│    <CommandItem />                  │
│    <CommandItem />                  │
│  </CommandList>                     │
│                                     │
│  All read/write through the store   │
└─────────────────────────────────────┘
 */

/**
 * Root command component that creates and manages the command palette state.
 * All other command components (Input, List, Item, etc.) must be children of this.
 *
 * Supports both controlled and uncontrolled modes:
 *
 * Uncontrolled:
 *   <Command label="Search">...</Command>
 *
 * Controlled:
 *   <Command label="Search" value={search} onValueChange={setSearch}>...</Command>
 */

export default function Command({
  label,
  value,
  onValueChange,
  filter,
  loop = false,
  children,
}: CommandProps) {
  const id = useId()

  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)

  if (!storeRef.current) {
    const initialState: CommandState = {
      open: false,
      activeId: null,
      loop,
      view: {
        type: 'root',
        query: value ?? '',
      },
      history: [],
      recentCommands: [],
    }

    storeRef.current = createStore(initialState)
  }

  const store = storeRef.current

  useEffect(() => {
    if (value !== undefined) {
      const currentView = store.getState().view
      store.setState({
        view: {
          ...currentView,
          query: value, // ✅ Update view.query instead
        },
      })
    }
  }, [value, store])

  useEffect(() => {
    store.setState({ loop: loop })
  }, [loop, store])

  return (
    <CommandContext value={store}>
      <div
        className="
          w-full max-w-[640px]
          bg-white dark:bg-gray-900
          rounded-xl
          shadow-2xl
          border border-gray-200 dark:border-gray-800
          overflow-hidden
          flex flex-col
        "
        role="group"
        aria-label={label}
        id={id}
      >
        {children}
      </div>
    </CommandContext>
  )
}
