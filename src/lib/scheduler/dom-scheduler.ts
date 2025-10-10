// src/lib/scheduler/dom-scheduler.ts

/**
 * Priority-based DOM Scheduler
 *
 * Why do we need this?
 * When multiple operations happen at once (user types → filter → select → scroll),
 * we want to:
 * 1. Batch them together to prevent layout thrashing
 * 2. Execute in the right order (high priority first)
 * 3. Only run once per animation frame
 *
 * Original CMDK used a similar pattern but was tightly coupled.
 * We're making it reusable and testable.
 */

export enum SchedulerPriority {
  /**
   * IMMEDIATE - Run before anything else
   * Example: Selecting first item when palette opens
   */
  IMMEDIATE = 1,

  /**
   * HIGH - Run after immediate but before normal
   * Example: Sorting and filtering items
   */
  HIGH = 2,

  /**
   * NORMAL - Default priority
   * Example: Mounting/unmounting items
   */
  NORMAL = 3,

  /**
   * LOW - Run after everything else
   * Example: Scrolling selected item into view
   */
  LOW = 4,

  /**
   * IDLE - Run when browser is idle
   * Example: Preloading images, analytics
   */
  IDLE = 5,
}

type ScheduledTask = {
  id: string
  priority: SchedulerPriority
  fn: () => void
  /** If true, only keep the latest call with this ID */
  deduplicate?: boolean
}

/**
 * DOMScheduler - Manages batched DOM operations
 */
export class DOMScheduler {
  /**
   * Queue of pending tasks, grouped by priority
   * Lower number = higher priority
   */
  private queues: Map<SchedulerPriority, Map<string, ScheduledTask>> = new Map()

  /**
   * Animation frame ID for cancellation
   */
  private rafId: number | null = null

  /**
   * Idle callback ID for cancellation
   */
  private idleId: number | null = null

  /**
   * Whether a flush is already scheduled
   */
  private isFlushScheduled = false

  constructor() {
    // Initialize priority queues
    Object.values(SchedulerPriority)
      .filter(v => typeof v === 'number')
      .forEach(priority => {
        this.queues.set(priority as SchedulerPriority, new Map())
      })
  }

  /**
   * Schedule a task to run
   *
   * @param id - Unique identifier (used for deduplication)
   * @param priority - When this should run
   * @param fn - The function to execute
   * @param deduplicate - If true, only keep latest call with this ID
   *
   * Usage:
   * ```
   * scheduler.schedule('select-first', SchedulerPriority.IMMEDIATE, () => {
   *   selectFirstItem()
   * }, true)
   * ```
   */
  schedule(
    priority: SchedulerPriority,
    id: string,
    fn: () => void,
    deduplicate = true
  ): void {
    const queue = this.queues.get(priority)
    if (!queue) return

    // If deduplicating, remove old task with same ID
    if (deduplicate && queue.has(id)) {
      queue.delete(id)
    }

    // Add new task
    queue.set(id, { id, priority, fn, deduplicate })

    // Schedule a flush if not already scheduled
    if (!this.isFlushScheduled) {
      this.scheduleFlush(priority)
    }
  }

  /**
   * Schedule the flush operation
   * Uses RAF for normal priorities, requestIdleCallback for idle priority
   */
  private scheduleFlush(priority: SchedulerPriority): void {
    this.isFlushScheduled = true

    if (priority === SchedulerPriority.IDLE) {
      // Use idle callback for low-priority work
      if (typeof requestIdleCallback !== 'undefined') {
        this.idleId = requestIdleCallback(() => this.flush())
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => this.flush(), 50)
      }
    } else {
      // Use RAF for immediate/high/normal/low priorities
      this.rafId = requestAnimationFrame(() => this.flush())
    }
  }

  /**
   * Execute all pending tasks in priority order
   */
  private flush(): void {
    this.isFlushScheduled = false
    this.rafId = null
    this.idleId = null

    // Execute tasks in priority order (1, 2, 3, 4, 5)
    const priorities = Array.from(this.queues.keys()).sort((a, b) => a - b)

    for (const priority of priorities) {
      const queue = this.queues.get(priority)
      if (!queue || queue.size === 0) continue

      // Execute all tasks in this priority level
      const tasks = Array.from(queue.values())
      queue.clear()

      for (const task of tasks) {
        try {
          task.fn()
        } catch (error) {
          console.error(`Error executing scheduled task ${task.id}:`, error)
        }
      }
    }
  }

  /**
   * Cancel a scheduled task
   */
  cancel(id: string, priority?: SchedulerPriority): void {
    if (priority) {
      // Cancel from specific priority queue
      this.queues.get(priority)?.delete(id)
    } else {
      // Cancel from all queues
      this.queues.forEach(queue => queue.delete(id))
    }
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): void {
    this.queues.forEach(queue => queue.clear())

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this.idleId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(this.idleId)
      this.idleId = null
    }

    this.isFlushScheduled = false
  }

  /**
   * Get number of pending tasks
   */
  getPendingCount(): number {
    let count = 0
    this.queues.forEach(queue => {
      count += queue.size
    })
    return count
  }

  /**
   * Check if a specific task is scheduled
   */
  isScheduled(id: string, priority?: SchedulerPriority): boolean {
    if (priority) {
      return this.queues.get(priority)?.has(id) ?? false
    }

    // Check all queues
    for (const queue of this.queues.values()) {
      if (queue.has(id)) return true
    }
    return false
  }
}

/**
 * Create a singleton instance
 * We use a singleton so all components use the same scheduler
 */
let globalScheduler: DOMScheduler | null = null

export function getScheduler(): DOMScheduler {
  if (!globalScheduler) {
    globalScheduler = new DOMScheduler()
  }
  return globalScheduler
}

/**
 * Reset the global scheduler (mainly for testing)
 */
export function resetScheduler(): void {
  globalScheduler?.cancelAll()
  globalScheduler = null
}
