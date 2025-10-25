// src/lib/store/command-store.ts

import { commandScore } from '../scoring/command-score'
import { getScheduler } from '../scheduler/dom-scheduler'
import type {
  CommandStore,
  CommandItem,
  CommandGroup,
  CommandConfig,
  CommandEvents,
  CommandEventListener,
} from '../../types'

/**
 * Default configuration values
 * These are sensible defaults that work for most use cases
 */
const DEFAULT_CONFIG: CommandConfig = {
  filter: true, // Enable filtering by default
  filterFn: undefined, // Use built-in scoring algorithm
  debounceMs: 150, // Wait 150ms after typing before searching
  maxResults: 50, // Show max 50 results to keep UI fast
  keyboard: true, // Enable keyboard navigation
  loop: true, // Loop from bottom to top and vice versa
  caseSensitive: false, // Case-insensitive by default
}

// =============================================================================
// EVENT EMITTER - Allows components to listen to store events
// =============================================================================

/**
 * Simple event emitter for pub/sub pattern
 *
 * Why do we need this?
 * - Components can react to store changes without tight coupling
 * - Multiple components can listen to the same event
 * - Easy to add/remove listeners
 */
class CommandEventEmitter {
  // Map of event names to sets of listener functions
  private listeners = new Map<
    keyof CommandEvents,
    Set<CommandEventListener<any>>
  >()

  /**
   * Emit an event to all listeners
   */
  emit<T extends keyof CommandEvents>(event: T, data: CommandEvents[T]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Subscribe to an event
   * Returns an unsubscribe function for cleanup
   */
  on<T extends keyof CommandEvents>(
    event: T,
    listener: CommandEventListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear()
  }
}

// =============================================================================
// MAIN COMMAND STORE CLASS
// =============================================================================

/**
 * ModernCommandStore - The heart of the command palette
 *
 * This class manages all state and provides methods to interact with it.
 * It's designed to work with React's useSyncExternalStore hook.
 *
 * Key responsibilities:
 * 1. Store all items and groups
 * 2. Handle search queries and filtering
 * 3. Manage selection state
 * 4. Notify subscribers of changes
 * 5. Emit events for component communication
 */
export class ModernCommandStore {
  // The current state (private - access via getSnapshot)
  private state: CommandStore

  // Set of subscriber callbacks (React components)
  private listeners = new Set<() => void>()

  // Event emitter for pub/sub
  private eventEmitter = new CommandEventEmitter()

  // Debounce timer for search
  private searchTimeout: NodeJS.Timeout | null = null

  // Scheduler for batching DOM operations
  private scheduler = getScheduler()

  /**
   * Create a new command store
   */
  constructor(initialConfig?: Partial<CommandConfig>) {
    // Initialize state with defaults
    this.state = {
      search: {
        query: '',
        results: [],
        selectedId: undefined,
        loading: false,
        empty: false,
        navigation: {
          currentGroup: null,
          groupPath: [],
          isGroupView: false,
        },
      },
      groups: new Map(),
      items: new Map(),
      open: false,
      config: { ...DEFAULT_CONFIG, ...initialConfig },
    }
  }

  // ===========================================================================
  // REACT INTEGRATION - These methods work with useSyncExternalStore
  // ===========================================================================

  /**
   * Get current state snapshot
   * React calls this to get the current state
   */
  getSnapshot = (): CommandStore => {
    return this.state
  }

  /**
   * Subscribe to state changes
   * React calls this to listen for updates
   *
   * @returns Unsubscribe function
   */
  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all subscribers that state changed
   * This triggers React components to re-render
   */
  private notify(): void {
    this.listeners.forEach(callback => callback())
  }

  /**
   * Update state immutably
   * Always creates a new state object to ensure React detects the change
   */
  private setState(updater: (prev: CommandStore) => CommandStore): void {
    this.state = updater(this.state)
    this.notify()
  }

  // ===========================================================================
  // PUBLIC API - Methods components can call
  // ===========================================================================

