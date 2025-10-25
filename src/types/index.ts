import type { ComponentPropsWithoutRef, ReactNode } from 'react'

// =============================================================================
// BASE TYPES - Building blocks used everywhere
// =============================================================================

/**
 * For div elements - most components extend this
 */
export type DivProps = ComponentPropsWithoutRef<'div'>

/**
 * For input elements
 */
export type InputProps = ComponentPropsWithoutRef<'input'>

/**
 * For button elements
 */
export type ButtonProps = ComponentPropsWithoutRef<'button'>

/**
 * Children prop - accepts any React content
 */
export type Children = {
  children?: ReactNode
}

// =============================================================================
// COMMAND STORE TYPES - The heart of our state management
// =============================================================================

/**
 * CommandItem represents a single selectable option in the palette
 *
 * Think of it like an option in a dropdown, but more powerful:
 * - Has a unique ID (like a database primary key)
 * - Has a display value (what users see)
 * - Can have keywords for better searching
 * - Can be disabled (greyed out, not selectable)
 */
export interface CommandItem {
  id: string // Unique identifier
  value: string // Display text
  keywords?: string[] // Extra search terms (e.g., ["search", "find", "lookup"])
  disabled?: boolean // Whether item can be selected
  data?: Record<string, unknown> // Custom data you want to attach
  score?: number // Search relevance score (0-1, calculated automatically)
}

/**
 * CommandGroup organizes related items together
 *
 * Like sections in a menu: "Recent", "Suggestions", "Actions"
 */
export interface CommandGroup {
  id: string // Unique identifier
  heading?: string // Display text for the group header
  forceMount?: boolean // Show even when empty (useful for loading states)
  items: CommandItem[] // Items in this group
}

/**
 * NavigationState tracks current navigation context
 *
 * When you drill into a group, we track the navigation path
 */
export interface NavigationState {
  currentGroup: string | null // ID of group we're currently viewing (null = root view)
  groupPath: string[] // Stack of group IDs for breadcrumb navigation ([parent, child])
  isGroupView: boolean // True when viewing items within a specific group
}

/**
 * SearchState tracks the current search and results
 *
 * This is what changes when you type in the search box
 */
export interface SearchState {
  query: string // What the user typed
  results: CommandItem[] // Filtered and scored items
  selectedId: string | undefined // Currently highlighted item ID
  loading?: boolean // Show loading indicator
  empty?: boolean // True when search returns no results
  navigation: NavigationState // Current navigation context
}

/**
 * CommandConfig controls behavior of the entire palette
 *
 * These are the "settings" that control how search and navigation work
 */
export interface CommandConfig {
  filter?: boolean // Enable/disable filtering (default: true)
  filterFn?: ((item: CommandItem, query: string) => boolean) | undefined // Custom filter
  debounceMs?: number // Wait time after typing before searching (default: 150ms)
  maxResults?: number // Limit displayed results (default: 50)
  keyboard?: boolean // Enable keyboard navigation (default: true)
  loop?: boolean // Loop from bottom to top and vice versa (default: true)
  caseSensitive?: boolean // Case-insensitive by default (default: false)

  // Advanced features
  asyncLoader?: (query: string) => Promise<CommandItem[]> // Async data loading
  loaderDebounceMs?: number // Separate debounce for async loading
  customScoring?: (item: CommandItem, query: string) => number // Custom scoring function
  recentBoost?: number // Boost for recently used items (default: 1.2)
  frequencyBoost?: boolean // Boost frequently used items
  keyboardShortcuts?: KeyboardShortcutConfig // Custom keyboard shortcuts
  cache?: CacheConfig // Caching configuration
  workers?: WorkerConfig // Web worker configuration
}

/**
 * Advanced scoring configuration
 */
export interface AdvancedScoringConfig {
  boostRecent?: number // Multiplier for recently used items
  boostFrequency?: boolean // Enable frequency-based boosting
  customAlgorithm?: (item: CommandItem, query: string) => number
  recentDecayMs?: number // How old items lose "recent" status (default: 24 hours)
}

/**
 * Custom keyboard shortcuts configuration
 */
export interface KeyboardShortcutConfig {
  navigateUp?: string[] // Default: ['ArrowUp']
  navigateDown?: string[] // Default: ['ArrowDown']
  navigateUpAlt?: string[] // Alt+up for groups, default: ['Alt+ArrowUp']
  navigateDownAlt?: string[] // Alt+down for groups, default: ['Alt+ArrowDown']
  select?: string[] // Default: ['Enter']
  close?: string[] // Default: ['Escape']
  clear?: string[] // Clear search, default: ['Escape'] (when no selection)
}

/**
 * Caching configuration for performance
 */
export interface CacheConfig {
  enabled?: boolean // Enable caching (default: false)
  maxSize?: number // Max cached items (default: 1000)
  ttl?: number // Time to live in ms (default: 1 hour)
  persist?: boolean // Persist across sessions (needs IndexedDB)
}

/**
 * Web worker configuration for heavy computations
 */
export interface WorkerConfig {
  enabled?: boolean // Enable workers (default: false)
  scoringWorker?: boolean // Move scoring to worker
  minItems?: number // Min items before using worker (default: 1000)
}

/**
 * Render customization options
 */
