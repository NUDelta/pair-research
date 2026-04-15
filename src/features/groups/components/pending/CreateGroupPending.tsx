export default function CreateGroupPending() {
  return (
    <div className="container mx-auto flex max-w-7xl animate-pulse flex-col gap-6 p-6">
      <div className="h-8 w-56 rounded bg-gray-200" />
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={5} />
        <div className="rounded-lg border p-6">
          <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
          <div className="space-y-4">
            <div className="h-12 rounded bg-gray-100" />
            <div className="flex justify-end">
              <div className="h-10 w-32 rounded bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  const skeletonLineKeys = Array.from({ length: lines }, (_, index) => `line-${index + 1}`)

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="space-y-3">
        {skeletonLineKeys.map(lineKey => (
          <div key={lineKey} className="h-10 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
