import { DashboardSkeleton } from '@/components/Skeletons';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-neutral flex">
      {/* Sidebar skeleton */}
      <div className="w-64 min-h-screen bg-primary/95 shrink-0 hidden lg:block" />
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-20 bg-white border-b border-gray-100 px-8 flex items-center gap-4">
          <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="ml-auto h-9 w-28 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <main className="flex-1 p-8">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
}
