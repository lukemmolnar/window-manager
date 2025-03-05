import React from 'react';

export const EmptyState = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-stone-950">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-teal-400 mb-4">SLUMNET</h2>
      <p className="text-teal-400 mb-4">Bub boils the seed!</p>
      <div className="text-teal-50 bg-stone-950 p-2 font-mono text-sm">
        <p>Keyboard shortcdwadwauts:</p>
        <p>Ctrl+Enter - Create/Split Vertical</p>
        <p>Ctrl+Shift+Enter - Split Horizontal</p>
        <p>Ctrl+Backspace - Close Window</p>
      </div>
    </div>
  </div>
);

export default EmptyState;
