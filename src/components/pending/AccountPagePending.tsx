export default function AccountPagePending() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-8 p-6">
      <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="h-10 w-32 rounded bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-2 pt-8">
        <div className="h-6 w-1/5 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/5 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}
