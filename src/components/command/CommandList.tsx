import React, { useEffect, useRef } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import {
  useCommandResults,
  useCommandSelection,
} from '../../hooks/use-command-store'
import { useCommandContext } from '../providers/CommandProvider'
import type { CommandListProps } from '../../types'
import { getScheduler } from '../../lib/scheduler/dom-scheduler'

/**
 * CommandList - Container for command items and groups
 *
 * This component:
 * - Provides a scrollable container for results
 * - Handles accessibility (listbox role)
 * - Supports virtualization for large lists (optional)
 * - Auto-scrolls to keep selected item visible
 *
 * Usage:
 * ```
 * <Command>
 *   <CommandInput />
 *   <CommandList>
 *     <CommandItem value="item1">Item 1</CommandItem>
 *     <CommandItem value="item2">Item 2</CommandItem>
 *   </CommandList>
 * </Command>
 * ```
 */
export function CommandList({
  virtual = false,
  itemHeight = 32,
  maxHeight = '300px',
  className,
  children,
  ...props
}: CommandListProps) {
  const context = useCommandContext()
  const results = useCommandResults()
  const selectedItem = useCommandSelection()
  const listRef = useRef<HTMLDivElement>(null)
  const scheduler = getScheduler()

  /**
   * Auto-scroll to keep selected item visible
   * Simplified scrolling without complex priority system
   */
  useEffect(() => {
    if (!selectedItem || !listRef.current) return

    // Simple scroll scheduling
    scheduler.schedule(() => {
      if (!listRef.current) return

      // Find the selected item's DOM element
      const selectedElement = listRef.current.querySelector(
        `[data-command-item="${selectedItem.id}"]`
      ) as HTMLElement

      if (!selectedElement) return

      // Get scroll container and element positions
      const listRect = listRef.current.getBoundingClientRect()
      const itemRect = selectedElement.getBoundingClientRect()

      // Check if item is above visible area
      if (itemRect.top < listRect.top) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
      // Check if item is below visible area
      else if (itemRect.bottom > listRect.bottom) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    })
  }, [selectedItem, scheduler])

  /**
   * For now, virtualization is a prop that can be enabled,
   * but actual implementation would use a library like react-window.
   *
   * We'll render all children regardless of virtual prop for simplicity.
   * In production, you'd integrate react-window or react-virtualized here.
   */
  const content = children

  return (
    <Primitive.div
      {...props}
      ref={listRef}
      id={`${context.id}-list`}
      role="listbox"
      aria-label="Command options"
      className={className}
      style={{
        maxHeight,
        overflow: 'auto',
        ...props.style,
      }}
      data-command-list
    >
      {content}
    </Primitive.div>
  )
}

// Display name for debugging
CommandList.displayName = 'CommandList'
