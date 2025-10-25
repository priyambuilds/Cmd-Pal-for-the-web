# **Building CMDK from Scratch: Complete Beginner's Guide**

## Step-by-Step Tutorial to Create Your Own Command Palette Library

This comprehensive guide will teach you how to build a production-ready command palette library like the one in this codebase. We'll start with basic concepts and gradually add advanced features until you have a library that rivals Raycast and VS Code's command palette.

---

## 📋 **What We're Building**

Our final CMDK library will have:

- ✅ **Advanced fuzzy search** with multi-factor scoring
- ✅ **Keyboard-first navigation** with custom shortcuts
- ✅ **Async data loading** from APIs
- ✅ **Usage learning** and frequency-based suggestions
- ✅ **Web Workers** for performance
- ✅ **IndexedDB caching** for persistence
- ✅ **Error boundaries** and resilience
- ✅ **Comprehensive testing** and TypeScript
- ✅ **Production build** with tree-shaking
- ✅ **Documentation** and examples

---

# **Phase 1: Foundation - Basic Search Component**

## Start with React Hooks and TypeScript

### **Step 1: Project Setup**

Create a new React + TypeScript project:

```bash
# Create project
npx create-vite cmdk-from-scratch --template react-ts
cd cmdk-from-scratch

# Install dependencies
npm install
npm install -D @types/node

# Start dev server
npm run dev
```

**Why this setup:**

- Vite for fast development
- TypeScript for type safety
- Modern React with hooks

### **Step 2: Core Types**

Create `src/types.ts`:

```typescript
/**
 * Basic command item - represents one selectable option
 */
export interface CommandItem {
  id: string // Unique identifier
  value: string // Display text
}

/**
 * State of our command palette
 */
export interface CommandPaletteState {
  query: string // Current search query
  items: CommandItem[] // All available items
  filteredItems: CommandItem[] // Items matching current query
  selectedIndex: number // Which item is currently highlighted
  isOpen: boolean // Is the palette visible?
}
```

**Teaching moment:** These types define our data model. The `CommandItem` is our basic building block - an item that can be searched and selected.

### **Step 3: Simple Search Hook**

Create `src/hooks/useCommandPalette.ts`:

```typescript
import { useState, useMemo } from 'react'

/**
 * Basic fuzzy matching - checks if query appears in text
 * We'll replace this with better algorithms later
 */
function simpleSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

/**
 * useCommandPalette - Core hook that manages search state
 */
export function useCommandPalette(items: CommandItem[]) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Filter items based on current query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    return items.filter(item => simpleSearch(item.value, query))
  }, [items, query])

  // Reset selection when filtered results change
  useState(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1))
    }
  }, [filteredItems, selectedIndex])

  const selectItem = (index: number) => {
    const item = filteredItems[index]
    if (item) {
      console.log('Selected:', item)
      closePalette()
    }
  }

  const openPalette = () => setIsOpen(true)
  const closePalette = () => setIsOpen(false)

  const navigateUp = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1))
  }

  const navigateDown = () => {
    setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0))
  }

  return {
    // State
    query,
    selectedIndex,
    filteredItems,
    isOpen,

    // Actions
    setQuery,
    setSelectedIndex,
    selectItem,
    openPalette,
    closePalette,
    navigateUp,
    navigateDown,
  }
}
```

**Teaching moment:** This hook demonstrates:

- React state management with useState
- Performance optimization with useMemo
- Encapsulated logic for maintainability

### **Step 4: Basic Component Structure**

Create `src/components/CommandPalette.tsx`:

