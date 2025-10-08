import { createContext, use, useId, useRef, useEffect } from 'react' // Using React 19's 'use' hook
import type { Context as ContextType, Store } from './types'

const CommandContext = createContext<ContextType | undefined>(undefined)

/**
 * Hook to access command context
 * Uses React 19's 'use()' instead of 'useContext()'
 */
export const useCommand = () => {
  const context = use(CommandContext)
  if (!context) {
    throw new Error('useCommand must be used within a Command component')
  }
  return context
}

interface CommandProviderProps {
  children: React.ReactNode
  store: Store
  label?: string
  shouldFilter?: boolean
  filter?: (value: string, search: string, keywords?: string[]) => number
  value?: string
  onValueChange?: (value: string) => void
  loop?: boolean
  disablePointerSelection?: boolean
  vimBindings?: boolean
}

export const CommandProvider = ({
  children,
  store,
  label = 'Command Menu',
  shouldFilter = true,
  filter,
  loop = false,
  disablePointerSelection = false,
  vimBindings = true,
  value: controlledValue,
  onValueChange,
}: CommandProviderProps) => {
  // Generate unique IDs for accessibility (this is fine, stable across renders)
  const listId = useId()
  const labelId = useId()
  const inputId = useId()

  // Refs for tracking without re-renders
  const allItems = useRef<Map<string, string>>(new Map())
  const allGroups = useRef<Set<string>>(new Set())
  const ids = useRef<Map<string, string>>(new Map())
  const itemKeywords = useRef<Map<string, string[]>>(new Map())

  const snapshot = store.snapshot()

  // Registration functions
  // Note: No useCallback! React Compiler handles this automatically
  const value = (id: string, itemValue: string, keywords?: string[]) => {
    allItems.current.set(id, itemValue)
    ids.current.set(itemValue, id)

    if (keywords) {
      itemKeywords.current.set(id, keywords)
    }
  }

  const item = (id: string, groupId: string) => {
    // return cleanup function
    return () => {
      const itemValue = allItems.current.get(id)
      allItems.current.delete(id)
      if (itemValue) {
        ids.current.delete(itemValue)
      }
      itemKeywords.current.delete(id)
    }
  }

  const group = (id: string) => {
    allGroups.current.add(id)

    return () => {
      allGroups.current.delete(id)
    }
  }

  const filterFn = () => shouldFilter

  // Controlled value sync
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== snapshot.value) {
      store.setState('value', controlledValue)
    }
  }, [controlledValue, snapshot.value])

  // Notify parent of value changes
  useEffect(() => {
    if (onValueChange && snapshot.value !== controlledValue) {
      onValueChange(snapshot.value)
    }
  }, [snapshot.value, onValueChange, controlledValue])

  // Build context value
  // Note: No useMemo! React Compiler memoizes this automatically
  const contextValue: ContextType = {
    value,
    item,
    group,
    filter: filterFn,
    label,
    disablePointerSelection,
    listId,
    inputId,
    labelId,
    allItems,
    allGroups,
    ids,
    setState: store.setState,
  };

  return (
    <CommandContext value={contextValue}>
      {children}
    </CommandContext>
  )
}
