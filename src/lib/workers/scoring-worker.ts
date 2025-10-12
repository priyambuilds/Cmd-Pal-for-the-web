/**
 * Web Worker for CMDK scoring operations
 * Offloads heavy computations to avoid blocking the main thread
 */

import { commandScore } from '../scoring/command-score'
import {
  computeAdvancedScore,
  recordUsage,
  getUsageScore,
} from '../scoring/advanced-scoring'

// Worker message types
interface WorkerMessage {
  type:
    | 'SCORE_ITEMS'
    | 'COMPUTE_ADVANCED'
    | 'RECORD_USAGE'
    | 'GET_USAGE'
    | 'TERMINATE'
  id: string
  data: any
}

interface WorkerResponse {
  type: string
  id: string
  result?: any
  error?: string
}

// Main worker handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data } = event.data

  try {
    switch (type) {
      case 'SCORE_ITEMS':
        handleScoreItems(id, data)
        break

      case 'COMPUTE_ADVANCED':
        handleAdvancedScoring(id, data)
        break

      case 'RECORD_USAGE':
        handleRecordUsage(id, data)
        break

      case 'GET_USAGE':
        handleGetUsage(id, data)
        break

      case 'TERMINATE':
        self.close()
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse)
  }
}

/**
 * Handle batch scoring of items
 */
function handleScoreItems(
  id: string,
  data: {
    items: Array<{ id: string; value: string; keywords?: string[] }>
    query: string
    caseSensitive?: boolean
    customScoring?: boolean
    scoringOptions?: any
  }
) {
  const { items, query, caseSensitive, customScoring, scoringOptions } = data

  // Score all items
  const results = items.map(item => {
    let score = 0

    if (customScoring && scoringOptions) {
      score = computeAdvancedScore(item, query, {}, scoringOptions)
    } else {
      score = calculateItemScore(item, query, caseSensitive)
    }

    return {
      id: item.id,
      score,
    }
  })

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  self.postMessage({
    type: 'SCORE_ITEMS_RESULT',
    id,
    result: results,
  } as WorkerResponse)
}

/**
 * Handle advanced scoring computation
 */
function handleAdvancedScoring(
  id: string,
  data: {
    item: any
    query: string
    weights?: any
    options?: any
  }
) {
  const { item, query, weights, options } = data

  const score = computeAdvancedScore(item, query, weights, options)

  self.postMessage({
    type: 'ADVANCED_SCORE_RESULT',
    id,
    result: { score },
  } as WorkerResponse)
}

/**
 * Handle usage recording
 */
function handleRecordUsage(id: string, data: { itemId: string }) {
  recordUsage(data.itemId)

  self.postMessage({
    type: 'RECORD_USAGE_RESULT',
    id,
    result: { success: true },
  } as WorkerResponse)
}

/**
 * Handle usage retrieval
 */
function handleGetUsage(id: string, data: { itemId: string }) {
  const score = getUsageScore(data.itemId)

  self.postMessage({
    type: 'GET_USAGE_RESULT',
    id,
    result: { score },
  } as WorkerResponse)
}

/**
 * Simple scoring fallback for worker
 */
function calculateItemScore(
  item: { id: string; value: string; keywords?: string[] },
  query: string,
  caseSensitive?: boolean
): number {
  if (!query.trim()) return 0

  // Score the main value
  let score = commandScore(
    caseSensitive ? item.value : item.value.toLowerCase(),
    caseSensitive ? query : query.toLowerCase()
  )

  // Also check keywords
  if (item.keywords && item.keywords.length > 0) {
    const keywordScores = item.keywords.map(keyword => {
      return commandScore(
        caseSensitive ? keyword : keyword.toLowerCase(),
        caseSensitive ? query : query.toLowerCase()
      )
    })
    const bestKeywordScore = Math.max(...keywordScores, 0)
    score = Math.max(score, bestKeywordScore * 0.9)
  }

  return score
}

// Export for TypeScript
export {}
