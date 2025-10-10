import { Primitive } from '@radix-ui/react-primitive'
import { useCommandLoading } from '../../hooks/use-command-store'
import type { CommandLoadingProps } from '../../types'

/**
 * CommandLoading - Shown during async operations
 *
 * Displays when:
 * - Store loading state is true
 * - Async search in progress
 * - Data being fetched
 *
 * Features:
 * - Auto-show/hide based on loading state
 * - Optional progress indicator (0-1)
 * - Accessible loading announcements
 *
 * Usage:
 * ```
 * <CommandList>
 *   <CommandLoading>Searching...</CommandLoading>
 *   <CommandEmpty>No results</CommandEmpty>
 *   <CommandItem value="1">Item 1</CommandItem>
 * </CommandList>
 * ```
 */
export function CommandLoading({
  children = 'Loading...',
  progress,
  label = 'Loading results',
  className,
  ...props
}: CommandLoadingProps) {
  const loading = useCommandLoading()

  // Only show when loading
  if (!loading) {
    return null
  }

  return (
    <Primitive.div
      {...props}
      role="status"
      aria-live="polite"
      aria-label={label}
      className={className}
      data-command-loading
    >
      {/* Optional progress bar */}
      {progress !== undefined && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading progress"
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: 'currentColor',
              transition: 'width 0.2s ease',
            }}
            data-command-loading-bar
          />
        </div>
      )}

      {/* Loading message */}
      <div>{children}</div>
    </Primitive.div>
  )
}

// Display name for debugging
CommandLoading.displayName = 'CommandLoading'
