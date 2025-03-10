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
    <div className="p-4 h-full flex flex-col bg-stone-900">
      <div className="flex-1">
        <h1 className="text-2xl text-teal-400 font-mono">Pretend this is a chart</h1>
        <p className="mt-2 text-teal-400 font-mono text-sm">
          these would be the different components
        </p>
      </div>

      {/* Command input */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-teal-400 mr-2">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
};

export default PreviewWindow;
