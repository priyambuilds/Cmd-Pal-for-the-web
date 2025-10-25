/**
 * CMDK Advanced Features Demo
 * Showcases all the advanced features we've implemented
 */

// entrypoints/content/App.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CommandDialog } from '../../components/command/CommandDialog'
import { CommandInput } from '../../components/command/CommandInput'
import { CommandList } from '../../components/command/CommandList'
import { CommandItem } from '../../components/command/CommandItem'
import { CommandGroup } from '../../components/command/CommandGroup'
import { CommandEmpty } from '../../components/command/CommandEmpty'
import { CommandLoading } from '../../components/command/CommandLoading'
import { CommandErrorBoundary } from '../../components/error/CommandErrorBoundary'
import {
  recordUsage,
  computeAdvancedScore,
} from '../../lib/scoring/advanced-scoring'
import type { CommandItem as CommandItemType } from '../../types'

// ============================================================================
// MOCK DATA AND APIS
// ============================================================================

// Mock static commands
const staticCommands: CommandItemType[] = [
  {
    id: 'file-new',
    value: 'Create New File',
    keywords: ['new', 'file', 'create', 'document'],
  },
  { id: 'file-open', value: 'Open File', keywords: ['open', 'file', 'load'] },
  { id: 'file-save', value: 'Save File', keywords: ['save', 'file', 'store'] },
  {
    id: 'file-export',
    value: 'Export File',
    keywords: ['export', 'save', 'download'],
  },
  { id: 'edit-undo', value: 'Undo', keywords: ['undo', 'back', 'revert'] },
  { id: 'edit-redo', value: 'Redo', keywords: ['redo', 'forward', 'repeat'] },
  { id: 'view-zoom-in', value: 'Zoom In', keywords: ['zoom', 'in', 'magnify'] },
  {
    id: 'view-zoom-out',
    value: 'Zoom Out',
    keywords: ['zoom', 'out', 'shrink'],
  },
  {
    id: 'help-docs',
    value: 'Open Documentation',
    keywords: ['help', 'docs', 'documentation'],
  },
  {
    id: 'help-about',
    value: 'About Application',
    keywords: ['about', 'info', 'version'],
  },
]

// Mock GitHub API integration
const searchGitHub = async (query: string): Promise<CommandItemType[]> => {
  if (!query.startsWith('gh ')) return []

  const q = query.slice(3).trim()
  if (!q) return []

  // Mock delay for realistic async behavior
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  // Mock GitHub results
  return [
    {
      id: `gh-repo-${q}-1`,
      value: `${q}/awesome-project - A great project for ${q}`,
      keywords: ['github', 'repository', 'open-source', q],
    },
    {
      id: `gh-repo-${q}-2`,
      value: `${q}-tools/${q}-cli - Command line tools for ${q}`,
      keywords: ['github', 'cli', 'tools', q],
    },
    {
      id: `gh-repo-${q}-3`,
      value: `microsoft/${q}-sdk - Official SDK for ${q}`,
      keywords: ['github', 'microsoft', 'sdk', q],
    },
  ]
}

// Mock search history (would come from IndexedDB in real app)
const searchHistory: string[] = [
  'help docs',
  'file save',
  'edit undo',
  'view zoom',
]

// ============================================================================
// ENHANCED COMMAND PALETTE COMPONENT
// ============================================================================

