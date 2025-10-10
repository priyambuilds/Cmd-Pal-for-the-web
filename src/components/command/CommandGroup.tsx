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
   * Check if group has any visible items
   *
   * We need to check if any child CommandItem is in the
   * current search results. If no items are visible, we
   * hide the entire group (unless forceMount is true).
   */
  const hasVisibleItems = useMemo(() => {
    if (forceMount) return true

    // Count visible children
    let visibleCount = 0

    // Walk through children to find CommandItems
    const countVisibleChildren = (child: any): void => {
      if (!child) return

      // handle arrays of childres
      if (Array.isArray(child)) {
        child.forEach(countVisibleChildren)
        return
      }

      // Check if it's a valid react element
      if (typeof child === 'object' && child.props) {
        // Check if it's a CommandItem by checking for 'value' prop
        // (CommandItem always has a value prop)
        if (child.props.value) {
          const itemValue = child.props.value
          const isVisible = results.some(result => result.id === itemValue)
          if (isVisible) visibleCount++
        }

        // recursively check children
        if (child.props.children) {
          countVisibleChildren(child.props.children)
        }
      }
    }
    countVisibleChildren(children)

    return visibleCount > 0
  }, [children, results, forceMount])

  /**
   * Don't render if group is empty
   * (unless forceMount is enabled)
   */
  if (!hasVisibleItems && !forceMount) {
    return null
  }

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
      {heading && (
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
