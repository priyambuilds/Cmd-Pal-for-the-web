# CMDK Library Rewrite - Complete Bug Fix Documentation

## Project Overview

This document details the debugging and fixing of a React 19-based CMDK (Command Menu & Document Keyboard) library rewrite. The library was rewritten from the original single-file implementation to a modern, modular architecture using:

- React 19 with modern hooks
- Zustand-inspired global store pattern
- TypeScript 5.9+
- Modular component architecture
- Context-based communication

The rewrite aimed to provide the same fluent UX as the original CMDK (used by tools like Raycast), but with modern React patterns and better maintainability.

## Root Cause Analysis

### Architecture Mismatch - The Fundamental Issue

**Problem**: The original CMDK used Context-based implicit item registration, while this rewrite used explicit store-based management. This created severe compatibility issues:

- Original: Items registered themselves via Context when mounted
- Rewrite: Items were supposed to register explicitly, but timing issues prevented this

**Impact**: CommandItems weren't registering with the store, causing no items to appear.

**Consequence**: Multiple cascading failures in filtering, rendering, and search functionality.

### Development Process

The debugging followed this iterative process:

1. Identify why items weren't rendering
2. Fix item registration issues
3. Enable search/filtering functionality
4. Resolve React Rules of Hooks violations
5. Optimize UX (hide group headings when searching)

## Detailed Fix Documentation

### Fix #1 - Variable Typo in CommandList

**File**: `src/components/command/CommandList.tsx`
**Lines**: 43-48

#### Problem Description

```tsx
// BROKEN
const reuslts = useCommandResults()
```

Variable was incorrectly named `reuslts` instead of `results`.

#### Root Cause

Typo during refactoring from original CMDK code.

#### Impact

- Auto-scrolling to selected items failed silently
- Component couldn't access search results for UI updates
- Contributed to confusing debug output

#### Technical Details

This prevented the CommandList component from:

- Accessing current search results for proper rendering
- Implementing auto-scroll selection behavior
- Reacting to state changes properly

#### Fix Implementation

```tsx
// FIXED
const results = useCommandResults()
```

**Testing**: Verified auto-scroll now works when navigating with arrow keys.

---

### Fix #2 - Incorrect DOM Selector for Auto-Scroll

**File**: `src/components/command/CommandList.tsx`
**Lines**: 75

#### Problem Description

```tsx
// BROKEN
const selectedElement = listRef.current.querySelector(
  `[data-command-item-id="${selectedItem.id}"]`
)
```

Used wrong data attribute selector.

#### Root Cause

Mismatch between data attributes set on CommandItem components:

- CommandItem set: `data-command-item={value}`
- CommandList searched: `[data-command-item-id="${selectedItem.id}"]`

#### Impact

