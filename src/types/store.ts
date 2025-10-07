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
    console.error('Failed to save recent commands to storage:', error)
  }
}

/**
 * Command Store Interface
 * Explicitly defines all methods available on the store
 */
interface CommandStore {
  subscribe: (callback: Subscriber) => () => void
  getState: () => CommandState
  setState: (partial: Partial<CommandState>) => void
  navigate: (newView: ViewState) => void
  goBack: () => boolean // ← Changed to return boolean
  init: () => Promise<void>
  addRecentCommand: (commandId: string) => Promise<void>
  cleanup?: () => void
}
/**
 * Creates a production-grade store with memory leak prevention
 */
export function createStore(initialState: CommandState): CommandStore {
  let state = initialState

  // Use Map instead of Set for better metadata tracking
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
        staleSubscribers.push(id)
      }
    })

    // Cleanup any subscribers that threw errors
    staleSubscribers.forEach(id => {
      subscribers.delete(id)
      console.warn(`Removing stale subscriber ${id} due to error`)
    })
  }

  /**
   * Get current state snapshot
   * This is called by React during renders
   */
  function getState(): CommandState {
    return state
  }

  /**
   * Update state and notify subscribers
   */
  function setState(partial: Partial<CommandState>): void {
    const oldState = state
    state = { ...state, ...partial }

    // Only notify if state actually changed
    if (oldState !== state) {
      notifySubscribers()

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 State updated:', partial)
      }
    }
  }

  /**
   * Navigate to a new view, preserving history
   */
  function navigate(newView: ViewState): void {
    const currentView = state.view

    setState({
      view: newView,
      history: [...state.history, currentView],
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`🧭 Navigated to: ${newView.type}`)
    }
  }

  /**
   * Go back to the previous view
   * Returns true if successful, false otherwise
   */
  function goBack(): boolean {
    const history = state.history

    // Guard: Check if history is empty
    if (history.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ No history to go back to')
      }
      return false
    }

    // Get the previous view with explicit type check
    const previousView: ViewState | undefined = history[history.length - 1]

    // Guard: Ensure previousView exists
    if (!previousView) {
      console.error(
        '❌ Previous view is undefined despite history length check'
      )
      return false
    }

    // Update state (TypeScript knows previousView is ViewState now)
    setState({
      view: previousView,
      history: history.slice(0, -1),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`⬅️ Went back to: ${previousView.type}`)
    }

    return true
  }

  /**
   * Initialize store by loading persisted data
   */
  async function init(): Promise<void> {
    try {
      const recentCommands = await loadRecentCommands()
      setState({ recentCommands })

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🚀 Store initialized with ${recentCommands.length} recent commands`
        )
      }
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

    // Update state
    setState({ recentCommands: updated })

    // Persist to storage
    await saveRecentCommands(updated)

    if (process.env.NODE_ENV === 'development') {
      console.log(`⭐ Added to recent: ${commandId}`)
    }
  }

  /**
   * Development only: Force cleanup of all subscribers
   * Useful for testing and debugging
   */
  function cleanup(): void {
    if (process.env.NODE_ENV === 'development') {
      const count = subscribers.size
      subscribers.clear()
      console.warn(`🧹 Command Store: Cleaned up ${count} subscribers`)
    }
  }

  // Return store with explicit type
  const store: CommandStore = {
    subscribe,
    getState,
    setState,
    navigate,
    goBack,
    init,
    addRecentCommand,
    ...(process.env.NODE_ENV === 'development' ? { cleanup } : {}),
  }

  return store
}

// Export the type for use in other files
export type { CommandStore }
