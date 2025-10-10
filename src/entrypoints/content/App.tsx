// entrypoints/content/App.tsx

import { useState, useEffect } from 'react'
import { Command } from '@/components/command/Command'
import { CommandInput } from '@/components/command/CommandInput'
import { CommandList } from '@/components/command/CommandList'
import { CommandItem } from '@/components/command/CommandItem'
import { CommandGroup } from '@/components/command/CommandGroup'
import { CommandEmpty } from '@/components/command/CommandEmpty'
// import { CommandLoading } from '@/components/command/CommandLoading'
import { CommandSeparator } from '@/components/command/CommandSeparator'
import { CommandDialog } from '@/components/command/CommandDialog'

export default function App() {
  const [open, setOpen] = useState(false)

  // Setup Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Handle item selection
  const handleSelect = (value: string) => {
    console.log('Selected:', value)

    // Execute actions based on selected item
    switch (value) {
      case 'github':
        window.open('https://github.com', '_blank')
        break
      case 'google':
        window.open('https://google.com', '_blank')
        break
      case 'current-url':
        navigator.clipboard.writeText(window.location.href)
        alert('URL copied to clipboard!')
        break
      case 'scroll-top':
        window.scrollTo({ top: 0, behavior: 'smooth' })
        break
      case 'scroll-bottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        break
    }

    // Close dialog after selection
    setOpen(false)
  }

  return (
    <>
      {/* Use Command instead of CommandDialog for debugging */}
      <Command
        open={open}
        onOpenChange={setOpen}
        // Disable filtering temporarily to see all items
        config={{ filter: false }}
      >
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '640px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            overflow: 'hidden',
            display: open ? 'block' : 'none',
          }}
        >
          <CommandInput
            placeholder="Type a command or search..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '16px',
              outline: 'none',
            }}
          />

          <CommandList
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            <CommandEmpty>
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                No results found.
              </div>
            </CommandEmpty>

            <CommandGroup heading="Quick Actions">
              <CommandItem
                value="github"
                onSelect={handleSelect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                🚀 Open GitHub
              </CommandItem>
              <CommandItem
                value="google"
                onSelect={handleSelect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                🔍 Open Google
              </CommandItem>
              <CommandItem
                value="current-url"
                onSelect={handleSelect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                📋 Copy Current URL
              </CommandItem>
            </CommandGroup>

            <CommandSeparator
              style={{
                height: '1px',
                backgroundColor: '#e5e7eb',
                margin: '8px 0',
              }}
            />

            <CommandGroup heading="Navigation">
              <CommandItem
                value="scroll-top"
                onSelect={handleSelect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                ⬆️ Scroll to Top
              </CommandItem>
              <CommandItem
                value="scroll-bottom"
                onSelect={handleSelect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                ⬇️ Scroll to Bottom
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </div>
      </Command>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        />
      )}
    </>
  )
}