- Auto-scroll to selected item didn't work
- Keyboard navigation appeared broken (items selected but viewport didn't follow)
- Poor user experience during navigation

#### Technical Details

CommandList implements auto-scroll behavior by:

1. Finding selected item in DOM using data attributes
2. Calling `scrollIntoView()` with smooth scrolling
3. Prioritizing scrolling with LOW scheduler priority

#### Fix Implementation

```tsx
// FIXED
const selectedElement = listRef.current.querySelector(
  `[data-command-item="${selectedItem.id}"]`
)
```

**Testing**: Arrow key navigation now properly scrolls selected items into view.

---

### Fix #3 - Delayed Search Execution (Critical Timing Issue)

**File**: `src/lib/store/command-store.ts`
**Lines**: 373-378

#### Problem Description

```tsx
// BROKEN - Scheduled search execution
this.scheduler.schedule(SchedulerPriority.NORMAL, 'refilter-after-add', () =>
  this.performSearch(this.state.search.query)
)
```

Search execution was scheduled instead of synchronous.

#### Root Cause

Original implementation used scheduling for performance optimization, but this created race conditions where:

- CommandItems mounted and registered
- But search results weren't updated until scheduler ran
- First render showed empty results

#### Impact

- Items registered but didn't appear until later
- CommandEmpty showed "No results found" incorrectly
- Redux-like re-render issues with stale state
- Intermittent bugs based on timing

#### Technical Details

The store uses a custom scheduler for batching DOM operations:

- HIGH priority: User interactions (selections)
- NORMAL priority: Filtering/search
- LOW priority: Scrolling animations

Scheduling search created a timing mismatch between item registration and result computation.

#### Fix Implementation

```tsx
// FIXED - Immediate search execution
this.performSearch(this.state.search.query)
```

**Testing**: Items appear immediately after registration, no more delayed rendering.

---

### Fix #4 - CommandGroup Hiding Items (Critical Architecture Issue)

**File**: `src/components/command/CommandGroup.tsx`
**Lines**: 46-49

#### Original Problem

```tsx
// BROKEN - Attempts to filter at group level
const hasVisibleItems = useMemo(() => {
  // Complex JSX prop inspection that failed
}, [children, results, forceMount])

if (!hasVisibleItems && !forceMount) {
  return null // This hid the ENTIRE group!
}
```

CommandGroup tried to conditionally render based on child visibility.

#### Root Cause

Architecture mismatch: In the original CMDK, CommandGroups conditionally render based on filtered state. However, this rewrite implemented filtering at the CommandItem level (rendering null), but CommandGroup was still trying to pre-filter.

When CommandGroup returned `null`, its children (CommandItems) never mounted, so they couldn't register with the store.

#### Impact

- CommandItems never rendered → never registered
- Store had empty items Map
- No search results, no functionality
- This was the primary blocker for the entire library

#### Technical Details

Original CMDK uses Context-based filtering:

- Store provides `shouldFilter` and `filtered` state
- CommandGroups check if they have visible items from Context
- CommandItems conditionally render based on Context state

This rewrite intended:

- Items register explicitly with store
- Items conditionally render based on results array
- Groups could pre-filter, but that caused timing issues

#### Fix Implementation

```tsx
// FIXED - Always render group container, conditionally show heading
return (
  <Primitive.div>
    {heading && hasVisibleItems && <div>{heading}</div>}
    {children} {/* Always render children */}
  </Primitive.div>
)
```

**Testing**: Items now register and render properly. Group headings hide during search.

---

### Fix #5 - Filtering Completely Disabled

**File**: `src/entrypoints/content/App.tsx`
**Lines**: 58-62

#### Problem Description

```tsx
// BROKEN
<Command
  // ...
  config={{ filter: false }} // This disabled ALL filtering
>
```

#### Root Cause

During debugging "to see all items", the developer disabled filtering entirely. The store's `filter: false` setting bypasses all search logic and returns all items regardless of query.

#### Impact

- Typing anything had no effect
- All items always visible (even during search)
- Impossible to test filtering functionality

#### Technical Details

Store's performSearch method:

```tsx
if (!filter) {
  results = allItems // Bypasses scoring and filtering entirely
}
```

This setting is useful in some cases (like if you handle filtering externally), but breaks search.

#### Fix Implementation

```tsx
// FIXED - Removed config to enable default filtering
<Command open={open} onOpenChange={setOpen}>
```

**Testing**: Search now filters items based on input. Type "github" → only GitHub shows.

---

### Fix #6 - React Rules of Hooks Violation (Critical React Issue)

**File**: `src/components/command/CommandItem.tsx`
**Lines**: 75-85

#### Problem Description

React detected changes in hook call order between renders:

```
Previous render      Next render
------------------------------------------
...hooks 1-16...    ...hooks 1-16...
17. useEffect       17. useCallback ← New hook!
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

#### Root Cause

Conditional early return changed hook execution order:

```tsx
// BROKEN
useCommandResults() // This hook call

// Calculate visibility
const isVisible = checkVisibility()
// Early return for non-visible items
if (!isVisible) return null // Hooks below not called!

useCallback(/* ... */) // This hooks never called for non-visible items
```

#### Impact

- React strict mode/development mode showed warning
- Potential production bugs from inconsistent state
- Hook dependency issues and stale closures
- Memory leaks and performance problems

#### Technical Details

React requires hooks to be called in the same order every render. Conditional returns can change this order if hooks are called before the condition but not after.

The solution: Move all hook calls before any conditional returns.

#### Fix Implementation

```tsx
// FIXED - All hooks called first, conditional return after
const searchResults = useCommandResults()
// const selectedItem = useCommandSelection() etc...
// ...all hooks...

const isVisible = checkVisibilityLogic()

// All hooks finished, safe to conditionally return
if (!isVisible) return null

// Render logic...
```

**Testing**: No more React DevTools warnings about hook order violations.

---

### Fix #7 - CommandItem Visibility Management

**File**: `src/components/command/CommandItem.tsx`
**Lines**: 69-75

#### Problem Description

CommandItems always rendered regardless of search results.

#### Root Cause

Items registered with store but didn't check if they should be visible in current search.

#### Impact

- Filtered items remained visible but shouldn't render
- Memory usage higher than necessary
- Poor performance with large item lists

#### Technical Details

Original CMDK uses Context to provide visibility state. This rewrite needed explicit checking:

```tsx
const isVisible =
  forceMount || searchResults.some(result => result.id === value)
```

#### Fix Implementation

Added conditional rendering:

```tsx
if (!isVisible) return null
```

But placed AFTER all hooks to avoid Rules of Hooks violations.

**Testing**: Items disappear when they don't match search terms.

---

### Fix #8 - Group Heading Visibility During Search

**File**: `src/components/command/CommandGroup.tsx`
**Lines**: 82-88

#### Problem Description

Group headings ("Quick Actions", "Navigation") showed during search even when group had no visible items.

#### Root Cause

Groups always rendered their headings regardless of content visibility.

#### Impact

- Cluttered search results
- Poor UX compared to Raycast-style interfaces
- Hard to focus on relevant results

#### Technical Details

Groups need to check if they contain visible items by:

1. Walking through React children tree
2. Finding elements with `value` prop (CommandItems)
3. Checking if those values are in search results

```tsx
const findVisibleItems = (children: any): boolean => {
  if (children?.props?.value) {
    return results.some(result => result.id === children.props.value)
  }
  // Recursively check nested children...
}
```

#### Fix Implementation

```tsx
// Only show heading when group has visible items
{
  heading && hasVisibleItems && <div>{heading}</div>
}
```

**Testing**: Group headings hide when no items in that group match the search.

---

## Testing Results

### Before Fixes

- ✅ Items appear: ❌ Failed
- ✅ Search filtering: ❌ Failed
- ✅ Keyboard navigation: ❌ Failed (due to no render)
- ✅ Clean UX: ❌ Failed

### After Fixes

- ✅ Items appear: ✅ Working
- ✅ Search filtering: ✅ Working ("github" shows only GitHub)
- ✅ Keyboard navigation: ✅ Working (arrows, enter)
- ✅ Clean UX: ✅ Working (group headings hide during irrelevant search)

## Architecture Insights

### Original CMDK vs Rewrite

**Original CMDK** (Single File):

- Context-based implicit registration
- Simple but monolithic
- Hard to extend/modularize
- No TypeScript
- 1000+ lines in one file

**Rewrite** (Modern Architecture):

- Explicit store-based registration
- Modular, maintainable components
- Full TypeScript coverage
- Modern React patterns
- Easier testing and extension

**Key Learning**: Store-based approach requires stricter timing management than Context-based solutions.

### Performance Considerations

1. **Hook Call Order**: Critical for React performance and correctness
2. **Re-render Optimization**: Store selectors reduced unnecessary renders
3. **DOM Operations**: Scheduler prevents layout thrashing during filtering
4. **Memory Management**: Item cleanup prevents leaks on unmount

### Common Patterns Established

1. **Always call hooks before conditional returns**
2. **Use useMemo for expensive tree traversals**
3. **Batch DOM operations with scheduling**
4. **Clear separation between registration and rendering**
5. **Context vs Store: Choose based on update frequency**

## Conclusion

This debugging session revealed deep architectural insights about:

- React hooks and Rules of Hooks
- Context vs Store patterns
- Component lifecycle timing
- Search/filter implementation
- UX considerations

The CMDK library rewrite now provides Raycast-grade command palette functionality with modern React architecture, proper accessibility, and clean user experience.
