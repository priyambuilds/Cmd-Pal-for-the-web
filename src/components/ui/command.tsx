'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Command as CommandPrimitive } from 'cmdk'

import { cn } from '@/lib/utils'

// Root
const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    // Accessible label for screen readers
    label="Command palette"
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

// Dialog wrapper using cmdk's built-in Radix composition
type CommandDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  container?: HTMLElement | undefined
}

const CommandDialog = ({
  open,
  onOpenChange,
  container,
  children,
}: CommandDialogProps) => {
  return (
    <CommandPrimitive.Dialog
      open={open}
      onOpenChange={onOpenChange}
      {...(container ? { container } : {})}
      label="Global command palette"
    >
      <div
        className={cn(
          'overflow-hidden p-0 shadow-lg rounded-md bg-popover text-popover-foreground',
          // style the internal structure with cmdk-provided attributes
          '[&_[cmdk-group-heading]]:px-2',
          '[&_[cmdk-group-heading]]:font-medium',
          '[&_[cmdk-group-heading]]:text-muted-foreground',
          '[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0',
          '[&_[cmdk-group]]:px-2',
          '[&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5',
          '[&_[cmdk-input]]:h-12',
          '[&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3',
          '[&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5'
        )}
      >
        {children}
      </div>
    </CommandPrimitive.Dialog>
  )
}

// Input
const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center px-3 border-b" cmdk-input-wrapper>
    <Search className="w-4 h-4 mr-2 opacity-50 shrink-0" />
    <CommandPrimitive.Input
      ref={ref}
      // cmdk v1 supports controlled value and onValueChange
      {...props}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none',
        'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  </div>
))
CommandInput.displayName = CommandPrimitive.Input.displayName

// List (required in v1)
const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

// Empty
const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-sm text-center"
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

// Group
const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground',
      '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
      '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
      '[&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

// Separator
const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

// Item with explicit aria selectors per v1 breaking change
const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      'aria-[selected=true]:bg-accent aria-[selected=true]:text-accent-foreground',
      'aria-[disabled=true]:pointer-events-none aria-[disabled=true]:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

// Shortcut
const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
