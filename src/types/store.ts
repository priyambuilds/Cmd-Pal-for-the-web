import type { CommandState } from './types'

/**
 * A subscription callback that React components pass to listen for changes.
 * When called, it tells React to re-render the component.
 */
type Subscriber = () => void

/**
 * Creates a simple store that holds CommandState and notifies subscribers
 * when state changes. Compatible with React's useSyncExternalStore.
 */
export function createStore(initialState: CommandState) {
  // Store the current state
  let state = initialState

  // Set of all subscribers (using Set to avoid duplicates)
  const subscribers = new Set<Subscriber>()

  /**
   * Get the current state snapshot.
   * This is what useSyncExternalStore calls to read state.
   */
  const getState = (): CommandState => {
    return state
  }

  /**
   * Get a specific slice of state.
   * Example: getSlice(s => s.search) returns just the search string.
   */
  const getSlice = <T>(selector: (state: CommandState) => T): T => {
    return selector(state)
  }

  /**
   * Update state and notify all subscribers.
   * Accepts a partial state object that gets merged with current state.
   */
  const setState = (updates: Partial<CommandState>) => {
    // Merge updates into current state (shallow merge)
    state = { ...state, ...updates }

    // Notify all subscribers that state changed
    subscribers.forEach(callback => callback())
  }

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function that React calls during cleanup.
   */
  const subscribe = (callback: Subscriber): (() => void) => {
    // Add this callback to the subscriber set
    subscribers.add(callback)

    // Return a function that removes this subscriber (cleanup)
    return () => {
      subscribers.delete(callback)
    }
  }

  // Return the store API
  return {
    getState,
    getSlice,
    setState,
    subscribe,
  }
}

/**
 * Type representing a store instance.
 * We'll use this for TypeScript typing in Context.
 */
export type CommandStore = ReturnType<typeof createStore>
