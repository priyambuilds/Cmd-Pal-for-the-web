import { useEffect, useRef, useCallback } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import { useCommandStore } from '../../hooks/use-command-store'
import { useCommandContext } from '../providers/CommandProvider'
import type { CommandInputProps } from '../../types'

/**
 * CommandInput - The search input for the command palette
 *
 * This is where users type their search queries. Features:
 * - Auto-focus when command palette opens
 * - Controlled value synced with store
 * - Accessibility attributes (combobox pattern)
 * - Automatic search/filtering via store
 *
 * Usage:
 * ```
 * <Command>
 *   <CommandInput placeholder="Type a command..." />
 *   <CommandList>...</CommandList>
 * </Command>
 * ```
 */
export function CommandInput({
  placeholder = 'Type a command or search...',
  value: controlledValue,
  onValueChange,
  autoFocus = true,
  className,
  ...props
}: CommandInputProps) {
  // Get context from parent Command component
  const context = useCommandContext()

  // Get store state
  const { state } = useCommandStore()

  // Input ref for focus management
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine value source
  // Priority: controlledValue > context.value > store value
  const value = controlledValue ?? context.value

  /**
   * Handle input changes
   * Coordinates between:
   * - Controlled prop (if provided)
   * - Context callback
   * - Store update
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value

      // Call prop callback if provided
      onValueChange?.(newValue)

      // Call context callback (updates store)
      context.onValueChange(newValue)
    },
    [onValueChange, context]
  )

  /**
   * Auto-focus on mount if enabled
   * Common for command palettes - users can type immediately
   */
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay ensures DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [autoFocus])

  /**
   * Focus input when command palette opens
   * This ensures keyboard shortcuts work even if focus was elsewhere
   */
  useEffect(() => {
    if (context.open && autoFocus && inputRef.current) {
      // Use setTimeout to ensure it happens after dialog opens
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 10)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [context.open, autoFocus])

  /**
   * Get currently selected item ID for aria-activedescendant
   * This tells screen readers which item is currently highlighted
   */
  const activeDescendant = state.search.selectedId
    ? `${context.id}-item-${state.search.selectedId}`
    : undefined

  return (
    <Primitive.input
      {...props}
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      // Accessibility attributes (ARIA Combobox pattern)
      role="combobox"
      aria-expanded={context.open}
      aria-controls={`${context.id}-list`}
      aria-activedescendant={activeDescendant}
      // Disable browser features for better UX
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      autoCapitalize="off"
    />
  )
}

// Display name for debugging
CommandInput.displayName = 'CommandInput'
