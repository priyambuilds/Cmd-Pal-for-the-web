import { SetStateAction } from 'react'
import type { CommandState, Store } from './types'

/**
 * Creates a store that manages command palette state
 * Uses the useSyncExternalStore pattern
 */
export function createStore(): Store {
  // The actual state object
  const state: CommandState = {
    search: '',
    value: '',
    filtered: {
      count: 0,
      items: new Map(),
      groups: new Set(),
    },
  }

  // SUbscribers that want to knwo about changes
  const subscribers = new Set<() => void>()

  return {
    /**
     * Subscribe to state changes
     * Returns an unsubscribe function
     */
    subscribe: callback => {
      subscribers.add(callback)
      // Return cleanup function
      return () => subscribers.delete(callback)
    },

    /**
     * Get current state snapshot
     * Called by useSyncExternalStore
     */
    snapshot: () => {
      return state
    },
    /**
     * Update a piece of state
     * Optionally skip notifying subscribers (for batching)
     */
    setState: (key, value, opts = {}) => {
      const { notify = true } = opts

      // update the state
      state[key] = value

      // Notify all subscribers if requested
      if (notify) {
        subscribers.forEach(subscriber => subscriber())
      }
    },
  }
}
