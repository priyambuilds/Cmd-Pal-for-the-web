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
import { allCommands, getCommandById, getCategoryById } from '@/lib/commands'
import { type Command as CommandType } from '@/types/types'
import commandScore from 'command-score'
import CategoryList from '@/components/CategoryList'
import RecentCommands from '@/components/RecentCommands'
import { parsePrefix } from '@/lib/prefixes'
import PrefixHint from '@/components/PrefixHint'

/**
 * Minimum score threshold for fuzzy search results
 * Lower = more lenient matching, Higher = stricter matching
 */
const MIN_SCORE_THRESHOLD = 0.1

/**
 * Maximum number of results to show before "Show more"
 * Keeps UI snappy by virtualizing long lists
 */
const MAX_INITIAL_RESULTS = 100

export default function App() {
  const [open, setOpen] = useState(false)

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K: Open Command Palette
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        console.log('Ctrl/Cmd+K detected!')
        e.preventDefault()
        e.stopPropagation()
        setOpen(prev => !prev)
      }

      // Escape to close when open
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    console.log('Keyboard listener registered')

    return () => {
      window.removeEventListener('keydown', handleKeyDown, {
        capture: true,
      })
    }
  }, [open])

  if (!open) return null

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh] px-4">
        <div
          className="w-full max-w-2xl overflow-hidden bg-white rounded-lg shadow-2xl dark:bg-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <Command label="Command Palette" loop>
            <AppContent />
          </Command>
        </div>
      </div>
    </ErrorBoundary>
  )
}

/**
 * Main content component with performance-optimized filtering
 * Separated from App to keep modal logic clean
 */
function AppContent() {
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
  const filteredCOmmands = useMemo(() => {
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
  // VIEW RENDERING
  // ============================================

  /**
   * Handle command execution
   */
  const handleCommandSelect = async (commandId: string) => {
    const command = getCommandById(commandId)
    if (!command) return

    try {
      // Add to recent commands
      await store.addRecentCommand(command.id)

      // Execute command
      if (command.type === 'action' && command.onExecute) {
        await command.onExecute()
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
      console.error('Failed executing command:', error)
    }
  }

  /**
   * Handle prefix-based search
   */
  const handlePrefixSearch = () => {
    if (!prefixInfo.detected || !prefixInfo.query) return

    // Open URL in new tab
    const url = prefixInfo.mapping!.urlTemplate.replace(
      '{query}',
      encodeURIComponent(prefixInfo.query)
    )

    chrome.tabs.create({ url })
  }

  // ============================================
  // RENDER DIFFERENT VIEWS
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
        {/* ROOT VIEW: Show all commands and recent commands */}
        {view.type === 'root' && (
          <>
            {/* Show recent commands if no query */}
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
                    <div className="font-medium">
                      Search "{prefixInfo.query}" on {prefixInfo.mapping?.name}
                    </div>
                  </div>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-700">
                    ↵
                  </kbd>
                </div>
              </CommandItem>
            )}

            {/* Regular commands */}
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
                      <div className="font-medium">{cmd.name}</div>
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
          <CategoryList
            categoryId={view.categoryId}
            onSelect={handleCommandSelect}
          />
        )}

        {/* PORTAL VIEW: Bookmarks, History, etc. */}
        {view.type === 'portal' && view.portalId && (
          <div className="p-4 text-sm text-gray-500">
            Opening{' '}
            {view.portalId === 'search-bookmarks' ? 'Bookmarks' : 'History'} ...
          </div>
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
