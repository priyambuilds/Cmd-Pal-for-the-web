// src/types/command-score.d.ts

/**
 * Type declarations for the command-score library.
 *
 * command-score is a small fuzzy string matching library designed for
 * command palettes. It scores how well a search query matches a target string.
 *
 * @see https://www.npmjs.com/package/command-score
 */

declare module 'command-score' {
  /**
   * Calculates a match score between a target string and a search query.
   * Uses fuzzy matching to handle abbreviations, typos, and character skips.
   *
   * @param target - The string to match against (e.g., "Open Settings")
   * @param query - The search query typed by the user (e.g., "sett")
   * @returns A score from 0 to 1:
   *   - 1.0 = Perfect exact match
   *   - 0.99 = Prefix match ("sett" → "settings")
   *   - 0.9 = Acronym match ("os" → "Open Settings")
   *   - 0.3-0.5 = Character skips ("opset" → "Open Settings")
   *   - 0.1-0.2 = Typos/transpositions
   *   - 0 = No match
   *
   * @example
   * ```
   * import commandScore from 'command-score'
   *
   * commandScore("Open Settings", "sett")      // Returns ~0.99
   * commandScore("Calculator", "clc")          // Returns ~0.3
   * commandScore("New Tab", "ntb")             // Returns ~0.9
   * commandScore("Something", "xyz")           // Returns 0
   * ```
   */
  function commandScore(target: string, query: string): number

  export default commandScore
}
