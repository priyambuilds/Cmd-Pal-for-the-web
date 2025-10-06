import { useState, useEffect, useSyncExternalStore } from 'react'
import CommandInput from '@/components/CommandInput'
import Command from '@/components/Command'
import CommandList from '@/components/CommandList'
import CommandItem from '@/components/CommandItem'
import CommandEmpty from '@/components/CommandEmpty'
import BackButton from '@/components/BackButton'
import { useCommandContext } from '@/types/context'
import { allCommands, getCommandById, getCategoryById } from '@/lib/commands'
import { type Command as CommandType } from '@/types/types'
import commandScore from 'command-score'
import CategoryList from '@/components/CategoryList'
import RecentCommands from '@/components/RecentCommands'
import { parsePrefix } from '@/lib/prefixes'
import PrefixHint from '@/components/PrefixHint'

export default function App() {
  const [open, setOpen] = useState(false)

  // Listen for Ctrl+K / Cmd+K directly in the content script
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        console.log('Ctrl/Cmd+K detected!')
        e.preventDefault() // Prevent Chrome's default search
        e.stopPropagation() // Stop event from bubbling
        setOpen(prev => !prev)
      }

      // Also listen for Escape to close
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }

    // Add listener to window
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    console.log('Keyboard listener registered')

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-[9999]"
      onClick={() => setOpen(false)}
    >
      <div onClick={e => e.stopPropagation()}>
        <Command label="Global Command Menu">
          <CommandContent onClose={() => setOpen(false)} />
        </Command>
      </div>
    </div>
  )
}

function CommandContent({ onClose }: { onClose: () => void }) {
  const store = useCommandContext()

  // subscribe to current view
  const view = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view
  )

  // Handle command selection
  const handleCommandSelect = (command: CommandType) => {
    if (command.type === 'action') {
      // Execute action immediately and close
      command.onExecute()
      store.addRecentCommand(command.id)
      onClose()
    } else if (command.type === 'portal') {
      // navigation to portal view
      store.navigate({
        type: 'portal',
        portalId: command.id,
        query: '',
      })
      store.addRecentCommand(command.id)
    }
  }

  // ROOT VIEW: Show all commands with search
  if (view.type === 'root') {
    const { hasPrefix, prefix, searchTerm, mapping, isInternal, portalId } =
      parsePrefix(view.query)

    // If internal prefix, navigate to that portal immediately
    if (hasPrefix && isInternal && portalId && searchTerm.length > 0) {
      // Navigate immediately (no useEffect!)
      store.navigate({
        type: 'portal',
        portalId,
        query: searchTerm,
      })
      // Return loading state while navigating
      return (
        <div className="p-8 text-center text-gray-500">
          <div className="mb-4 text-4xl animate-spin">⏳</div>
          <p>
            Opening {portalId === 'search-bookmarks' ? 'Bookmarks' : 'History'}
            ...
          </p>
        </div>
      )
    }

    // If external prefix with search term, show "Search X" action
    if (hasPrefix && mapping && searchTerm.length > 0) {
      const searchUrl = mapping.urlTemplate.replace(
        '{query}',
        encodeURIComponent(searchTerm)
      )

      return (
        <>
          <CommandInput placeholder="Search commands..." autofocus />
          <CommandList>
            <CommandItem
              key="prefix-search"
              value="prefix-search"
              keywords={[searchTerm]}
              onSelect={async () => {
                try {
                  await chrome.runtime.sendMessage({
                    type: 'OPEN_BOOKMARK',
                    url: searchUrl,
                  })
                } catch (error) {
                  console.error('Failed to open URL:', error)
                }
                onClose()
              }}
            >
              <span className="text-2xl">{mapping.icon}</span>
              <div className="flex-1">
                <div className="font-medium">
                  {mapping.name}: "{searchTerm}"
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Press Enter to search
                </div>
              </div>
              <kbd className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800">
                ↵
              </kbd>
            </CommandItem>
          </CommandList>

          <PrefixHint />
        </>
      )
    }

    // If no query, show suggestions view
    if (!view.query) {
      return (
        <>
          <CommandInput placeholder="Search commands..." autofocus />
          <div className="max-h-[400px] overflow-y-auto py-2">
            <RecentCommands
              onSelect={id => {
                const cmd = getCommandById(id)
                if (cmd) handleCommandSelect(cmd)
              }}
            />
            <CategoryList />
          </div>

          <PrefixHint />
        </>
      )
    }

    // If query exists but no prefix, show filtered commands
    const filteredCommands = allCommands
      .map(cmd => ({
        command: cmd,
        score: Math.max(
          commandScore(cmd.name, view.query),
          ...cmd.keywords.map(kw => commandScore(kw, view.query))
        ),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.command)

    return (
      <>
        <CommandInput placeholder="Search commands..." autofocus />
        <CommandList>
          {filteredCommands.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              keywords={cmd.keywords}
              onSelect={() => handleCommandSelect(cmd)}
            >
              <span className="text-xl">{cmd.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{cmd.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {cmd.description}
                </div>
              </div>
              {cmd.type === 'portal' && (
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </CommandItem>
          ))}

          <CommandEmpty>
            <div className="space-y-2">
              <p className="font-medium">No results found</p>
              <p className="text-xs">Try using a prefix like !g, !p, or !yt</p>
            </div>
          </CommandEmpty>
        </CommandList>

        <PrefixHint />
      </>
    )
  }
  // PORTAL VIEW: Show portal content
  if (view.type === 'portal') {
    const portal = getCommandById(view.portalId!)

    if (!portal || portal.type !== 'portal') {
      return <div className="p-4 text-red-500">Portal not found</div>
    }

    return (
      <>
        <BackButton />
        <CommandInput
          placeholder={portal.searchPlaceholder || 'Search...'}
          autofocus
        />
        <div className="min-h-[200px]">
          {portal.renderContent(view.query, { onClose, store })}
        </div>
      </>
    )
  }

  // CATEGORY VIEW: Show commands from that category
  if (view.type === 'category') {
    const category = getCategoryById(view.categoryId!)

    if (!category) {
      return <div className="p-4 text-red-500">Category not found</div>
    }

    const categoryCommands = allCommands.filter(cmd =>
      category.commandIds.includes(cmd.id)
    )

    return (
      <>
        <BackButton />
        <CommandInput placeholder={`Search ${category.name}...`} autofocus />
        <CommandList>
          {categoryCommands.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              keywords={cmd.keywords}
              onSelect={() => handleCommandSelect(cmd)}
            >
              <span className="text-xl">{cmd.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{cmd.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {cmd.description}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </>
    )
  }
  return null
}
