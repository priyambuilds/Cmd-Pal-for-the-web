import { useSyncExternalStore } from 'react'
import { useCommandContext } from '@/types/context'
import { getCommandById } from '@/lib/commands'
import CommandItem from './CommandItem'

export interface RecentCommandsProps {
  onSelect: (commandId: string) => void
}

/**
 * Shows recently used commands
 */
export default function RecentCommands({ onSelect }: RecentCommandsProps) {
  const store = useCommandContext()

  const recentIds = useSyncExternalStore(
    store.subscribe,
    () => store.getState().recentCommands
  )

  // Get full command objects from IDs
  const recentCommands = recentIds
    .map(id => getCommandById(id))
    .filter(Boolean) // remove any that no longer exist
    .slice(0, 5) // Show max 5

  if (recentCommands.length === 0) return null // Dont show if no recent commands

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        Recently used
      </div>
      {recentCommands.map(cmd => (
        <CommandItem
          key={cmd!.id}
          value={cmd!.id}
          keywords={cmd!.keywords}
          onSelect={() => onSelect(cmd!.id)}
        >
          <span className="text-xl">{cmd!.icon}</span>
          <div className="flex-1">
            <div className="font-medium">{cmd!.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {cmd!.description}
            </div>
          </div>
        </CommandItem>
      ))}
    </div>
  )
}
