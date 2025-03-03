import React, { useState, useEffect, useRef } from 'react';

export const CommandBar = ({ 
  onCommand, 
  currentWorkspaceIndex = 0,
  switchWorkspace,
  user,
  onLogout
}) => {
  console.log('CommandBar render, currentWorkspaceIndex:', currentWorkspaceIndex);
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
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 0 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(0)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 1 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(1)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 2 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(2)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 3 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(3)} />
      </div>
      <span className="text-gray-400 text-sm font-mono">$</span>
      <input
        ref={inputRef}
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)} 
        onKeyDown={handleKeyDown}
        placeholder="Press '/' to focus"
        className="flex-1 bg-stone-700 text-white px-4 py-1 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {/* User info and logout */}
      {user && (
        <div className="flex items-center border-l border-stone-600 ml-2 pl-2">
          <span className="text-white text-sm font-mono mr-2">
            {user?.username || 'User'}
          </span>
          <button 
            onClick={onLogout}
            className="bg-stone-700 hover:bg-stone-600 text-white text-sm px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default CommandBar;
