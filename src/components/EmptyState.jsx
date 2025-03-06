import React from 'react';

export const EmptyState = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950">
    <img 
      src="/src/assets/SVG/emptyState.svg" 
      alt="Empty State" 
      className="w-1/4 h-auto"
    />
    <h2 className="text-xl font-semibold text-teal-400 mt-4">SLUMNET</h2>
  </div>
);

export default EmptyState;