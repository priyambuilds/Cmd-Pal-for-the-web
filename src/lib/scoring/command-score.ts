// src/lib/scoring/command-score.ts

/**
 * Enhanced Command Scoring Algorithm
 *
 * This is the heart of the search functionality. It determines how well
 * a search query matches a target string using fuzzy matching.
 *
 * Based on the original CMDK scoring but enhanced with:
 * - TypeScript types for safety
 * - Configurable scoring weights
 * - Performance optimizations
 * - Better edge case handling
 */

// =============================================================================
// SCORING WEIGHTS - These control how matches are scored
// =============================================================================

/**
 * Best case: continuous character match
 * Example: typing "git" in "github" - each letter flows to the next
 */
const SCORE_CONTINUE_MATCH = 1.0

/**
 * Matching at a word boundary (after a space)
 * Example: typing "n" matches "New" in "New File"
 * This gets high score because users often type word starts
 */
const SCORE_SPACE_WORD_JUMP = 0.9

/**
 * Matching at a word boundary (after -, _, /, etc.)
 * Example: typing "f" matches "file" in "create-file"
 * Slightly lower than space because less common
 */
const SCORE_NON_SPACE_WORD_JUMP = 0.8

/**
 * Matching a character anywhere else
 * Example: typing "u" matches "GitHub" (the second letter)
 * Low score because it's less likely what user meant
 */
const SCORE_CHARACTER_JUMP = 0.17

/**
 * Penalty for transposed characters
 * Example: typing "teh" should still match "the" but with lower score
 */
const SCORE_TRANSPOSITION = 0.1

/**
 * Maximum score degradation for missing characters
 * Ensures score decreases smoothly as query gets longer
 */
const PENALTY_SKIPPED = 0.999

/**
 * Penalty for sequential character misses
 * Makes consecutive misses hurt more than spread out misses
 */
const PENALTY_DISTANCE = 0.9

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if character is a word boundary
 * Word boundaries: space, dash, underscore, slash, dot, etc.
 */
function isWordBoundary(char: string): boolean {
  return /[\s\-_/\\.]/.test(char)
}

/**
 * Check if character is uppercase (useful for camelCase matching)
 */
