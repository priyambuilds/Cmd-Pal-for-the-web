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
