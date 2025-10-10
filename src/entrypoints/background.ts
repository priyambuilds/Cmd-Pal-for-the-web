// entrypoints/background.ts

export default defineBackground(() => {
  console.log('CMDK Extension background script loaded')

  // Listen for keyboard commands
  browser.commands.onCommand.addListener(command => {
    if (command === 'toggle-command-palette') {
      // Send message to content script to toggle
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: 'toggle-palette' })
        }
      })
    }
  })
})
