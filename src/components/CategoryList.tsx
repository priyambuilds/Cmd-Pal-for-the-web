import { useMemo } from 'react'
import { categories, allCommands } from '@/lib/commands'
import CommandItem from './CommandItem'

export interface CategoryListProps {
  categoryId: string
  onSelect: (commandId: string) => void
}

/**
 * Shows commands within a specific category
 */
export default function CategoryList({
  categoryId,
  onSelect,
}: CategoryListProps) {
  // Find the category
  const category = useMemo(
    () => categories.find(cat => cat.id === categoryId),
    [categoryId]
  )

  // Get commands for this category
  const categoryCommands = useMemo(() => {
    if (!category) return []
    return allCommands.filter(cmd => cmd.category === category.id)
  }, [category])

  // Category not found
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-2 text-4xl">❓</div>
        <p className="text-gray-500 dark:text-gray-400">Category not found</p>
      </div>
    )
  }

  // No commands in category
  if (categoryCommands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-2 text-4xl">{category.icon}</div>
        <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          {category.name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No commands in this category yet
        </p>
      </div>
    )
  }

  // Render category commands
  return (
    <>
      {/* Category Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {category.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {category.description}
            </div>
          </div>
        </div>
      </div>

      {/* Commands in Category */}
      {categoryCommands.map(cmd => (
        <CommandItem
          key={cmd.id}
          value={cmd.id}
          keywords={cmd.keywords}
          onSelect={() => onSelect(cmd.id)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cmd.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {cmd.name}
              </div>
              {cmd.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {cmd.description}
                </div>
              )}
            </div>
          </div>
        </CommandItem>
      ))}
    </>
  )
}
