export function SkeletonBlock({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div 
      className={`rounded-2xl ${dark ? 'shimmer-bg-dark' : 'shimmer-bg'} ${className}`} 
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="kpi-card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-8 w-36" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
              <SkeletonBlock className="h-12 w-12 rounded-2xl shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary KPIs + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="flex flex-col gap-6">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="dashboard-card flex items-center gap-5">
              <SkeletonBlock className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2.5 flex-1">
                <SkeletonBlock className="h-3.5 w-28" />
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-2 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="chart-card">
          <SkeletonBlock className="h-5.5 w-48 mb-3" />
          <SkeletonBlock className="h-3.5 w-64 mb-8" />
          <div className="h-64 flex items-center justify-center">
            <SkeletonBlock className="h-48 w-48 rounded-full" />
          </div>
        </div>
      </div>

      {/* Row 3: Bar + Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="chart-card">
            <SkeletonBlock className="h-5.5 w-40 mb-3" />
            <SkeletonBlock className="h-3.5 w-56 mb-8" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        ))}
      </div>

      {/* Row 4: Horizontal Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="chart-card">
            <SkeletonBlock className="h-5.5 w-40 mb-3" />
            <SkeletonBlock className="h-3.5 w-56 mb-8" />
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
    <div className="card overflow-hidden !p-0">
      <div className="p-6 border-b border-gray-100">
        <SkeletonBlock className="h-6 w-44" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50">
              {[...Array(columns)].map((_, index) => (
                <th key={index} className="p-5"><SkeletonBlock className="h-3.5 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, row) => (
              <tr key={row} className="border-b border-gray-100/60 last:border-b-0">
                {[...Array(columns)].map((__, column) => (
                  <td key={column} className="p-5"><SkeletonBlock className="h-4 w-full max-w-[140px]" /></td>
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
    <div className="max-w-3xl mx-auto card space-y-6">
      <div>
        <SkeletonBlock className="h-7 w-52 mb-3.5" />
        <SkeletonBlock className="h-4.5 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="space-y-2.5">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
        <SkeletonBlock className="h-10 w-24 rounded-xl" />
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
