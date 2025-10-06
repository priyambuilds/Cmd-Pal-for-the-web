import { useState, useEffect } from 'react'
import CommandItem from '@/components/CommandItem'
import commandScore from 'command-score'

export interface HistoryPortalProps {
  query: string
  onSelect: (url: string) => void
}

interface HistoryItem {
  id: string
  title: string
  url: string
  lastVisitTime: number
  visitCount: number
}

export default function HistoryPortal({ query, onSelect }: HistoryPortalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all')

  useEffect(() => {
    loadHistory()
  }, [timeFilter])

  async function loadHistory() {
    try {
      setLoading(true)

      // Calculate start time based on filter
      let startTime = 0
      const now = Date.now()

      if (timeFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startTime = today.getTime()
      } else if (timeFilter === 'week') {
        startTime = now - 7 * 24 * 60 * 60 * 1000 // 7 days ago
      }

      // Request history from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_HISTORY',
        maxResults: 1000,
        startTime,
      })
      if (response.success) {
        setHistory(response.data)
        setError(null)
      } else {
        throw new Error(response.error)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
      setError('Failed to load history. Please check permissions.')
    } finally {
      setLoading(false)
    }
  }
  // Filter and rank history items
  const filteredHistory = query
    ? history
        .map(item => ({
          item,
          score: Math.max(
            commandScore(item.title || '', query),
            commandScore(item.url, query)
          ),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map(({ item }) => item)
    : history
        .sort((a, b) => b.lastVisitTime - a.lastVisitTime) // Most recent first
        .slice(0, 50)

  // Format relative time
  function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="mb-4 text-4xl animate-spin">⏳</div>
        <p>Loading history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p className="mb-4 text-4xl">⚠️</p>
        <p className="font-medium">{error}</p>
        <button
          onClick={loadHistory}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Time filter tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTimeFilter('all')}
          className={`px-3 py-1 text-sm rounded ${
            timeFilter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeFilter('today')}
          className={`px-3 py-1 text-sm rounded ${
            timeFilter === 'today'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimeFilter('week')}
          className={`px-3 py-1 text-sm rounded ${
            timeFilter === 'week'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          This Week
        </button>
      </div>

      {/* History list */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-4 text-4xl">📜</p>
          <p className="font-medium">
            {query ? 'No history found' : 'No history yet'}
          </p>
        </div>
      ) : (
        <div className="max-h-[350px] overflow-y-auto py-2">
          {filteredHistory.map(item => (
            <CommandItem
              key={item.id}
              value={item.id}
              keywords={[item.url]}
              onSelect={() => onSelect(item.url)}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`}
                alt=""
                className="w-5 h-5"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {item.title || 'Untitled'}
                </div>
                <div className="text-xs text-gray-500 truncate dark:text-gray-400">
                  {item.url}
                </div>
              </div>

              <div className="flex flex-col items-end text-xs text-gray-400">
                <span>{formatRelativeTime(item.lastVisitTime)}</span>
                {item.visitCount > 1 && (
                  <span className="text-[10px]">{item.visitCount} visits</span>
                )}
              </div>
            </CommandItem>
          ))}
        </div>
      )}
    </div>
  )
}
