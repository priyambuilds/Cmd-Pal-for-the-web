import type { Command, Category } from '@/types/types'

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
      await browser.runtime.openOptionsPage()
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
      await browser.tabs.create({})
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
  {
    type: 'portal',
    id: 'search-google',
    name: 'Google Search',
    description: 'Search the web with Google',
    icon: '🔍',
    keywords: ['google', 'web', 'internet', 'find', 'query'],
    category: 'search',
    source: 'Built-in',
    searchPlaceholder: 'Search Google...',
    renderContent: query => (
      <div className="p-8 text-center text-gray-500">
        <p className="mb-2 text-xl">🔍</p>
        <p>Google Search Portal</p>
        <p className="mt-2 text-sm">Query: "{query}"</p>
        <p className="mt-4 text-xs">Full implementation coming soon!</p>
      </div>
    ),
  },
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
export function getCommandbyId(id: string): Command | undefined {
  return allCommands.find(cmd => cmd.id === id)
}
/**
 * Helper to get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id)
}
