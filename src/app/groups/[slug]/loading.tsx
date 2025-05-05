export default function SingleGroupPageLoading() {
  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded hidden sm:block" />
          <div className="h-8 w-24 bg-gray-200 rounded hidden sm:block" />
        </div>
      </div>

      {/* My Task Card */}
      <div className="border rounded-md shadow-sm p-4 space-y-3">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-6 w-1/4 bg-gray-200 rounded mt-4" />
      </div>

      {/* Other's Tasks Section */}
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        {[...Array.from({ length: 3 })].map((_, i) => (
          <div key={i} className="border rounded-md shadow-sm p-4 justify-between flex flex-col space-y-4 sm:flex-row sm:space-y-0">
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-5/6 bg-gray-100 rounded" />
              <div className="flex items-center gap-3 mt-2">
                <div className="h-6 w-6 bg-gray-300 rounded-full" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {[...Array.from({ length: 5 })].map((_, j) => (
                <div key={j} className="w-8 h-8 bg-gray-100 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
