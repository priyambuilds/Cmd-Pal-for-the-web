import type { CommandStore } from './store'

/**
 * Command filter function signature
 * Used for custom filtering logic
 */
export type CommandFilter = (
  value: string,
  search: string,
  keywords: string[]
) => number

/**
 * Global command palette state
 */
export interface CommandState {
  open: boolean
  activeId: string | null | undefined
  loop: boolean
  view: ViewState
  history: ViewState[] // Navigation stack for back button
  recentCommands: string[]
}

/**
 * Props for the root Command component
 */
export interface CommandProps {
  label: string // Accessible name for the combobox
  value?: string
  onValueChange?: (v: string) => void
  shouldFilter?: boolean
  filter?: CommandFilter
  loop?: boolean
  children?: React.ReactNode
}

/**
 * Props for CommandItem component
 */
export interface CommandItemProps {
  id?: string // Falls back to a generated id
  value: string // Canonical value for filtering/selection
  keywords?: string[] // Additional terms to match
  disabled?: boolean
  onSelect?: (value: string) => void
  children?: React.ReactNode
}

/**
 * View types for navigation
 */
export type ViewType = 'root' | 'portal' | 'category'

/**
 * View state for navigation
 * Represents the current "screen" the user is on
 */
export interface ViewState {
  type: ViewType
  portalId?: string // Set when type = 'portal'
  categoryId?: string // Set when type = 'category'
  query?: string // Current search query (optional)
}

/**
 * Base properties shared by all command types
 */
export interface BaseCommand {
  id: string
  name: string
  description: string
  icon: string
  keywords: string[]
  category: string // Which category this belongs to
  source?: string // "Built-in" or extension name
}

/**
 * Action command - executes immediately
 *
 * Examples:
 * - "Clear Cache"
 * - "Copy Current URL"
 * - "Take Screenshot"
 */
export interface ActionCommand extends BaseCommand {
  type: 'action'
  onExecute: () => void | Promise<void>
}

/**
 * Portal command - opens a new searchable interface
 *
 * Examples:
 * - "Search Bookmarks" (opens bookmarks portal)
 * - "Search History" (opens history portal)
 * - "Search Tabs" (opens tab switcher)
 */
export interface PortalCommand extends BaseCommand {
  type: 'portal'
  searchPlaceholder?: string
  renderContent: (query: string, context: PortalContext) => React.ReactNode
}

/**
 * Category command - groups related commands
 *
 * Examples:
 * - "Navigation" category
 * - "Developer Tools" category
 * - "System" category
 */
export interface CategoryCommand extends BaseCommand {
  type: 'category'
}

/**
 * Context passed to portal render functions
 */
export interface PortalContext {
  onClose: () => void
  store: CommandStore
}

/**
 * Union type of all command types
 */
export type Command = ActionCommand | PortalCommand | CategoryCommand

/**
 * Category definition
 * Categories group commands together
 */
export interface Category {
  id: string
  name: string
  icon: string
  description: string
  commandIds: string[] // IDs of commands in this category
}
