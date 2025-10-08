import type { Dispatch, SetStateAction } from 'react'

// The state that components can read
export interface CommandState {
  search: string // Current search query
  value: string // Currently selected item value
  filtered: {
    count: number // How many items match the search
    items: Map<string, number> // item value → score
    groups: Set<string> // Which groups are visible
  }
}

// the store's internal API
export interface Store {
  subscribe: (callback: () => void) => () => void
  snapshot: () => CommandState
  setState: <K extends keyof CommandState>(
    key: K,
    value: CommandState[K],
    opts?: { notify?: boolean }
  ) => void
}

// What gets passed through the context
export interface Context {
  // Item registration
  value: (id: string, value: string, keywords?: string[]) => void
  item: (id: string, groupId: string) => () => void
  group: (id: string) => () => void

  // Filtering
  filter: () => boolean

  // Config
  label: string
  disablePointerSelection: boolean
  listId: string
  inputId: string
  labelId: string

  // Refs - these track mutable data without re-rendering
  allItems: React.RefObject<Map<string, string>> // id -> value
  allGroups: React.RefObject<Set<string>> // all group ids
  ids: React.RefObject<Map<string, string>> // value -> id

  // State updaters
  setState: <K extends keyof CommandState>(
    key: K,
    value: CommandState[K],
    opts?: { notify?: boolean }
  ) => void
}

// Component prop types
export type Children = React.ReactElement | React.ReactElement[]

export interface CommandProps {
  children?: React.ReactNode
  label?: string
  shouldFilter?: boolean
  filter?: (value: string, search: string, keywords?: string[]) => number
  value?: string
  onValueChange?: (value: string) => void
  loop?: boolean
  disablePointerSelection?: boolean
  vimBindings?: boolean
}
