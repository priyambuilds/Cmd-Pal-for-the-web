// src/lib/scheduler/dom-scheduler.ts

/**
 * Simple DOM Scheduler for batching DOM operations
 * Uses requestAnimationFrame to prevent layout thrashing
 */
class DOMScheduler {
  private pendingTasks = new Set<() => void>()
  private isFlushScheduled = false

  /**
   * Schedule a task to run on next animation frame
   */
  schedule(callback: () => void) {
    this.pendingTasks.add(callback)
    if (!this.isFlushScheduled) {
      this.isFlushScheduled = true
      requestAnimationFrame(() => {
        this.pendingTasks.forEach(task => task())
        this.pendingTasks.clear()
        this.isFlushScheduled = false
      })
    }
  }
}

/**
 * Singleton instance
 */
let globalScheduler: DOMScheduler | null = null

export function getScheduler(): DOMScheduler {
  if (!globalScheduler) {
    globalScheduler = new DOMScheduler()
  }
  return globalScheduler
}

/**
 * Reset for testing (optional)
 */
export function resetScheduler(): void {
  globalScheduler = null
}
