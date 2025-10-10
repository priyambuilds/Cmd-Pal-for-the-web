Now I have a comprehensive understanding of the CMDK library and the latest versions of our tech stack. Let me analyze the code and create a comprehensive plan for rebuilding the CMDK library from scratch.

# CMDK Library Rebuild Plan: Modern Architecture with WXT + React 19

After analyzing your uploaded CMDK source code, I can see several areas where we can modernize and improve the library using the latest tech stack. Here's a comprehensive plan for rebuilding it from scratch.

## Analysis of Current CMDK Library

The current library (1000+ lines in a single file) has these key components:

1. **Search & Filtering**: Uses a custom scoring algorithm (`command-score.ts`)
2. **State Management**: Custom store implementation with subscriptions
3. **Component Structure**: All components in one file with forwardRef patterns
4. **Keyboard Navigation**: Complex keyboard handling with vim bindings
5. **Virtual Rendering**: DOM manipulation for performance
6. **Context System**: Multiple React contexts for state sharing

## Areas for Improvement with Modern Stack

### **React 19 Improvements**

- **Remove forwardRef**: React 19 allows `ref` as a direct prop[1][2][3]
- **Better Server Components**: Though not applicable for extensions, we can use the patterns
- **Enhanced Error Boundaries**: Better hydration error reporting[4][5]
- **Modern Hooks**: Use built-in `useSyncExternalStore` instead of custom implementation

### **TypeScript 5.9+ Benefits**

- **Better Performance**: 11% faster type checking with cache optimizations[6][7]
- **Stricter Types**: Use the latest strict mode features[8]
- **Import Defer**: For performance-critical parts (though limited use in extensions)

### **Project Structure Improvements**

Based on WXT best practices , we should organize into:[9]

```
src/
├── entrypoints/           # WXT extension entry points
│   ├── content.ts        # Content script
│   ├── background.ts     # Background script
│   └── popup/            # Extension popup
├── components/           # CMDK components (auto-imported)
│   ├── command/          # Core command components
│   ├── ui/              # Base UI components
│   └── providers/       # Context providers
├── hooks/               # React hooks (auto-imported)
├── lib/                 # Core library logic
│   ├── store/           # State management
│   ├── scoring/         # Search scoring
│   ├── keyboard/        # Keyboard handling
│   └── utils/           # Utilities
├── types/               # TypeScript definitions
└── styles/              # Tailwind styles
```

## Recommended File Structure for CMDK Rebuild

```
src/
├── lib/
│   ├── store/
│   │   ├── command-store.ts      # Modern state management
│   │   ├── types.ts              # Store types
│   │   └── hooks.ts              # Store hooks
│   ├── scoring/
│   │   ├── command-score.ts      # Improved scoring algorithm
│   │   ├── filters.ts            # Filter functions
│   │   └── types.ts              # Scoring types
│   ├── keyboard/
│   │   ├── handlers.ts           # Keyboard event handlers
│   │   ├── navigation.ts         # Navigation logic
│   │   └── shortcuts.ts          # Shortcut definitions
│   └── utils/
│       ├── dom.ts                # DOM utilities
│       ├── refs.ts               # Ref utilities (React 19)
│       └── scheduling.ts         # Layout effect scheduling
├── components/
│   ├── command/
│   │   ├── Command.tsx           # Root component
│   │   ├── CommandInput.tsx      # Input component
│   │   ├── CommandList.tsx       # List container
│   │   ├── CommandItem.tsx       # Individual items
│   │   ├── CommandGroup.tsx      # Group container
│   │   ├── CommandSeparator.tsx  # Separator
│   │   ├── CommandEmpty.tsx      # Empty state
│   │   ├── CommandLoading.tsx    # Loading state
│   │   └── CommandDialog.tsx     # Dialog wrapper
│   └── providers/
│       ├── CommandProvider.tsx   # Main context provider
│       ├── StoreProvider.tsx     # Store context
│       └── GroupProvider.tsx     # Group context
├── hooks/
│   ├── useCommand.ts             # Command context hook
│   ├── useCommandState.ts        # State management hook
│   ├── useKeyboardNavigation.ts  # Keyboard handling
│   ├── useVirtualization.ts      # List virtualization
│   └── useCommandScore.ts        # Scoring hook
└── types/
    ├── command.ts                # Core command types
    ├── store.ts                  # Store types
    └── index.ts                  # Export all types
```

## Key Modernization Strategies

### **1. Replace forwardRef with React 19 Patterns**

```typescript
// Old (React 18)
const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  (props, ref) => <input ref={ref} {...props} />
)

// New (React 19)
const CommandInput = (props: CommandInputProps) =>
  <input {...props} /> // ref is now part of props automatically
```

### **2. Modern State Management**

Replace the custom store with a more maintainable approach:

```typescript
// Use React 19's enhanced useSyncExternalStore
const useCommandStore = () => {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot // For SSR compatibility
  )
}
```

### **3. Better TypeScript Types**

Leverage TypeScript 5.9+ features:

