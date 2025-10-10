// src/index.ts

/**
 * Modern CMDK - Command Palette Library
 *
 * A modern, production-ready command palette library built with:
 * - React 19 (no forwardRef needed)
 * - TypeScript 5.9+
 * - Radix UI primitives
 * - Modern best practices
 *
 * @example
 * ```
 * import { Command, CommandInput, CommandList, CommandItem } from '@your-org/cmdk'
 *
 * function App() {
 *   return (
 *     <Command>
 *       <CommandInput placeholder="Type a command..." />
 *       <CommandList>
 *         <CommandItem value="1">Item 1</CommandItem>
 *       </CommandList>
 *     </Command>
 *   )
 * }
 * ```
 */

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
export { CommandSeparator } from './components/command/CommandSeparator'
export { CommandDialog } from './components/command/CommandDialog'
export { getScheduler, SchedulerPriority } from './lib/scheduler/dom-scheduler'
// =============================================================================
// CONTEXT - React context and provider
// =============================================================================

export {
  CommandProvider,
  useCommandContext,
} from './components/providers/CommandProvider'

// =============================================================================
// HOOKS - React hooks for state management
// =============================================================================

// Store hooks
export {
  useCommandStore,
  useCommandSelector,
  useCommandSearch,
  useCommandResults,
  useCommandSelection,
  useCommandConfig,
  useCommandOpen,
  useCommandQuery,
  useCommandLoading,
  useCommandEmpty,
  resetCommandStore,
} from './hooks/use-command-store'

// Keyboard hooks
export {
  useKeyboardNavigation,
  useKeyboardShortcut,
  useCommandPaletteShortcut,
} from './hooks/use-keyboard-navigation'

// Item and group hooks
export {
  useCommandItems,
  useCommandGroups,
  useCommandItem,
  useCommandGroup,
} from './hooks/use-command-items'

// Event hooks
export {
  useCommandEvent,
  useCommandItemSelect,
  useCommandSearchChange,
  useCommandItemAdd,
  useCommandItemRemove,
  useCommandGroupAdd,
  useCommandGroupRemove,
  useCommandEventEmitter,
} from './hooks/use-command-events'

// =============================================================================
// STORE - Store class and utilities
// =============================================================================

export {
  ModernCommandStore,
  createCommandStore,
} from './lib/store/command-store'

// =============================================================================
// UTILITIES - Helper functions
// =============================================================================

export {
  commandScore,
  scoreAndSort,
  matches,
} from './lib/scoring/command-score'

// =============================================================================
// TYPES - TypeScript type definitions
// =============================================================================

// Export all types for TypeScript users
export type * from './types'
