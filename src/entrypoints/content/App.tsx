import {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useDeferredValue,
} from 'react'
import CommandInput from '@/components/CommandInput'
import Command from '@/components/Command'
import CommandList from '@/components/CommandList'
import CommandItem from '@/components/CommandItem'
import CommandEmpty from '@/components/CommandEmpty'
import BackButton from '@/components/BackButton'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useCommandContext } from '@/types/context'
import { allCommands, getCommandById } from '@/lib/commands'
import { type Command as CommandType } from '@/types/types'
import commandScore from 'command-score'
import CategoryList from '@/components/CategoryList'
import RecentCommands from '@/components/RecentCommands'
import { parsePrefix } from '@/lib/prefixes'
import PrefixHint from '@/components/PrefixHint'
import BookmarksPortal from '@/components/portals/BookmarksPortal'
import HistoryPortal from '@/components/portals/HistoryPortal'

/**
 * Minimum score threshold for fuzzy search results
 * Lower = more lenient matching, Higher = stricter matching
 */
const MIN_SCORE_THRESHOLD = 0.1

/**
 * Maximum number of results to show
 * Keeps UI snappy by limiting DOM nodes
 */
const MAX_INITIAL_RESULTS = 50

/**
 * Main App Component - Command Palette Modal
 *
 * This component handles:
 * - Global keyboard shortcuts (Cmd/Ctrl+K)
 * - Modal open/close state
 * - Global error boundary
 */
export default function App() {
  const [open, setOpen] = useState(false)

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Toggle command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(prev => !prev)

        if (process.env.NODE_ENV === 'development') {
          console.log('🎹 Command Palette toggled:', !open)
        }
      }

      // Escape: Close palette when open
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }

    // Use capture phase to catch events before they bubble
    window.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [open])

  // Don't render anything when closed
  if (!open) return null

  return (
    <ErrorBoundary
      isolationLevel="global"
      onError={(error, errorInfo) => {
        console.error('💥 App-level error:', error)
        console.error('Component stack:', errorInfo.componentStack)
      }}
    >
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center px-4 bg-black/50 backdrop-blur-sm pt-[20vh]"
        onClick={() => setOpen(false)}
      >
        {/* Modal Content */}
        <div
          className="w-full max-w-2xl overflow-hidden bg-white rounded-lg shadow-2xl dark:bg-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <Command label="Command Palette" loop>
            <AppContent onClose={() => setOpen(false)} />
          </Command>
        </div>
      </div>
    </ErrorBoundary>
  )
}

