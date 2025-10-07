export default defineBackground(() => {
  console.log('🚀 Background script loaded')

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = {
    REQUEST_TIMEOUT: 10000, // 10 seconds
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 1000, // 1 second, exponential backoff
    MAX_BOOKMARKS_RESULTS: 10000,
    MAX_HISTORY_RESULTS: 1000,
  }

  // ============================================
  // TYPES
  // ============================================

  interface MessageRequest {
    type: string
    url?: string
    maxResults?: number
    startTime?: number
  }

  interface MessageResponse {
    success: boolean
    data?: any
    error?: string
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Wrap a promise with a timeout
   * Rejects if the promise doesn't resolve within the timeout period
   */
  function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ])
  }

  /**
   * Retry a function with exponential backoff
   *
   * @param fn Function to retry
   * @param maxRetries Maximum number of retry attempts
   * @param baseDelay Base delay in milliseconds (will be exponentially increased)
   * @returns Result of the function or throws last error
   */
  async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = CONFIG.MAX_RETRIES,
    baseDelay: number = CONFIG.RETRY_DELAY_BASE
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry on last attempt
        if (attempt === maxRetries) break

        // Calculate exponential backoff delay: 1s, 2s, 4s, 8s...
        const delay = baseDelay * Math.pow(2, attempt)

        console.warn(
          `⚠️ Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`,
          error
        )

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  /**
   * Validate message request
   * Ensures the message has required fields and correct types
   */
  function validateMessage(message: any): message is MessageRequest {
    if (!message || typeof message !== 'object') {
      return false
    }

    if (!message.type || typeof message.type !== 'string') {
      return false
    }

    // Type-specific validation
    switch (message.type) {
      case 'OPEN_BOOKMARK':
      case 'OPEN_HISTORY':
        return typeof message.url === 'string' && message.url.length > 0

      case 'GET_HISTORY':
        if (message.maxResults && typeof message.maxResults !== 'number') {
          return false
        }
        if (message.startTime && typeof message.startTime !== 'number') {
          return false
        }
        return true

      case 'GET_BOOKMARKS':
        return true

      default:
        return false
    }
  }

  /**
   * Create a standardized error response
   */
  function errorResponse(error: unknown, context: string): MessageResponse {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    console.error(`❌ ${context}:`, error)

    return {
      success: false,
      error: errorMessage,
    }
  }

  /**
   * Create a standardized success response
   */
  function successResponse(data?: any): MessageResponse {
    return {
      success: true,
      data,
    }
  }

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  /**
   * Handle GET_BOOKMARKS request
   * Fetches all bookmarks from Chrome's bookmark API
   */
  async function handleGetBookmarks(): Promise<MessageResponse> {
    try {
      const tree = await withTimeout(
        withRetry(() => chrome.bookmarks.getTree()),
        CONFIG.REQUEST_TIMEOUT,
        'Bookmark fetch timed out'
      )

      console.log(`📚 Fetched bookmark tree with ${tree.length} root nodes`)

      return successResponse(tree)
    } catch (error) {
      return errorResponse(error, 'Failed to fetch bookmarks')
    }
  }

  /**
   * Handle GET_HISTORY request
   * Fetches browsing history with optional time filter
   */
  async function handleGetHistory(
    maxResults: number = CONFIG.MAX_HISTORY_RESULTS,
    startTime?: number
  ): Promise<MessageResponse> {
    try {
      // Validate and cap maxResults
      const safeMaxResults = Math.min(
        Math.max(1, maxResults),
        CONFIG.MAX_HISTORY_RESULTS
      )

      const history = await withTimeout(
        withRetry(() =>
          chrome.history.search({
            text: '',
            maxResults: safeMaxResults,
            startTime: startTime || 0,
          })
        ),
        CONFIG.REQUEST_TIMEOUT,
        'History fetch timed out'
      )

      console.log(
        `📜 Fetched ${history.length} history items (max: ${safeMaxResults})`
      )

      return successResponse(history)
    } catch (error) {
      return errorResponse(error, 'Failed to fetch history')
    }
  }

  /**
   * Handle OPEN_BOOKMARK request
   * Opens a bookmark URL in the current tab
   */
  async function handleOpenBookmark(url: string): Promise<MessageResponse> {
    try {
      // Validate URL
      new URL(url) // Throws if invalid

      await withTimeout(
        chrome.tabs.update({ url }),
        CONFIG.REQUEST_TIMEOUT,
        'Failed to open bookmark (timeout)'
      )

      console.log(`🔖 Opened bookmark: ${url}`)

      return successResponse()
    } catch (error) {
      return errorResponse(error, 'Failed to open bookmark')
    }
  }

  /**
   * Handle OPEN_HISTORY request
   * Opens a history URL in the current tab
   */
  async function handleOpenHistory(url: string): Promise<MessageResponse> {
    try {
      // Validate URL
      new URL(url) // Throws if invalid

      await withTimeout(
        chrome.tabs.update({ url }),
        CONFIG.REQUEST_TIMEOUT,
        'Failed to open history item (timeout)'
      )

      console.log(`🕐 Opened history item: ${url}`)

      return successResponse()
    } catch (error) {
      return errorResponse(error, 'Failed to open history item')
    }
  }

  // ============================================
  // MESSAGE LISTENER
  // ============================================

  /**
   * Main message handler
   * Routes messages to appropriate handlers
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Validate message structure
    if (!validateMessage(message)) {
      console.error('❌ Invalid message received:', message)
      sendResponse({
        success: false,
        error: 'Invalid message format',
      })
      return false
    }

    // Log incoming message in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📨 Message received:', message.type, {
        from: sender.tab ? `tab ${sender.tab.id}` : 'extension',
      })
    }

    // Route to appropriate handler
    const handleRequest = async () => {
      try {
        let response: MessageResponse

        switch (message.type) {
          case 'GET_BOOKMARKS':
            response = await handleGetBookmarks()
            break

          case 'GET_HISTORY':
            response = await handleGetHistory(
              message.maxResults,
              message.startTime
            )
            break

          case 'OPEN_BOOKMARK':
            response = await handleOpenBookmark(message.url!)
            break

          case 'OPEN_HISTORY':
            response = await handleOpenHistory(message.url!)
            break

          default:
            // This should never happen due to validation
            response = {
              success: false,
              error: `Unknown message type: ${message.type}`,
            }
        }

        sendResponse(response)
      } catch (error) {
        // Catch-all for unexpected errors
        console.error('💥 Unexpected error in message handler:', error)
        sendResponse(errorResponse(error, 'Internal error'))
      }
    }

    // Execute async handler
    handleRequest()

    // Return true to indicate we'll call sendResponse asynchronously
    return true
  })

  // ============================================
  // INITIALIZATION
  // ============================================

  console.log('✅ Message handlers registered')

  // Optional: Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    console.log('⚙️ Configuration:', CONFIG)
  }
})
