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
   * Helper to check if keyboard shortcut matches
   */
  const matchesShortcut = useCallback(
    (shortcut: string[], event: KeyboardEvent): boolean => {
      const modifiers = []

      if (event.ctrlKey) modifiers.push('Control')
      if (event.altKey) modifiers.push('Alt')
      if (event.shiftKey) modifiers.push('Shift')
      if (event.metaKey) modifiers.push('Meta')

      const key = event.key === ' ' ? 'Space' : event.key
      const fullShortcut = [...modifiers, key]

      return shortcut.every(part =>
        fullShortcut.some(
          shortcutPart => shortcutPart.toLowerCase() === part.toLowerCase()
        )
      )
    },
    []
  )

  /**
   * Main keyboard event handler
   * This is where all the magic happens!
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if keyboard navigation is enabled
      if (!config.keyboard) return

      // Check if IME composition is active (prevents interfering with IME)
      if (
        (event as any).nativeEvent?.isComposing ||
        (event as any).keyCode === 229
      ) {
        return
      }

      const shortcuts = config.keyboardShortcuts || {}
      let handled = false

      // Check all possible shortcuts
      if (
        shortcuts.navigateUp &&
        matchesShortcut(shortcuts.navigateUp, event)
      ) {
        selectPrevious()
        handled = true
      } else if (
        shortcuts.navigateDown &&
        matchesShortcut(shortcuts.navigateDown, event)
      ) {
        selectNext()
        handled = true
      } else if (
        shortcuts.navigateUpAlt &&
        matchesShortcut(shortcuts.navigateUpAlt, event)
      ) {
        // Group navigation not implemented in store yet
        // navigateSelection('group:prev')
        handled = true
      } else if (
        shortcuts.navigateDownAlt &&
        matchesShortcut(shortcuts.navigateDownAlt, event)
      ) {
        // Group navigation not implemented in store yet
        // navigateSelection('group:next')
        handled = true
      } else if (shortcuts.select && matchesShortcut(shortcuts.select, event)) {
        selectCurrent()
        handled = true
      } else if (shortcuts.clear && matchesShortcut(shortcuts.clear, event)) {
        // Clear search (useful if Escape isn't clearing)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
        handled = true
      }
      // Handle basic navigation keys (backward compatibility)
      else if (!handled) {
        const key = event.key

        const isNavigationKey =
          key === 'ArrowUp' ||
          key === 'ArrowDown' ||
          key === 'Home' ||
          key === 'End' ||
          key === 'Enter' ||
          (key === 'j' && event.ctrlKey) || // Vim: Ctrl+J = down
          (key === 'k' && event.ctrlKey) // Vim: Ctrl+K = up

        if (!isNavigationKey) return

        // Prevent default browser behavior
        event.preventDefault()

        // Handle each key
        switch (key) {
          case 'ArrowUp':
            if (event.altKey) {
              // Alt+ArrowUp for group navigation (not implemented in store yet)
              selectPrevious() // Fallback to regular navigation
            } else {
              selectPrevious()
            }
            break

          case 'ArrowDown':
            if (event.altKey) {
              // Alt+ArrowDown for group navigation (not implemented in store yet)
              selectNext() // Fallback to regular navigation
            } else {
              selectNext()
            }
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
      }

      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    [
      config.keyboard,
      config.keyboardShortcuts,
      selectPrevious,
      selectNext,
      selectCurrent,
      navigateSelection,
      matchesShortcut,
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
