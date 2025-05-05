export default function AccountPageLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-pulse">
      {/* Title Skeleton */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />

      {/* Avatar + Change Avatar Button */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar circle */}
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
          {/* Updated label */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
        {/* File input button */}
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40" />
      </div>

      {/* Full Name field */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Save button */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32" />

      {/* Placeholder for future features */}
      <div className="pt-8 space-y-2">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
      </div>
    </div>
  )
}
