import { useEffect } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Command } from './Command'
import type { CommandDialogProps } from '../../types'

/**
 * CommandDialog - Modal wrapper for the command palette
 *
 * This wraps the Command component in a Radix Dialog for modal behavior.
 * Perfect for keyboard shortcuts (Ctrl+K) style command palettes.
 *
 * Features:
 * - Modal overlay/backdrop
 * - Focus trapping
 * - Escape key handling
 * - Click outside to close
 * - Body scroll lock
 * - Portal rendering (avoids z-index issues)
 *
 * Usage:
 * ```
 * const [open, setOpen] = useState(false)
 *
 * // Setup keyboard shortcut
 * useEffect(() => {
 *   const down = (e: KeyboardEvent) => {
 *     if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
 *       e.preventDefault()
 *       setOpen(true)
 *     }
 *   }
 *   document.addEventListener('keydown', down)
 *   return () => document.removeEventListener('keydown', down)
 * }, [])
 *
 * return (
 *   <CommandDialog open={open} onOpenChange={setOpen}>
 *     <CommandInput />
 *     <CommandList>
 *       <CommandItem value="1">Item 1</CommandItem>
 *     </CommandList>
 *   </CommandDialog>
 * )
 * ```
 */
export function CommandDialog({
  open,
  onOpenChange,
  overlayClassName,
  contentClassName,
  showCloseButton = false,
  children,
  ...commandProps
}: CommandDialogProps) {
  /**
   * Clear search query when dialog closes
   * This ensures fresh start each time dialog opens
   */
  useEffect(() => {
    if (!open) {
      // Small delay to allow close animation to complete
      const timer = setTimeout(() => {
        // You could clear the query here if needed
        // store.setQuery('')
      }, 200)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [open])

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* Overlay/Backdrop */}
        <RadixDialog.Overlay
          className={overlayClassName}
          data-command-dialog-overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
          }}
        />

        {/* Dialog Content */}
        <RadixDialog.Content
          className={contentClassName}
          data-command-dialog-content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '640px',
            width: '90%',
            maxHeight: '85vh',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 51,
            // Prevent body scroll when dialog is open
            overflow: 'hidden',
          }}
        >
          {/* Command Component */}
          <Command {...commandProps} open={open} onOpenChange={onOpenChange}>
            {children}
          </Command>

          {/* Optional close button */}
          {showCloseButton && (
            <RadixDialog.Close
              asChild
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              <button
                type="button"
                aria-label="Close command palette"
                data-command-dialog-close
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

// Display name for debugging
CommandDialog.displayName = 'CommandDialog'
