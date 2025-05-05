export default function GroupsPageLoading() {
  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-10 w-32 bg-gray-300 rounded" />
      </div>

      {/* Pending Invitations */}
      <section>
        <div className="h-6 w-52 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={`pending-${i}`} />
          ))}
        </div>
      </section>

      {/* Joined Groups */}
      <section>
        <div className="h-6 w-44 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-5 w-5 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-full bg-gray-100 rounded" />
      <div className="h-4 w-3/4 bg-gray-100 rounded" />
      <div className="h-4 w-1/2 bg-gray-100 rounded" />
      <div className="h-4 w-24 bg-gray-300 rounded mt-2" />
    </div>
  )
}
