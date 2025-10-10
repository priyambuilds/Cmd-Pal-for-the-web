import { useEffect, useCallback } from 'react'
import {
  useCommandStore,
  useCommandConfig,
  useCommandSelection,
} from './use-command-store'
import type { UseKeyboardNavigation } from '../types'

/**
 * useKeyboardNavigation - Handle all keyboard interactions
 *
 * This hook makes the command palette keyboard-first by handling:
 * - Arrow key navigation (↑/↓)
 * - Enter to select current item
 * - Escape to close (handled by parent)
 * - Home/End for first/last item
 * - Vim-style navigation (Ctrl+J/K) for power users
 *
 * Usage:
 * ```
 * const { handleKeyDown, selectedIndex } = useKeyboardNavigation()
 *
 * useEffect(() => {
 *   document.addEventListener('keydown', handleKeyDown)
 *   return () => document.removeEventListener('keydown', handleKeyDown)
 * }, [handleKeyDown])
 * ```
 */
export function useKeyboardNavigation(): UseKeyboardNavigation {
  const { state, navigateSelection, selectItem } = useCommandStore()
  const config = useCommandConfig()
  const selectedItem = useCommandSelection()

  // Calculate the index of currently selected item
  // Returns -1 if nothing is selected
  // useMemo prevents recalculation on every render
  const selectedIndex = useMemo(() => {
    if (!state.search.selectedId) return -1
    return state.search.results.findIndex(
      item => item.id === state.search.selectedId
    )
  }, [state.search.selectedId, state.search.results])

  /**
   * Select the currently highlighted item
   * This is called when user presses Enter
   */
  const selectCurrent = useCallback(() => {
    if (!selectedItem) return
    if (selectedItem.disabled) return

    // Emit selection event (components listen to this)
    selectItem(selectedItem.id)
  }, [selectedItem, selectItem])

  /**
   * Move selection up (previous item)
   * Skips disabled items
   */
  const selectPrevious = useCallback(() => {
    navigateSelection('up')
  }, [navigateSelection])

  /**
   * Move selection down (next item)
   * Skips disabled items
   */
  const selectNext = useCallback(() => {
    navigateSelection('down')
  }, [navigateSelection])

  /**
   * Main keyboard event handler
   * This is where all the magic happens!
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if keyboard navigation is enabled
      if (!config.keyboard) return

      // Get the key that was pressed
      const key = event.key

      // Define which keys we handle
      const isNavigationKey =
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'Home' ||
        key === 'End' ||
        key === 'Enter' ||
        (key === 'j' && event.ctrlKey) || // Vim: Ctrl+J = down
        (key === 'k' && event.ctrlKey) // Vim: Ctrl+K = up

      // Only handle our keys (let other keys work normally)
      if (!isNavigationKey) return

      // Prevent default browser behavior
      // (e.g., arrow keys scrolling the page)
      event.preventDefault()

      // Handle each key
      switch (key) {
        case 'ArrowUp':
          selectPrevious()
          break

        case 'ArrowDown':
          selectNext()
          break

        case 'Home':
          navigateSelection('first')
          break

        case 'End':
          navigateSelection('last')
          break

        case 'Enter':
          selectCurrent()
          break

        case 'j':
          if (event.ctrlKey) selectNext() // Vim-style
          break

        case 'k':
          if (event.ctrlKey) selectPrevious() // Vim-style
          break
      }
    },
    [
      config.keyboard,
      selectPrevious,
      selectNext,
      selectCurrent,
      navigateSelection,
    ]
  )

  return {
    selectedIndex,
    selectPrevious,
    selectNext,
    selectCurrent,
    handleKeyDown,
  }
}

/**
 * useKeyboardShortcut - Register a global keyboard shortcut
 *
 * This is a utility hook for registering custom keyboard shortcuts.
 * Useful for things like opening the command palette with Ctrl+K.
 *
 * Usage:
 * ```
 * useKeyboardShortcut('k', { ctrl: true }, () => {
 *   setOpen(true)
 * })
 * ```
 *
 * @param key - The key to listen for (e.g., 'k', 'Enter', 'Escape')
 * @param modifiers - Optional modifiers (ctrl, alt, shift, meta)
 * @param callback - Function to call when shortcut is pressed
 */
export function useKeyboardShortcut(
  key: string,
  modifiers: {
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
  },
  callback: () => void
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase()

      // Check if all required modifiers are pressed
      const modifiersMatch =
        (modifiers.ctrl === undefined || event.ctrlKey === modifiers.ctrl) &&
        (modifiers.alt === undefined || event.altKey === modifiers.alt) &&
        (modifiers.shift === undefined || event.shiftKey === modifiers.shift) &&
        (modifiers.meta === undefined || event.metaKey === modifiers.meta)

      if (keyMatches && modifiersMatch) {
        event.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [key, modifiers, callback])
}

/**
 * useCommandPaletteShortcut - Pre-configured hook for opening command palette
 *
 * By default uses Ctrl+K (or Cmd+K on Mac), the standard for command palettes.
 *
 * Usage:
 * ```
 * useCommandPaletteShortcut(() => {
 *   setOpen(true)
 * })
 * ```
 */
export function useCommandPaletteShortcut(onOpen: () => void): void {
  useKeyboardShortcut(
    'k',
    {
      // Use Ctrl on Windows/Linux, Cmd on Mac
      [isMac() ? 'meta' : 'ctrl']: true,
    },
    onOpen
  )
}

/**
 * Helper to detect if user is on Mac
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
}
