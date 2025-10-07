import { useState, useEffect, useDeferredValue, useMemo } from 'react'
import CommandItem from '@/components/CommandItem'
import commandScore from 'command-score'
import { bookmarksCache, fetchWithCache, type Bookmark } from '@/lib/cache'

export interface BookmarksPortalProps {
  query: string
  onSelect: (url: string) => void
}

interface BookmarkTreeNode {
  id: string
  title: string
  url?: string
  dateAdded?: number
  children?: BookmarkTreeNode[]
}

export default function BookmarksPortal({
  query,
  onSelect,
}: BookmarksPortalProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Defer query for non-blocking filtering
  const deferredQuery = useDeferredValue(query)

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks()
  }, [])

  /**
   * Load bookmarks with caching
   * @param forceRefresh If true, bypass cache and fetch fresh data
   */
  async function loadBookmarks(forceRefresh = false) {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchWithCache(
        'bookmarks',
        bookmarksCache,
        async () => {
          // Fetch from background script
          const response = await chrome.runtime.sendMessage({
            type: 'GET_BOOKMARKS',
          })

          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch bookmarks')
          }

          return flattenBookmarks(response.data)
        },
        forceRefresh
      )

      setBookmarks(data)
    } catch (err) {
      console.error('Failed to load bookmarks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Flatten bookmark tree into flat array
   */
  function flattenBookmarks(nodes: BookmarkTreeNode[]): Bookmark[] {
    const result: Bookmark[] = []

    function traverse(node: BookmarkTreeNode) {
      if (node.url) {
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          dateAdded: node.dateAdded,
        })
      }

      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    nodes.forEach(traverse)
    return result
  }

  /**
   * Filter bookmarks based on query
   */
  const filteredBookmarks = useMemo(() => {
    if (!deferredQuery) {
      // No query - show most recent bookmarks
      return bookmarks
        .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
        .slice(0, 50)
    }

    // Fuzzy search on title and URL
    const scored = bookmarks
      .map(bookmark => {
        const titleScore = commandScore(bookmark.title, deferredQuery)
        const urlScore = bookmark.url
          ? commandScore(bookmark.url, deferredQuery)
          : 0
        return {
          bookmark,
          score: Math.max(titleScore, urlScore),
        }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)

    return scored.map(item => item.bookmark)
  }, [bookmarks, deferredQuery])

  // Check if cache is stale
  const isStale = bookmarksCache.isStale('bookmarks')

  // Render bookmarks

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin dark:border-gray-600 border-t-blue-500" />
          <span>Loading bookmarks...</span>
        </div>
      </div>
    )
  }
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-4xl">⚠️</div>
        <p className="px-4 text-center text-gray-600 dark:text-gray-300">
          {error}
        </p>
        <button
          onClick={() => loadBookmarks(true)}
          className="px-4 py-2 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (filteredBookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <div className="mb-2 text-4xl">🔖</div>
        <p className="font-medium text-gray-600 dark:text-gray-300">
          {query ? 'No bookmarks found' : 'No bookmarks yet'}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {query
            ? 'Try a different search term'
            : 'Start bookmarking pages to see them here'}
        </p>
      </div>
    )
  }
  // Success - render bookmarks
  return (
    <>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredBookmarks.length} bookmark
            {filteredBookmarks.length !== 1 ? 's' : ''}
          </span>
          {isStale && (
            <span className="text-xs text-yellow-600 dark:text-yellow-500">
              (may be outdated)
            </span>
          )}
        </div>

        <button
          onClick={() => loadBookmarks(true)}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-blue-500 transition-colors hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Bookmarks list */}
      {filteredBookmarks.map(bookmark => (
        <CommandItem
          key={bookmark.id}
          value={bookmark.id}
          onSelect={() => onSelect(bookmark.url)}
        >
          <div className="flex items-center min-w-0 gap-3">
            {/* Favicon */}
            <img
              src={`chrome://favicon/${bookmark.url}`}
              alt=""
              className="flex-shrink-0 w-4 h-4"
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate dark:text-gray-100">
                {bookmark.title || 'Untitled'}
              </div>
              <div className="text-sm text-gray-500 truncate dark:text-gray-400">
                {bookmark.url}
              </div>
            </div>
          </div>
        </CommandItem>
      ))}
    </>
  )
}
