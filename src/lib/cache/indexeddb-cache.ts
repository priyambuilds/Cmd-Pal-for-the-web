/**
 * IndexedDB-based caching for CMDK
 * Provides persistent storage for items, usage patterns, and search results
 */

interface CacheItem {
  id: string
  data: any
  timestamp: number
  ttl?: number // Time to live in milliseconds
}

interface UsageStats {
  id: string
  count: number
  lastUsed: number
  firstUsed: number
}

interface SearchResult {
  query: string
  results: Array<{ id: string; score: number }>
  timestamp: number
  frequency: number
}

class IndexedDBCache {
  private db: IDBDatabase | null = null
  private dbName = 'CMDKCache'
  private version = 1
  private initialized = false

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.initialized = true
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result
        this.createObjectStores(db)
      }
    })
  }

  /**
   * Create object stores for different data types
   */
  private createObjectStores(db: IDBDatabase): void {
    // Cache for arbitrary items
    if (!db.objectStoreNames.contains('items')) {
      db.createObjectStore('items', { keyPath: 'id' })
    }

    // Usage statistics
    if (!db.objectStoreNames.contains('usage')) {
      const usageStore = db.createObjectStore('usage', { keyPath: 'id' })
      usageStore.createIndex('lastUsed', 'lastUsed', { unique: false })
    }

    // Search results cache
    if (!db.objectStoreNames.contains('searches')) {
      const searchStore = db.createObjectStore('searches', { keyPath: 'query' })
      searchStore.createIndex('timestamp', 'timestamp', { unique: false })
      searchStore.createIndex('frequency', 'frequency', { unique: false })
    }

    // Configuration cache
    if (!db.objectStoreNames.contains('config')) {
      db.createObjectStore('config', { keyPath: 'key' })
    }
  }

  /**
   * Store an item with optional TTL
   */
  async setItem(key: string, data: any, ttl?: number): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readwrite')
      const store = transaction.objectStore('items')

      const item: CacheItem = {
        id: key,
        data,
        timestamp: Date.now(),
        ...(ttl !== undefined && { ttl }),
      }

      const request = store.put(item)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Retrieve an item from cache
   */
  async getItem(key: string): Promise<any | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readonly')
      const store = transaction.objectStore('items')
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const item: CacheItem = request.result

        if (!item) {
          resolve(null)
          return
        }

        // Check TTL
        if (item.ttl && Date.now() - item.timestamp > item.ttl) {
          this.deleteItem(key) // Clean up expired item
          resolve(null)
          return
        }

        resolve(item.data)
      }
    })
  }

  /**
   * Delete an item from cache
   */
  async deleteItem(key: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readwrite')
      const store = transaction.objectStore('items')
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Record usage of an item
   */
  async recordUsage(itemId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usage'], 'readwrite')
      const store = transaction.objectStore('usage')

      // First try to get existing stats
      const getRequest = store.get(itemId)

      getRequest.onsuccess = () => {
        const existing: UsageStats = getRequest.result
        const now = Date.now()

        const stats: UsageStats = existing
          ? {
              ...existing,
              count: existing.count + 1,
              lastUsed: now,
            }
          : {
              id: itemId,
              count: 1,
              lastUsed: now,
              firstUsed: now,
            }

        const putRequest = store.put(stats)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Get usage statistics for an item
   */
  async getUsageStats(itemId: string): Promise<UsageStats | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usage'], 'readonly')
      const store = transaction.objectStore('usage')
      const request = store.get(itemId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Get usage score (normalized 0-1)
   */
  async getUsageScore(itemId: string): Promise<number> {
    const stats = await this.getUsageStats(itemId)
    if (!stats) return 0

    // Normalize based on logarithmic scale
    return Math.min(Math.log10(stats.count + 1) * 2, 10) / 10
  }

  /**
   * Get most frequently used items
   */
  async getFrequentItems(limit = 10): Promise<UsageStats[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usage'], 'readonly')
      const store = transaction.objectStore('usage')
      const request = store.openCursor()
      const results: UsageStats[] = []

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          // Sort by count descending and return top results
          results.sort((a, b) => b.count - a.count)
          resolve(results.slice(0, limit))
        }
      }
    })
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    results: Array<{ id: string; score: number }>
  ): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searches'], 'readwrite')
      const store = transaction.objectStore('searches')

      // Try to get existing search cache
      const getRequest = store.get(query)

      getRequest.onsuccess = () => {
        const existing: SearchResult = getRequest.result
        const now = Date.now()

        const searchResult: SearchResult = existing
          ? {
              ...existing,
              results,
              timestamp: now,
              frequency: existing.frequency + 1,
            }
          : {
              query,
              results,
              timestamp: now,
              frequency: 1,
            }

        const putRequest = store.put(searchResult)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string
  ): Promise<Array<{ id: string; score: number }> | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searches'], 'readonly')
      const store = transaction.objectStore('searches')
      const request = store.get(query)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result: SearchResult = request.result
        resolve(result ? result.results : null)
      }
    })
  }

  /**
   * Store configuration
   */
  async setConfig(key: string, value: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readwrite')
      const store = transaction.objectStore('config')

      const configItem = {
        key,
        value,
        timestamp: Date.now(),
      }

      const request = store.put(configItem)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get configuration
   */
  async getConfig(key: string): Promise<any | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readonly')
      const store = transaction.objectStore('config')
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const item = request.result
        resolve(item ? item.value : null)
      }
    })
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['items', 'usage', 'searches', 'config'],
        'readwrite'
      )

      const promises = ['items', 'usage', 'searches', 'config'].map(
        storeName => {
          return new Promise<void>((resolveStore, rejectStore) => {
            const request = transaction.objectStore(storeName).clear()
            request.onerror = () => rejectStore(request.error)
            request.onsuccess = () => resolveStore()
          })
        }
      )

      Promise.all(promises)
        .then(() => resolve())
        .catch(reject)
    })
  }

  /**
   * Clean up expired items
   */
  async cleanup(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const now = Date.now()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readwrite')
      const store = transaction.objectStore('items')
      const request = store.openCursor()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const item: CacheItem = cursor.value

          // Check if item is expired
          if (item.ttl && now - item.timestamp > item.ttl) {
            cursor.delete()
          }

          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    items: number
    usage: number
    searches: number
    config: number
  }> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const stats = {
      items: 0,
      usage: 0,
      searches: 0,
      config: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['items', 'usage', 'searches', 'config'],
        'readonly'
      )

      const stores = ['items', 'usage', 'searches', 'config'] as const

      let completed = 0

      stores.forEach(storeName => {
        const request = transaction.objectStore(storeName).count()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          stats[storeName] = request.result
          completed++
          if (completed === stores.length) {
            resolve(stats)
          }
        }
      })
    })
  }
}

// Export singleton instance
export const indexedDBCache = new IndexedDBCache()

// Utility functions for easy access
export const cache = {
  set: (key: string, data: any, ttl?: number) =>
    indexedDBCache.setItem(key, data, ttl),
  get: (key: string) => indexedDBCache.getItem(key),
  delete: (key: string) => indexedDBCache.deleteItem(key),
  recordUsage: (itemId: string) => indexedDBCache.recordUsage(itemId),
  getUsageScore: (itemId: string) => indexedDBCache.getUsageScore(itemId),
  getFrequentItems: (limit?: number) => indexedDBCache.getFrequentItems(limit),
  cacheSearch: (query: string, results: Array<{ id: string; score: number }>) =>
    indexedDBCache.cacheSearchResults(query, results),
  getCachedSearch: (query: string) =>
    indexedDBCache.getCachedSearchResults(query),
  setConfig: (key: string, value: any) => indexedDBCache.setConfig(key, value),
  getConfig: (key: string) => indexedDBCache.getConfig(key),
  clear: () => indexedDBCache.clear(),
  cleanup: () => indexedDBCache.cleanup(),
  stats: () => indexedDBCache.getStats(),
  init: () => indexedDBCache.init(),
}
