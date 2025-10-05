import { useState, useEffect } from 'react'
import Command from '@/components/Command'
import CommandInput from '@/components/CommandInput'
import CommandList from '@/components/CommandList'
import CommandItem from '@/components/CommandItem'

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
        <Command label="Global Command Menu" loop>
          <CommandInput placeholder="Type a command or search..." autofocus />

          <CommandList>
            <CommandItem
              value="open-settings"
              keywords={['preferences', 'config', 'options']}
              onSelect={handleSelect}
            >
              <span className="text-xl">⚙️</span>
              <div className="flex-1">
                <div className="font-medium">Open Settings</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Configure your preferences
                </div>
              </div>
              <kbd className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800">
                ⌘,
              </kbd>
            </CommandItem>

            <CommandItem
              value="new-tab"
              keywords={['create', 'browser']}
              onSelect={handleSelect}
            >
              <span className="text-xl">🆕</span>
              <div className="flex-1">
                <div className="font-medium">New Tab</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Open a new browser tab
                </div>
              </div>
            </CommandItem>

            <CommandItem
              value="calculator"
              keywords={['math', 'compute', 'calc']}
              onSelect={handleSelect}
            >
              <span className="text-xl">🧮</span>
              <div className="flex-1">
                <div className="font-medium">Calculator</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Perform calculations
                </div>
              </div>
            </CommandItem>

            <CommandItem
              value="google-search"
              keywords={['web', 'internet', 'find']}
              onSelect={handleSelect}
            >
              <span className="text-xl">🔍</span>
              <div className="flex-1">
                <div className="font-medium">Google Search</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Search the web
                </div>
              </div>
            </CommandItem>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
