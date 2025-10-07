import type { PrefixMapping } from '@/lib/prefixes'

export interface PrefixHintProps {
  mapping: PrefixMapping
}

/**
 * Shows a hint about the detected prefix
 * Displays what will happen when user presses Enter
 */
export default function PrefixHint({ mapping }: PrefixHintProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
      <span className="text-lg">{mapping.icon}</span>
      <span className="text-gray-600 dark:text-gray-400">
        Search with{' '}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {mapping.name}
        </span>
      </span>
      <span className="ml-auto text-xs text-gray-400">
        Press{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
          Enter
        </kbd>{' '}
        to search
      </span>
    </div>
  )
}
