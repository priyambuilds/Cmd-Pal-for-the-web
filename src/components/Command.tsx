import { useEffect, useRef } from 'react'
import { CommandContext } from '@/types/context'
import { createStore } from '@/types/store'
import type { CommandProps, CommandState } from '@/types/types'

/**
 * Command Context Provider Component
 * Provides command store context to child components
 * Does NOT render any UI - only manages state
 */
export default function Command({
  label,
  value,
  onValueChange,
  filter,
  loop = false,
  children,
}: CommandProps) {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)

  if (!storeRef.current) {
    const initialState: CommandState = {
      open: true, // Default to open since modal state is controlled externally
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
    // Load recent commands from storage
    storeRef.current.init()
  }

  const store = storeRef.current

  useEffect(() => {
    if (value !== undefined) {
      const currentView = store.getState().view
      store.setState({
        view: {
          ...currentView,
          query: value,
        },
      })
    }
  }, [value, store])

  useEffect(() => {
    store.setState({ loop: loop })
  }, [loop, store])

  // Only provide context, no UI container
  return <CommandContext value={store}>{children}</CommandContext>
}
