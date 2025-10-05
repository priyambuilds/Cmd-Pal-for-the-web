export type CommandFilter = (
  value: string,
  search: string,
  keywords: string[]
) => number

export interface CommandState {
  open: boolean
  search: string
  activeId: string | null // current aria-activedescendant
  loop: boolean
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
