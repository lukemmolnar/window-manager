import React, { useState } from 'react';

const PreviewWindow = ({ nodeId, onCommand }) => {
  const [command, setCommand] = useState('');
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  return (
    <div className="p-4 h-full flex flex-col bg-white">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">Preview Window</h1>
        <p className="mt-2 text-gray-600">
          Live preview of your content will appear here.
        </p>
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

export default PreviewWindow;