export interface RenderConfig {
  renderItem?: (item: CommandItem, state: ItemRenderState) => ReactNode
  renderGroup?: (group: CommandGroup, state: GroupRenderState) => ReactNode
  renderEmpty?: (query: string) => ReactNode
  renderLoading?: (progress?: number) => ReactNode
  renderInput?: (props: InputProps) => ReactNode
}

/**
 * Item render state
 */
export interface ItemRenderState {
  isSelected: boolean
  isVisible: boolean
  index: number
}

/**
 * Group render state
 */
export interface GroupRenderState {
  hasVisibleItems: boolean
  visibleCount: number
  isCollapsed?: boolean
}

/**
 * CommandStore is the complete state of the command palette
 *
 * This is like the "database" that holds everything
 */
export interface CommandStore {
  search: SearchState // Current search state
  groups: Map<string, CommandGroup> // All groups (Map for fast lookup)
  items: Map<string, CommandItem> // All items (Map for fast lookup)
  open: boolean // Is the palette visible?
  config: CommandConfig // Configuration settings
}

// =============================================================================
// COMPONENT PROP TYPES - Props for each component
// =============================================================================

/**
 * Props for the root <Command> component
 */
export interface CommandProps extends DivProps {
  defaultValue?: string // Initial search query
  value?: string // Controlled search query
  onValueChange?: (value: string) => void
  onSelectionChange?: (item?: CommandItem) => void
  config?: Partial<CommandConfig> // Configuration options
  open?: boolean // Controlled open state
  onOpenChange?: (open: boolean) => void
}

/**
 * Props for <CommandInput> - the search box
 */
export interface CommandInputProps extends InputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  autoFocus?: boolean
}

/**
 * Props for <CommandList> - container for items
 */
export interface CommandListProps extends DivProps {
  virtual?: boolean
  itemHeight?: number
  maxHeight?: string | number
}

/**
 * Props for <CommandItem> - individual selectable items
 */
export interface CommandItemProps extends Omit<DivProps, 'onSelect'> {
  value: string // Required: unique value for this item
  keywords?: string[] // Optional: extra search terms
  disabled?: boolean // Optional: prevent selection
  onSelect?: (value: string) => void // Optional: callback when selected
  forceMount?: boolean // Optional: render even when filtered out
  data?: Record<string, unknown> // Optional: custom data
}

/**
 * Props for <CommandGroup> - groups items with a heading
 */
export interface CommandGroupProps extends DivProps {
  value?: string // Optional: unique identifier
  heading?: ReactNode // Optional: group heading content
  forceMount?: boolean // Optional: render even when empty
  selectable?: boolean // Optional: allow navigation into this group
}

/**
 * Props for <CommandSeparator> - visual divider
 */
export interface CommandSeparatorProps extends DivProps {
  alwaysRender?: boolean // Render even when no results
}

/**
 * Props for <CommandEmpty> - shown when no results
 */
export interface CommandEmptyProps extends DivProps {}

/**
 * Props for <CommandLoading> - shown during async operations
 */
export interface CommandLoadingProps extends DivProps {
  progress?: number
  label?: string
}

/**
 * Props for <CommandDialog> - modal wrapper using Radix UI
 */
export interface CommandDialogProps extends CommandProps {
  open: boolean // Required: dialog open state
  onOpenChange: (open: boolean) => void // Required: close callback
  overlayClassName?: string // Optional: style the backdrop
  contentClassName?: string // Optional: style the content
  showCloseButton?: boolean // Optional: show X button
}

// =============================================================================
// HOOK RETURN TYPES - What our custom hooks return
// =============================================================================

/**
 * Return type for useCommandStore hook
 * This gives you full access to the store and all actions
 */
export interface UseCommandStore {
  state: CommandStore
  setQuery: (query: string) => void
  selectItem: (id: string) => void
  addItem: (item: CommandItem, groupId?: string) => void
  removeItem: (id: string) => void
  addGroup: (group: CommandGroup) => void
  removeGroup: (id: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
  updateConfig: (config: Partial<CommandConfig>) => void
  getSelectedItem: () => CommandItem | undefined
  navigateSelection: (direction: 'up' | 'down' | 'first' | 'last') => void
  navigateIntoGroup: (groupId: string) => void
  navigateBack: () => void
  canNavigateBack: () => boolean
  getCurrentGroup: () => CommandGroup | null
}

/**
 * Return type for keyboard navigation hook
 */
export interface UseKeyboardNavigation {
  selectedIndex: number
  selectPrevious: () => void
  selectNext: () => void
  selectCurrent: () => void
  handleKeyDown: (event: KeyboardEvent) => void
}

// =============================================================================
// EVENT TYPES - For the pub/sub event system
// =============================================================================

/**
 * All events that the command store can emit
 *
 * Components can listen to these events to react to changes
 */
export interface CommandEvents {
  'item:select': { item: CommandItem }
  'item:add': { item: CommandItem; groupId?: string | undefined }
  'item:remove': { id: string }
  'search:change': { query: string; results: CommandItem[] }
  'group:add': { group: CommandGroup }
  'group:remove': { id: string }
}

/**
 * Type for event listener functions
 */
export type CommandEventListener<T extends keyof CommandEvents> = (
  event: CommandEvents[T]
) => void
