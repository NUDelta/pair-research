export default function GroupsPagePending() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="h-10 w-32 rounded bg-gray-300" />
      </div>

      <section>
        <div className="mb-4 h-6 w-52 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={`pending-${i}`} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 h-6 w-44 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={`joined-${i}`} />
          ))}
        </div>
      </section>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="h-5 w-5 rounded-full bg-gray-200" />
      </div>
      <div className="h-4 w-full rounded bg-gray-100" />
      <div className="h-4 w-3/4 rounded bg-gray-100" />
      <div className="h-4 w-1/2 rounded bg-gray-100" />
      <div className="mt-2 h-4 w-24 rounded bg-gray-300" />
    </div>
  )
}
