export type CommandFilter = (
  value: string,
  search: string,
  keywords: string[]
) => number

export interface CommandState {
  open: boolean
  search: string
  activeId: string | null | undefined
  loop: boolean
  view: ViewState
  history: ViewState[] // Navigation stack for back button
  recentCommands: string[]
}

export interface CommandProps {
  label: string // accessible name for the combobox
  value?: string
  onValueChange?: (v: string) => void
  shouldFilter?: boolean
  filter?: CommandFilter
  loop?: boolean
  children?: React.ReactNode
}

export interface CommandItemProps {
  id?: string // falls back to a generated id
  value: string // canonical value for filtering/selection
  keywords?: string[] // additional terms to match
  disabled?: boolean
  onSelect?: (value: string) => void
  children?: React.ReactNode
}

// NEW: View State for Navigation

export type ViewType = 'root' | 'portal' | 'category'
export interface ViewState {
  type: ViewType
  portalId?: string // Set when type = 'portal'
  categoryId?: string // Set when type = 'category'
  query: string // Current search query in this view
}

// NEW: Command Types (Action vs Portal)

export interface BaseCommand {
  id: string
  name: string
  description: string
  icon: string
  keywords: string[]
  category: string // Which category this belongs to
  source?: string // "Built-in" or extension name
}

// Simple action that executes immediately
export interface ActionCommand extends BaseCommand {
  type: 'action'
  onExecute: () => void | Promise<void>
}

// Portal that opens a new interface
export interface PortalCommand extends BaseCommand {
  type: 'portal'
  searchPlaceholder?: string
  renderContent: (query: string) => React.ReactNode
}

export type Command = ActionCommand | PortalCommand

// NEW: Category Definition

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  commandIds: string[] // IDs of commands in this category
}
