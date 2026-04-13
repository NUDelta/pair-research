export default function CreateGroupPending() {
  return (
    <div className="container mx-auto max-w-5xl animate-pulse p-6">
      <div className="mb-6 h-8 w-48 rounded bg-gray-200" />

      <div className="space-y-6">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={4} />

        <div className="space-y-4 rounded-lg p-6 shadow">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
        </div>

        <CardSkeleton lines={3} />

        <div className="flex justify-end">
          <div className="h-10 w-32 rounded bg-gray-300" />
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  const skeletonLineKeys = Array.from({ length: lines }, (_, index) => `line-${index + 1}`)

  return (
    <div className="space-y-4 rounded-lg p-6 shadow">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="space-y-3">
        {skeletonLineKeys.map(lineKey => (
          <div key={lineKey} className="h-10 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
