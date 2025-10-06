import { useState, useEffect, useSyncExternalStore } from 'react'
import Command from '@/components/Command'
import CommandInput from '@/components/CommandInput'
import CommandList from '@/components/CommandList'
import CommandItem from '@/components/CommandItem'
import CommandEmpty from '@/components/CommandEmpty'
import BackButton from '@/components/Backbutton'
import { useCommandContext } from '@/types/context'
import { allCommands, getCommandById, getCategoryById } from '@/lib/commands'
import commandScore from 'command-score'

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

  const handleSelect = (value: string) => {
    console.log('Selected:', value)
    setOpen(false)

    // Handle different commands
    switch (value) {
      case 'open-settings':
        browser.runtime.openOptionsPage()
        break
      case 'new-tab':
        browser.tabs.create({})
        break
      default:
        alert(`Executed: ${value}`)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-[9999]"
      onClick={() => setOpen(false)}
    >
      <div onClick={e => e.stopPropagation()}>
        <Command label="Global Command Menu">
          <CommandContext onClose={() => setOpen(false)} />
        </Command>
      </div>
    </div>
  )
}

function CommandContext({ onClose }: { onClose: () => void }) {
  const store = useCommandContext()

  // subscribe to current view
  const view = useSyncExternalStore(
    store.subscribe,
    () => store.getState().view
  )

  // Handle command selection
  const handleCommandSelect = (command: Command) => {
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
    // filter commands by query
    const filteredCommands = view.query
      ? allCommands
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
      : allCommands

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
              {/* Show arrow for portals */}
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
              <p className="text-xs">Try searching for something else</p>
            </div>
          </CommandEmpty>
        </CommandList>
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
        <div className="min-h-[200px]">{portal.renderContent(view.query)}</div>
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
