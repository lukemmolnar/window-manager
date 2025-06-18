import React, { useState, useEffect, useRef, useReducer } from 'react';
import d20Gif from '../../assets/GIF/d20.gif';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useWindowState } from '../../context/WindowStateContext';
import { useParty } from '../../context/PartyContext';
import { useSocket } from '../../context/SocketContext';
import { saveTerminalState, getTerminalState } from '../../services/indexedDBService';
import { parseDiceExpression, rollDice, formatRollResult, isValidDiceType } from '../../utils/diceUtils';
import DebugLogger from '../../utils/debugLogger';
import { executeCommand } from '../../utils/terminal/executor';
import { registerCommands } from '../../utils/terminal/commandLoader';
import { registry } from '../../utils/terminal/registry';
import { parse } from '../../utils/terminal/parser/parser';

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
  
  // Get socket context for party broadcasting
  const { socket } = useSocket();
  
  // Ref for managing scrolling
  const terminalRef = useRef(null);
  // Ref to track if state has been loaded from IndexedDB
  const stateLoadedRef = useRef(false);
  // Ref to store the dice roll animation timeout
  const diceTimeoutRef = useRef(null);

  // Terminal state - use windowState if available
  const [history, setHistory] = useState(
    windowState?.history || ['SLUMNET TERMINAL - Type "help" for available commands.']
  );
  const [commandHistory, setCommandHistory] = useState(windowState?.commandHistory || []);
  const [currentInput, setCurrentInput] = useState(windowState?.currentInput || '');
  const [historyIndex, setHistoryIndex] = useState(windowState?.historyIndex || -1);
  
  // Party mode state
  const [partyMode, setPartyMode] = useState(windowState?.partyMode || false);

  // Update partyMode when windowState changes (handles server state loading)
  useEffect(() => {
    console.log('[PARTY DEWDADWADWABUG] windowState changed:', {
      hasWindowState: !!windowState,
      partyModeInState: windowState?.partyMode,
      currentPartyMode: partyMode,
      shouldUpdate: windowState?.partyMode !== undefined && windowState.partyMode !== partyMode,
      nodeId,
      dataSource: windowState?.partyMode !== undefined ? 'SERVER' : 'LOCAL/DEFAULT'
    });

    if (windowState?.partyMode !== undefined && windowState.partyMode !== partyMode) {
      console.log(`[PARTY DEBUG] Restoring party mode from server state: ${windowState.partyMode} (was: ${partyMode})`);
      setPartyMode(windowState.partyMode);
    }
  }, [windowState?.partyMode, partyMode, nodeId]);

  // Load terminal state from IndexedDB to fill in any missing windowState fields
  useEffect(() => {
    const loadTerminalState = async () => {
      try {
        // Always try to load terminal state from IndexedDB to check for missing fields
        const savedState = await getTerminalState(nodeId);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`[PARTY DEBUG] Checking IndexedDB state for window ${nodeId}:`, {
            hasHistory: !!savedState.content.history,
            hasCommandHistory: !!savedState.content.commandHistory,
            hasPartyMode: savedState.content.partyMode !== undefined,
            partyModeValue: savedState.content.partyMode,
            windowStateHistory: !!windowState?.history,
            windowStateCommandHistory: !!windowState?.commandHistory,
            windowStatePartyMode: windowState?.partyMode
          });
          
          // Update state with saved values only if not in windowState
          if (savedState.content.history && !windowState?.history) {
            console.log(`[PARTY DEBUG] Restoring history from IndexedDB`);
            setHistory(savedState.content.history);
          }
          
          if (savedState.content.commandHistory && !windowState?.commandHistory) {
            console.log(`[PARTY DEBUG] Restoring commandHistory from IndexedDB`);
            setCommandHistory(savedState.content.commandHistory);
          }
          
          if (savedState.content.historyIndex !== undefined && windowState?.historyIndex === undefined) {
            console.log(`[PARTY DEBUG] Restoring historyIndex from IndexedDB`);
            setHistoryIndex(savedState.content.historyIndex);
          }
          
          // Always restore partyMode from IndexedDB if it's missing from windowState but present in IndexedDB
          if (savedState.content.partyMode !== undefined && windowState?.partyMode === undefined) {
            console.log(`[PARTY DEBUG] Restoring partyMode from IndexedDB: ${savedState.content.partyMode}`);
            setPartyMode(savedState.content.partyMode);
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
  
  // Cleanup dice animation timeout when component unmounts
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Clear any pending dice roll timeouts when unmounting
      if (diceTimeoutRef.current) {
        clearTimeout(diceTimeoutRef.current);
        diceTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Create a reducer for forced updates - useReducer guarantees a re-render
  const [updateCounter, forceUpdate] = useReducer(state => state + 1, 0);
  
  // Force re-render to check dice GIFs that need to be replaced with results
  // This ensures the transition happens even when the component was unmounted and remounted
  useEffect(() => {
    // This checks and processes all dice GIFs that have completed their display duration
    const processDiceGifs = () => {
      let needsUpdate = false;
      
      // Process the history array to find and update dice GIFs
      const updatedHistory = history.map(item => {
        // Only process dice-gif items that have completed their duration
        if (typeof item === 'object' && 
            item.type === 'dice-gif' && 
            Date.now() - item.timestamp >= item.displayDuration) {
          
          needsUpdate = true;
          // Return the result instead of the GIF
          return item.result;
        }
        return item;
      });
      
      // If we found and updated any completed dice GIFs, update the history
      if (needsUpdate) {
        setHistory(updatedHistory);
      }
      
      // Check if there are still any active dice GIFs
      return history.some(item => 
        typeof item === 'object' && 
        item.type === 'dice-gif' && 
        Date.now() - item.timestamp < item.displayDuration
      );
    };
    
    // Initial check and processing
    const hasActiveDiceGifs = processDiceGifs();
    
    // If we have active dice GIFs, set up an interval to keep checking
    let intervalId;
    if (hasActiveDiceGifs) {
      intervalId = setInterval(() => {
        const stillHasActiveDiceGifs = processDiceGifs();
        
        // Force a render update regardless of whether we processed any GIFs
        forceUpdate();
        
        // If no more active dice GIFs, clear the interval
        if (!stillHasActiveDiceGifs && intervalId) {
          clearInterval(intervalId);
        }
      }, 200); // Check more frequently (200ms) for smoother transitions
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [history]);

  // Update window state when terminal state changes
  useEffect(() => {
    if (updateWindowState) {
      const newState = {
        history,
        commandHistory,
        currentInput,
        historyIndex,
        partyMode
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
  }, [history, commandHistory, currentInput, historyIndex, partyMode, updateWindowState, nodeId]);

  // Socket event listeners for party broadcast
  useEffect(() => {
    if (!socket) return;

    const handlePartyCommandBroadcast = (data) => {
      const { username, command, result, userId } = data;
      
      // Don't show our own broadcasts (we already see them locally)
      if (userId === user?.id) return;
      
      // Only show broadcasts if we're in party mode
      if (!partyMode) return;
      
      // Add the broadcast to history with special formatting
      setHistory(prev => [...prev, {
        type: 'party-broadcast',
        username,
        command,
        result,
        timestamp: Date.now()
      }]);
    };

    socket.on('party_command_broadcast', handlePartyCommandBroadcast);

    return () => {
      socket.off('party_command_broadcast', handlePartyCommandBroadcast);
    };
  }, [socket, user?.id, partyMode]);

  // Party mode functions
  const enablePartyMode = () => {
    setPartyMode(true);
  };

  const disablePartyMode = () => {
    setPartyMode(false);
  };

  const isPartyMode = () => {
    return partyMode;
  };

  // Helper function to check if a command should be broadcasted
  const shouldBroadcastCommand = (commandString) => {
    try {
      // Parse the command to get the command name
      const parsedCommand = parse(commandString);
      if (!parsedCommand.command) return false;
      
      // Find the command in the registry
      const command = registry.findCommand(parsedCommand.command);
      if (!command) return false;
      
      // Only broadcast commands in the "VTT Actions" category
      return command.category === 'VTT Actions';
    } catch (error) {
      console.error('Error checking if command should be broadcasted:', error);
      return false;
    }
  };

  const handleTerminalClick = () => {
    focusRef.current?.focus();
  };

  const processCommand = async (command) => {
    // Handle "exit" command in party mode
    if (partyMode && command.toLowerCase().trim() === 'exit') {
      disablePartyMode();
      setHistory(prev => [...prev, `$ ${command}`, 'Party mode disabled.']);
      return;
    }

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
      
      // Party mode functions
      enablePartyMode,
      disablePartyMode,
      isPartyMode,
      
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
          // Add the GIF to history with timestamp and result data
          setHistory(prev => [...prev, { 
            type: 'dice-gif', 
            src: d20Gif,
            timestamp: Date.now(), // Add current timestamp
            displayDuration: 2000, // Display for 2 seconds
            result: response.content // Store the result with the GIF
          }]);
          
          // If in party mode and in a party, broadcast the dice roll result (only for VTT Actions)
          if (partyMode && currentParty && socket && shouldBroadcastCommand(command)) {
            socket.emit('broadcast_party_command', {
              partyId: currentParty.id,
              command,
              result: response.content,
              username: user?.username,
              userId: user?.id
            });
          }
        } else {
          // Handle regular text responses
          setHistory(prev => [...prev, response]);
          
          // If in party mode and in a party, broadcast the command result (only for VTT Actions)
          if (partyMode && currentParty && socket && response !== null && response !== undefined && shouldBroadcastCommand(command)) {
            socket.emit('broadcast_party_command', {
              partyId: currentParty.id,
              command,
              result: response,
              username: user?.username,
              userId: user?.id
            });
          }
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
    // If the item is an object with a type of 'dice-gif', handle it specially
    if (typeof item === 'object' && item.type === 'dice-gif') {
      // Check if enough time has passed since creation (2 seconds)
      const timeElapsed = Date.now() - item.timestamp;
      
      if (timeElapsed < item.displayDuration) {
        // If not enough time has passed, show the GIF
        return (
          <div key={i} className="mb-2">
            <img src={item.src} alt="Rolling dice" className="inline-block max-w-full h-32" />
          </div>
        );
      } else {
        // If enough time has passed, show the result instead
        return (
          <div key={i} className="mb-2">
            {item.result}
          </div>
        );
      }
    }
    // Handle party broadcast items
    else if (typeof item === 'object' && item.type === 'party-broadcast') {
      return (
        <div key={i} className="mb-2 text-teal-400 bg-teal-900/20 p-2 rounded border-l-4 border-teal-400">
          <span className="text-teal-300 font-bold">[{item.username}]</span> {item.command}
          <div className="text-teal-100 ml-4">{item.result}</div>
        </div>
      );
    }
    // Keep backward compatibility with any 'gif' type items
    else if (typeof item === 'object' && item.type === 'gif') {
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

      <div className={`p-2 flex items-center gap-2 border-t ${partyMode ? 'border-teal-400 bg-teal-900/10' : 'border-stone-700'}`}>
        {partyMode && (
          <span className="text-teal-400 text-xs bg-teal-900/30 px-1 rounded">PARTY MODE</span>
        )}
        <span className={`mr-2 ${partyMode ? 'text-teal-400' : ''}`}>$</span>
        <input
          ref={focusRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 px-2 py-1 rounded font-mono text-sm focus:outline-none ${
            partyMode 
              ? 'bg-teal-900/20 text-teal-100 border border-teal-400/50' 
              : 'bg-stone-800 text-teal-400'
          }`}
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalWindow;
