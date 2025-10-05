// src/entrypoints/background.ts

export default defineBackground(() => {
  console.log('Background script initialized', { id: browser.runtime.id })

  // You can keep this for other extension functionality
  // but it's no longer needed for Ctrl+K
})
