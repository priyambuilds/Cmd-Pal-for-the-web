import type { Command, Category, PortalContext } from '@/types/types'
import BookmarksPortal from '@/components/portals/BookmarksPortal'
import HistoryPortal from '@/components/portals/HistoryPortal'
import { prefixMappings } from '@/lib/prefixes'
/**
 * Example action commands that execute immediately
 */
export const actionCommands: Command[] = [
  {
    type: 'action',
    id: 'open-settings',
    name: 'Open Settings',
    description: 'Configure your preferences',
    icon: '⚙️',
    keywords: ['preferences', 'config', 'options', 'setup'],
    category: 'navigation',
    source: 'Built-in',
    onExecute: async () => {
      await chrome.runtime.openOptionsPage()
    },
  },
  {
    type: 'action',
    id: 'new-tab',
    name: 'New Tab',
    description: 'Open a new browser tab',
    icon: '🆕',
    keywords: ['create', 'browser', 'window', 'page'],
    category: 'navigation',
    source: 'Built-in',
    onExecute: async () => {
      await chrome.tabs.create({})
    },
  },
  {
    type: 'action',
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform calculations',
    icon: '🧮',
    keywords: ['math', 'compute', 'calc', 'arithmetic'],
    category: 'tools',
    source: 'Built-in',
    onExecute: async () => {
      alert('Calculator feature coming soon!')
    },
  },
]

/**
 * Example portal commands that open new interfaces
 */
export const portalCommands: Command[] = [
  // Bookmarks Portal
  {
    type: 'portal',
    id: 'search-bookmarks',
    name: 'Search Bookmarks',
    description: 'Browse and search your bookmarks',
    icon: '🔖',
    keywords: ['bookmarks', 'favorites', 'saved', 'starred', 'bookmark'],
    category: 'search',
    source: 'Built-in',
    searchPlaceholder: 'Search bookmarks...',
    renderContent: (query: string, context: PortalContext) => (
      <BookmarksPortal
        query={query}
        onSelect={async url => {
          // Send message to background to open URL
          await chrome.runtime.sendMessage({
            type: 'OPEN_BOOKMARK',
            url,
          })
          context.onClose()
        }}
      />
    ),
  },
  // History Portal
  {
    type: 'portal',
    id: 'search-history',
    name: 'Search History',
    description: 'Browse and search your browsing history',
    icon: '🕒',
    keywords: ['history', 'visited', 'browsing', 'pages', 'recent'],
    category: 'search',
    source: 'Built-in',
    searchPlaceholder: 'Search history...',
    renderContent: (query: string, context: PortalContext) => (
      <HistoryPortal
        query={query}
        onSelect={async url => {
          await chrome.runtime.sendMessage({
            type: 'OPEN_HISTORY',
            url,
          })
          context.onClose()
        }}
      />
    ),
  },

  // Dynamic prefix portals
  ...prefixMappings.map(mapping => ({
    type: 'portal' as const,
    id: `prefix-${mapping.prefix}`,
    name: `${mapping.name} Search`,
    description: mapping.description,
    icon: mapping.icon,
    keywords: [mapping.prefix.replace('!', ''), mapping.name.toLowerCase()],
    category: 'search',
    source: 'Built-in',
    searchPlaceholder: `Search ${mapping.name}...`,
    renderContent: (query: string, context: PortalContext) => {
      if (!query) {
        return (
          <div className="p-8 text-center text-gray-500">
            <span className="block mb-4 text-4xl">{mapping.icon}</span>
            <p className="text-lg font-medium">{mapping.name}</p>
            <p className="mt-2 text-sm">Type your search query</p>
          </div>
        )
      }
      const searchUrl = mapping.urlTemplate.replace(
        '{query}',
        encodeURIComponent(query)
      )
      return (
        <>
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ready to search {mapping.name} for "{query}"
              </p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={async () => {
                try {
                  await chrome.runtime.sendMessage({
                    type: 'OPEN_BOOKMARK', // Reuse for general URL opening
                    url: searchUrl,
                  })
                } catch (error) {
                  console.error('Failed to open URL:', error)
                }
                context.onClose()
              }}
              className="w-full px-4 py-2 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Search {mapping.name}
            </button>
          </div>
        </>
      )
    },
  })),
]

/**
 * All commands combined
 */
export const allCommands: Command[] = [...actionCommands, ...portalCommands]

/**
 * Categories for browssing
 */
export const categories: Category[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    icon: '🧭',
    description: 'Browser navigation and tabs',
    commandIds: allCommands
      .filter(cmd => cmd.category === 'navigation')
      .map(cmd => cmd.id),
  },
  {
    id: 'search',
    name: 'Search',
    icon: '🔎',
    description: 'Search providers and tools',
    commandIds: allCommands
      .filter(cmd => cmd.category === 'search')
      .map(cmd => cmd.id),
  },
  {
    id: 'tools',
    name: 'Tools & Utilities',
    icon: '🛠️',
    description: 'Helpful utilities and converters',
    commandIds: allCommands
      .filter(cmd => cmd.category === 'tools')
      .map(cmd => cmd.id),
  },
]
/**
 * Helper to get command by ID
 */
export function getCommandById(id: string): Command | undefined {
  return allCommands.find(cmd => cmd.id === id)
}
/**
 * Helper to get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id)
}
