export default function CreateGroupLoading() {
  return (
    <div className="container max-w-5xl mx-auto p-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" />

      <div className="space-y-6">
        {/* Basics Section */}
        <CardSkeleton lines={2} />

        {/* Roles Section */}
        <CardSkeleton lines={4} />

        {/* Assigned Role */}
        <div className="p-6 rounded-lg shadow space-y-4">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>

        {/* Members Section */}
        <CardSkeleton lines={3} />

        {/* Submit button */}
        <div className="flex justify-end">
          <div className="h-10 w-32 bg-gray-300 rounded" />
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-6 rounded-lg shadow space-y-4">
      <div className="h-5 w-40 bg-gray-200 rounded" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}
