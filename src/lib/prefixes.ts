/**
 * External search prefix mapping
 * Maps prefixes like !g, !yt to search URLs
 */
export interface PrefixMapping {
  prefix: string
  name: string
  icon: string
  description: string
  urlTemplate: string // Use {query} as placeholder
}

/**
 * External prefix mappings (search engines, websites)
 */
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
 * Internal prefix configuration
 * Maps prefixes like *, # to portals
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
 * Result of parsing a query for prefix detection
 */
export interface PrefixInfo {
  detected: boolean // Whether a prefix was detected
  prefix: string | null // The prefix itself (!g, *, etc)
  query: string // The search term after the prefix
  mapping: PrefixMapping | null // PrefixMapping if external prefix
  isInternal: boolean // Whether it's internal (*, #)
  portalId?: string // Portal ID for internal prefixes
  shouldNavigate: boolean // Whether to navigate to portal/search
}

/**
 * Parse query to detect prefix
 *
 * Examples:
 * - "!g hello" → { detected: true, prefix: "!g", query: "hello", mapping: {...} }
 * - "* something" → { detected: true, prefix: "*", query: "something", isInternal: true }
 * - "normal query" → { detected: false, prefix: null, query: "normal query" }
 *
 * @param query The search query to parse
 * @returns PrefixInfo object with detection results
 */
export function parsePrefix(query: string): PrefixInfo {
  // Don't trim initially - we need to detect the space character
  const original = query
  const trimmed = query.trim()

  // ============================================
  // CHECK EXTERNAL PREFIXES (e.g., !g, !yt)
  // ============================================

  for (const mapping of prefixMappings) {
    // Exactly the prefix (e.g., just "!g")
    if (trimmed === mapping.prefix) {
      return {
        detected: true,
        prefix: mapping.prefix,
        query: '',
        mapping,
        isInternal: false,
        shouldNavigate: false, // No query yet, don't navigate
      }
    }

    // Prefix + space + search term (e.g., "!g hello world")
    if (original.startsWith(mapping.prefix + ' ')) {
      return {
        detected: true,
        prefix: mapping.prefix,
        query: original.slice(mapping.prefix.length + 1).trim(),
        mapping,
        isInternal: false,
        shouldNavigate: true, // Has query, navigate
      }
    }
  }

  // ============================================
  // CHECK INTERNAL PREFIXES (e.g., *, #)
  // ============================================

  for (const internal of internalPrefixes) {
    // Exactly the prefix (e.g., just "*")
    if (trimmed === internal.prefix) {
      return {
        detected: true,
        prefix: internal.prefix,
        query: '',
        mapping: null,
        isInternal: true,
        portalId: internal.portalId,
        shouldNavigate: false, // No query yet, don't navigate
      }
    }

    // Prefix + space + search term (e.g., "* bookmark name")
    if (original.startsWith(internal.prefix + ' ')) {
      const afterPrefix = original.slice(internal.prefix.length)

      // If there's a space and more characters, navigate
      if (afterPrefix.length > 0) {
        return {
          detected: true,
          prefix: internal.prefix,
          query: afterPrefix.trim(),
          mapping: null,
          isInternal: true,
          portalId: internal.portalId,
          shouldNavigate: true, // Has query, navigate to portal
        }
      }
    }
  }

  // ============================================
  // NO PREFIX DETECTED
  // ============================================

  return {
    detected: false,
    prefix: null,
    query: trimmed,
    mapping: null,
    isInternal: false,
    shouldNavigate: false,
  }
}