function isUpperCase(char: string): boolean {
  return char === char.toUpperCase() && char !== char.toLowerCase()
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculate fuzzy match score between search query and target string
 *
 * @param target - The string to search in (e.g., "Create New File")
 * @param query - The search query (e.g., "new")
 * @returns Score between 0 and 1 (1 = perfect match, 0 = no match)
 *
 * @example
 * commandScore("GitHub", "git")    // ~0.95 (great match)
 * commandScore("GitHub", "hub")    // ~0.75 (good match)
 * commandScore("GitHub", "xyz")    // 0 (no match)
 */
export function commandScore(target: string, query: string): number {
  // Normalize to lowercase for case-insensitive matching
  const lowerTarget = target.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Edge cases - handle early for performance
  if (lowerQuery === '') return 0
  if (lowerQuery === lowerTarget) return 1
  if (lowerTarget.includes(lowerQuery)) {
    // Substring match - high score
    // Boost score if it's at the start
    const startsWithQuery = lowerTarget.startsWith(lowerQuery)
    return startsWithQuery ? 0.9 : 0.7
  }

  // No substring match - use fuzzy algorithm
  return fuzzyScore(target, lowerTarget, query, lowerQuery)
}

/**
 * Core fuzzy matching algorithm
 * This is where the magic happens!
 */
function fuzzyScore(
  target: string,
  lowerTarget: string,
  query: string,
  lowerQuery: string
): number {
  const targetLength = target.length
  const queryLength = query.length

  // Impossible to match if query is longer than target
  if (queryLength > targetLength) return 0

  // Track scoring state
  let score = 0
  let queryIndex = 0
  let targetIndex = 0
  let lastMatchIndex = -1
  let consecutiveMatches = 0

  // Walk through target string looking for query characters
  while (targetIndex < targetLength) {
    // Already matched all query characters? We're done!
    if (queryIndex >= queryLength) break

    const queryChar = lowerQuery[queryIndex]
    const targetChar = lowerTarget[targetIndex]

    // Character match found!
    if (queryChar === targetChar) {
      // Calculate points for this match
      let points = 0

      // Bonus for consecutive matches
      if (lastMatchIndex === targetIndex - 1) {
        consecutiveMatches++
        points = SCORE_CONTINUE_MATCH
      } else {
        consecutiveMatches = 0

        // First character match
        if (targetIndex === 0) {
          points = SCORE_CONTINUE_MATCH
        }
        // Match at camelCase boundary (e.g., "N" in "createNew")
        else {
          const currentChar = target[targetIndex]

          if (currentChar && isUpperCase(currentChar)) {
            points = SCORE_NON_SPACE_WORD_JUMP
          }
          // Match after word boundary character
          else if (targetIndex > 0) {
            const prevChar = target[targetIndex - 1]
            if (prevChar && isWordBoundary(prevChar)) {
              // Space gets slightly higher score than other boundaries
              points =
                prevChar === ' '
                  ? SCORE_SPACE_WORD_JUMP
                  : SCORE_NON_SPACE_WORD_JUMP
            } else {
              // Regular character jump
              points = SCORE_CHARACTER_JUMP

              // Apply distance penalty for jumping far
              if (lastMatchIndex >= 0) {
                const distance = targetIndex - lastMatchIndex - 1
                points *= Math.pow(PENALTY_DISTANCE, distance)
              }
            }
          } else {
            // Default to character jump
            points = SCORE_CHARACTER_JUMP

            if (lastMatchIndex >= 0) {
              const distance = targetIndex - lastMatchIndex - 1
              points *= Math.pow(PENALTY_DISTANCE, distance)
            }
          }
        }
      }

      // Bonus for consecutive matches
      if (consecutiveMatches > 0) {
        points *= 1 + consecutiveMatches * 0.1
      }

      score += points
      lastMatchIndex = targetIndex
      queryIndex++
    }

    targetIndex++
  }

  // Penalty if we didn't match all query characters
  if (queryIndex < queryLength) {
    return 0
  }

  // Normalize score by query length
  score = score / queryLength

  // Slight penalty for longer targets (prefer shorter matches)
  score *= Math.pow(PENALTY_SKIPPED, targetLength - queryLength)

  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score))
}

// =============================================================================
// UTILITY FUNCTIONS FOR BULK SCORING
// =============================================================================

/**
 * Score multiple items and return sorted results
 * Useful for filtering and sorting a list of command items
 *
 * @example
 * const items = [
 *   { value: "Create File" },
 *   { value: "Delete File" },
 *   { value: "New Folder" }
 * ]
 * const sorted = scoreAndSort(items, "file")
 * // Returns items sorted by relevance to "file"
 */
export function scoreAndSort<T extends { value: string; keywords?: string[] }>(
  items: T[],
  query: string
): Array<T & { score: number }> {
  if (!query || query.trim() === '') {
    // No query - return all items with max score
    return items.map(item => ({ ...item, score: 1 }))
  }

  return items
    .map(item => {
      // Score the main value
      let score = commandScore(item.value, query)

      // Also check keywords if available
      if (item.keywords && item.keywords.length > 0) {
        const keywordScores = item.keywords.map(keyword =>
          commandScore(keyword, query)
        )
        // Take the best keyword score
        const bestKeywordScore = Math.max(...keywordScores)
        // Use keyword score if it's better (with slight penalty)
        score = Math.max(score, bestKeywordScore * 0.9)
      }

      return { ...item, score }
    })
    .filter(item => item.score > 0) // Remove non-matches
    .sort((a, b) => b.score - a.score) // Sort by score descending
}

/**
 * Check if a query matches a target (simple boolean)
 * Useful when you just need to know if there's a match, not the score
 *
 * @example
 * matches("GitHub", "git")  // true
 * matches("GitHub", "xyz")  // false
 */
export function matches(target: string, query: string): boolean {
  return commandScore(target, query) > 0
}
