export interface PrefixMapping {
  prefix: string
  name: string
  icon: string
  description: string
  urlTemplate: string // {query} will be replaced with the search term
}

export const prefixMappings: PrefixMapping[] = [
  {
    prefix: '!g',
    name: 'Google Search',
    icon: '🔍',
    description: 'Search Google',
    urlTemplate: 'https://www.google.com/search?q={query}',
  },
  {
    prefix: '!p',
    name: 'Perplexity',
    icon: '🔮',
    description: 'Search with Perplexity AI',
    urlTemplate: 'https://www.perplexity.ai/search?q={query}',
  },
  {
    prefix: '!yt',
    name: 'YouTube',
    icon: '📺',
    description: 'Search YouTube videos',
    urlTemplate: 'https://www.youtube.com/results?search_query={query}',
  },
  {
    prefix: '!gh',
    name: 'GitHub',
    icon: '🐙',
    description: 'Search GitHub repositories',
    urlTemplate: 'https://github.com/search?q={query}',
  },
  {
    prefix: '!tw',
    name: 'Twitter',
    icon: '🐦',
    description: 'Search Twitter/X',
    urlTemplate: 'https://twitter.com/search?q={query}',
  },
  {
    prefix: '!w',
    name: 'Wikipedia',
    icon: '📖',
    description: 'Search Wikipedia',
    urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search={query}',
  },
  {
    prefix: '!r',
    name: 'Reddit',
    icon: '🤖',
    description: 'Search Reddit',
    urlTemplate: 'https://www.reddit.com/search?q={query}',
  },
  {
    prefix: '!md',
    name: 'MDN',
    icon: '📚',
    description: 'Search MDN Web Docs',
    urlTemplate: 'https://developer.mozilla.org/en-US/search?q={query}',
  },
  {
    prefix: '!npm',
    name: 'npm',
    icon: '📦',
    description: 'Search npm packages',
    urlTemplate: 'https://www.npmjs.com/search?q={query}',
  },
  {
    prefix: '!so',
    name: 'Stack Overflow',
    icon: '📝',
    description: 'Search Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q={query}',
  },
]

/**
 * Special prefixes that trigger internal portals
 */
export const internalPrefixes = [
  {
    prefix: '*',
    name: 'Bookmarks',
    portalId: 'search-bookmarks',
  },
  {
    prefix: '#',
    name: 'History',
    portalId: 'search-history',
  },
]

/**
 * Parse query to detect prefix
 */
export function parsePrefix(query: string): {
  hasPrefix: boolean
  prefix: string | null
  searchTerm: string
  mapping: PrefixMapping | null
  isInternal: boolean
  portalId?: string
} {
  const trimmed = query.trim()

  // Check external prefixes
  for (const mapping of prefixMappings) {
    if (trimmed.startsWith(mapping.prefix + ' ')) {
      return {
        hasPrefix: true,
        prefix: mapping.prefix,
        searchTerm: trimmed.slice(mapping.prefix.length + 1).trim(),
        mapping,
        isInternal: false,
      }
    }
  }

  // Check internal prefixes
  for (const internal of internalPrefixes) {
    if (trimmed.startsWith(internal.prefix)) {
      return {
        hasPrefix: true,
        prefix: internal.prefix,
        searchTerm: trimmed.slice(internal.prefix.length).trim(),
        mapping: null,
        isInternal: true,
        portalId: internal.portalId,
      }
    }
  }

  return {
    hasPrefix: false,
    prefix: null,
    searchTerm: trimmed,
    mapping: null,
    isInternal: false,
  }
}
