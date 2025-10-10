import { useEffect, useCallback, useRef } from 'react'
import type { CommandEvents, CommandEventListener } from '../types'

/**
User clicks item
→ Component calls selectItem()
→ Store updates state
→ Store emits 'item:select' event
→ All listeners receive event
→ Listeners execute their callbacks
 */

/**
 * Get access to the store's event system
 * We need this because the store is global and events are on the store instance
 */
function getStoreEventSystem() {
  // Import here to avoid circular dependencies
  const { getGlobalStore } = require('./use-command-store')
  const store = getGlobalStore()
  return {
    on: store.on.bind(store),
    emit: store.emit.bind(store),
  }
}

/**
 * useCommandEvent - Subscribe to a command store event
 *
 * Provides a clean way to listen to store events with automatic cleanup.
 * The event listener is automatically unsubscribed when component unmounts.
 *
 * Usage:
 * ```
 * useCommandEvent('item:select', (data) => {
 *   console.log('Item selected:', data.item)
 * })
 * ```
 *
 * @param event - Event name to listen to
 * @param listener - Event listener function
 */
export function useCommandEvent<T extends keyof CommandEvents>(
  event: T,
  listener: CommandEventListener<T>
): void {
  // Use ref to keep the latest listener without re-subscribing
  // This prevents listener from being called multiple times
  const listenerRef = useRef(listener)

  // Update ref when listener changes
  useEffect(() => {
    listenerRef.current = listener
  }, [listener])

  useEffect(() => {
    const { on } = getStoreEventSystem()

    // Wrapper that calls the ref's current value
    // This ensures we always call the latest listener
    const wrappedListener = (data: CommandEvents[T]) => {
      listenerRef.current(data)
    }

    // Subscribe to event
    const unsubscribe = on(event, wrappedListener)

    // Cleanup: unsubscribe when component unmounts
    return unsubscribe
  }, [event]) // Only re-subscribe if event name changes
}

/**
 * useCommandItemSelect - Listen to item selection events
 *
 * Convenience hook for the most common event.
 * Commonly used for:
 * - Analytics tracking
 * - Closing the command palette
 * - Executing the item's action
 *
 * Usage:
 * ```
 * useCommandItemSelect((item) => {
 *   console.log('Selected:', item.value)
 *   // Close palette, execute action, etc.
 * })
 * ```
 */
export function useCommandItemSelect(
  onSelect: (item: CommandEvents['item:select']['item']) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['item:select']) => {
      onSelect(data.item)
    },
    [onSelect]
  )

  useCommandEvent('item:select', callback)
}

/**
 * useCommandSearchChange - Listen to search query changes
 *
 * Useful for:
 * - Updating URL params
 * - Analytics/metrics
 * - Syncing with external state
 *
 * Usage:
 * ```
 * useCommandSearchChange((query, results) => {
 *   console.log(`Searching for "${query}" - ${results.length} results`)
 * })
 * ```
 */
export function useCommandSearchChange(
  onChange: (
    query: string,
    results: CommandEvents['search:change']['results']
  ) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['search:change']) => {
      onChange(data.query, data.results)
    },
    [onChange]
  )

  useCommandEvent('search:change', callback)
}

/**
 * useCommandItemAdd - Listen to item addition events
 *
 * Useful for:
 * - Tracking when items are registered
 * - Debugging
 * - Analytics
 *
 * Usage:
 * ```
 * useCommandItemAdd((item, groupId) => {
 *   console.log('Item added:', item.value, 'to group:', groupId)
 * })
 * ```
 */
export function useCommandItemAdd(
  onAdd: (
    item: CommandEvents['item:add']['item'],
    groupId?: CommandEvents['item:add']['groupId']
  ) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['item:add']) => {
      onAdd(data.item, data.groupId)
    },
    [onAdd]
  )

  useCommandEvent('item:add', callback)
}

/**
 * useCommandItemRemove - Listen to item removal events
 *
 * Useful for:
 * - Cleanup operations
 * - Tracking item lifecycle
 * - Debugging
 */
export function useCommandItemRemove(
  onRemove: (id: CommandEvents['item:remove']['id']) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['item:remove']) => {
      onRemove(data.id)
    },
    [onRemove]
  )

  useCommandEvent('item:remove', callback)
}

/**
 * useCommandGroupAdd - Listen to group addition events
 */
export function useCommandGroupAdd(
  onAdd: (group: CommandEvents['group:add']['group']) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['group:add']) => {
      onAdd(data.group)
    },
    [onAdd]
  )

  useCommandEvent('group:add', callback)
}

/**
 * useCommandGroupRemove - Listen to group removal events
 */
export function useCommandGroupRemove(
  onRemove: (id: CommandEvents['group:remove']['id']) => void
): void {
  const callback = useCallback(
    (data: CommandEvents['group:remove']) => {
      onRemove(data.id)
    },
    [onRemove]
  )

  useCommandEvent('group:remove', callback)
}

/**
 * useCommandEventEmitter - Get direct access to event system
 *
 * Advanced usage - for when you need to emit custom events
 * or need more control over event handling.
 *
 * Usage:
 * ```
 * const { on, emit } = useCommandEventEmitter()
 *
 * // Listen to event
 * useEffect(() => {
 *   return on('item:select', (data) => console.log(data))
 * }, [on])
 *
 * // Emit event
 * emit('item:select', { item: myItem })
 * ```
 */
export function useCommandEventEmitter() {
  return getStoreEventSystem()
}