  /**
   * Update search query with debouncing
   *
   * Why debouncing?
   * If user types "github", we don't want to search 6 times.
   * We wait until they stop typing for 150ms.
   */
  setQuery = (query: string): void => {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    // Cancel any pending async loading
    if (this.asyncAbortController) {
      this.asyncAbortController.abort()
    }

    // Update query immediately for responsive input
    this.setState(prev => ({
      ...prev,
      search: {
        ...prev.search,
        query,
        loading: true, // Show loading indicator
      },
    }))

    // Set up async loading if configured
    if (this.state.config.asyncLoader) {
      this.setupAsyncLoading(query)
    }

    // Always perform local search (static items)
    this.performSearch(query)
  }

  /**
   * Async loading state
   */
  private asyncTimeout: NodeJS.Timeout | null = null
  private asyncAbortController: AbortController | null = null

  /**
   * Set up async data loading with separate debouncing
   */
  private setupAsyncLoading = (query: string): void => {
    if (this.asyncTimeout) {
      clearTimeout(this.asyncTimeout)
    }

    // Use separate debounce time for async loading (longer to avoid spam)
    const debounceMs = this.state.config.loaderDebounceMs || 300

    this.asyncTimeout = setTimeout(() => {
      this.performAsyncSearch(query)
    }, debounceMs)
  }

  /**
   * Perform async search and merge with results
   */
  private async performAsyncSearch(query: string): Promise<void> {
    const loader = this.state.config.asyncLoader
    if (!loader) return

    // Create abort controller for this request
    this.asyncAbortController = new AbortController()

    try {
      // Call async loader
      const asyncItems = await loader(query)

      // Only update if this request wasn't aborted and query still matches
      if (
        !this.asyncAbortController.signal.aborted &&
        this.state.search.query === query
      ) {
        // Merge async items with existing static items
        this.setState(prev => {
          const allItems = new Map(prev.items)
          const asyncItemMap = new Map<string, CommandItem>()

          // Add async items (may overwrite static items if same ID)
          asyncItems.forEach(item => {
            allItems.set(item.id, item)
            asyncItemMap.set(item.id, item)
          })

          // Re-run search to include async items
          const refreshedResults = this.computeSearchResults(
            query,
            Array.from(allItems.values())
          )

          return {
            ...prev,
            items: allItems,
            search: {
              ...prev.search,
              results: refreshedResults,
              loading: false,
              empty: refreshedResults.length === 0 && query.trim() !== '',
            },
          }
        })

        // Schedule DOM sorting for async items
        this.scheduler.schedule(() => this.sort())
      }
    } catch (error) {
      if (!this.asyncAbortController.signal.aborted) {
        console.error('[CMDK] Async loader error:', error)
        // Could emit error event here
      }
    } finally {
      if (!this.asyncAbortController.signal.aborted) {
        this.asyncAbortController = null
      }
    }
  }

