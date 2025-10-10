import { useEffect, useId, useMemo, useCallback } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import { useCommandStore } from '../../hooks/use-command-store'
import { useKeyboardNavigation } from '../../hooks/use-keyboard-navigation'
import { CommandContext } from '../providers/CommandProvider'
import type { CommandProps } from '../../types'

/**
User types in input
  → handleValueChange called
  → If controlled: notify parent via onValueChange
  → If uncontrolled: update store via setQuery
  → Store updates search results
  → Components re-render with new results
 */

/**
Why So Many useEffects?

// Each effect has a specific job:

// 1. Initialize default value (once)
useEffect(() => { ... }, [defaultValue])

// 2. Sync controlled value (when it changes)
useEffect(() => { ... }, [controlledValue])

// 3. Update config (when it changes)
useEffect(() => { ... }, [config])

// 4. Setup keyboard (once with cleanup)
useEffect(() => { ... return cleanup }, [])
 */

/**
 * Command - Root component for the command palette
 *
 * This is the main container that orchestrates everything:
 * - Provides context to child components
 * - Sets up keyboard event handling
 * - Manages controlled/uncontrolled value state
 * - Configures the store
 *
 * Usage:
 * ```
 * // Uncontrolled
 * <Command>
 *   <CommandInput />
 *   <CommandList>
 *     <CommandItem value="item1">Item 1</CommandItem>
 *   </CommandList>
 * </Command>
 *
 * // Controlled
 * <Command value={query} onValueChange={setQuery}>
 *   ...
 * </Command>
 * ```
 */
export function Command({
  defaultValue,
  value: controlledValue,
  onValueChange,
  onSelectionChange,
  config,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  ...props
}: CommandProps) {
  // Generate unique ID for this command instance
  // Used for accessibility attributes (aria-controls, aria-labelledby)
  const id = useId()

  // Get store access and keyboard handling
  const { state, setQuery, setOpen, updateConfig } = useCommandStore(config)
  const { handleKeyDown } = useKeyboardNavigation()

  // Determine if we're in controlled mode
  const isControlledValue = controlledValue !== undefined
  const isControlledOpen = controlledOpen !== undefined

  // Get current value (controlled or from store)
  const currentValue = isControlledValue ? controlledValue : state.search.query

  // Initialize with default value (uncontrolled mode)
  useEffect(() => {
    if (!isControlledValue && defaultValue && state.search.query === '') {
      setQuery(defaultValue)
    }
  }, [defaultValue, isControlledValue, state.search.query, setQuery])

  // Sync controlled value to store
  useEffect(() => {
    if (isControlledValue && controlledValue !== state.search.query) {
      setQuery(controlledValue)
    }
  }, [isControlledValue, controlledValue, state.search.query, setQuery])

  // Handle value changes (called by input)
  const handleValueChange = useCallback(
    (newValue: string) => {
      // Update store if uncontrolled
      if (!isControlledValue) {
        setQuery(newValue)
      }
      // Notify parent
      onValueChange?.(newValue)
    },
    [isControlledValue, setQuery, onValueChange]
  )

  // Sync controlled open state to store
  useEffect(() => {
    if (isControlledOpen && controlledOpen !== state.open) {
      setOpen(controlledOpen)
    }
  }, [isControlledOpen, controlledOpen, state.open, setOpen])

  // Handle open state changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Update store if uncontrolled
      if (!isControlledOpen) {
        setOpen(newOpen)
      }
      // Notify parent
      onOpenChange?.(newOpen)
    },
    [isControlledOpen, setOpen, onOpenChange]
  )

  // Update store config when props change
  useEffect(() => {
    if (config) {
      updateConfig(config)
    }
  }, [config, updateConfig])

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedItem = state.items.get(state.search.selectedId || '')
      onSelectionChange(selectedItem)
    }
  }, [state.search.selectedId, state.items, onSelectionChange])

  // Set up global keyboard event listener
  useEffect(() => {
    const handleKeyDownEvent = (event: KeyboardEvent) => {
      // Only handle events when command palette is active
      const target = event.target as Element
      const isInCommand = target.closest(`[data-command-root="${id}"]`)

      if (isInCommand) {
        handleKeyDown(event)
      }
    }

    document.addEventListener('keydown', handleKeyDownEvent)
    return () => document.removeEventListener('keydown', handleKeyDownEvent)
  }, [handleKeyDown, id])

  // Create context value
  const contextValue = useMemo(
    () => ({
      id,
      value: currentValue,
      onValueChange: handleValueChange,
      open: isControlledOpen ? controlledOpen : state.open,
      onOpenChange: handleOpenChange,
    }),
    [
      id,
      currentValue,
      handleValueChange,
      isControlledOpen,
      controlledOpen,
      state.open,
      handleOpenChange,
    ]
  )

  return (
    <Primitive.div
      {...props}
      data-command-root={id}
      role="application"
      aria-label="Command palette"
      className={className}
    >
      <CommandContext.Provider value={contextValue}>
        {children}
      </CommandContext.Provider>
    </Primitive.div>
  )
}

// Add display name for debugging
Command.displayName = 'Command'