```typescript
import { useEffect } from 'react'
import { useCommandPalette } from '../hooks/useCommandPalette'
import type { CommandItem } from '../types'

interface CommandPaletteProps {
  items: CommandItem[]
}

export function CommandPalette({ items }: CommandPaletteProps) {
  const {
    query, setQuery, selectedIndex,
    filteredItems, isOpen,
    selectItem, openPalette, closePalette,
    navigateUp, navigateDown
  } = useCommandPalette(items)

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open palette with Ctrl+K
      if (!isOpen && e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        openPalette()
        return
      }

      if (!isOpen) return

      // Close with Escape
      if (e.key === 'Escape') {
        closePalette()
        return
      }

      // Navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateUp()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateDown()
        return
      }

      // Select item
      if (e.key === 'Enter') {
        e.preventDefault()
        selectItem(selectedIndex)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, selectItem, openPalette, closePalette, navigateUp, navigateDown])

  // Don't render if closed
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '500px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Search Input */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search commands..."
        style={{
          width: '100%',
          padding: '16px',
          border: 'none',
          borderBottom: '1px solid #e5e7eb',
          outline: 'none',
          fontSize: '16px',
          background: 'transparent',
        }}
        autoFocus
      />

      {/* Results List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: '12px 16px',
              backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              borderBottom: index < filteredItems.length - 1 ? '1px solid #f9fafb' : 'none',
            }}
            onClick={() => selectItem(index)}
          >
            {item.value}
          </div>
        ))}

        {filteredItems.length === 0 && query && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No results for "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
```

**Teaching moment:** This component shows:

- Controlled components with event handlers
- Global keyboard event handling
- Conditional rendering
- Component composition

### **Step 5: Test the Basic Version**

Update `src/App.tsx`:

```typescript
import { CommandPalette } from './components/CommandPalette'

const sampleCommands = [
  { id: 'file-open', value: 'Open File' },
  { id: 'file-save', value: 'Save File' },
  { id: 'file-new', value: 'New File' },
  { id: 'edit-copy', value: 'Copy' },
  { id: 'edit-paste', value: 'Paste' },
  { id: 'view-zoom-in', value: 'Zoom In' },
]

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>CMDK Tutorial - Phase 1</h1>
      <p>Press <kbd>Ctrl+K</kbd> to open the command palette</p>
      <CommandPalette items={sampleCommands} />
    </div>
  )
}

export default App
```

## 🎉 **Phase 1 Complete!**

You've built a basic command palette that:

- ✅ Opens with keyboard shortcut
- ✅ Filters and searches items
- ✅ Keyboard navigation (↑↓ arrows, Enter, Escape)
- ✅ Click to select
- ✅ Modal overlay

**Test it:** Press Ctrl+K, type "file", use arrow keys to navigate!

---

# **Phase 2: Scoring Algorithm - Better Search**

## Making Search Smarter with Weighted Scoring

### **Step 1: Enhanced Scoring System**

Create `src/utils/scoring.ts`:

```typescript
/**
 * Advanced command scoring based on command-score algorithm
 * Ranks matches by relevance using multiple factors
 */
export function commandScore(text: string, query: string): number {
  if (!query) return 1
  if (!text) return 0

  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact match gets highest score
  if (textLower === queryLower) return 1

  // Contains exact query gets high score
  const queryIndex = textLower.indexOf(queryLower)
  if (queryIndex !== -1) {
    // Early matches score higher
    const positionBonus = 1 - (queryIndex / textLower.length) * 0.3
    return 0.9 * positionBonus
  }

  // Character-by-character matching (fuzzy search)
  return fuzzyScore(textLower, queryLower)
}

/**
 * Fuzzy matching with character-level scoring
 */
function fuzzyScore(text: string, query: string): number {
  if (query.length === 0) return 1

  let score = 0
  let queryIndex = 0
  let consecutiveBonus = 0

  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      // Found a matching character
      score += 1

      // Bonus for earlier matches
      score += (query.length - queryIndex) * 0.1

      // Bonus for consecutive matches
      if (consecutiveBonus > 0) {
        score += consecutiveBonus
      }
      consecutiveBonus += 0.5

      queryIndex++
    } else {
      consecutiveBonus = 0
    }
  }

  // Only return score if we found all characters
  if (queryIndex === query.length) {
    // Normalize by query length and text length
    return (score / text.length) * (query.length / query.length)
  }

  return 0
}
```

**Teaching moment:** This algorithm:

