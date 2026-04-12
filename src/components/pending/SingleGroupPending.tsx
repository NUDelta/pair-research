export default function SingleGroupPending() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 animate-pulse">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="hidden h-8 w-24 rounded bg-gray-200 sm:block" />
          <div className="hidden h-8 w-24 rounded bg-gray-200 sm:block" />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4 shadow-sm">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-5/6 rounded bg-gray-100" />
        <div className="mt-4 h-6 w-1/4 rounded bg-gray-200" />
      </div>

      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between space-y-4 rounded-md border p-4 shadow-sm sm:flex-row sm:space-y-0"
          >
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-5/6 rounded bg-gray-100" />
              <div className="mt-2 flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-300" />
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-8 w-8 rounded-full bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
