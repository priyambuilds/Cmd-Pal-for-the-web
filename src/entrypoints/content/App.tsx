import {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useDeferredValue,
} from 'react'
import Command from '@/components/Command'
import CommandInput from '@/components/CommandInput'
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

// ============================================
// Command Context Provider
// Provides store context for all command components
// ============================================

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
 * Main App Component - Command Palette Modal Content
 *
 * This component handles:
 * - Modal content (always visible when rendered)
 * - Global error boundary
 * - Command palette logic and navigation
 */
export default function App() {
  return (
    <ErrorBoundary
      isolationLevel="global"
      onError={(error, errorInfo) => {
        console.error('💥 App-level error:', error)
        console.error('Component stack:', errorInfo.componentStack)
      }}
    >
      {/* Modal Overlay - Full screen dark background */}
      <div className="fixed inset-0 z-50 flex items-start justify-center px-4 bg-black/50 backdrop-blur-sm pt-[20vh]">
        {/* Modal Content - White rounded container */}
        <div className="w-full max-w-2xl overflow-hidden bg-white rounded-lg shadow-2xl dark:bg-gray-800">
          <Command label="Command Palette" loop>
            <AppContent />
          </Command>
        </div>
      </div>
    </ErrorBoundary>
  )
}

/**
 * AppContent Component - Main palette logic
 *
 * Separated from App for cleaner architecture:
 * - App handles modal state and shortcuts
 * - AppContent handles command logic and rendering
 */
interface AppContentProps {
  onClose?: () => void
}

function AppContent({ onClose }: AppContentProps = {}) {
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
   * Safe access to query with fallback
   * view.query is optional, so we default to empty string
   */
  const query = view.query ?? ''
  const deferredQuery = useDeferredValue(query)

  // ============================================
  // PREFIX PARSING
  // ============================================

  const prefixInfo = useMemo(() => parsePrefix(deferredQuery), [deferredQuery])

  // ============================================
  // COMMAND FILTERING (OPTIMIZED)
  // ============================================

  /**
   * Filter and score commands based on query
   *
   * Performance optimizations:
   * 1. Uses deferredQuery (runs in React idle time)
   * 2. Early return for empty query
   * 3. Single-pass scoring and filtering
   * 4. Score threshold to skip poor matches
   * 5. Limited results to reduce DOM nodes
   */
  const filteredCommands = useMemo(() => {
    // No query or prefix detected - show all commands
    if (!deferredQuery || prefixInfo.detected) {
      return allCommands
    }

    // Development performance tracking
    if (process.env.NODE_ENV === 'development') {
      console.time('filter-commands')
    }

    // Score and filter in single pass
    const scoredCommands: Array<{ command: CommandType; score: number }> = []

    for (const cmd of allCommands) {
      const score = commandScore(cmd.name, deferredQuery)

      // Skip low-quality matches early
      if (score < MIN_SCORE_THRESHOLD) continue

      scoredCommands.push({ command: cmd, score })
    }

    // Sort by score (highest first)
    scoredCommands.sort((a, b) => b.score - a.score)

    // Limit results
    const results = scoredCommands
      .slice(0, MAX_INITIAL_RESULTS)
      .map(item => item.command)

    if (process.env.NODE_ENV === 'development') {
      console.timeEnd('filter-commands')
      console.log(`Filtered ${allCommands.length} → ${results.length} commands`)
    }

    return results
  }, [deferredQuery, prefixInfo.detected])

  // ============================================
  // RECENT COMMANDS FILTERING
  // ============================================

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
        onClose?.()
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
    if (!prefixInfo.detected || !prefixInfo.query || !prefixInfo.mapping) return

    const url = prefixInfo.mapping.urlTemplate.replace(
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

      {/* Prefix hint - only show if mapping exists */}
      {prefixInfo.detected && prefixInfo.mapping && (
        <PrefixHint mapping={prefixInfo.mapping} />
      )}

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
            {prefixInfo.detected && prefixInfo.query && prefixInfo.mapping && (
              <CommandItem
                value={`search-${prefixInfo.prefix}`}
                onSelect={handlePrefixSearch}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{prefixInfo.mapping.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Search "{prefixInfo.query}" on {prefixInfo.mapping.name}
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
            <BookmarksPortal query={query} onSelect={handleBookmarkSelect} />
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
            <HistoryPortal query={query} onSelect={handleHistorySelect} />
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
