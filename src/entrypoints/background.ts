export default defineBackground(() => {
  console.log('Background script initialized', { id: browser.runtime.id })

  // Listen for messages from command script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // handle bookmark requests
    if (message.type === 'GET_BOOKMARKS') {
      chrome.bookmarks
        .getTree()
        .then(tree => {
          sendResponse({ success: true, data: tree })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })
      return true // Keep channel open for async response
    }

    // handle opening bookmark
  })
})
