import { Primitive } from '@radix-ui/react-primitive'
import { useCommandSearch } from '../../hooks/use-command-store'
import type { CommandEmptyProps } from '../../types'

/**
 * CommandEmpty - Shown when no search results found
 *
 * Displays when:
 * - User has typed a search query
 * - No items match the query
 *
 * Features:
 * - Auto-show/hide based on results
 * - Customizable message
 * - Accessible announcements
 *
 * Usage:
 * ```
 * <CommandList>
 *   <CommandEmpty>No results found.</CommandEmpty>
 *   <CommandItem value="1">Item 1</CommandItem>
 * </CommandList>
 * ```
 */
export function CommandEmpty({
  children = 'No results found.',
  className,
  ...props
}: CommandEmptyProps) {
  const { empty } = useCommandSearch()

  // Only show when empty state is true
  if (!empty) {
    return null
  }

  return (
    <Primitive.div
      {...props}
      role="status"
      aria-live="polite"
      className={className}
      data-command-empty
    >
      {children}
    </Primitive.div>
  )
}

// Display name for debugging
CommandEmpty.displayName = 'CommandEmpty'
