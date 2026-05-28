import { Suspense } from 'react';

export default function MakePaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading payment page...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
