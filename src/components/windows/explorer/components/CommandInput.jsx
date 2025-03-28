import React from 'react';

const CommandInput = ({ focusRef, isAdmin, handleCommand }) => {
  // Handle command input
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const cmd = e.target.value.trim();
      handleCommand(cmd);
      e.target.value = '';
    }
  };

  return (
    <div className="p-2 flex items-center gap-2 border-t border-stone-700">
      <span className="text-teal-400">$</span>
      <input
        ref={focusRef}
        type="text"
        onKeyDown={onKeyDown}
        className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
      />
    </div>
  );
};

export default CommandInput;