  /**
   * Extract search logic into reusable function
   */
  private computeSearchResults = (
    query: string,
    items: CommandItem[]
  ): CommandItem[] => {
    const { filter, filterFn, maxResults, caseSensitive } = this.state.config

    if (!filter) {
      return items
    }

    if (query.trim() === '') {
      return items
    }

    let results: CommandItem[]

    if (filterFn) {
      results = items.filter(item => filterFn(item, query))
    } else {
      // Use score cache for performance
      results = items
        .map(item => {
          const cacheKey = `${item.id}:${query}`
          let score = this.scoreCache.get(cacheKey)

          if (score === undefined) {
            score = this.calculateItemScore(item, query, caseSensitive || false)
            this.scoreCache.set(cacheKey, score)
          }

          return { ...item, score }
        })
        .filter(item => (item.score || 0) > 0)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    if (maxResults && results.length > maxResults) {
      results = results.slice(0, maxResults)
    }

    return results
  }

  /**
   * performSearch with memoization
   *
   * Now caches scores to avoid recalculating for same items
   * Cache is cleaned up periodically to prevent memory leaks
   */
  private scoreCache = new Map<string, number>()
  private cacheCleanupCounter = 0

  private performSearch = (query: string): void => {
    const { filter, filterFn, maxResults, caseSensitive } = this.state.config
    const { currentGroup } = this.state.search.navigation

    let results: CommandItem[] = []

    // Get base items - either all items or filtered by current group
    let baseItems: CommandItem[]
    if (currentGroup) {
      // In group view: only show items from the current group
      const group = this.state.groups.get(currentGroup)
      if (group) {
        baseItems = group.items
      } else {
        baseItems = []
      }
    } else {
      // Root view: show all items
      baseItems = Array.from(this.state.items.values())
    }

    if (!filter) {
      results = baseItems
    } else if (query.trim() === '') {
      results = baseItems
      // Periodic cleanup of cache
      this.cacheCleanupCounter++
      if (this.cacheCleanupCounter > 10) {
        this.scoreCache.clear()
        this.cacheCleanupCounter = 0
      }
    } else {
      if (filterFn) {
        results = baseItems.filter(item => filterFn(item, query))
      } else {
        // Use score cache for performance
        results = baseItems
          .map(item => {
            const cacheKey = `${item.id}:${query}`
            let score = this.scoreCache.get(cacheKey)

            if (score === undefined) {
              score = this.calculateItemScore(
                item,
                query,
                caseSensitive || false
              )
              this.scoreCache.set(cacheKey, score)
            }

            return { ...item, score }
          })
          .filter(item => (item.score || 0) > 0)
          .sort((a, b) => (b.score || 0) - (a.score || 0))
      }

      if (maxResults && results.length > maxResults) {
        results = results.slice(0, maxResults)
      }
    }

    // Update state with results
    this.setState(prev => {
      const selectedStillVisible = results.find(
        item => item.id === prev.search.selectedId
      )

      return {
        ...prev,
        search: {
          ...prev.search,
          results,
          loading: false,
          empty: results.length === 0 && query.trim() !== '',
          selectedId: selectedStillVisible?.id || results[0]?.id,
        },
      }
    })

    this.eventEmitter.emit('search:change', { query, results })
  }

  /**
   * Navigate into a group (shows only items in that group)
   */
  navigateIntoGroup = (groupId: string): void => {
    const group = this.state.groups.get(groupId)
    if (!group) return

    this.setState(prev => {
      const groupPath = [...prev.search.navigation.groupPath, groupId]

      return {
        ...prev,
        search: {
          ...prev.search,
          navigation: {
            currentGroup: groupId,
            groupPath,
            isGroupView: true,
          },
          query: '', // Clear query when entering group
          selectedId: undefined,
          results: [],
          loading: false,
          empty: false,
        },
      }
    })

    // Update results to show only group items
    this.performSearch('')
  }

  /**
   * Navigate back from group view
   */
  navigateBack = (): void => {
    this.setState(prev => {
      const newPath = [...prev.search.navigation.groupPath]
      newPath.pop() // Remove current group

      const newGroup =
        newPath.length > 0 ? (newPath[newPath.length - 1] as string) : null

      return {
        ...prev,
        search: {
          ...prev.search,
          navigation: {
            currentGroup: newGroup,
            groupPath: newPath,
            isGroupView: newPath.length > 0,
          },
          query: '', // Clear query when leaving group
          selectedId: undefined,
        },
      }
    })

    // Update results to show items for new context
    this.performSearch('')
  }

  /**
   * Check if we can navigate back
   */
  canNavigateBack = (): boolean => {
    return this.state.search.navigation.groupPath.length > 0
  }

  /**
   * Get current group info
   */
  getCurrentGroup = (): CommandGroup | null => {
    const { currentGroup } = this.state.search.navigation
    return currentGroup ? this.state.groups.get(currentGroup) || null : null
  }

  /**
   * Calculate search score for an item
   * Checks both value and keywords
   */
  private calculateItemScore(
    item: CommandItem,
    query: string,
    caseSensitive: boolean
  ): number {
    const searchText = caseSensitive ? item.value : item.value.toLowerCase()
    const searchQuery = caseSensitive ? query : query.toLowerCase()

    // Score the main value
    let score = commandScore(searchText, searchQuery)

    // Also check keywords
    if (item.keywords && item.keywords.length > 0) {
      const keywordScores = item.keywords.map(keyword => {
        const keywordText = caseSensitive ? keyword : keyword.toLowerCase()
        return commandScore(keywordText, searchQuery)
      })
      // Take best keyword score with slight penalty
      const bestKeywordScore = Math.max(...keywordScores)
      score = Math.max(score, bestKeywordScore * 0.9)
    }

    return score
  }

  /**
   * selectItem with HIGH priority scheduling
   * Select an item by ID
   * Won't select if item is disabled
   */
  selectItem = (id: string): void => {
    const item = this.state.items.get(id)
    if (!item || item.disabled) return

    // Select item immediately
    this.setState(prev => ({
      ...prev,
      search: {
        ...prev.search,
        selectedId: id,
      },
    }))

    this.eventEmitter.emit('item:select', { item })
  }

  /**
   * addItem with batch support
   * Add a new item to the store
   * Optionally add it to a specific group
   */
  addItem = (item: CommandItem, groupId?: string): void => {
    this.setState(prev => {
      const newItems = new Map(prev.items)
      newItems.set(item.id, item)

      const newGroups = new Map(prev.groups)
      if (groupId && newGroups.has(groupId)) {
        const group = newGroups.get(groupId)!
        const updatedGroup = {
          ...group,
          items: [...group.items, item],
        }
        newGroups.set(groupId, updatedGroup)
      }

      return {
        ...prev,
        items: newItems,
        groups: newGroups,
      }
    })

    // Perform re-search to include new item
    this.performSearch(this.state.search.query)

    // Schedule DOM sorting
    this.scheduler.schedule(() => this.sort())

    this.eventEmitter.emit('item:add', { item, groupId })
  }

  /**
   * Remove an item from the store
   */
  removeItem = (id: string): void => {
    this.setState(prev => {
      const newItems = new Map(prev.items)
      newItems.delete(id)

      // Remove from all groups
      const newGroups = new Map(prev.groups)
      newGroups.forEach((group, groupId) => {
        const filteredItems = group.items.filter(item => item.id !== id)
        if (filteredItems.length !== group.items.length) {
          newGroups.set(groupId, { ...group, items: filteredItems })
        }
      })

      return {
        ...prev,
        items: newItems,
        groups: newGroups,
      }
    })

    this.scheduler.schedule(() => this.performSearch(this.state.search.query))

    this.eventEmitter.emit('item:remove', { id })
  }

  /**
   * Add a new group with its items
   */
  addGroup = (group: CommandGroup): void => {
    this.setState(prev => {
      const newGroups = new Map(prev.groups)
      const newItems = new Map(prev.items)

      // Add group
      newGroups.set(group.id, group)

      // Add all group items
      group.items.forEach(item => {
        newItems.set(item.id, item)
      })

      return {
        ...prev,
        groups: newGroups,
        items: newItems,
      }
    })

    this.scheduler.schedule(() => this.performSearch(this.state.search.query))

    this.eventEmitter.emit('group:add', { group })
  }

  /**
   * Remove a group and all its items
   */
  removeGroup = (id: string): void => {
    this.setState(prev => {
      const group = prev.groups.get(id)
      if (!group) return prev

      const newGroups = new Map(prev.groups)
      const newItems = new Map(prev.items)

      // Remove group
      newGroups.delete(id)

      // Remove all group items
      group.items.forEach(item => {
        newItems.delete(item.id)
      })

      return {
        ...prev,
        groups: newGroups,
        items: newItems,
      }
    })

    this.scheduler.schedule(() => this.performSearch(this.state.search.query))

    this.eventEmitter.emit('group:remove', { id })
  }

  /**
   * Set open/closed state
   */
  setOpen = (open: boolean): void => {
    this.setState(prev => ({
      ...prev,
      open,
    }))
  }

  /**
   * Clear all items and groups
   */
  clear = (): void => {
    this.scoreCache.clear()
    this.setState(prev => ({
      ...prev,
      items: new Map(),
      groups: new Map(),
      search: {
        query: '',
        results: [],
        selectedId: undefined,
        loading: false,
        empty: false,
        navigation: {
          currentGroup: null,
          groupPath: [],
          isGroupView: false,
        },
      },
    }))
  }

  /**
   * Update configuration
   */
  updateConfig = (config: Partial<CommandConfig>): void => {
    this.setState(prev => ({
      ...prev,
      config: { ...prev.config, ...config },
    }))
  }

  /**
   * Get currently selected item
   */
  getSelectedItem = (): CommandItem | undefined => {
    const { selectedId } = this.state.search
    return selectedId ? this.state.items.get(selectedId) : undefined
  }

  /**
   * Navigate selection (for keyboard)
   *
   * @param direction - Which way to move selection
   */
  navigateSelection = (direction: 'up' | 'down' | 'first' | 'last'): void => {
    const { results, selectedId } = this.state.search
    if (results.length === 0) return

    // Find current index
    const currentIndex = selectedId
      ? results.findIndex(item => item.id === selectedId)
      : -1

    let newIndex = currentIndex

    // Calculate new index based on direction
    switch (direction) {
      case 'up':
        newIndex =
          currentIndex <= 0
            ? this.state.config.loop
              ? results.length - 1
              : 0
            : currentIndex - 1
        break
      case 'down':
        newIndex =
          currentIndex >= results.length - 1
            ? this.state.config.loop
              ? 0
              : results.length - 1
            : currentIndex + 1
        break
      case 'first':
        newIndex = 0
        break
      case 'last':
        newIndex = results.length - 1
        break
    }

    // Select the new item
    const newItem = results[newIndex]
    if (newItem && !newItem.disabled) {
      this.selectItem(newItem.id)
    }
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Subscribe to store events
   */
  on = this.eventEmitter.on.bind(this.eventEmitter)

  /**
   * Emit a store event
   */
  emit = this.eventEmitter.emit.bind(this.eventEmitter)

  /**
   * Sort DOM elements by score (signature feature of CMDK)
   * Physically reorders DOM elements based on search relevance
   */
  sort = (): void => {
    if (!this.state.search.query || !this.state.config.filter) {
      return // Don't sort if no search or filtering disabled
    }

    // Find the command list container in DOM
    const listElement = document.querySelector('[cmdk-list]')
    if (!listElement) return

    // Get all item elements that are currently rendered
    const itemElements = Array.from(
      listElement.querySelectorAll('[data-command-item]')
    )

    if (itemElements.length === 0) return

    // Sort elements by their position in results array (highest score first)
    const sortedElements = itemElements.sort((a, b) => {
      const aId = a.getAttribute('data-command-item') || ''
      const bId = b.getAttribute('data-command-item') || ''
      const aIndex = this.state.search.results.findIndex(
        item => item.id === aId
      )
      const bIndex = this.state.search.results.findIndex(
        item => item.id === bId
      )
      return aIndex - bIndex // Lower index = higher score
    })

    // Reorder DOM elements - place them in sorted order
    sortedElements.forEach(element => {
      listElement.appendChild(
        element.parentElement === listElement
          ? element
          : element.closest('[data-command-item]') || element
      )
    })
  }

  /**
   * Cleanup - call when store is no longer needed
   */
  destroy = (): void => {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
    // Tasks complete automatically
    this.scoreCache.clear() // Clear cache
    this.listeners.clear()
    this.eventEmitter.clear()
  }
}

/**
 * Factory function to create a new store instance
 */
export function createCommandStore(
  config?: Partial<CommandConfig>
): ModernCommandStore {
  return new ModernCommandStore(config)
}
