import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
      <div className="space-y-2 mt-6">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
};
