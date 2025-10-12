// src/components/command/CommandItem.tsx

import { useEffect, useCallback, useRef } from 'react'
import { Primitive } from '@radix-ui/react-primitive'
import { useCommandItems } from '../../hooks/use-command-items'
import {
  useCommandStore,
  useCommandSelection,
} from '../../hooks/use-command-store'
import { useCommandContext } from '../providers/CommandProvider'
import type { CommandItemProps } from '../../types'

export function CommandItem({
  value,
  keywords = [],
  disabled = false,
  onSelect,
  forceMount = false,
  data = {},
  children,
  className,
  ...props
}: CommandItemProps) {
  const context = useCommandContext()
  const { addItem, removeItem } = useCommandItems()
  const { selectItem } = useCommandStore()
  const selectedItem = useCommandSelection()
  const searchResults = useCommandResults()

  // Use ref to track if already registered
  const registeredRef = useRef(false)

  // Register item on mount ONLY ONCE
  useEffect(() => {
    if (registeredRef.current) return

    const item = {
      id: value,
      value,
      keywords,
      disabled,
      data,
    }

    addItem(item)
    registeredRef.current = true

    return () => {
      removeItem(value)
      registeredRef.current = false
    }
  }, [value]) // Only value as dependency

  const isSelected = selectedItem?.id === value

  // Check if this item should be visible in current search results
  const isVisible =
    forceMount || searchResults.some(result => result.id === value)

  const handleSelect = useCallback(() => {
    if (disabled) return
    selectItem(value)
    onSelect?.(value)
  }, [disabled, selectItem, value, onSelect])

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      handleSelect()
    },
    [handleSelect]
  )

  const handleMouseEnter = useCallback(() => {
    if (!disabled && !isSelected) {
      selectItem(value)
    }
  }, [disabled, isSelected, selectItem, value])

  // Don't render if not visible (filtered out) - AFTER all hooks are called
  if (!isVisible) {
    return null
  }

  const itemId = `${context.id}-item-${value}`

  return (
    <Primitive.div
      {...props}
      id={itemId}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-selected={isSelected}
      data-disabled={disabled}
      data-command-item={value}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseDown={e => e.preventDefault()}
    >
      {children}
    </Primitive.div>
  )
}

CommandItem.displayName = 'CommandItem'
