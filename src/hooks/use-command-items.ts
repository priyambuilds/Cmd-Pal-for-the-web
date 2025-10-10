// src/hooks/use-command-items.ts

import { useCallback, useMemo, useEffect } from 'react'
import { useCommandStore } from './use-command-store'
import type { CommandItem, CommandGroup } from '../types'

/**
 * useCommandItems - Hook for managing command items
 *
 * Provides utilities for:
 * - Registering items with the store
 * - Checking if items exist
 * - Getting items by ID
 * - Accessing all items
 *
 * Commonly used by CommandItem components to register themselves.
 */
export function useCommandItems() {
  const { addItem, removeItem, state } = useCommandStore()

  /**
   * Register an item with the store
   * Returns a cleanup function that removes the item
   *
   * Usage in a component:
   * ```
   * useEffect(() => {
   *   return registerItem({ id: 'item1', value: 'My Item' })
   * }, [])
   * ```
   */
  const registerItem = useCallback(
    (item: CommandItem, groupId?: string) => {
      addItem(item, groupId)

      // Return cleanup function
      return () => {
        removeItem(item.id)
      }
    },
    [addItem, removeItem]
  )

  /**
   * Check if an item exists in the store
   */
  const hasItem = useCallback(
    (id: string): boolean => {
      return state.items.has(id)
    },
    [state.items]
  )

  /**
   * Get an item by ID
   */
  const getItem = useCallback(
    (id: string): CommandItem | undefined => {
      return state.items.get(id)
    },
    [state.items]
  )

  /**
   * Get all items as an array
   * Useful for debugging or custom rendering
   */
  const allItems = useMemo(() => {
    return Array.from(state.items.values())
  }, [state.items])

  return {
    registerItem,
    hasItem,
    getItem,
    allItems,
    addItem, // Direct access to store methods
    removeItem, // Direct access to store methods
  }
}

/**
 * useCommandGroups - Hook for managing command groups
 *
 * Similar to useCommandItems but for groups.
 * Groups are collections of related items with optional headings.
 */
export function useCommandGroups() {
  const { addGroup, removeGroup, state } = useCommandStore()

  /**
   * Register a group with the store
   * Returns cleanup function
   */
  const registerGroup = useCallback(
    (group: CommandGroup) => {
      addGroup(group)

      // Return cleanup function
      return () => {
        removeGroup(group.id)
      }
    },
    [addGroup, removeGroup]
  )

  /**
   * Check if a group exists
   */
  const hasGroup = useCallback(
    (id: string): boolean => {
      return state.groups.has(id)
    },
    [state.groups]
  )

  /**
   * Get a group by ID
   */
  const getGroup = useCallback(
    (id: string): CommandGroup | undefined => {
      return state.groups.get(id)
    },
    [state.groups]
  )

  /**
   * Get all groups as an array
   */
  const allGroups = useMemo(() => {
    return Array.from(state.groups.values())
  }, [state.groups])

  return {
    registerGroup,
    hasGroup,
    getGroup,
    allGroups,
    addGroup, // Direct access
    removeGroup, // Direct access
  }
}

/**
 * useCommandItem - Hook for individual item components
 *
 * This is a convenience hook that handles the complete lifecycle
 * of a command item component.
 *
 * Usage:
 * ```
 * function MyCommandItem({ value, keywords }: Props) {
 *   const { isSelected, select } = useCommandItem({
 *     id: value,
 *     value,
 *     keywords,
 *   })
 *
 *   return (
 *     <div onClick={select} data-selected={isSelected}>
 *       {value}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCommandItem(item: CommandItem, groupId?: string) {
  const { registerItem } = useCommandItems()
  const { state, selectItem } = useCommandStore()

  // Auto-register on mount, auto-cleanup on unmount
  useEffect(() => {
    return registerItem(item, groupId)
  }, [registerItem, item, groupId])

  // Check if this item is currently selected
  const isSelected = state.search.selectedId === item.id

  // Check if this item is in current search results
  const isVisible = useMemo(() => {
    return state.search.results.some(result => result.id === item.id)
  }, [state.search.results, item.id])

  // Callback to select this item
  const select = useCallback(() => {
    if (!item.disabled) {
      selectItem(item.id)
    }
  }, [selectItem, item.id, item.disabled])

  return {
    isSelected,
    isVisible,
    select,
  }
}

/**
 * useCommandGroup - Hook for group components
 *
 * Similar to useCommandItem but for groups.
 * Handles auto-registration and provides useful utilities.
 */
export function useCommandGroup(group: CommandGroup) {
  const { registerGroup } = useCommandGroups()
  const { state } = useCommandStore()

  // Auto-register on mount
  useEffect(() => {
    return registerGroup(group)
  }, [registerGroup, group])

  // Check if group has any visible items
  const hasVisibleItems = useMemo(() => {
    return group.items.some(item =>
      state.search.results.some(result => result.id === item.id)
    )
  }, [group.items, state.search.results])

  return {
    hasVisibleItems,
  }
}
