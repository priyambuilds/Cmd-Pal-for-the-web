/**
 * Advanced scoring and ranking utilities
 * Provides enhanced algorithms beyond basic command-score
 */

import { commandScore } from './command-score'
import type { CommandItem } from '../../types'

// Usage tracking for frequency-based scoring
interface UsageStats {
  id: string
  count: number
  lastUsed: number
}

// In-memory usage database
const usageStats = new Map<string, UsageStats>()
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get recent usage count for frequency-based scoring
 */
export function getUsageScore(itemId: string): number {
  const stats = usageStats.get(itemId)
  if (!stats) return 0

  // Only count recent usage
  const now = Date.now()
  if (now - stats.lastUsed > RECENT_WINDOW_MS) {
    // Reset if too old
    usageStats.set(itemId, { id: itemId, count: 0, lastUsed: now })
    return 0
  }

  // Return logarithmic score (1-10 range)
  return Math.min(Math.log10(stats.count + 1) * 2, 10)
}

/**
 * Record usage for frequency-based scoring
 */
export function recordUsage(itemId: string): void {
  const stats = usageStats.get(itemId) || { id: itemId, count: 0, lastUsed: 0 }
  usageStats.set(itemId, {
    ...stats,
    count: stats.count + 1,
    lastUsed: Date.now(),
  })
}

/**
 * Advanced scoring with multiple algorithms
 */
export interface ScoringWeights {
  textMatch: number // Base command-score (0-1)
  keywordMatch: number // Keyword matches (0-1)
  frequency: number // Usage frequency (0-1)
  recency: number // How recent (0-1)
  position: number // Position in original list (0-1)
  length: number // Length penalty (0-1)
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  textMatch: 1.0,
  keywordMatch: 0.8,
  frequency: 0.3,
  recency: 0.2,
  position: 0.1,
  length: 0.05,
}

/**
 * Compute comprehensive score using multiple factors
 */
export function computeAdvancedScore(
  item: CommandItem,
  query: string,
  weights: Partial<ScoringWeights> = {},
  options: {
    caseSensitive?: boolean
    recentBoost?: number
    frequencyBoost?: boolean
    itemIndex?: number // Position in original list
  } = {}
): number {
  const w = { ...DEFAULT_WEIGHTS, ...weights }
  const { caseSensitive, recentBoost, frequencyBoost, itemIndex } = options

  let totalScore = 0
  let totalWeight = 0

  // 1. Basic text matching (command-score algorithm)
  const textScore = commandScore(
    caseSensitive ? item.value : item.value.toLowerCase(),
    caseSensitive ? query : query.toLowerCase()
  )
  totalScore += textScore * w.textMatch
  totalWeight += w.textMatch

  // 2. Keyword matching
  if (item.keywords && item.keywords.length > 0 && query.trim()) {
    const keywordScores = item.keywords.map(keyword => {
      const kwScore = commandScore(
        caseSensitive ? keyword : keyword.toLowerCase(),
        caseSensitive ? query : query.toLowerCase()
      )
      return kwScore
    })
    const bestKeywordScore = Math.max(...keywordScores, 0)
    totalScore += bestKeywordScore * w.keywordMatch
    totalWeight += w.keywordMatch
  }

  // 3. Usage frequency
  if (frequencyBoost) {
    const freqScore = getUsageScore(item.id) / 10 // Normalize to 0-1
    totalScore += freqScore * w.frequency
    totalWeight += w.frequency
  }

  // 4. Recent usage boost
  if (recentBoost && recentBoost > 1) {
    const recentMultiplier = wasUsedRecently(item.id) ? recentBoost : 1.0
    totalScore *= recentMultiplier
  }

  // 5. Position bonus (earlier items get slight boost)
  if (itemIndex !== undefined && itemIndex >= 0) {
    const positionScore = Math.max(0, (100 - itemIndex) / 100) // Higher for earlier positions
    totalScore += positionScore * w.position
    totalWeight += w.position
  }

  // 6. Length penalty (shorter matches preferred for same score)
  const lengthPenalty = Math.max(0, 1 - item.value.length / 100) // Penalize very long items
  totalScore += lengthPenalty * w.length
  totalWeight += w.length

  // Normalize by total weight
  return totalWeight > 0 ? totalScore / totalWeight : textScore
}

/**
 * Check if item was used recently (within time window)
 */
function wasUsedRecently(itemId: string): boolean {
  const stats = usageStats.get(itemId)
  if (!stats) return false

  const now = Date.now()
  return now - stats.lastUsed < RECENT_WINDOW_MS
}

/**
 * Fuzzy ranking algorithm (Levenshtein distance-based)
 */
export function fuzzyRank(text: string, query: string): number {
  if (!query) return 1

  text = text.toLowerCase()
  query = query.toLowerCase()

  // Exact match gets highest score
  if (text === query) return 1

  // Contains query gets good score
  if (text.includes(query)) {
    const position = text.indexOf(query)
    // Earlier matches get higher score
    return Math.max(0.5, 1 - (position / text.length) * 0.3)
  }

  // Fuzzy matching using character-level scoring
  return fuzzyMatchScore(text, query)
}

/**
 * Simple edit distance based scoring (simplified Levenshtein)
 * Returns a score from 0-1 where 1 is perfect match
 */
function fuzzyMatchScore(text: string, query: string): number {
  if (query.length === 0) return 1
  if (text.length === 0) return 0

  // Very simple substring-based scoring for now
  // Can be extended with full Levenshtein if needed
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact substring match
  if (textLower.includes(queryLower)) {
    return 0.8
  }

  // Character-level matching
  let matches = 0
  for (const char of queryLower) {
    if (textLower.includes(char)) {
      matches++
    }
  }

  // Calculate similarity ratio
  const similarity = matches / queryLower.length
  const lengthDiff = Math.abs(text.length - query.length)
  const lengthPenalty = Math.max(
    0,
    1 - lengthDiff / Math.max(text.length, query.length)
  )

  return similarity * lengthPenalty * 0.7 // Scale down to leave room for better matches
}

/**
 * Time-decay algorithm for recent items
 */
export function timeDecayScore(
  lastUsedMs: number,
  currentTime: number = Date.now()
): number {
  const ageMs = currentTime - lastUsedMs
  const decayRate = 0.0000001 // Adjust for desired decay speed

  // Exponential decay: score = e^(-decayRate * age)
  return Math.exp(-decayRate * ageMs)
}

/**
 * Contextual scoring based on user behavior patterns
 */
export interface ContextData {
  timeOfDay: number // 0-23 (hour)
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  recentlyViewed: string[] // IDs of recently viewed items
  favorites: string[] // IDs of favorited items
}

export function contextualScore(
  item: CommandItem,
  context: ContextData,
  baseScore: number
): number {
  let multiplier = 1.0

  // Favor items often used at similar times
  if (context.recentlyViewed.includes(item.id)) {
    multiplier *= 1.5
  }

  // Favor favorites
  if (context.favorites.includes(item.id)) {
    multiplier *= 2.0
  }

  // Some apps might prefer different items at different times
  // This is just an example of contextual scoring
  const isWorkHour = context.timeOfDay >= 9 && context.timeOfDay <= 17
  const isWeekday = context.dayOfWeek >= 1 && context.dayOfWeek <= 5

  // Different scoring based on time/day context
  if (isWorkHour && isWeekday) {
    // During work hours on weekdays, boost productivity items
    if (
      item.keywords?.some(kw => ['work', 'productivity', 'tools'].includes(kw))
    ) {
      multiplier *= 1.2
    }
  }

  return baseScore * multiplier
}
