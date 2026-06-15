import React from "react";
import { Loader2, Heart } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ message, overlay = false }: LoadingSpinnerProps) {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/85 backdrop-blur-xs transition-colors">
        <div className="relative flex items-center justify-center">
          {/* Outer elegant spinning arc */}
          <Loader2 className="h-14 w-14 animate-spin text-rose-800 dark:text-amber-500" size={56} />
          {/* Inner heartbeat element */}
          <div className="absolute">
            <Heart size={18} fill="currentColor" className="text-amber-400 animate-pulse" />
          </div>
        </div>
        {message && (
          <p className="mt-4 text-xs font-serif font-semibold text-rose-950 dark:text-amber-200 tracking-wide animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-800" size={32} />
        <div className="absolute">
          <Heart size={10} fill="currentColor" className="text-amber-400 animate-pulse" />
        </div>
      </div>
      {message && (
        <p className="mt-2 text-[11px] font-medium text-gray-500 tracking-wide">
          {message}
        </p>
      )}
    </div>
  );
}
