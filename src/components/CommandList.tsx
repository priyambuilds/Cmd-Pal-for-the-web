import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'

/**
User presses ArrowDown
     ↓
handleKeyDown() called
     ↓
Query all [data-command-item] elements
     ↓
Find current active item's index
     ↓
Calculate next index (currentIndex + 1)
     ↓
Check if we need to wrap (loop)
     ↓
store.setState({ activeId: items[nextIndex] })
     ↓
Store notifies subscribers
     ↓
CommandItem with new activeId re-renders with "selected" style
     ↓
Auto-scroll effect runs
     ↓
Active item scrolls into view
 */

export interface CommandListProps {
  children?: React.ReactNode
  className?: string
}

/**
 * Container for command items with keyboard navigation.
 * Handles ArrowUp/Down/Enter/Escape and scrolls active items into view.
 */

export default function CommandList({
  children,
  className = '',
}: CommandListProps) {
  const store = useCommandContext()
  const listRef = useRef<HTMLDivElement>(null)

  // Subscribe to open state
  const open = useSyncExternalStore(
    store.subscribe,
    () => store.getState().open
  )
  // Subscribe to activeId for keyboard navigation
  const activeId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().activeId
  )

  // keyboard navigation handler - only active when list is open
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = store.getState()

      // Get all item IDs currently rendered
      // We'll populate this from CommandItem components later
      const items = Array.from(
        listRef.current?.querySelectorAll('[data-command-item]') || []
      )
        .map(el => el.id)
        .filter(Boolean)

      if (items.length == 0) return

      const currentIndex = state.activeId ? items.indexOf(state.activeId) : -1

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          let nextIndex = currentIndex + 1

          // Wrap t first if at end and loop if enabled
          if (nextIndex >= items.length) {
            nextIndex = state.loop ? 0 : items.length - 1
          }

          store.setState({ activeId: items[nextIndex] })
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          let prevIndex = currentIndex - 1

          // Wrap to last if at start and loop is enabled
          if (prevIndex < 0) {
            prevIndex = state.loop ? items.length - 1 : 0
          }

          store.setState({ activeId: items[prevIndex] })
          break
        }

        case 'Home': {
          e.preventDefault()
          store.setState({ activeId: items[0] })
          break
        }

        case 'End': {
          e.preventDefault()
          store.setState({ activeId: items[items.length - 1] })
          break
        }
        case 'Enter': {
          // Find the active item element and trigger its click
          if (state.activeId) {
            const activeElement = listRef.current?.querySelector(
              `[id="${state.activeId}"]`
            ) as HTMLElement

            if (activeElement) {
              e.preventDefault()
              activeElement.click()
            }
          }
          break
        }

        case 'Escape': {
          e.preventDefault()

          // Only clear query if there's one
          // Let parent (App) handle closing the modal
          const currentView = state.view
          if (currentView.query) {
            store.setState({
              view: {
                ...currentView,
                query: '',
              },
              activeId: null,
            })
          }
          // If no query, let the event bubble up to close modal
          break
        }
      }
    }

    // listen for keybaord events globally
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [store])

  // Auto scroll active items into view
  useEffect(() => {
    if (!activeId || !listRef.current) return

    const activeElement = listRef.current.querySelector(`[id="${activeId}"]`)
    if (activeElement) {
      activeElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [activeId])

  // Don't render if not open
  if (!open) return null

  return (
    <div
      ref={listRef}
      role="listbox"
      className={`
        max-h-[400px]
        overflow-y-auto
        overflow-x-hidden
        py-2
        ${className}
      `}
      style={{
        //Custom scrollbar styling
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgb(203 213 225) transparent',
      }}
    >
      {children}
    </div>
  )
}
