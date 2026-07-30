import Loader from '@/components/Loader';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015),0_30px_60px_rgba(0,0,0,0.015)] border-none outline-none">
        <Loader />
      </div>
    </div>
  );
}
