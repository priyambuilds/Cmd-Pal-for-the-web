import { useState, useEffect } from 'react'
import './style.css'
import { createRoot } from 'react-dom/client'
import Command from '@/components/Command'
import CommandInput from '@/components/CommandInput'
import CommandList from '@/components/CommandList'
import CommandItem from '@/components/CommandItem'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Create UI container
    const ui = await createShadowRootUi(ctx, {
      name: 'command-palette-overlay',
      position: 'inline',
      onMount: container => {
        // Create React root and render
        const root = createRoot(container)
        root.render(<CommandPaletteOverlay />)
        return root
      },
      onRemove: root => {
        root?.unmount()
      },
    })

    // Mount the UI
    ui.mount()
  },
})

function CommandPaletteOverlay() {
  const [open, setOpen] = useState(false)

  // Listen for keyboard shortcut from background scrip
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === 'toggle-command-palette') {
        setOpen(prev => !prev)
      }
    }

    browser.runtime.onMessage.addListener(handleMessage)
    return () => browser.runtime.onMessage.removeListener(handleMessage)
  }, [])

  const handleSelect = (value: string) => {
    console.log('Selected:', value)
    setOpen(false)

    // Handle different command actions
    switch (value) {
      case 'open-settings':
        browser.runtime.openOptionsPage()
        break
      case 'new-tab':
        browser.tabs.create({})
        break
      // Add more handlers
      default:
        console.log('Command:', value)
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
                <div className="text-xs text-gray-500">
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
                <div className="text-xs text-gray-500">
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
                <div className="text-xs text-gray-500">
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
                <div className="text-xs text-gray-500">Search the web</div>
              </div>
            </CommandItem>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
