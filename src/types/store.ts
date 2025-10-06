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
 * Load recent commands from chrome.storage.local
 */
async function loadRecentCommands(): Promise<string[]> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || []
  } catch (error) {
    console.error('Failed to load recent commands from storage', error)
    return []
  }
}

/**
 * Save recent commands to chrome.storage.local
 */
async function saveRecentCommands(commands: string[]): Promise<void> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: commands })
  } catch (error) {
    console.error('Failed to save recent commands to storage', error)
  }
}

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

    navigate: (newView: ViewState) => {
      const currentView = state.view
      setState({
        view: newView,
        history: [...state.history, currentView],
      })
    },

    goBack: () => {
      const history = state.history
      if (history.length > 0) {
        const previousView = history[history.length - 1]!
        setState({
          view: previousView,
          history: history.slice(0, -1),
        })
      }
    },

    addRecentCommand: (commandId: string) => {
      const recent = state.recentCommands.filter(id => id !== commandId)
      const newRecent = [commandId, ...recent].slice(0, 10)

      setState({
        recentCommands: newRecent,
      })

      saveRecentCommands(newRecent)
    },

    // ✅ NEW: Initialize from storage
    init: async () => {
      const recentCommands = await loadRecentCommands()
      setState({ recentCommands })
    },
  }
}

export type CommandStore = ReturnType<typeof createStore>
