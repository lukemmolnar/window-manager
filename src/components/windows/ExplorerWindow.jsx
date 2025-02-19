import React, { useState } from 'react';
import { FolderOpen, Code } from 'lucide-react';

const ExplorerWindow = ({ nodeId, onCommand }) => {
  const [command, setCommand] = useState('');
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-white">
      <div className="flex-1">
        {/* File tree structure */}
        <div className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer">
          <FolderOpen size={16} />
          <span>src/</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer ml-4">
          <Code size={16} />
          <span>main.js</span>
        </div>
      </div>

      {/* Command input */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-gray-400">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-gray-100 px-2 py-1 rounded text-sm focus:outline-none"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
};

export default ExplorerWindow;