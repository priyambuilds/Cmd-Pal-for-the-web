import type { CommandState, ViewState } from './types'

/**
 * Storage key for recent commands
 */
const STORAGE_KEY = 'commandPalette_recent'

/**
 * A subscription callback that React components pass to listen for changes.
 * When called, it tells React to re-render the component.
 */
type Subscriber = () => void

/**
 * Subscription metadata for health tracking
 */
interface SubscriptionMeta {
  callback: Subscriber
  id: number // Unique ID for this subscription
  mountedAt: number // Timestamp when this subscription was added
  lastActive: number // Timestamp when this subscription was last called
}

/**
 * Load recent commands from chrome.storage.local
 */
async function loadRecentCommands(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []
  } catch (error) {
    console.warn('Failed to load recent commands from storage:', error)
    return []
  }
}

/**
 * Save recent commands to chrome.storage.local
 */
async function saveRecentCommands(commands: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: commands })
  } catch (error) {
    console.error('Failed to save recent commands to storage', error)
  }
}

/**
 * Creates a production-grade store with memory leak prevention
 */
export function createStore<T extends CommandState>(initialState: T) {
  let state = initialState

  // Use Map instead of Set for better Metadata tracking
  // Why: Maps allow us to store metadata alongside the callback. We can quickly look up by ID and track additional info.
  const subscribers = new Map<number, SubscriptionMeta>()
  let nextSubscriptionId = 0

  // Development-only: Track subscription patterns
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore - Development only global
    window.__COMMAND_STORE_DEBUG__ = {
      getSubscriberCount: () => subscribers.size,
      getSubscribers: () => Array.from(subscribers.values()),
      logSubscribers: () => {
        console.table(
          Array.from(subscribers.values()).map(sub => ({
            id: sub.id,
            mountedAt: new Date(sub.mountedAt).toLocaleTimeString(),
            lastActive: new Date(sub.lastActive).toLocaleTimeString(),
            age: `${Math.round((Date.now() - sub.mountedAt) / 1000)}s`,
          }))
        )
      },
    }
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function that MUST be called on unmount
   */
  function subscribe(callback: Subscriber): () => void {
    const id = nextSubscriptionId++
    const now = Date.now()

    const meta: SubscriptionMeta = {
      callback,
      id,
      mountedAt: now,
      lastActive: now,
    }

    subscribers.set(id, meta)

    // Development warning: detect if subscriber count is growing abnormally
    if (process.env.NODE_ENV === 'development') {
      if (subscribers.size > 20) {
        console.warn(
          `⚠️ Command Store: ${subscribers.size} subscribers active. ` +
            `This might indicate a memory leak. Check that all components properly unmount.`
        )
      }
    }

    // Return cleanup function
    return () => {
      const removed = subscribers.delete(id)

      if (!removed && process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Command Store: Attempted to unsubscribe with ID ${id} but it was already removed. ` +
            `This might indicate a double-unsubscribe or cleanup called twice.`
        )
      }
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  function notifySubscribers() {
    const now = Date.now()
    const staleSubscribers: number[] = []

    subscribers.forEach((meta, id) => {
      try {
        // Update last active timestamp
        meta.lastActive = now

        // Call the subscriber
        meta.callback()
      } catch (error) {
        console.error(`Error in subscriber ${id}:`, error)

        // Mark for removal if subscriber throws errors
        // Why: If a subscriber throws an error (due to a bug), we automatically remove it to prevent cascading failures.
        staleSubscribers.push(id)
      }
    })

    // Cleanup any subscribers that threw errors
    staleSubscribers.forEach(id => {
      console.warn(`Removing stale subscriber ${id} due to error`)
    })
  }
  /**
   * Get current state snapshot
   * This is called by React during renders
   */

  function getState(): T {
    return state
  }

  /**
   * Update state and notify subscribers
   */
  function setState(partial: Partial<T>): void {
    const oldState = state
    state = { ...state, ...partial }

    // Only notify if state actually changed
    // This prevents unnecessary re-renders
    if (oldState !== state) {
      notifySubscribers()
    }
  }

  /**
   * Initialize store by loading persisted data
   */
  async function init(): Promise<void> {
    try {
      const recentCommands = await loadRecentCommands()
      setState({ recentCommands } as Partial<T>)
    } catch (error) {
      console.error('Failed to initialize store:', error)
    }
  }

  /**
   * Add a command to recent commands and persist
   */
  async function addRecentCommand(commandId: string): Promise<void> {
    const MAX_RECENT = 10
    const current = state.recentCommands || []

    // Remove if already exists (we'll add it to the front)
    const filtered = current.filter(id => id !== commandId)

    // Add to front and limit to MAX_RECENT
    const updated = [commandId, ...filtered].slice(0, MAX_RECENT)

    // update state
    await saveRecentCommands(updated)
  }

  /**
   * Development only: Force cleanup of all subscribers
   * Useful for testing and debugging
   */
  function cleanup() {
    if (process.env.NODE_ENV === 'development') {
      const count = subscribers.size
      subscribers.clear()
      console.warn(`⚠️ Command Store: Cleaned up ${count} subscribers`)
    }
  }

  return {
    subscribe,
    getState,
    setState,
    init,
    addRecentCommand,
    ...(process.env.NODE_ENV === 'development' ? { cleanup } : {}),
  }
}

export type CommandStore = ReturnType<typeof createStore<CommandState>>

// How to test this?
// Check current subscriber count
// window.__COMMAND_STORE_DEBUG__.getSubscriberCount()

// Log detailed subscriber info
// window.__COMMAND_STORE_DEBUG__.logSubscribers()

// After closing and reopening palette multiple times,
// subscriber count should stay stable (not grow infinitely)
