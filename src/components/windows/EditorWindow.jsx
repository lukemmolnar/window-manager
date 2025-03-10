import React, { useState, useEffect } from 'react';

const EditorWindow = ({ nodeId, onCommand, windowState, updateWindowState }) => {
  // Use state from windowState or default value
  const [text, setText] = useState(windowState?.text || `function hello() {\n  console.log("Hello, World!");\n}\n\n// Call the function\nhello();`);
  const [command, setCommand] = useState('');
  
  // Sync with external state when it changes
  useEffect(() => {
    if (windowState && windowState.text !== undefined) {
      setText(windowState.text);
    }
  }, [windowState]);
  
  // Update window state when text changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({ text });
    }
  }, [text, updateWindowState]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  return (
    <div className="p-4 font-mono text-sm h-full flex flex-col bg-white">
      <div className="flex-1">
        <textarea
          className="w-full h-full text-gray-800 resize-none focus:outline-none"
          value={text}
          onChange={handleTextChange}
        />
      </div>

      {/* Editor's own command input */}
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
