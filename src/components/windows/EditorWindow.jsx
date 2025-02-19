import React, { useState } from 'react';

const EditorWindow = ({ nodeId, onCommand }) => {
  const [command, setCommand] = useState('');
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  return (
    <div className="p-4 font-mono text-sm h-full flex flex-col bg-white">
      <div className="flex-1">
        <pre className="text-gray-800">
          {`function hello() {
  console.log("Hello, World!");
}

// Call the function
hello();`}
        </pre>
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

export default EditorWindow;