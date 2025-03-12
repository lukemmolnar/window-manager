import React, { useState, useEffect, useRef } from 'react';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncement } from '../../context/AnnouncementContext';

const TerminalWindow = ({ onCommand, isActive, nodeId, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Get user authentication info
  const { user } = useAuth();
  // Get announcement context
  const { updateAnnouncement } = useAnnouncement();
  
  // Ref for managing scrolling
  const terminalRef = useRef(null);

  // Terminal state - use windowState if available
  const [history, setHistory] = useState(
    windowState?.history || ['SLUMNET TERMINAL - Type "help" for available commands.']
  );
  const [commandHistory, setCommandHistory] = useState(windowState?.commandHistory || []);
  const [currentInput, setCurrentInput] = useState(windowState?.currentInput || '');
  const [historyIndex, setHistoryIndex] = useState(windowState?.historyIndex || -1);

  // Auto-focus is now handled by the withWindowState HOC

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Update window state when terminal state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        history,
        commandHistory,
        currentInput,
        historyIndex
      });
    }
  }, [history, commandHistory, currentInput, historyIndex, updateWindowState]);

  const handleTerminalClick = () => {
    focusRef.current?.focus();
  };

  const executeCommand = async (command) => {
    setHistory(prev => [...prev, `$ ${command}`]);
    setCommandHistory(prev => [...prev, command]);
  
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
  
    if (Object.keys(WINDOW_TYPES).some(type => type.toLowerCase() === cmd)) {
      const requestedType = WINDOW_TYPES[cmd.toUpperCase()];
      transformWindow(nodeId, requestedType);
      return;
    }
  
  // Handle the announcement command
    if (cmd === 'announcement') {
      // Check if user is admin
      if (!user?.is_admin) {
        setHistory(prev => [...prev, 'Access denied: Admin privileges required']);
        return;
      }

      // Extract the announcement text from quotes
      const match = command.match(/"([^"]*)"|'([^']*)'|`([^`]*)`/);
      if (!match) {
        setHistory(prev => [...prev, 'Usage: announcement "Your announcement text here"']);
        return;
      }

      // Get the matched text from whichever group captured it
      const announcementText = match[1] || match[2] || match[3];
      
      setHistory(prev => [...prev, `Setting announcement: "${announcementText}"...`]);
      
      try {
        // Update the announcement via the API
        const success = await updateAnnouncement(announcementText);
        
        if (success) {
          setHistory(prev => [...prev, `Announcement set: "${announcementText}"`]);
          setHistory(prev => [...prev, 'Announcement has been broadcast to all connected users.']);
        } else {
          setHistory(prev => [...prev, 'Failed to set announcement. Please try again.']);
        }
      } catch (error) {
        console.error('Error setting announcement:', error);
        setHistory(prev => [...prev, 'Error setting announcement. Please try again.']);
      }
      return;
    }
  
    let response;
    switch (cmd) {
      case 'admin':
        // Check if user is admin
        if (user?.is_admin) {
          transformWindow(nodeId, WINDOW_TYPES.ADMIN);
          return;
        } else {
          response = 'Access denied: Admin privileges required';
        }
        break;
        
      case 'help':
        const adminCommands = user?.is_admin ? 
          '  admin        - Access admin panel\n  announcement "text" - Set a system-wide announcement\n' : 
          '';
        response = [
          'Commands:',
          '  explorer     - Transform window into file explorer',
          '  terminal     - Transform into terminal',
          adminCommands,
          '  help         - Show this help message',
          '  clear        - Clear terminal output',
          '',
          'Keyboard shortcuts:',
          '  Ctrl + Enter       - Split vertically',
          '  Ctrl + Shift + Enter - Split horizontally',
          '  Ctrl + Backspace   - Close window',
          '  Ctrl + Q   - Resize mode',
          '  Ctrl + M   - Move mode'
        ].join('\n');
        break;
  
      case 'clear':
        setHistory(['']);
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
      className="bg-stone-900 text-teal-400 font-mono text-sm h-full flex flex-col"
      onClick={handleTerminalClick}
    >
      <div ref={terminalRef} className="p-2 flex-1 overflow-auto whitespace-pre-wrap">
        {history.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="p-2 flex items-center gap-2 border-t border-stone-700">
        <span className="mr-2">$</span>
        <input
          ref={focusRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalWindow;
