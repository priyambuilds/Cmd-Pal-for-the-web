// src/hooks/use-command-store.ts

import { useSyncExternalStore, useCallback, useMemo } from 'react'
import {
  ModernCommandStore,
  createCommandStore,
} from '../lib/store/command-store'
import type {
  UseCommandStore,
  CommandStore,
  CommandItem,
  CommandGroup,
  CommandConfig,
} from '../types'

/**
 * SINGLETON PATTERN
 *
 * We use a global store instance so that all components share the same state.
 * This is similar to how Redux or Zustand work.
 *
 * Why singleton?
 * - All CommandItem components register to the same store
 * - CommandInput updates affect all CommandList components
 * - Consistent state across the entire command palette
 */
let globalStore: ModernCommandStore | null = null

/**
 * Get or create the global store
 * Only creates once, then updates config on subsequent calls
 */
function getGlobalStore(config?: Partial<CommandConfig>): ModernCommandStore {
  if (!globalStore) {
    globalStore = createCommandStore(config)
  } else if (config) {
    // Update config if store exists but new config provided
    globalStore.updateConfig(config)
  }
  return globalStore
}

/**
 * Reset the global store (useful for testing or cleanup)
 * In production, you rarely need this
 */
export function resetCommandStore(): void {
  if (globalStore) {
    globalStore.destroy()
    globalStore = null
  }
}

// =============================================================================
// MAIN STORE HOOK
// =============================================================================

/**
 * useCommandStore - Main hook for accessing the command store
 *
 * This hook provides full access to the store state and all actions.
 * It uses React 19's useSyncExternalStore for optimal performance.
 *
 * Usage:
 * ```
 * const { state, setQuery, selectItem } = useCommandStore()
 * ```
 *
 * @param config - Optional configuration for the store
 * @returns Store state and action methods
 */
export function useCommandStore(
  config?: Partial<CommandConfig>
): UseCommandStore {
  // Get the store instance (creates on first call)
  // useMemo ensures we don't create multiple stores
  const store = useMemo(() => getGlobalStore(config), [])

  // Subscribe to store state using React's external store hook
  // This is the magic that connects our external store to React!
  const state = useSyncExternalStore(
    // subscribe: How to listen for changes
    store.subscribe,

    // getSnapshot: How to get current state
    store.getSnapshot,

    // getServerSnapshot: For SSR (Server-Side Rendering)
    // Returns the same state on server as client for hydration
    store.getSnapshot
  )

  // Memoize action methods to prevent unnecessary re-renders
  // If we don't memoize, every render creates new function references
  // This would cause child components to re-render even when nothing changed
  const actions = useMemo(
    () => ({
      setQuery: store.setQuery,
      selectItem: store.selectItem,
      addItem: store.addItem,
      removeItem: store.removeItem,
      addGroup: store.addGroup,
      removeGroup: store.removeGroup,
      clear: store.clear,
      setOpen: store.setOpen,
      updateConfig: store.updateConfig,
      getSelectedItem: store.getSelectedItem,
      navigateSelection: store.navigateSelection,
      navigateIntoGroup: store.navigateIntoGroup,
      navigateBack: store.navigateBack,
      canNavigateBack: store.canNavigateBack,
      getCurrentGroup: store.getCurrentGroup,
    }),
    [store]
  )

  return {
    state,
    ...actions,
  }
}

// =============================================================================
// SELECTOR HOOKS - For optimized re-renders
// =============================================================================

/**
 * useCommandSelector - Subscribe to a specific part of the store
 *
 * This is a performance optimization. Instead of re-rendering when ANY
 * part of the store changes, components only re-render when their specific
 * data changes.
 *
 * Example:
 * ```
 * // Only re-renders when results change, not when query changes
 * const results = useCommandSelector(state => state.search.results)
 * ```
 *
 * @param selector - Function to select specific state
 * @returns Selected state value
 */
export function useCommandSelector<T>(selector: (state: CommandStore) => T): T {
  const store = getGlobalStore()

  // Subscribe to the selector result
  // React will only re-render if the selected value changes
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot())
  )
}

/**
 * useCommandSearch - Get only search state
 *
 * Components that only need search data won't re-render when
 * groups or config change.
 */
export function useCommandSearch() {
  return useCommandSelector(state => state.search)
}

/**
 * useCommandResults - Get only search results
 *
 * Most commonly used by list components that display filtered items.
 * Won't re-render when query changes, only when results change.
 */
export function useCommandResults() {
  return useCommandSelector(state => state.search.results)
}

/**
 * useCommandSelection - Get currently selected item
 *
 * Used by components that need to highlight the selected item
 * or show selection details.
 */
export function useCommandSelection() {
  const selectedId = useCommandSelector(state => state.search.selectedId)
  const items = useCommandSelector(state => state.items)

  // Memoize the selected item lookup
  return useMemo(() => {
    return selectedId ? items.get(selectedId) : undefined
  }, [selectedId, items])
}

/**
 * useCommandConfig - Get store configuration
 *
 * Components that need to adapt behavior based on config
 * (like enabling/disabling keyboard navigation).
 */
export function useCommandConfig() {
  return useCommandSelector(state => state.config)
}

/**
 * useCommandOpen - Get and set open state
 *
 * Returns a tuple like useState: [value, setter]
 * Perfect for dialog/modal components.
 *
 * Usage:
 * ```
 * const [open, setOpen] = useCommandOpen()
 * ```
 */
export function useCommandOpen(): [boolean, (open: boolean) => void] {
  const store = getGlobalStore()
  const open = useCommandSelector(state => state.open)

  const setOpen = useCallback(
    (newOpen: boolean) => {
      store.setOpen(newOpen)
    },
    [store]
  )

  return [open, setOpen]
}

/**
 * useCommandQuery - Get and set search query
 *
 * Similar to useCommandOpen, returns [value, setter] tuple.
 *
 * Usage:
 * ```
 * const [query, setQuery] = useCommandQuery()
 * ```
 */
export function useCommandQuery(): [string, (query: string) => void] {
  const store = getGlobalStore()
  const query = useCommandSelector(state => state.search.query)

  const setQuery = useCallback(
    (newQuery: string) => {
      store.setQuery(newQuery)
    },
    [store]
  )

  return [query, setQuery]
}

/**
 * useCommandLoading - Get loading state
 *
 * Shows if search is in progress (useful for loading indicators).
 */
export function useCommandLoading() {
  return useCommandSelector(state => state.search.loading)
}

/**
 * useCommandEmpty - Get empty state
 *
 * True when search returned no results (useful for empty state UI).
 */
export function useCommandEmpty() {
  return useCommandSelector(state => state.search.empty)
}
