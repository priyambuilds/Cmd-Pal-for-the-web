import { prefixMappings, internalPrefixes } from '@/lib/prefixes'

/**
 * Shows available prefix shortcuts when input is empty or typing
 */
export default function PrefixHint() {
  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <div className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        Quick Shortcuts
      </div>
      <div className="flex flex-wrap gap-2">
        {/* internal prefixes */}
        {internalPrefixes.map(prefix => (
          <div
            key={prefix.prefix}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 rounded dark:bg-blue-900/30"
          >
            <kbd className="font-mono font-semibold text-blue-700 dark:text-blue-300">
              {prefix.prefix}
            </kbd>
            <span className="text-gray-600 dark:text-grey-400">
              {prefix.name}
            </span>
          </div>
        ))}
        {/* External prefixes (show first 6) */}
        {/* External prefixes (show first 6) */}
        {prefixMappings.slice(0, 6).map(mapping => (
          <div
            key={mapping.prefix}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800"
          >
            <span className="text-base">{mapping.icon}</span>
            <kbd className="font-mono font-semibold text-gray-700 dark:text-gray-300">
              {mapping.prefix}
            </kbd>
            <span className="text-gray-600 dark:text-gray-400">
              {mapping.name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-400">
        Type a prefix + space + search term (e.g., "!g react hooks")
      </div>
    </div>
  )
}
