import { useCommandContext } from '@/types/context'
import { categories } from '@/lib/commands'

/**
 * Shows browsable categories
 */
export default function CategoryList() {
  const store = useCommandContext()

  const handleCategoryClick = (categoryId: string) => {
    store.navigate({
      type: 'category',
      categoryId,
      query: '',
    })
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        📂 Browse by Category
      </div>
      {categories.map(category => (
        <div
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="text-2xl">{category.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {category.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {category.description} • {category.commandIds.length} commands
            </div>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
