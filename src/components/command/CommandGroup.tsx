import { useMemo } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import { useCommandResults } from '../../hooks/use-command-store'
import { useCommandContext } from '../providers/CommandProvider'
import type { CommandGroupProps } from '../../types'
import type { ReactElement } from 'react'

/**
 * CommandGroup - Organize related items with an optional heading
 *
 * Groups provide logical organization for command items:
 * - "Recent" items
 * - "Suggestions"
 * - "Actions"
 * - "Files"
 *
 * Features:
 * - Auto-hide when empty (unless forceMount)
 * - Optional heading
 * - Accessibility (ARIA group pattern)
 * - Counts visible children
 *
 * Usage:
 * ```
 * <CommandList>
 *   <CommandGroup heading="Recent">
 *     <CommandItem value="1">Recently used</CommandItem>
 *   </CommandGroup>
 *
 *   <CommandGroup heading="Actions">
 *     <CommandItem value="2">Create new</CommandItem>
 *   </CommandGroup>
 * </CommandList>
 * ```
 */

export function CommandGroup({
  value,
  heading,
  forceMount = false,
  children,
  className,
  ...props
}: CommandGroupProps) {
  const context = useCommandContext()
  const results = useCommandResults()

  /**
   * Generate group ID
   * Used for accessibility and debugging
   */
  const groupId = value || (typeof heading === 'string' ? heading : 'group')

  /**
   * Check if group has any visible items by finding child components with 'value' prop that match search results
   * This walks through React children and assumes any element with a 'value' prop is a CommandItem
   */
  const hasVisibleItems = useMemo(() => {
    if (forceMount) return true

    // Walk through children to find elements with value prop (CommandItems) and check if they're in results
    const findVisibleItems = (children: any): boolean => {
      if (!children) return false

      if (Array.isArray(children)) {
        return children.some(findVisibleItems)
      }

      // Check if this element has a value prop (assumed to be CommandItem)
      if (children?.props?.value) {
        return results.some(result => result.id === children.props.value)
      }

      // Recursively check nested children
      if (children?.props?.children) {
        return findVisibleItems(children.props.children)
      }

      return false
    }

    return findVisibleItems(children)
  }, [children, results, forceMount])

  /**
   * Generate heading ID for accessibility
   */
  const headingId = heading
    ? `${context.id}-group-${groupId}-heading`
    : undefined

  return (
    <Primitive.div
      {...props}
      role="group"
      aria-labelledby={headingId}
      className={className}
      data-command-group={groupId}
    >
      {heading && hasVisibleItems && (
        <div
          id={headingId}
          role="presentation"
          aria-hidden="true"
          data-command-group-heading
        >
          {heading}
        </div>
      )}
      {children}
    </Primitive.div>
  )
}

// Display name for debugging
CommandGroup.displayName = 'CommandGroup'