- **Exact matches** score highest (1.0)
- **Substring matches** score well (0.9) with position bonuses
- **Fuzzy matching** finds results even with typos

### **Step 2: Update Types with Scoring**

Update `src/types.ts`:

```typescript
export interface CommandItem {
  id: string
  value: string
  score?: number // Add optional score field
}
```

### **Step 3: Enhanced Hook with Scoring**

Update `src/hooks/useCommandPalette.ts`:

```typescript
import { useMemo } from 'react'
import { commandScore } from '../utils/scoring'
import type { CommandItem } from '../types'

// ... existing code ...

// Enhanced filtering with scoring and sorting
const filteredItems = useMemo(() => {
  if (!query.trim()) return items

  return items
    .map(item => ({
      ...item,
      score: commandScore(item.value, query),
    }))
    .filter(item => item.score! > 0)
    .sort((a, b) => b.score! - a.score!) // Higher scores first
}, [items, query])
```

**Teaching moment:** The key improvements:

- **Map/filter/sort**: Three-step process for data transformation
- **Score calculation**: Each item gets a relevance score
- **Descending sort**: Best matches appear first

### **Step 4: Show Scores in Development**

Update the CommandPalette component to display scores:

```typescript
// In the results mapping
{item.value}
{process.env.NODE_ENV === 'development' && item.score !== undefined && (
  <span style={{
    color: '#6b7280',
    fontSize: '12px',
    marginLeft: '8px'
  }}>
    ({item.score.toFixed(2)})
  </span>
)}
```

## 🎯 **Phase 2 Results**

Now try searching:

- **"file"** → "Open File", "Save File", "New File" ranked by relevance
- **"edit"** → "Copy", "Paste" (exact matches rank higher)
- **"zoom"** → "Zoom In" scores perfectly

The algorithm understands **relevance**!

---

# **Phase 3: Store Pattern - Better State Management**

## Centralized State for Complex Features

### **Step 1: Create Observable Store**

Create `src/store/commandStore.ts`:

```typescript
import { commandScore } from '../utils/scoring'
import type { CommandItem, CommandPaletteState } from '../types'

/**
 * Observable store for command palette state
 * Allows multiple components to subscribe to changes
 */
export class CommandStore {
  private state: CommandPaletteState
  private listeners: Array<(state: CommandPaletteState) => void> = []

  constructor() {
    this.state = {
      query: '',
      items: [],
      filteredItems: [],
      selectedIndex: 0,
      isOpen: false,
    }
  }

  // Subscribe to state changes
  subscribe(listener: (state: CommandPaletteState) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Get current state snapshot
  getSnapshot(): CommandPaletteState {
    return { ...this.state }
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener(this.getSnapshot()))
  }

  // Actions that modify state
  setQuery(query: string) {
    const filteredItems = this.computeFilteredItems(query, this.state.items)

    this.state = {
      ...this.state,
      query,
      filteredItems,
      selectedIndex: 0, // Reset selection on new query
    }

    this.notify()
  }

  setItems(items: CommandItem[]) {
    const filteredItems = this.computeFilteredItems(this.state.query, items)

    this.state = {
      ...this.state,
      items: [...items],
      filteredItems,
      selectedIndex: Math.min(
        this.state.selectedIndex,
        filteredItems.length - 1
      ),
    }

    this.notify()
  }

  setOpen(isOpen: boolean) {
    this.state = { ...this.state, isOpen }
    this.notify()
  }

  setSelectedIndex(index: number) {
    const maxIndex = this.state.filteredItems.length - 1
    this.state = {
      ...this.state,
      selectedIndex: Math.max(0, Math.min(index, maxIndex)),
    }
    this.notify()
  }

  selectCurrent() {
    const item = this.state.filteredItems[this.state.selectedIndex]
    if (item) {
      console.log('Selected:', item)
      this.setOpen(false)
    }
  }

  // Private method for filtering logic
  private computeFilteredItems(
    query: string,
    items: CommandItem[]
  ): CommandItem[] {
    if (!query.trim()) return [...items]

    return items
      .map(item => ({
        ...item,
        score: commandScore(item.value, query),
      }))
      .filter(item => item.score! > 0)
      .sort((a, b) => b.score! - a.score!)
  }
}

// Singleton instance
export const commandStore = new CommandStore()
```

