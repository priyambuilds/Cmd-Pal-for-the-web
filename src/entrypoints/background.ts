export default defineBackground(() => {
  console.log('Background script loaded')

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Handle bookmark requests
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

    // Handle opening bookmark
    if (message.type === 'OPEN_BOOKMARK') {
      chrome.tabs
        .update({ url: message.url })
        .then(() => {
          sendResponse({ success: true })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    // Handle history requests
    if (message.type === 'GET_HISTORY') {
      const { maxResults = 1000, startTime } = message

      chrome.history
        .search({
          text: '',
          maxResults,
          startTime: startTime || 0, // Default to all history
        })
        .then(history => {
          sendResponse({ success: true, data: history })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })
      return true
    }
    // Handle opening history item
    if (message.type === 'OPEN_HISTORY') {
      chrome.tabs
        .update({ url: message.url })
        .then(() => {
          sendResponse({ success: true })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })
      return true
    }

    // Unknown message type - return false
    console.warn('Unknown message type:', message.type)
    return false
  })
})