```typescript
// Use stricter types and better inference
type CommandProps<T extends HTMLElement = HTMLDivElement> =
  React.ComponentProps<'div'> & {
    // Custom props with better type safety
  }
```

### **4. Performance Optimizations**

- Split the monolithic component into focused, smaller components
- Use React.memo strategically for performance
- Implement proper virtualization for large lists
- Optimize re-renders with better state structure

## Next Steps

Would you like me to start by:

1. **Setting up the basic project structure** with the recommended folder organization?
2. **Creating the core types** and interfaces that will guide our implementation?
3. **Building the modern state management system** to replace the custom store?
4. **Starting with a specific component** like the Command root or CommandInput?

I recommend we start with the **core types and state management** since everything else depends on these foundations. This will let me teach you the modern patterns while building a solid architecture.

Which approach would you prefer to begin with?

[1](https://www.hypermod.io/explore/react-19-remove-forwardref)
[2](https://www.youtube.com/watch?v=Gwy6ZgCfjLo)
[3](https://github.com/shadcn-ui/ui/issues/3898)
[4](https://www.kellton.com/kellton-tech-blog/react-19-latest-features-and-updates)
[5](https://www.geeksforgeeks.org/reactjs/react-19-new-features-and-updates/)
[6](https://www.infoq.com/news/2025/08/typescript-5-9-released/)
[7](https://blog.logrocket.com/upgrade-to-typescript-5-9/)
[8](https://www.w3schools.com/typescript/typescript_best_practices.php)
[9](https://wxt.dev/guide/essentials/project-structure)
[10](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/54415088/34460dd4-fe79-477c-8812-0a9a6ad2ba5d/command-score.ts)
[11](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/54415088/d8510772-25c0-4f53-b2dc-fe772033a879/index.tsx)
[12](https://dev.to/abdulnasirolcan/react-19-new-features-advanced-techniques-and-enhanced-usage-methods-271p)
[13](https://dev.to/thisweekinjavascript/typescript-59-is-here-glm-45-is-epic-for-programming-nodejs-2218-lts-and-more-48h8)
[14](https://www.radix-ui.com/themes/docs/overview/releases)
[15](https://www.radix-ui.com/primitives/docs/overview/releases)
[16](https://www.npmjs.com/package/radix-ui)
[17](https://react.dev/blog/2024/12/05/react-19)
[18](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
[19](https://www.radix-ui.com)
[20](https://vercel.com/blog/whats-new-in-react-19)
[21](https://peerlist.io/saxenashikhil/articles/why-typescript-59-is-a-big-deal)
[22](https://www.radix-ui.com/colors/docs/overview/installation)
[23](https://www.freecodecamp.org/news/new-react-19-features-you-should-know-with-code-examples/)
[24](https://www.reddit.com/r/typescript/comments/1mf0vkq/announcing_typescript_59/)
[25](https://www.npmjs.com/package/@radix-ui/primitive)
[26](https://react.dev/blog/2025/10/01/react-19-2)
[27](https://javascript.plainenglish.io/typescript-5-9-a-story-of-evolution-from-pain-points-to-power-b58ecd72b5bb)
[28](https://developers.raycast.com/misc/changelog)
[29](https://github.com/pacocoursey/cmdk/pulls)
[30](https://github.com/pacocoursey/cmdk/issues/266)
[31](https://github.com/pacocoursey/cmdk/activity)
[32](https://github.com/pacocoursey/cmdk/releases)
[33](https://github.com/pacocoursey/cmdk/discussions/221)
[34](https://www.raycast.com/blog/how-raycast-api-extensions-work)
[35](https://www.raycast.com/store/category/developer-tools/9)
[36](https://github.com/pacocoursey/cmdk/issues/171)
[37](https://github.com/pacocoursey/cmdk)
[38](https://github.com/timc1/kbar)
[39](https://github.com/pacocoursey/cmdk/issues/307)
[40](https://github.com/pacocoursey/cmdk/issues/345)
[41](https://www.raycast.com/store/recent/151)
[42](https://www.raycast.com/store/trending/186)
[43](https://www.raycast.com/store/recent/140/feed.json/feed.json/feed.atom)
[44](https://www.raycast.com/blog/launch-week-summary)
[45](https://blog.logrocket.com/developing-web-extensions-wxt-library/)
[46](https://wxt.dev/guide/essentials/extension-apis)
[47](https://mudssrali.com/blog/stop-using-forward-ref-in-your-custom-components-in-react)
[48](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
[49](https://marmelab.com/blog/2025/04/15/browser-extension-form-ai-wxt.html)
[50](https://wxt.dev)
[51](https://wxt.dev/guide/introduction)
[52](https://javascript.plainenglish.io/react-19-deprecated-forwardref-a-guide-to-passing-ref-as-a-standard-prop-7c0f13e6a229)
[53](https://www.reddit.com/r/chrome_extensions/comments/1fs9om2/i_wrote_wxt_a_relatively_new_framework_for/)
[54](https://app.codemod.com/registry/react/19/remove-forward-ref)
