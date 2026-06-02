import { SkeletonBlock } from '@/components/Skeletons';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-neutral">
      <div className="bg-primary text-white shadow-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-xl bg-white/20" />
            <SkeletonBlock className="h-5 w-40 bg-white/20" />
          </div>
          <div className="hidden md:flex gap-3">
            <SkeletonBlock className="h-9 w-20 bg-white/20" />
            <SkeletonBlock className="h-9 w-24 bg-white/20" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="rounded-3xl bg-white p-8 md:p-12 shadow-sm space-y-6 text-center">
          <SkeletonBlock className="h-12 w-3/4 max-w-xl mx-auto" />
          <SkeletonBlock className="h-5 w-2/3 max-w-lg mx-auto" />
          <SkeletonBlock className="h-5 w-1/2 max-w-md mx-auto" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-3">
            <SkeletonBlock className="h-12 w-36 rounded-xl" />
            <SkeletonBlock className="h-12 w-36 rounded-xl" />
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="card p-6 space-y-4">
              <SkeletonBlock className="h-12 w-12 rounded-xl mx-auto" />
              <SkeletonBlock className="h-5 w-32 mx-auto" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-4/5 mx-auto" />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
