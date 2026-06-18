export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="kpi-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-8 w-32" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
              <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary KPIs + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="flex flex-col gap-6">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="dashboard-card flex items-center gap-4 p-6">
              <SkeletonBlock className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-2 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="chart-card p-6">
          <SkeletonBlock className="h-5 w-48 mb-2" />
          <SkeletonBlock className="h-3 w-64 mb-6" />
          <div className="h-64 flex items-center justify-center">
            <SkeletonBlock className="h-48 w-48 rounded-full" />
          </div>
        </div>
      </div>

      {/* Row 3: Bar + Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="chart-card p-6">
            <SkeletonBlock className="h-5 w-40 mb-2" />
            <SkeletonBlock className="h-3 w-56 mb-8" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        ))}
      </div>

      {/* Row 4: Horizontal Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="chart-card p-6">
            <SkeletonBlock className="h-5 w-40 mb-2" />
            <SkeletonBlock className="h-3 w-56 mb-8" />
            <div className="h-64 flex flex-col gap-4">
              <SkeletonBlock className="h-8 w-full" />
              <SkeletonBlock className="h-8 w-3/4" />
              <SkeletonBlock className="h-8 w-5/6" />
              <SkeletonBlock className="h-8 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Row 5: Table */}
      <TableSkeleton rows={5} columns={6} />
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
