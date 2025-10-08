// Users can target these with CSS or Tailwind's @layer directive
export const DATA_ATTRIBUTE = 'cmdk'

// Component selectors for internal use and user styling
// Example CSS: [cmdk-item] { ... }
// Example Tailwind: @apply in global CSS targeting [cmdk-item]
export const ITEM_SELECTOR = `[${DATA_ATTRIBUTE}-item]`
export const GROUP_SELECTOR = `[${DATA_ATTRIBUTE}-group]`
export const GROUP_ITEMS_SELECTOR = `[${DATA_ATTRIBUTE}-group-items]`
export const GROUP_HEADING_SELECTOR = `[${DATA_ATTRIBUTE}-group-heading]`

// Valid items (not disabled) for keyboard navigation
export const VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`

// Keyboard keys
export const KEYS = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  ENTER: 'Enter',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

// Helper to create data attribute key-value pairs
export const dataAttr = (name: string) => `${DATA_ATTRIBUTE}-${name}` as const
