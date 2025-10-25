// src/hooks/use-command-items.ts

import { useCallback, useMemo } from 'react'
import { useCommandStore } from './use-command-store'
import type { CommandItem, CommandGroup } from '../types'

/**
 * useCommandItems - Core utility hook for managing command items
 *
 * Used by components to register, check, and access items.
 */
export function useCommandItems() {
  const { addItem, removeItem, state } = useCommandStore()

  const registerItem = useCallback(
    (item: CommandItem, groupId?: string) => {
      addItem(item, groupId)
      return () => removeItem(item.id)
    },
    [addItem, removeItem]
  )

  const hasItem = useCallback(
    (id: string): boolean => state.items.has(id),
    [state.items]
  )

  const getItem = useCallback(
    (id: string): CommandItem | undefined => state.items.get(id),
    [state.items]
  )

  const allItems = useMemo(
    () => Array.from(state.items.values()),
    [state.items]
  )

  return {
    registerItem,
    hasItem,
    getItem,
    allItems,
    addItem,
    removeItem,
  }
}

/**
 * useCommandGroups - Core utility hook for managing command groups
 */
export function useCommandGroups() {
  const { addGroup, removeGroup, state } = useCommandStore()

  const registerGroup = useCallback(
    (group: CommandGroup) => {
      addGroup(group)
      return () => removeGroup(group.id)
    },
    [addGroup, removeGroup]
  )

  const hasGroup = useCallback(
    (id: string): boolean => state.groups.has(id),
    [state.groups]
  )

  const getGroup = useCallback(
    (id: string): CommandGroup | undefined => state.groups.get(id),
    [state.groups]
  )

  const allGroups = useMemo(
    () => Array.from(state.groups.values()),
    [state.groups]
  )

  return {
    registerGroup,
    hasGroup,
    getGroup,
    allGroups,
    addGroup,
    removeGroup,
  }
}