// AppContent Component - Main palette logic
interface AppContentProps {
  onClose: () => void
}
function AppContent({ onClose }: AppContentProps) {
  const store = useCommandContext()

  // ============================================
  // SUBSCRIBE TO STORE STATE
  // ============================================

  const view = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view
  )
  const recentCommands = useSyncExternalStore(
    store.subscribe,
    () => store.getState().recentCommands
  )

  // ============================================
  // PERFORMANCE OPTIMIZATION: DEFERRED QUERY
  // ============================================

  /**
   * Defer the query value for expensive filtering operations
   */
  const deferredQuery = useDeferredValue(view.query)

  // ============================================
  // PREFIX PARSING
  // ============================================

  const prefixInfo = useMemo(() => parsePrefix(deferredQuery), [deferredQuery])

  // ============================================
  // COMMAND FILTERING (OPTIMIZED)
  // ============================================

  /**
   * Filter and sort commands based on fuzzy search score
   *
   * Optimizations applied:
   * 1. Uses deferredQuery (runs in idle time, not on every keystroke)
   * 2. Early return for empty query (avoid unnecessary work)
   * 3. Score threshold filtering (remove low-quality matches early)
   * 4. Single-pass filter+sort (combine operations)
   * 5. Limit results (stop processing after MAX_INITIAL_RESULTS)
   */
  const filteredCommands = useMemo(() => {
    // Early return: no query = show all commands
    if (!deferredQuery || prefixInfo.detected) {
      return allCommands
    }

    // Performance trscing in development
    if (process.env.NODE_ENV === 'development') {
      console.time('filter-commands')
    }

    /**
     * Single-pass filtering with scoring
     *
     * Why this is fast:
     * - We score and filter in one pass (reduce() instead of map+filter)
     * - We stop early if we have enough results
     * - We filter out low scores immediately
     */
    const scoredCommands: Array<{ command: CommandType; score: number }> = []

    for (const cmd of allCommands) {
      // Calculatee fuzzy match score
      const score = commandScore(cmd.name, deferredQuery)

      // Skip low-quality matches early
      if (score < MIN_SCORE_THRESHOLD) continue

      // Add to results
      scoredCommands.push({ command: cmd, score })

      // Optional: Stop early if we have enough results
      // This is useful for huge command lists
      // if (scoredCommands.length >= MAX_INITIAL_RESULTS * 2) break
    }

    // Sort by score (highest first)
    scoredCommands.sort((a, b) => b.score - a.score)

    // Extract commands (limit to reasonable number)
    const results = scoredCommands
      .slice(0, MAX_INITIAL_RESULTS)
      .map(item => item.command)

    if (process.env.NODE_ENV === 'development') {
      console.timeEnd('filter-commands')
      console.log(
        `Filtered ${allCommands.length} -> ${results.length} commands`
      )
    }

    return results
  }, [deferredQuery, prefixInfo.detected]) // Only re-run when query changes

  // ============================================
  // RECENT COMMANDS FILTERING
  // ============================================

  /**
   * Get recent command objects from IDs
   * Memoized because this involves array operations
   */
  const recentCommandObjects = useMemo(
    () =>
      recentCommands
        .map(id => getCommandById(id))
        .filter((cmd): cmd is CommandType => cmd !== null),
    [recentCommands]
  )

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle command selection
   */
  const handleCommandSelect = async (commandId: string) => {
    const command = getCommandById(commandId)
    if (!command) return

    try {
      // Add to recent commands
      await store.addRecentCommand(commandId)

      // Execute based on command type
      if (command.type === 'action' && command.onExecute) {
        await command.onExecute()
        // Close palette after action
        onClose()
      } else if (command.type === 'category') {
        // Navigate to category view
        const currentView = store.getState().view
        const history = store.getState().history

        store.setState({
          view: {
            type: 'category',
            categoryId: commandId,
            query: '',
          },
          history: [...history, currentView],
        })
      }
    } catch (error) {
      console.error('Failed to execute command:', error)
    }
  }

  /**
   * Handle prefix-based search
   */
  const handlePrefixSearch = () => {
    if (!prefixInfo.detected || !prefixInfo.query) return

    const url = prefixInfo.mapping!.urlTemplate.replace(
      '{query}',
      encodeURIComponent(prefixInfo.query)
    )

    chrome.tabs.create({ url })
    onClose()
  }

  /**
   * Handle bookmark selection
   */
  const handleBookmarkSelect = (url: string) => {
    chrome.tabs.update({ url })
    onClose()
  }

  /**
   * Handle history selection
   */
  const handleHistorySelect = (url: string) => {
    chrome.tabs.update({ url })
    onClose()
  }
  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* Back button for navigation */}
      <BackButton />

      {/* Search input */}
      <CommandInput placeholder="Type a command or search..." autoFocus />

      {/* Prefix hint */}
      {prefixInfo.detected && <PrefixHint mapping={prefixInfo.mapping!} />}

      {/* Command list */}
      <CommandList>
        {/* ROOT VIEW */}
        {view.type === 'root' && (
          <>
            {/* Recent commands (only when no query) */}
            {!deferredQuery && recentCommandObjects.length > 0 && (
              <RecentCommands
                commands={recentCommandObjects}
                onSelect={handleCommandSelect}
              />
            )}

            {/* Prefix search action */}
            {prefixInfo.detected && prefixInfo.query && (
              <CommandItem
                value={`search-${prefixInfo.prefix}`}
                onSelect={handlePrefixSearch}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{prefixInfo.mapping?.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Search "{prefixInfo.query}" on {prefixInfo.mapping?.name}
                    </div>
                  </div>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-700">
                    ↵
                  </kbd>
                </div>
              </CommandItem>
            )}

            {/* Regular filtered commands */}
            {!prefixInfo.detected &&
              filteredCommands.map(cmd => (
                <CommandItem
                  key={cmd.id}
                  value={cmd.id}
                  keywords={cmd.keywords}
                  onSelect={handleCommandSelect}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cmd.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {cmd.name}
                      </div>
                      {cmd.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
          </>
        )}

        {/* CATEGORY VIEW */}
        {view.type === 'category' && view.categoryId && (
          <ErrorBoundary
            isolationLevel="component"
            fallback={(error, reset) => (
              <div className="p-6 text-center">
                <p className="mb-3 text-red-500">Failed to load category</p>
                <button
                  onClick={reset}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          >
            <CategoryList
              categoryId={view.categoryId}
              onSelect={handleCommandSelect}
            />
          </ErrorBoundary>
        )}

        {/* PORTAL VIEW: Bookmarks */}
        {view.type === 'portal' && view.portalId === 'search-bookmarks' && (
          <ErrorBoundary
            isolationLevel="component"
            fallback={(error, reset) => (
              <div className="p-6 text-center">
                <p className="mb-3 text-red-500">Failed to load bookmarks</p>
                <button
                  onClick={reset}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          >
            <BookmarksPortal
              query={view.query || ''}
              onSelect={handleBookmarkSelect}
            />
          </ErrorBoundary>
        )}

        {/* PORTAL VIEW: History */}
        {view.type === 'portal' && view.portalId === 'search-history' && (
          <ErrorBoundary
            isolationLevel="component"
            fallback={(error, reset) => (
              <div className="p-6 text-center">
                <p className="mb-3 text-red-500">Failed to load history</p>
                <button
                  onClick={reset}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          >
            <HistoryPortal
              query={view.query || ''}
              onSelect={handleHistorySelect}
            />
          </ErrorBoundary>
        )}

        {/* Empty state */}
        <CommandEmpty>
          <div className="py-12 text-center">
            <p className="mb-2 text-gray-500 dark:text-gray-400">
              No results found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Try using a prefix like !g, !p, or !yt
            </p>
          </div>
        </CommandEmpty>
      </CommandList>
    </>
  )
}
