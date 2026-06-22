'use client';

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-5">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulse ring */}
        <div className="absolute w-20 h-20 rounded-full border border-secondary/20 animate-ping duration-1000 opacity-60" />
        
        {/* Apple liquid-glass spin ring */}
        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-secondary border-r-secondary/30 animate-spin" />
        
        {/* Inner brand planet core */}
        <div className="absolute w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse-soft" />
        </div>
      </div>
      
      <div className="text-center space-y-1.5">
        <p className="text-[11px] font-bold tracking-[0.25em] text-primary/80 uppercase animate-pulse">
          Loading Portal
        </p>
        <p className="text-[10px] font-medium text-gray-400">
          Preparing your workspace...
        </p>
      </div>
    </div>
  );
}
