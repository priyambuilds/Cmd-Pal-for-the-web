// src/index.ts

// =============================================================================
// COMPONENTS - Main UI components
// =============================================================================
export { Command } from './components/command/Command'
export { CommandInput } from './components/command/CommandInput'
export { CommandList } from './components/command/CommandList'
export { CommandItem } from './components/command/CommandItem'
export { CommandGroup } from './components/command/CommandGroup'
export { CommandEmpty } from './components/command/CommandEmpty'
export { CommandLoading } from './components/command/CommandLoading'

export { CommandDialog } from './components/command/CommandDialog'

// =============================================================================
// HOOKS - React hooks for state management
// =============================================================================
export { useCommandStore } from './hooks/use-command-store'
export { useCommandItems } from './hooks/use-command-items'
export { useKeyboardNavigation } from './hooks/use-keyboard-navigation'

// =============================================================================
// TYPES - TypeScript type definitions (types exported through components)
// =============================================================================
export type * from './types'
