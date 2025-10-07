import React, { Component, ReactNode } from 'react'

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolationLevel?: 'component' | 'global' // How much to isolate errors
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetCount: number // Track how many times we've reset
}

/**
 * Error boundary with recovery mechanisms
 *
 * Features:
 * - User-friendly error UI
 * - Automatic recovery attempts
 * - Development mode stack traces
 * - Component isolation
 * - Error logging
 *
 * Usage:
 * ```
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```
 * <ErrorBoundary fallback={(error, reset) => (
 *   <div>
 *     <p>Error: {error.message}</p>
 *     <button onClick={reset}>Try Again</button>
 *   </div>
 * )}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: 0,
    }
  }
  /**
   * React lifecycle: Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }
  /**
   * React lifecycle: Handle error after it's caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('🔥 Error Boundary caught an error:', error)
    console.error('Component stack:', errorInfo.componentStack)

    // Update state with error info
    this.setState({
      errorInfo,
    })
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
    }
  }
  /**
   * Reset error boundary and try to recover
   */
  resetErrorBoundary = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: prevState.resetCount + 1,
    }))
  }
  /**
   * Render error UI or children
   */
  render(): ReactNode {
    const { hasError, error, errorInfo, resetCount } = this.state
    const { children, fallback, isolationLevel = 'component' } = this.props

    // No error - render children normally
    if (!hasError) {
      return children
    }

    // Too many attempts - show fatal error
    if (resetCount >= 3) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="mb-4 text-6xl">💥</div>
          <h3 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
            Fatal Error
          </h3>
          <p className="max-w-md mb-4 text-center text-red-600 dark:text-red-300">
            This component has crashed multiple times. Please reload the
            extension.
          </p>
          <button
            onClick={() => chrome.runtime.reload()}
            className="px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
          >
            Reload Extension
          </button>
        </div>
      )
    }

    // Custom fallbck provided
    if (fallback && error) {
      return fallback(error, this.resetErrorBoundary)
    }

    // Default error UI
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        {/* Error Icon */}
        <div className="mb-3 text-5xl">⚠️</div>

        {/* Error Title */}
        <h3 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-200">
          {isolationLevel === 'global'
            ? 'Application Error'
            : 'Component Error'}
        </h3>

        {/* Error Message */}
        <p className="max-w-md mb-4 text-sm text-center text-yellow-700 dark:text-yellow-300">
          {error?.message || 'An unexpected error occurred'}
        </p>

        {/* Recovery Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.resetErrorBoundary}
            className="px-4 py-2 text-sm font-medium text-white transition-colors bg-yellow-600 rounded-lg hover:bg-yellow-700"
          >
            Try Again
          </button>

          {isolationLevel === 'global' && (
            <button
              onClick={() => chrome.runtime.reload()}
              className="px-4 py-2 text-sm font-medium text-white transition-colors bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              Reload Extension
            </button>
          )}
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && errorInfo && (
          <details className="w-full max-w-2xl mt-6">
            <summary className="text-sm font-medium text-yellow-700 cursor-pointer dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200">
              🐛 Developer Info (click to expand)
            </summary>
            <div className="p-4 mt-3 overflow-auto bg-gray-900 rounded-lg max-h-64">
              <div className="mb-3">
                <div className="mb-1 text-xs text-gray-400">Error:</div>
                <code className="text-xs text-red-400">
                  {error?.toString()}
                </code>
              </div>
              <div className="mb-3">
                <div className="mb-1 text-xs text-gray-400">Stack:</div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                  {error?.stack}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs text-gray-400">
                  Component Stack:
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </div>
            </div>
          </details>
        )}

        {/* Reset Count Indicator */}
        {resetCount > 0 && (
          <p className="mt-4 text-xs text-yellow-600 dark:text-yellow-400">
            Recovery attempt: {resetCount}/3
          </p>
        )}
      </div>
    )
  }
}

/**
 * Hook to use error boundary imperatively
 * Allows components to manually trigger error boundary
 *
 * Usage:
 * ```
 * function MyComponent() {
 *   const throwError = useErrorHandler()
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation()
 *     } catch (error) {
 *       throwError(error) // Will be caught by nearest error boundary
 *     }
 *   }
 * }
 * ```
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error>()

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error // This will be cause by the error boundary
    })
  }, [])
}