export default function App() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [asyncResults, setAsyncResults] = useState<CommandItemType[]>([])
  const [isLoadingAsync, setIsLoadingAsync] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string>('')

  // ============================================================================
  // ADVANCED SCORING CONFIGURATION
  // ============================================================================

  const scoringConfig = useMemo(
    () => ({
      customScoring: computeAdvancedScore,
      recentBoost: 1.5,
      frequencyBoost: true,
      scoringWeights: {
        textMatch: 1.0,
        keywordMatch: 0.9,
        frequency: 0.4,
        recency: 0.2,
        position: 0.1,
        length: 0.05,
      },
    }),
    []
  )

  // ============================================================================
  // ASYNC DATA LOADING
  // ============================================================================

  const asyncLoader = useCallback(
    async (searchQuery: string): Promise<CommandItemType[]> => {
      setIsLoadingAsync(true)
      try {
        const results = await searchGitHub(searchQuery)
        setAsyncResults(results)
        return results
      } catch (error) {
        console.error('Async loading failed:', error)
        return []
      } finally {
        setIsLoadingAsync(false)
      }
    },
    []
  )

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K to toggle
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }

      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // ============================================================================
  // COMMAND SELECTION HANDLER
  // ============================================================================

  const handleCommandSelect = useCallback((value: string) => {
    console.log('Selected command:', value)

    // Record usage for learning
    recordUsage(value)
    setSelectedItem(value)

    // Execute command logic
    switch (value) {
      case 'file-new':
        console.log('Creating new file...')
        break
      case 'file-open':
        console.log('Opening file dialog...')
        break
      case 'help-docs':
        window.open('https://cmdk-docs.vercel.app', '_blank')
        break
      default:
        console.log(`Executing ${value}`)
    }

    // Close after selection
    setTimeout(() => setOpen(false), 100)
  }, [])

  return (
    <CommandErrorBoundary
      fallback={(error: any, errorInfo: any) => (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
        >
          <div
            style={{
              background: 'black',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#dc2626', margin: '0 0 16px 0' }}>
              ⚠️ Command Palette Error
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#374151' }}>
              Something went wrong with the advanced command palette.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    >
      {/* Command Palette */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        config={{
          asyncLoader,
          loaderDebounceMs: 300,
          ...scoringConfig,
          workers: { enabled: true, minItems: 10 },
          cache: { enabled: true, persist: true },
          keyboardShortcuts: {
            navigateUp: ['ArrowUp', 'k'],
            navigateDown: ['ArrowDown', 'j'],
            select: ['Enter'],
            close: ['Escape'],
          },
        }}
        style={{
          borderRadius: '12px',
          maxWidth: '600px',
          width: '90%',
          background: 'black',
        }}
      >
        <CommandInput
          placeholder="Search commands, GitHub repos, or type 'help'..."
          value={query}
          onValueChange={setQuery}
          style={{
            width: '100%',
            padding: '16px 20px',
            border: 'none',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '16px',
            outline: 'none',
            background: 'transparent',
          }}
        />

        <CommandList
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <CommandEmpty>
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
              }}
            >
              {query
                ? `No results for "${query}"`
                : 'Start typing to search...'}
              <br />
              <small>
                Try "gh react" for GitHub search or "help" for documentation
              </small>
            </div>
          </CommandEmpty>

          {isLoadingAsync && (
            <CommandLoading>
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  🔄
                </div>
                <div style={{ marginTop: '8px' }}>Searching...</div>
              </div>
            </CommandLoading>
          )}

          {/* Static Commands */}
          <CommandGroup heading="Commands">
            {staticCommands.slice(0, 8).map(cmd => (
              <CommandItem key={cmd.id} {...cmd} onSelect={handleCommandSelect}>
                {/* Simple custom rendering with icons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {cmd.id.includes('file') && <span>📄</span>}
                  {cmd.id.includes('edit') && <span>✏️</span>}
                  {cmd.id.includes('view') && <span>👁️</span>}
                  {cmd.id.includes('help') && <span>❓</span>}
                  <span>{cmd.value}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {/* Search History (no query) */}
          {!query && searchHistory.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {searchHistory.slice(0, 3).map((hist, idx) => (
                <CommandItem
                  key={`history-${idx}`}
                  value={hist}
                  keywords={['recent']}
                  onSelect={() => setQuery(hist)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🕐</span>
                    <span>{hist}</span>
                    <small style={{ color: '#6b7280', marginLeft: 'auto' }}>
                      recent
                    </small>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Async Results */}
          {asyncResults.length > 0 && (
            <CommandGroup heading="GitHub Repositories">
              {asyncResults.map(result => (
                <CommandItem
                  key={result.id}
                  {...result}
                  onSelect={handleCommandSelect}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🐙</span>
                    <div>
                      <div>{result.value}</div>
                      <small style={{ color: '#6b7280' }}>
                        GitHub Repository
                      </small>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Status indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          zIndex: 10000,
        }}
      >
        ✅ Advanced Features Active
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Better focus and interaction states */
        [data-command-item] {
          padding: 8px 12px;
          border-radius: 6px;
          transition: background-color 0.1s;
        }

        [data-command-item]:hover {
          background-color: #f9fafb;
        }

        [data-command-item][data-selected="true"] {
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        [data-command-group-heading] {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </CommandErrorBoundary>
  )
}
