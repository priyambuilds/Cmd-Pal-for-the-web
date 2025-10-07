/**
 * Simple, production-ready cache with TTL and LRU eviction
 *
 * Features:
 * - Time-to-live (TTL) expiration
 * - Least Recently Used (LRU) eviction
 * - Manual invalidation
 * - Staleness detection
 * - Development debugging
 *
 * Design philosophy:
 * - Simple and predictable
 * - No external dependencies
 * - Chrome extension optimized
 * - Easy to test and debug
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T
  timestamp: number // When this entry was created
  expiresAt: number // When this entry should be considered expired
}

/**
 * Cache configuration options
 */
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of entries before eviction
}

/**
 * Simple in-memory cache with TTL and LRU eviction
 *
 * Example usage:
 * ```
 * const cache = new SimpleCache<Bookmark[]>({ ttl: 10 * 60 * 1000, maxSize: 5 })
 *
 * // Set data
 * cache.set('bookmarks', bookmarksData)
 *
 * // Get data (returns null if expired or not found)
 * const data = cache.get('bookmarks')
 *
 * // Force invalidate
 * cache.invalidate('bookmarks')
 * ```
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder: string[] = [] // Track access order for LRU
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: config.ttl ?? 5 * 60 * 1000, // Default: 5 minutes
      maxSize: config.maxSize ?? 10, // Default: 10 entries
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Cache initialized:', {
        ttl: `${this.config.ttl / 1000}s`,
        maxSize: this.config.maxSize,
      })
    }
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   *
   * Side effects:
   * - Updates access order (LRU tracking)
   * - Removes expired entries
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    // Not found
    if (!entry) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`❌ Cache MISS: "${key}" (not found)`)
      }
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`❌ Cache MISS: "${key}" (expired)`)
      }
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return null
    }

    // Cache hit - update access order
    this.updateAccessOrder(key)

    if (process.env.NODE_ENV === 'development') {
      const age = Math.round((Date.now() - entry.timestamp) / 1000)
      console.log(`✅ Cache HIT: "${key}" (age: ${age}s)`)
    }

    return entry.data
  }

  /**
   * Set value in cache
   *
   * Side effects:
   * - Evicts LRU entry if at max size
   * - Updates access order
   */
  set(key: string, value: T): void {
    // Evict old entries if at max size and key doesn't exist
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const now = Date.now()
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      expiresAt: now + this.config.ttl,
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `💾 Cache SET: "${key}" (expires in ${this.config.ttl / 1000}s)`
      )
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Manually invalidate a specific key
   * Useful for force refresh or when data is known to be stale
   */
  invalidate(key: string): void {
    const existed = this.cache.delete(key)
    this.removeFromAccessOrder(key)

    if (process.env.NODE_ENV === 'development') {
      if (existed) {
        console.log(`🗑️ Cache INVALIDATE: "${key}"`)
      }
    }
  }

  /**
   * Check if cached data is approaching staleness
   *
   * @param key Cache key to check
   * @param threshold Percentage of TTL (0-1) to consider stale. Default: 0.8 (80%)
   * @returns true if data is >80% of its TTL age
   *
   * Example:
   * - TTL is 10 minutes
   * - Data was cached 9 minutes ago
   * - 9/10 = 0.9 > 0.8 threshold
   * - Returns true (data is stale)
   *
   * Use this to show UI indicators like "Data may be outdated"
   */
  isStale(key: string, threshold = 0.8): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true

    const age = Date.now() - entry.timestamp
    const maxAge = this.config.ttl
    const staleness = age / maxAge

    return staleness > threshold
  }

  /**
   * Get metadata about cached entry
   * Useful for debugging and UI indicators
   */
  getMetadata(key: string): { age: number; expiresIn: number } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    return {
      age: Math.round((now - entry.timestamp) / 1000), // seconds
      expiresIn: Math.round((entry.expiresAt - now) / 1000), // seconds
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.accessOrder = []

    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 Cache CLEAR: Removed ${size} entries`)
    }
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get all cache keys (for debugging)
   */
  get keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Evict least recently used entry
   * Called automatically when cache reaches max size
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder[0] // First item = least recently used

    // Use non-null assertion since we already checked length > 0
    this.cache.delete(lruKey!)
    this.accessOrder.shift()

    if (process.env.NODE_ENV === 'development') {
      console.log(`🗑️ Cache EVICT (LRU): "${lruKey}"`)
    }
  }

  /**
   * Update access order (move to end = most recently used)
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }
}
/**
 * Wrapper function for fetching with cache
 *
 * This is the main function we'll use in components:
 *
 * @param key Unique cache key
 * @param cache Cache instance to use
 * @param fetcher Function that fetches fresh data
 * @param forceRefresh Bypass cache and fetch fresh (default: false)
 *
 * @returns Cached data or fresh data from fetcher
 *
 * Example:
 * ```
 * const bookmarks = await fetchWithCache(
 *   'bookmarks',
 *   bookmarksCache,
 *   async () => {
 *     const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' })
 *     return response.data
 *   }
 * )
 * ```
 */
export async function fetchWithCache<T>(
  key: string,
  cache: SimpleCache<T>,
  fetcher: () => Promise<T>,
  forceRefresh = false
): Promise<T> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }
  }

  // Cache miss or force refresh - fetch fresh data
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Fetching fresh data for: "${key}"`)
  }

  try {
    const data = await fetcher()
    cache.set(key, data)
    return data
  } catch (error) {
    console.error(`🔴 Error fetching data for: "${key}"`, error)
    throw error
  }
}

/**
 * Pre-configured cache instances for common use cases
 */

/**
 * Bookmarks cache
 * - TTL: 10 minutes (bookmarks don't change frequently)
 * - Max size: 10 entries (typically just one "bookmarks" key)
 */
export const bookmarksCache = new SimpleCache<Bookmark[]>({
  ttl: 10 * 60 * 1000,
  maxSize: 10,
})

/**
 * History cache
 * - TTL: 2 minutes (history changes frequently)
 * - Max size: 10 entries (different time filters need separate cache)
 */
export const historyCache = new SimpleCache<HistoryItem[]>({
  ttl: 2 * 60 * 1000,
  maxSize: 10,
})

/**
 * Tabs cache (for future tab switcher feature)
 * - TTL: 30 seconds (tabs change very frequently)
 * - Max size: 5 entries
 */
export const tabsCache = new SimpleCache<TabInfo[]>({
  ttl: 30 * 1000,
  maxSize: 5,
})

/**
 * Type definitions
 */

export interface Bookmark {
  id: string
  title: string
  url: string
  dateAdded: number | undefined
}

export interface HistoryItem {
  id: string
  title: string
  url: string
  lastVisitTime: number
  visitCount: number
}

export interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl?: string
  active: boolean
  windowId: number
}

/**
 * Development-only global debug utilities
 * Access via window.__CACHE_DEBUG__ in DevTools console
 */
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - Development only
  window.__CACHE_DEBUG__ = {
    bookmarks: bookmarksCache,
    history: historyCache,
    tabs: tabsCache,

    // Helper to inspect all caches
    inspect() {
      console.log('📦 Cache Status:')
      console.log('Bookmarks:', {
        size: bookmarksCache.size,
        keys: bookmarksCache.keys,
      })
      console.log('History:', {
        size: historyCache.size,
        keys: historyCache.keys,
      })
      console.log('Tabs:', {
        size: tabsCache.size,
        keys: tabsCache.keys,
      })
    },

    // Helper to clear all caches
    clearAll() {
      bookmarksCache.clear()
      historyCache.clear()
      tabsCache.clear()
      console.log('🧹 All caches cleared')
    },
  }
}
