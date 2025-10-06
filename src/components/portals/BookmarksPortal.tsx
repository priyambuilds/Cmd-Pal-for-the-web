import { useState, useEffect } from 'react'
import CommandItem from '@/components/CommandItem'
import commandScore from 'command-score'

export interface BookmarksPortalProps {
  query: string
  onSelect: (url: string) => void
}

interface Bookmark {
  id: string
  title: string
  url: string
  dateAdded: number | undefined
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

  useEffect(() => {
    loadBookmarks()
  }, [])

  async function loadBookmarks() {
    try {
      setLoading(true)

      // Send message to background script to get bookmarks
      const response = await chrome.runtime.sendMessage({
        type: 'GET_BOOKMARKS',
      })

      if (response.success) {
        const flatBookmarks = flattenBookmarks(response.data)
        setBookmarks(flatBookmarks)
        setError(null)
      } else {
        throw new Error(response.error)
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err)
      setError('Failed to load bookmarks. Please check permissions.')
    } finally {
      setLoading(false)
    }
  }

  function flattenBookmarks(nodes: BookmarkTreeNode[]): Bookmark[] {
    const result: Bookmark[] = []

    for (const node of nodes) {
      if (node.url) {
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          dateAdded: node.dateAdded,
        })
      }

      if (node.children) {
        result.push(...flattenBookmarks(node.children))
      }
    }

    return result
  }

  // Filtering logic
  const filteredBookmarks = query
    ? bookmarks
        .map(bookmark => ({
          bookmark,
          score: Math.max(
            commandScore(bookmark.title, query),
            bookmark.url ? commandScore(bookmark.url, query) : 0
          ),
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map(item => item.bookmark)
    : bookmarks
        .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
        .slice(0, 50)

  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="mb-4 text-4xl animate-spin">⏳</div>
        <p>Loading bookmarks...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p className="mb-4 text-4xl">⚠️</p>
        <p className="font-medium">{error}</p>
        <button
          onClick={loadBookmarks}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (filteredBookmarks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="mb-4 text-4xl">📑</p>
        <p className="font-medium">
          {query ? 'No bookmarks found' : 'No bookmarks yet'}
        </p>
        <p className="mt-2 text-sm">
          {query
            ? 'Try a different search term'
            : 'Start bookmarking pages to see them here'}
        </p>
      </div>
    )
  }

  // Render bookmarks
  return (
    <div className="max-h-[400px] overflow-y-auto py-2">
      {filteredBookmarks.map(bookmark => (
        <CommandItem
          key={bookmark.id}
          value={bookmark.id}
          keywords={[bookmark.url || '']}
          onSelect={() => onSelect(bookmark.url!)}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url!).hostname}&sz=32`}
            alt=""
            className="w-5 h-5"
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {bookmark.title || 'Untitled'}
            </div>
            <div className="text-xs text-gray-500 truncate dark:text-gray-400">
              {bookmark.url}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              ↵
            </kbd>
          </div>
        </CommandItem>
      ))}
    </div>
  )
}
