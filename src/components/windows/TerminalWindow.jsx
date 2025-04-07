import React, { useState, useEffect, useRef } from 'react';
import d20Gif from '../../assets/GIF/d20.gif';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useWindowState } from '../../context/WindowStateContext';
import { useParty } from '../../context/PartyContext';
import { saveTerminalState, getTerminalState } from '../../services/indexedDBService';
import { parseDiceExpression, rollDice, formatRollResult, isValidDiceType } from '../../utils/diceUtils';
import DebugLogger from '../../utils/debugLogger';
import { executeCommand } from '../../utils/terminal/executor';
import { registerCommands } from '../../utils/terminal/commandLoader';

// Initialize the command system
registerCommands();

const TerminalWindow = ({ onCommand, isActive, nodeId, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Get user authentication info
  const { user } = useAuth();
  // Get announcement context
  const { updateAnnouncement } = useAnnouncement();
  // Get window state context for additional persistence
  const { setActiveWindow } = useWindowState();
  // Get party context
  const { 
    currentParty, 
    parties, 
    joinParty, 
    leaveParty, 
    createParty, 
    refreshParty,
    refreshParties,
    deleteParty
  } = useParty();
  
  // Ref for managing scrolling
  const terminalRef = useRef(null);
  // Ref to track if state has been loaded from IndexedDB
  const stateLoadedRef = useRef(false);

  // Terminal state - use windowState if available
  const [history, setHistory] = useState(
    windowState?.history || ['SLUMNET TERMINAL - Type "help" for available commands.']
  );
  const [commandHistory, setCommandHistory] = useState(windowState?.commandHistory || []);
  const [currentInput, setCurrentInput] = useState(windowState?.currentInput || '');
  const [historyIndex, setHistoryIndex] = useState(windowState?.historyIndex || -1);

  // Load terminal state from IndexedDB on mount if not already in windowState
  useEffect(() => {
    const loadTerminalState = async () => {
      // Skip if we already have state from the WindowStateContext
      if (windowState?.history && windowState?.commandHistory) {
        stateLoadedRef.current = true;
        return;
      }
      
      try {
        // Try to load terminal state from IndexedDB
        const savedState = await getTerminalState(nodeId);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`Loaded terminal state for window ${nodeId} from IndexedDB:`, savedState.content);
          
          // Update state with saved values
          if (savedState.content.history) {
            setHistory(savedState.content.history);
          }
          
          if (savedState.content.commandHistory) {
            setCommandHistory(savedState.content.commandHistory);
          }
          
          if (savedState.content.historyIndex !== undefined) {
            setHistoryIndex(savedState.content.historyIndex);
          }
          
          // Mark as loaded
          stateLoadedRef.current = true;
        }
      } catch (error) {
        console.error(`Failed to load terminal state for window ${nodeId} from IndexedDB:`, error);
      }
    };
    
    loadTerminalState();
  }, [nodeId, windowState]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);
  
  // Clear input when window becomes active or when transformed back to terminal
  useEffect(() => {
    // Always clear the input when the component mounts or is transformed back to terminal
    setCurrentInput('');
  }, []);
  
  // Handle window activation
  useEffect(() => {
    if (isActive) {
      // Clear input when window becomes active
      setCurrentInput('');
      
      // Save this as the active terminal window
      setActiveWindow(nodeId, WINDOW_TYPES.TERMINAL);
    }
  }, [isActive, nodeId, setActiveWindow]);

  // Update window state when terminal state changes
  useEffect(() => {
    if (updateWindowState) {
      const newState = {
        history,
        commandHistory,
        currentInput,
        historyIndex
      };
      
      // Update window state in context
      updateWindowState(newState);
      
      // Also save directly to IndexedDB for redundancy
      if (stateLoadedRef.current) { // Only save after initial load to avoid overwriting with empty state
        saveTerminalState({
          id: nodeId,
          content: newState
        }).catch(error => {
          console.error(`Failed to save terminal state for window ${nodeId} to IndexedDB:`, error);
        });
      }
    }
  }, [history, commandHistory, currentInput, historyIndex, updateWindowState, nodeId]);

  const handleTerminalClick = () => {
    focusRef.current?.focus();
  };

  const processCommand = async (command) => {
    setHistory(prev => [...prev, `$ ${command}`]);
    setCommandHistory(prev => [...prev, command]);
    
    // Legacy window transformation handling (direct conversion)
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    if (Object.keys(WINDOW_TYPES).some(type => type.toLowerCase() === cmd)) {
      const requestedType = WINDOW_TYPES[cmd.toUpperCase()];
      transformWindow(nodeId, requestedType);
      return;
    }
    
    // Create recursive executeCommand function for legacy redirects
    const executeCommandFn = async (cmdStr) => {
      // Don't add the command to history since it's an internal redirect
      return await processCommand(cmdStr);
    };
    
    // Create the execution context with all necessary terminal state and functions
    const context = {
      // Original command text
      original: command,
      
      // User and authentication
      user,
      
      // Window management
      nodeId,
      transformWindow,
      
      // Announcement management
      updateAnnouncement,
      
      // Party system
      parties,
      currentParty,
      joinParty,
      leaveParty,
      createParty,
      refreshParty,
      refreshParties,
      deleteParty,
      
      // Dice utilities
      parseDiceExpression,
      rollDice,
      formatRollResult,
      isValidDiceType,
      
      // Debug utilities
      debugLogger: DebugLogger,
      
      // Terminal management
      clearTerminal: () => setHistory(['']),
      
      // Recursive command execution (for legacy redirects)
      executeCommand: executeCommandFn
    };
    
    try {
      // Execute the command using our new command system
      const response = await executeCommand(command, context);
      
      // Handle special return values
      if (response === '__CLEAR_TERMINAL__') {
        setHistory(['']);
        return;
      }
      
      // Handle response based on its type
      if (response) {
        if (typeof response === 'object' && response.type === 'dice-roll') {
          // First add the GIF to history
          setHistory(prev => [...prev, { type: 'gif', src: d20Gif }]);
          
          // After a delay, add the dice roll result
          setTimeout(() => {
            setHistory(prev => {
              // Remove the GIF from history
              const newHistory = [...prev];
              newHistory.pop();
              // Add the actual dice roll result
              return [...newHistory, response.content];
            });
          }, 2000); // 2 second delay to show the GIF
        } else {
          // Handle regular text responses
          setHistory(prev => [...prev, response]);
        }
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setHistory(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      processCommand(currentInput.trim());
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
      className="bg-stone-900 text-white font-mono text-sm h-full flex flex-col"
      onClick={handleTerminalClick}
    >
<div ref={terminalRef} className="p-2 flex-1 overflow-auto whitespace-pre-wrap">
  {history.map((item, i) => {
    // If the item is an object with a type of 'gif', render an image
    if (typeof item === 'object' && item.type === 'gif') {
      return (
        <div key={i} className="mb-2">
          <img src={item.src} alt="Rolling dice" className="inline-block max-w-full h-32" />
        </div>
      );
    }
    // Otherwise, render as before
    return (
      <div key={i} className={`mb-2 ${typeof item === 'string' && item.startsWith('$ ') ? 'text-teal-400' : ''}`}>
        {item}
      </div>
    );
  })}
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
