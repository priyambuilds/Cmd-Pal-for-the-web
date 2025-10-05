export default defineBackground(() => {
  console.log('Background script initialized')

  // Listen for keyboard command
  browser.commands.onCommand.addListener(command => {
    if (command === 'toggle-command-palette') {
      // Send message to active tab to toggle palette
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        const activeTab = tabs[0]
        if (activeTab?.id) {
          browser.tabs.sendMessage(activeTab.id, {
            action: 'toggle-command-palette',
          })
        }
      })
    }
  })
})
