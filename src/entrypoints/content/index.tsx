// src/entrypoints/content/index.tsx

import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('Content script loaded')

    let ui: any = null
    let root: ReturnType<typeof createRoot> | null = null
    let isOpen = false

    // Create but don't mount the UI yet
    const createUI = async () => {
      if (!ui) {
        ui = await createShadowRootUi(ctx, {
          name: 'command-palette-overlay',
          position: 'inline',
          onMount: container => {
            console.log('UI mounted - rendering App')
            root = createRoot(container)
            root.render(<App />)
            return root
          },
          onRemove: () => {
            console.log('UI removed')
            root?.unmount()
            root = null
            ui = null
          },
        })
      }
    }

    // Global keyboard shortcut handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Cmd/Ctrl + K: Toggle command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()

        if (!isOpen) {
          // Open palette
          isOpen = true
          createUI().then(() => {
            ui.mount()
          })
        } else {
          // Close palette
          isOpen = false
          ui?.remove()
        }
      }

      // Escape: Close if open
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        isOpen = false
        ui?.remove()
      }
    }

    // Add global keyboard listener
    window.addEventListener('keydown', handleKeyDown, { capture: true })

    console.log(
      'Content script initialization complete - waiting for keyboard shortcut'
    )
  },
})
