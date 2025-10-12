/**
 * CommandErrorBoundary - Error boundary specifically for CMDK components
 *
 * Catches crashes in the command palette and provides fallback UI.
 * Logs errors for debugging and monitoring.
 */

import React from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface CommandErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  boundary?: string // Identifier for logging
}

interface CommandErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class CommandErrorBoundary extends React.Component<
  CommandErrorBoundaryProps,
  CommandErrorBoundaryState
> {
  constructor(props: CommandErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<CommandErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for monitoring/debugging
    console.error('[CMDK Error Boundary]', {
      boundary: this.props.boundary || 'unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })

    this.setState({ errorInfo })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In development, you might want to send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // reportError(error, { componentStack: errorInfo.componentStack })
    }
  }

  render() {
    if (this.state.hasError) {
      // Default fallback UI
      const defaultFallback = (
        <div
          role="alert"
          style={{
            padding: '16px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
            Command Palette Error
          </h3>
          <p style={{ margin: '0', fontSize: '14px' }}>
            Something went wrong with the command palette. Please try refreshing
            the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                Error Details (Development)
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )

      // Use custom fallback if provided
      return this.props.fallback
        ? this.props.fallback(this.state.error!, this.state.errorInfo!)
        : defaultFallback
    }

    return this.props.children
  }
}

/**
 * CommandStoreErrorBoundary - Specific error boundary for store-related errors
 *
 * Handles errors that occur during state management and search operations.
 */
export class CommandStoreErrorBoundary extends React.Component<
  Omit<CommandErrorBoundaryProps, 'boundary'>,
  CommandErrorBoundaryState
> {
  render() {
    return (
      <CommandErrorBoundary
        {...this.props}
        boundary="store"
        onError={(error, errorInfo) => {
          // Store-specific error handling
          console.warn('[CMDK Store Error]', error.message)

          // Reset store state if needed
          try {
            // Could call a store reset method here
          } catch (resetError) {
            console.error('[CMDK Store Reset Failed]', resetError)
          }

          this.props.onError?.(error, errorInfo)
        }}
      />
    )
  }
}

/**
 * Hook for handling errors in functional components
 */
export function useCommandErrorHandler() {
  return React.useCallback((error: Error, context?: string) => {
    console.error('[CMDK Hook Error]', {
      context: context || 'unknown',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })

    // Could send to error reporting service
    // reportError(error, { context, ...otherMetadata })
  }, [])
}

/**
 * Higher-order component that adds error boundary
 */
export function withCommandErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<CommandErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundary = (props: P) => (
    <CommandErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CommandErrorBoundary>
  )

  WithErrorBoundary.displayName = `withCommandErrorBoundary(${Component.displayName || Component.name})`

  return WithErrorBoundary
}

/**
 * Error recovery hook for retrying failed operations
 */
export function useCommandErrorRecovery() {
  const [retryCount, setRetryCount] = React.useState(0)
  const maxRetries = 3

  const retry = React.useCallback(
    (operation: () => void | Promise<void>) => {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        operation()
      }
    },
    [retryCount]
  )

  const reset = React.useCallback(() => {
    setRetryCount(0)
  }, [])

  return { retry, reset, canRetry: retryCount < maxRetries }
}
