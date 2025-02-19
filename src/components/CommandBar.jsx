import React, { useState, useEffect, useRef } from 'react';

export const CommandBar = ({ 
  onCommand, 
  currentWorkspaceIndex = 0
}) => {
  const [command, setCommand] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="w-full bg-stone-800 p-2 flex items-center gap-2">
      <div className="flex gap-2 items-center pr-2 border-r border-stone-600">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i === currentWorkspaceIndex 
                ? 'w-3 h-3 bg-teal-400' 
                : 'w-2 h-2 bg-stone-600'
            }`}
          />
        ))}
      </div>
      <span className="text-gray-400 text-sm font-mono">$</span>
      <input
        ref={inputRef}
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type 'help' for available commands or press '/' to focus"
        className="flex-1 bg-stone-700 text-white px-4 py-1 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default CommandBar;