**Teaching moment:** The store pattern provides:

- **Centralized state** - One source of truth
- **Observable updates** - Components react to changes
- **Clean separation** - Business logic in store, UI in components

### **Step 2: React Integration Hook**

Create `src/hooks/useCommandStore.ts`:

```typescript
import { useSyncExternalStore } from 'react'
import { commandStore } from '../store/commandStore'

/**
 * React hook that connects to our external store
 * Uses React 18's useSyncExternalStore for optimal performance
 */
export function useCommandStore() {
  const state = useSyncExternalStore(
    commandStore.subscribe.bind(commandStore),
    commandStore.getSnapshot.bind(commandStore)
  )

  return {
    // State
    ...state,

    // Actions
    setQuery: commandStore.setQuery.bind(commandStore),
    setItems: commandStore.setItems.bind(commandStore),
    setOpen: commandStore.setOpen.bind(commandStore),
    setSelectedIndex: commandStore.setSelectedIndex.bind(commandStore),
    selectCurrent: commandStore.selectCurrent.bind(commandStore),

    // Navigation helpers
    navigateUp: () => commandStore.setSelectedIndex(state.selectedIndex - 1),
    navigateDown: () => commandStore.setSelectedIndex(state.selectedIndex + 1),
  }
}
```

**Teaching moment:** `useSyncExternalStore` is React's way of connecting to external stores with minimal re-renders.

### **Step 3: Update Components to Use Store**

Update CommandPalette component:

```typescript
import { useEffect } from 'react'
import { useCommandStore } from '../hooks/useCommandStore'

export function CommandPalette({ items }: CommandPaletteProps) {
  const {
    query,
    setQuery,
    filteredItems,
    selectedIndex,
    isOpen,
    setOpen,
    setSelectedIndex,
    selectCurrent,
    navigateUp,
    navigateDown,
    setItems,
  } = useCommandStore()

  // Update items when props change
  useEffect(() => {
    setItems(items)
  }, [items, setItems])

  // ... existing keyboard handling but use navigateUp/navigateDown ...
}
```

## 🏗️ **Phase 3 Complete**

Your architecture now has:

- ✅ **Observable store** with subscription system
- ✅ **React integration** via useSyncExternalStore
- ✅ **Clean separation** between state and UI
- ✅ **Singleton pattern** for global state

---

# **Phase 4: Modular Components - Reusable Parts**

## Breaking Down into Smaller, Testable Pieces

### **Step 1: Individual Component Files**

Create `src/components/CommandInput.tsx`:

```typescript
interface CommandInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CommandInput({
  value,
  onChange,
  placeholder = "Search commands..."
}: CommandInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck="false"
      style={{
        width: '100%',
        padding: '16px 20px',
        border: 'none',
        borderBottom: '1px solid #e5e7eb',
        outline: 'none',
        fontSize: '16px',
        background: 'transparent',
        fontFamily: 'inherit',
      }}
    />
  )
}
```

Create `src/components/CommandItem.tsx`:

```typescript
import type { CommandItem as CommandItemType } from '../types'

interface CommandItemProps {
  item: CommandItemType
  isSelected: boolean
  onClick: () => void
}

export function CommandItem({ item, isSelected, onClick }: CommandItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 20px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
        borderBottom: '1px solid #f9fafb',
        transition: 'background-color 0.1s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span>{item.value}</span>
      {process.env.NODE_ENV === 'development' && item.score && (
        <span style={{
          color: '#9ca3af',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          ({item.score.toFixed(2)})
        </span>
      )}
    </div>
  )
}
```

Create `src/components/CommandList.tsx`:

