import { useMemo } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import { useCommandResults } from '../../hooks/use-command-store'
import type { CommandSeparatorProps } from '../../types'

/**
 * CommandSeparator - Visual divider between items/groups
 *
 * Features:
 * - Divides groups visually
 * - Auto-hide when no results (unless alwaysRender)
 * - Accessible separator role
 *
 * Usage:
 * ```
 * <CommandList>
 *   <CommandGroup heading="Recent">
 *     <CommandItem value="1">Item 1</CommandItem>
 *   </CommandGroup>
 *
 *   <CommandSeparator />
 *
 *   <CommandGroup heading="Actions">
 *     <CommandItem value="2">Item 2</CommandItem>
 *   </CommandGroup>
 * </CommandList>
 * ```
 */
export function CommandSeparator({
  alwaysRender = false,
  className,
  ...props
}: CommandSeparatorProps) {
  const results = useCommandResults()

  /**
   * Determine if separator should be visible
   * Hide when no results (unless alwaysRender is true)
   */
  const shouldRender = useMemo(() => {
    return alwaysRender || results.length > 0
  }, [alwaysRender, results.length])

  if (!shouldRender) {
    return null
  }

  return (
    <Primitive.div
      {...props}
      role="separator"
      aria-orientation="horizontal"
      className={className}
      data-command-separator
    />
  )
}

// Display name for debugging
CommandSeparator.displayName = 'CommandSeparator'
