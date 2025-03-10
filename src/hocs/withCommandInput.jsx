import React, { useState, useRef } from 'react';

/**
 * Higher-Order Component that adds a command input field to any window component.
 * This HOC provides a standardized way to input commands across different window types.
 * The command input is added at the bottom of the window, after any existing content.
 *
 * @param {React.Component} WrappedComponent - The window component to enhance with a command input
 * @returns {React.Component} - A new component with a command input field
 */
const withCommandInput = (WrappedComponent) => {
  return function WithCommandInput({
    onCommand,
    focusRef,
    ...props
  }) {
    const [command, setCommand] = useState('');
    const commandInputRef = useRef(null);

    // Use the provided focusRef for the command input
    const combinedRef = (el) => {
      commandInputRef.current = el;
      if (focusRef) {
        focusRef.current = el;
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && command.trim()) {
        onCommand(command.trim());
        setCommand('');
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Original component takes most of the space */}
        <div className="flex-1 overflow-auto">
          <WrappedComponent
            {...props}
            onCommand={onCommand}
          />
        </div>
        
        {/* Command input - always at the bottom */}
        <div className="p-2 flex items-center gap-2 border-t border-stone-700 bg-stone-900">
          <span className="text-teal-400 mr-2">$</span>
          <input
            ref={combinedRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          />
        </div>
      </div>
    );
  };
};

export default withCommandInput;
