import React, { useState, useEffect, useRef } from 'react';
import { WINDOW_TYPES } from '../../utils/windowTypes';

const TerminalWindow = ({ onCommand, isActive, nodeId, transformWindow }) => {
  // Refs for managing focus and scrolling
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  // Terminal state
  const [history, setHistory] = useState([
    'Welcome to the Terminal! Type "help" for available commands.'
  ]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-focus when terminal becomes active
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const executeCommand = (command) => {
    setHistory(prev => [...prev, `$ ${command}`]);
    setCommandHistory(prev => [...prev, command]);
  
    const cmd = command.toLowerCase();
  
    if (Object.keys(WINDOW_TYPES).some(type => type.toLowerCase() === cmd)) {
      const requestedType = WINDOW_TYPES[cmd.toUpperCase()];
      transformWindow(nodeId, requestedType);
      return;
    }
  
    let response;
    switch (cmd) {
      case 'help':
        response = [
          'Available commands:',
          '  explorer     - Transform into file explorer',
          '  editor       - Transform into code editor',
          '  terminal     - Transform into terminal',
          '  preview      - Transform into preview window',
          '  help         - Show this help message',
          '  clear        - Clear terminal output',
          '',
          'Keyboard shortcuts:',
          '  Ctrl + Enter       - Split vertically',
          '  Ctrl + Shift + Enter - Split horizontally',
          '  Ctrl + Backspace   - Close window',
          '  /                  - Focus command bar'
        ].join('\n');
        break;
  
      case 'clear':
        setHistory(['Terminal cleared']);
        return;
  
      case 'version':
        response = 'SLUMNET Terminal v1.0.0';
        break;
  
      default:
        response = `Unknown command: ${command}`;
    }
  
    setHistory(prev => [...prev, response]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      executeCommand(currentInput.trim());
      setCurrentInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    }
  };

  return (
    <div 
      className="p-4 bg-stone-900 text-teal-400 font-mono text-sm h-full flex flex-col"
      onClick={handleTerminalClick}
    >
      <div ref={terminalRef} className="flex-1 overflow-auto whitespace-pre-wrap">
        {history.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="flex items-center mt-2">
        <span className="mr-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-teal-400"
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalWindow;