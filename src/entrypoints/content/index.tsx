// src/entrypoints/content/index.tsx

import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('Content script loaded')

    const ui = await createShadowRootUi(ctx, {
      name: 'command-palette-overlay',
      position: 'inline',
      onMount: container => {
        console.log('UI mounted')
        const root = createRoot(container)
        root.render(<App />)
        return root
      },
      onRemove: root => {
        console.log('UI removed')
        root?.unmount()
      },
    })

    ui.mount()
    console.log('Content script initialization complete')
  },
})
