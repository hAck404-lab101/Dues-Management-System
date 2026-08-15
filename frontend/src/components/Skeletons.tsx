export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`} />;
}

export function DashboardSkeleton({ title = 'Dashboard' }: { title?: string }) {
  return (
    <div className="space-y-8">
      <div>
        <SkeletonBlock className="h-7 w-56 mb-3" />
        <SkeletonBlock className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-8 w-32" />
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="card p-6 space-y-4">
            <SkeletonBlock className="h-6 w-40" />
            <div className="space-y-3">
              {[...Array(4)].map((__, row) => (
                <div key={row} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-6 w-20 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3 w-32" />
                  <SkeletonBlock className="h-3 w-48" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        <SkeletonBlock className="h-6 w-44" />
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center justify-between border-b last:border-b-0 py-3 gap-4">
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b">
        <SkeletonBlock className="h-6 w-44" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {[...Array(columns)].map((_, index) => (
                <th key={index} className="p-4"><SkeletonBlock className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, row) => (
              <tr key={row} className="border-b last:border-b-0">
                {[...Array(columns)].map((__, column) => (
                  <td key={column} className="p-4"><SkeletonBlock className="h-4 w-full max-w-[140px]" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto card p-6 space-y-6">
      <div>
        <SkeletonBlock className="h-7 w-52 mb-3" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <SkeletonBlock className="h-10 w-24 rounded-xl" />
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
