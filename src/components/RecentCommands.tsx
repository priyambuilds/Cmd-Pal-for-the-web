import type { Command } from '@/types/types'
import CommandItem from './CommandItem'

export interface RecentCommandsProps {
  commands: Command[]
  onSelect: (commandId: string) => void
}

/**
 * Shows recently used commands
 */
export default function RecentCommands({
  commands,
  onSelect,
}: RecentCommandsProps) {
  if (commands.length === 0) return null

  return (
    <>
      {/* Section Header */}
      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
        Recent
      </div>

      {/* Recent Command Items */}
      {commands.map(cmd => (
        <CommandItem
          key={cmd.id}
          value={cmd.id}
          keywords={cmd.keywords}
          onSelect={() => onSelect(cmd.id)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cmd.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {cmd.name}
              </div>
              {cmd.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {cmd.description}
                </div>
              )}
            </div>
          </div>
        </CommandItem>
      ))}

      {/* Divider */}
      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
    </>
  )
}
