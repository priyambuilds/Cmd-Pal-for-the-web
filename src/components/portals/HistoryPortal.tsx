import { useState, useEffect, useDeferredValue, useMemo } from 'react'
import CommandItem from '@/components/CommandItem'
import commandScore from 'command-score'
import { historyCache, fetchWithCache, type HistoryItem } from '@/lib/cache'

export interface HistoryPortalProps {
  query: string
  onSelect: (url: string) => void
}

type TimeFilter = 'all' | 'today' | 'week'

export default function HistoryPortal({ query, onSelect }: HistoryPortalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const deferredQuery = useDeferredValue(query)

  // Load history when time filter changes
  useEffect(() => {
    loadHistory()
  }, [timeFilter])

  /**
   * Load history with caching
   * Different time filters get separate cache keys
   */
  async function loadHistory(forceRefresh = false) {
    try {
      setLoading(true)
      setError(null)

      // Calculate start time based on filter
      let startTime = 0
      const now = Date.now()

      if (timeFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startTime = today.getTime()
      } else if (timeFilter === 'week') {
        startTime = now - 7 * 24 * 60 * 60 * 1000
      }

      // Use different cache keys for different filters
      const cacheKey = `history-${timeFilter}`

      const data = await fetchWithCache(
        cacheKey,
        historyCache,
        async () => {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_HISTORY',
            maxResults: 1000,
            startTime,
          })

          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch history')
          }

          return response.data
        },
        forceRefresh
      )

      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Filter history based on query
   */
  const filteredHistory = useMemo(() => {
    if (!deferredQuery) {
      return history.slice(0, 50)
    }

    const scored = history
      .map(item => {
        const titleScore = commandScore(item.title, deferredQuery)
        const urlScore = commandScore(item.url, deferredQuery)
        return {
          item,
          score: Math.max(titleScore, urlScore),
        }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)

    return scored.map(({ item }) => item)
  }, [history, deferredQuery])

  const isStale = historyCache.isStale(`history-${timeFilter}`)

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin dark:border-gray-600 border-t-blue-500" />
          <span>Loading history...</span>
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
          onClick={() => loadHistory(true)}
          className="px-4 py-2 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (filteredHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <div className="mb-2 text-4xl">🕐</div>
        <p className="font-medium text-gray-600 dark:text-gray-300">
          {query ? 'No history found' : 'No history yet'}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {query
            ? 'Try a different search term'
            : 'Start browsing to build your history'}
        </p>
      </div>
    )
  }

  // Success - render history
  return (
    <>
      {/* Header with filters and refresh */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          {/* Time filter buttons */}
          <div className="flex gap-1">
            {(['all', 'today', 'week'] as TimeFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  timeFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {filter === 'all'
                  ? 'All'
                  : filter === 'today'
                    ? 'Today'
                    : 'This Week'}
              </button>
            ))}
          </div>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredHistory.length} item
            {filteredHistory.length !== 1 ? 's' : ''}
          </span>

          {isStale && (
            <span className="text-xs text-yellow-600 dark:text-yellow-500">
              (may be outdated)
            </span>
          )}
        </div>

        <button
          onClick={() => loadHistory(true)}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-blue-500 transition-colors hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* History list */}
      {filteredHistory.map(item => (
        <CommandItem
          key={item.id}
          value={item.id}
          onSelect={() => onSelect(item.url)}
        >
          <div className="flex items-center min-w-0 gap-3">
            <img
              src={`chrome://favicon/${item.url}`}
              alt=""
              className="flex-shrink-0 w-4 h-4"
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />

            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate dark:text-gray-100">
                {item.title || 'Untitled'}
              </div>
              <div className="text-sm text-gray-500 truncate dark:text-gray-400">
                {item.url}
              </div>
            </div>

            <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {formatTime(item.lastVisitTime)}
            </div>
          </div>
        </CommandItem>
      ))}
    </>
  )
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
