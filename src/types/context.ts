import { createContext, useContext } from 'react'
import type { CommandStore } from './store'

/**
 * Context that provides the command store to all child components.
 * Components like CommandInput, CommandList, and CommandItem consume this.
 */
export const CommandContext = createContext<CommandStore | null>(null)

/**
 * Hook that returns the command store from context.
 * Throws an error if used outside of <Command>.
 *
 * Example usage:
 *   const store = useCommandContext()
 *   store.setState({ search: 'new value' })
 */
export function useCommandContext(): CommandStore {
  const store = useContext(CommandContext)

  if (!store) {
    throw new Error(
      'useCommandContext must be used within a <Command> component. ' +
        'Wrap your component tree with <Command>...</Command>'
    )
  }

  return store
}