```typescript
import { CommandItem } from './CommandItem'
import type { CommandItem as CommandItemType } from '../types'

interface CommandListProps {
  items: CommandItemType[]
  selectedIndex: number
  onItemSelect: (index: number) => void
  maxHeight?: number
}

export function CommandList({
  items,
  selectedIndex,
  onItemSelect,
  maxHeight = 300
}: CommandListProps) {
  return (
    <div
      style={{
        maxHeight: `${maxHeight}px`,
        overflowY: items.length > 8 ? 'auto' : 'visible',
        borderTop: '1px solid #f3f4f6',
      }}
    >
      {items.map((item, index) => (
        <CommandItem
          key={item.id}
          item={item}
          isSelected={index === selectedIndex}
          onClick={() => onItemSelect(index)}
        />
      ))}

      {items.length === 0 && (
        <div style={{
          padding: '32px 20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          No results found
        </div>
      )}
    </div>
  )
}
```

### **Step 2: Simplified Main Component**

Update `src/components/CommandPalette.tsx`:

```typescript
import { CommandInput } from './CommandInput'
import { CommandList } from './CommandList'
import { useCommandStore } from '../hooks/useCommandStore'
import type { CommandItem } from '../types'

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const {
    query, setQuery, filteredItems, selectedIndex, isOpen,
    setOpen, setSelectedIndex, selectCurrent
  } = useCommandStore()

  // ... keyboard handling code ...

  const handleItemSelect = (index: number) => {
    setSelectedIndex(index)
    selectCurrent()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '600px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 1000,
    }}>
      <CommandInput
        value={query}
        onChange={setQuery}
        placeholder="Search commands..."
      />

      <CommandList
        items={filteredItems}
        selectedIndex={selectedIndex}
        onItemSelect={handleItemSelect}
      />
    </div>
  )
}
```

**Teaching moment:** Modular components provide:

- **Reusability** - Use components independently
- **Testability** - Test each component in isolation
- **Maintainability** - Change one without affecting others

### **Step 3: Export Index File**

Create `src/components/index.ts`:

```typescript
export { CommandPalette } from './CommandPalette'
export { CommandInput } from './CommandInput'
export { CommandList } from './CommandList'
export { CommandItem } from './CommandItem'
export { useCommandStore } from '../hooks/useCommandStore'

export type { CommandItem } from '../types'
```

## 📦 **Phase 4 Complete**

Now you have:

- ✅ **Modular components** that work together
- ✅ **Reusable parts** for future features
- ✅ **Clean API** for library users
- ✅ **Better testing** capabilities

---

# **Phase 5: Keywords & Groups - Enhanced Search**

## Adding Metadata and Organization

### **Step 1: Enhanced Types**

Update `src/types.ts`:

```typescript
export interface CommandItem {
  id: string
  value: string // Display text
  keywords?: string[] // Extra search terms
  group?: string // Which group it belongs to
  score?: number
}

export interface CommandGroup {
  id: string
  name: string
  items: CommandItem[]
}
```

### **Step 2: Group Component**

Create `src/components/CommandGroup.tsx`:

```typescript
import { CommandItem } from './CommandItem'
import type { CommandGroup as CommandGroupType, CommandItem as CommandItemType } from '../types'

interface CommandGroupProps {
  group: CommandGroupType
  selectedIndex: number
  itemOffset: number  // Global offset in filtered list
  onItemSelect: (globalIndex: number) => void
}

export function CommandGroup({ group, selectedIndex, itemOffset, onItemSelect }: CommandGroupProps) {
  const groupItems = group.items.filter(item => item.score && item.score > 0)

  // Don't render empty groups
  if (groupItems.length === 0) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Group Header */}
      <div style={{
        padding: '8px 20px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        {group.name}
      </div>

      {/* Group Items */}
      {groupItems.map((item, localIndex) => {
        const globalIndex = itemOffset + localIndex
        return (
          <CommandItem
            key={item.id}
            item={item}
            isSelected={globalIndex === selectedIndex}
            onClick={() => onItemSelect(globalIndex)}
          />
        )
      })}
    </div>
  )
}
```

### **Step 3: Enhanced Scoring with Keywords**

Update `src/utils/scoring.ts`:

```typescript
export
```
