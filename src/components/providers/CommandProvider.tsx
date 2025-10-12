import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/**
 * CommandContext - Shared data between Command components
 *
 * This context provides component-specific data that child components
 * need to coordinate with each other:
 * - Component ID (for accessibility attributes)
 * - Current search value (for controlled/uncontrolled patterns)
 * - Callbacks (for coordinating state updates)
 * - Open state (for dialog/modal patterns)
 */
interface CommandContextValue {
  /**
   * Unique ID for this command instance
   * Used for accessibility attributes like aria-controls, aria-labelledby
   */
  id: string

  /**
   * Current search query value
   * Can be controlled or uncontrolled
   */
  value: string

  /**
   * Callback when search value changes
   */
  onValueChange: (value: string) => void

  /**
   * Whether the command palette is open
   */
  open: boolean

  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void
}

/**
 * Create the context with null as default
 *
 * We use null to force consumers to check if they're inside a provider.
 * This catches mistakes at runtime with a helpful error message.
 */
export const CommandContext = createContext<CommandContextValue | undefined>(
  undefined
)

/**
 * Hook to access command context
 *
 * This hook provides type-safe access to the context and throws
 * a helpful error if used outside a Command component.
 *
 * Usage:
 * ```
 * function MyComponent() {
 *   const context = useCommandContext()
 *   const { id, value, onValueChange } = context
 *   // ... use context values
 * }
 * ```
 *
 * @throws Error if used outside Command component
 */
export function useCommandContext(): CommandContextValue {
  const context = useContext(CommandContext)

  if (!context) {
    throw new Error(
      'useCommandContext must be used within a Command component. ' +
        'Wrap your component with <Command>...</Command>'
    )
  }
  return context
}

/**
 * Export the context for direct Provider access
 * Components typically use useCommandContext() instead
 */

/**
 * CommandProvider - Convenience wrapper component
 *
 * This is a convenience component if you want to provide context
 * without rendering a Command component. Useful for testing or
 * custom implementations.
 *
 * Usage:
 * ```
 * <CommandProvider value={contextValue}>
 *   <YourComponents />
 * </CommandProvider>
 * ```
 */
interface CommandProviderProps {
  value: CommandContextValue
  children: ReactNode
}

export function CommandProvider({ value, children }: CommandProviderProps) {
  return (
    <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
  )
}
