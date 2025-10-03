# Command Palette for the web (Chrome, Firefox, Edge) Extension

## Tehnolgies used:

- WXT
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn UI
- pnpm (package manager)

## Inspirations:

### 1. [Raycast](https://github.com/harshayburadkar/clut-chrome-extension/issues/20#issuecomment-2724517668)

- UI Design & animations
- Clipboard
- Anything Calculator
- Window Management
- Snippets
- Quick Links
- Hotkeys and Aliases
- Run Scripts
- Remind
- Block Distractions
- Find text in image & similar utilities
- Developer support (API, Build in UI, etc.)
- Extension marketplace

### 2. [Alfred](https://www.alfredapp.com/)

- [Spell & Define](https://www.alfredapp.com/help/features/dictionary/)
- [Quick Look](https://www.alfredapp.com/help/features/file-search/#quick-look)
- [Workflow](https://www.alfredapp.com/workflows/)

### 3. [kbar](https://github.com/timc1/kbar) | 4. [kmenu](https://github.com/haaarshsingh/kmenu) | 5. [cmdk](https://github.com/pacocoursey/cmdk)

Inspiration for the design of the command palette. The projects use TSX.

### 6. [Tab Switcher Ultra](https://codeberg.org/TheUllernProject/tab-switcher-ultra)

Inspiration for the tab switching utility. May add something like this in the future.

### 7. [Arc Max](https://arc.net/max)

Inspiration for the AI Features.

- 5 Second Previews
- Tidy Tab Titles
- Tidy Downloads
- Split Tabs
- Peek Preview
- Mini Player
- Live Calendar
- Quick tabs
- AI Tabs sorting & organizing

### 8. [Tab Suspender](https://github.com/sergey-drpa/Tab-Suspender)

Optimization & performance improvements.

### 9. [Clut](https://github.com/harshayburadkar/clut-chrome-extension)

Tabs Cycling

### 10. [Snooze Tabs](https://snoozetabs.com/)

All features.

## Features:

1. the user can set multiple key board shortcuts that allows them to search on different kinds of search engines without visiting the url bar. Like !g = google, !p = perplexity, !yt = youtube, \* = bookmarks, # = history etc etc. This list can be extended to all kinds of sites.
2. The user, as he types can see the search suggestions and the history just like a normal browser search.
3. The user can manage his active tabs or switch between them with the help of this command palette.
4. calculator and other tools like converter for everything etc
5. ability for users to add snippets
6. Run scripts
7. remind, translate, image text extractor and similar utility tools
8. If the user is on a documentation like website which feature search, the extension can act as a command palette for that particular site. If the user searches anything, just like a normal search result on that website, the results appear on the command palette, and the user can navigate around that sight too.
9. Ability for other developers to create their own extensions and plugins for the command palette.

## Things to keep in mind:

1. The extension should be lightweight and fast.
2. The extension should be built like a library. Developers should be able to use the library and build their own extensions.
3. The UI should feel native and follow a very specific style.
4. Security should be a top priority.
5. Properly typed and documented APIs for developers to use.

## Phases of development:

### 1. Build the basic UI

### 2. Build the search functionality

### 3. Build the rest of the features (roll out an MVP)

### 4. Add AI integration.

### 5. Add other planned features

### 6. Build proper extension marketplace and support for other developers to build their own extensions.

### 7. Work on the performance and optimization.
