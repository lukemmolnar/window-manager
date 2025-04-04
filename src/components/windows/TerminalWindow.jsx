import React, { useState, useEffect, useRef } from 'react';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useWindowState } from '../../context/WindowStateContext';
import { useParty } from '../../context/PartyContext';
import { saveTerminalState, getTerminalState } from '../../services/indexedDBService';
import { COMMAND_ALIASES } from '../../utils/commandAliases';
import { parseDiceExpression, rollDice, formatRollResult, isValidDiceType } from '../../utils/diceUtils';
import DebugLogger from '../../utils/debugLogger';

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

  const executeCommand = async (command) => {
    setHistory(prev => [...prev, `$ ${command}`]);
    setCommandHistory(prev => [...prev, command]);
  
    const parts = command.split(' ');
    let cmd = parts[0].toLowerCase();
    
    // Check if the command is an alias and replace it
    if (COMMAND_ALIASES[cmd]) {
      cmd = COMMAND_ALIASES[cmd];
    }
  
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
          '  admin (adm)  - Access admin panel\n  announcement (ann) "text" - Set a system-wide announcement\n  debug (dbg) - Toggle debug mode (console logs)\n' : 
          '';
        response = [
          'Commands:',
          '  explorer (ex) - Transform window into file explorer',
          '  terminal (term) - Transform into terminal',
          '  chat (ch) - Transform into chat window',
          adminCommands,
          '  party (p) - Party system commands:',
          '    party create "Name" (pc) - Create a new D&D party (admin only)',
          '    party join <id|name> (pj) - Join a party',
          '    party leave (pl) - Leave your current party',
          '    party list (pls) - List all available parties',
          '    party info (pi) - Show your current party info',
          '    party delete <id> (pd) - Delete a party (admin only)',
          '    party (p) - Show your current party info (shorthand for party info)',
          '  roll (r, d) - Roll dice (e.g., roll 2d6+3)',
          '  help (h) - Show this help message',
          '  clear (cl) - Clear terminal output',
          '  version (v) - Show terminal version',
          '',
          'Keyboard shortcuts:',
          '  Ctrl + Enter - Split vertically',
          '  Ctrl + Shift + Enter - Split horizontally',
          '  Ctrl + Backspace - Close window',
          '  Ctrl + Q - Resize mode',
          '  Ctrl + M - Move mode',
          '  Ctrl + alt + [arrow key] - Move workspaces',
          '  Ctrl + [arrow key] - Move active window',
        ].join('\n');
        break;
  
      case 'clear':
        setHistory(['']);
        return;
  
      case 'version':
        response = 'SLUMNET Terminal v1.0.0';
        break;
        
      case 'debug':
        // Check if user is admin
        if (!user?.is_admin) {
          response = 'Access denied: Admin privileges required';
          break;
        }
        
        // Toggle debug mode
        const debugEnabled = DebugLogger.toggleDebug();
        response = debugEnabled 
          ? 'Debug mode enabled. Console logs are now visible.' 
          : 'Debug mode disabled. Console logs are now hidden.';
        break;
        
      case 'party':
        // Handle party subcommands
        if (parts.length > 1) {
          const subCommand = parts[1].toLowerCase();
          
          switch (subCommand) {
            case 'create':
              // Check if user is admin
              if (!user?.is_admin) {
                response = 'Access denied: Admin privileges required';
                break;
              }
              
              // Extract party name from quotes or just take the remaining arguments
              const partyMatch = command.match(/"([^"]*)"|'([^']*)'|`([^`]*)`/);
              const partyName = partyMatch 
                ? (partyMatch[1] || partyMatch[2] || partyMatch[3]) 
                : parts.slice(2).join(' ');
              
              if (!partyName) {
                response = 'Usage: party create "Party Name"';
                break;
              }
              
              setHistory(prev => [...prev, `Creating party "${partyName}"...`]);
              
              try {
                const result = await createParty(partyName);
                response = `Party "${partyName}" created successfully with ID ${result.id}`;
              } catch (error) {
                if (error.response?.status === 400) {
                  response = `Error: ${error.response.data.message}`;
                } else {
                  console.error('Error creating party:', error);
                  response = 'Error creating party. Please try again.';
                }
              }
              break;
            
            case 'join':
              if (parts.length < 3) {
                response = 'Usage: party join <party_id or party_name>';
                break;
              }
              
              const partyIdentifier = parts.slice(2).join(' ');
              setHistory(prev => [...prev, `Joining party "${partyIdentifier}"...`]);
              
              try {
                // Try to get the party by ID first
                let partyId = parseInt(partyIdentifier);
                let isName = false;
                
                if (isNaN(partyId)) {
                  // If it's not a number, assume it's a name
                  isName = true;
                  // Find the party by name
                  const party = parties.find(p => 
                    p.name.toLowerCase() === partyIdentifier.toLowerCase()
                  );
                  
                  if (!party) {
                    response = `Party "${partyIdentifier}" not found`;
                    break;
                  }
                  
                  partyId = party.id;
                }
                
                // Try to join the party
                const joinResponse = await joinParty(partyId);
                
                if (joinResponse.message?.includes('Already a member')) {
                  response = `You are already a member of this party`;
                } else {
                  response = `Joined party "${joinResponse.party.name}" successfully`;
                }
              } catch (error) {
                console.error('Error joining party:', error);
                if (error.response?.status === 404) {
                  response = 'Party not found';
                } else {
                  response = 'Error joining party. Please try again.';
                }
              }
              break;
            
            case 'leave':
              setHistory(prev => [...prev, 'Leaving current party...']);
              
              try {
                if (!currentParty) {
                  response = 'You are not currently in a party';
                  break;
                }
                
                // Leave the party
                await leaveParty();
                response = `Left party "${currentParty.name}" successfully`;
              } catch (error) {
                console.error('Error leaving party:', error);
                response = 'Error leaving party. Please try again.';
              }
              break;
            
            case 'list':
              // List all parties
              setHistory(prev => [...prev, 'Fetching parties...']);
              
              try {
                await refreshParties();
                if (parties.length === 0) {
                  response = 'No parties available';
                } else {
                  response = 'Available parties:\n' + 
                    parties.map(party => 
                      `ID: ${party.id} | Name: ${party.name} | Members: ${party.member_count} | Created by: ${party.creator_name}`
                    ).join('\n');
                }
              } catch (error) {
                console.error('Error fetching parties:', error);
                response = 'Error fetching parties. Please try again.';
              }
              break;
              
            case 'info':
              // Show current party (same as no subcommand)
              setHistory(prev => [...prev, 'Fetching current party...']);
              
              try {
                await refreshParty();
                
                if (!currentParty) {
                  response = 'You are not currently in a party. Use "party list" to see available parties or "party join <id>" to join one.';
                } else {
                  response = `Current party: ${currentParty.name} (ID: ${currentParty.id})\n` +
                    `Created by: ${currentParty.creator_name}\n` +
                    `Created at: ${new Date(currentParty.created_at).toLocaleString()}\n` +
                    `Members (${currentParty.members?.length || 0}):\n` +
                    (currentParty.members || []).map(member => 
                      `- ${member.username}${member.is_admin ? ' (Admin)' : ''}${member.id === currentParty.creator_id ? ' (Creator)' : ''}`
                    ).join('\n');
                }
              } catch (error) {
                console.error('Error fetching current party:', error);
                response = 'Error fetching current party. Please try again.';
              }
              break;

            case 'delete':
              // Check if user is admin
              if (!user?.is_admin) {
                response = 'Access denied: Admin privileges required';
                break;
              }
              
              if (parts.length < 3) {
                response = 'Usage: party delete <party_id>';
                break;
              }
              
              const partyIdToDelete = parseInt(parts[2]);
              if (isNaN(partyIdToDelete)) {
                response = 'Invalid party ID. Please provide a valid numeric ID.';
                break;
              }
              
              setHistory(prev => [...prev, `Deleting party with ID ${partyIdToDelete}...`]);
              
              try {
                const result = await deleteParty(partyIdToDelete);
                if (result.success) {
                  response = `Party with ID ${partyIdToDelete} has been deleted successfully.`;
                } else {
                  response = `Failed to delete party: ${result.message || 'Unknown error'}`;
                }
              } catch (error) {
                console.error('Error deleting party:', error);
                response = 'Error deleting party. Please try again.';
              }
              break;
              
            default:
              response = 'Unknown party subcommand. Available subcommands: create, join, leave, list, info, delete';
          }
        } else {
          // No subcommand, show current party info
          setHistory(prev => [...prev, 'Fetching current party...']);
          
          try {
            await refreshParty();
            
            if (!currentParty) {
              response = 'You are not currently in a party. Use "party list" to see available parties or "party join <id>" to join one.';
            } else {
              response = `Current party: ${currentParty.name} (ID: ${currentParty.id})\n` +
                `Created by: ${currentParty.creator_name}\n` +
                `Created at: ${new Date(currentParty.created_at).toLocaleString()}\n` +
                `Members (${currentParty.members?.length || 0}):\n` +
                (currentParty.members || []).map(member => 
                  `- ${member.username}${member.is_admin ? ' (Admin)' : ''}${member.id === currentParty.creator_id ? ' (Creator)' : ''}`
                ).join('\n');
            }
          } catch (error) {
            console.error('Error fetching current party:', error);
            response = 'Error fetching current party. Please try again.';
          }
        }
        break;
        
      // Handle legacy party commands for backward compatibility
      case 'create-party':
        executeCommand(`party create ${parts.slice(1).join(' ')}`);
        return;
        
      case 'join-party':
        executeCommand(`party join ${parts.slice(1).join(' ')}`);
        return;
        
      case 'leave-party':
        executeCommand('party leave');
        return;
        
      case 'parties':
        if (parts.length > 1 && parts[1].toLowerCase() === 'list') {
          executeCommand('party list');
        } else {
          executeCommand('party');
        }
        return;
        
      case 'roll':
        // Extract dice expression from command
        const diceExpression = parts.slice(1).join('').trim();
        
        if (!diceExpression) {
          response = 'Usage: roll <dice expression> (e.g., roll 2d6+3)';
          break;
        }
        
        // Parse the dice expression
        const parsedDice = parseDiceExpression(diceExpression);
        
        if (!parsedDice) {
          response = 'Invalid dice expression. Use format: NdS+M (e.g., 2d6+3)';
          break;
        }
        
        const { numDice, diceType, modifier } = parsedDice;
        
        // Validate dice type
        if (!isValidDiceType(diceType)) {
          response = 'Invalid dice type. Please use standard dice types (d4, d6, d8, d10, d12, d20, d100)';
          break;
        }
        
        // Validate number of dice
        if (numDice < 1 || numDice > 20) {
          response = 'Please use between 1 and 20 dice';
          break;
        }
        
        // Roll the dice
        const result = rollDice(diceType, numDice, modifier);
        
        // Format the results
        response = formatRollResult(result);
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
      className="bg-stone-900 text-white font-mono text-sm h-full flex flex-col"
      onClick={handleTerminalClick}
    >
<div ref={terminalRef} className="p-2 flex-1 overflow-auto whitespace-pre-wrap">
  {history.map((line, i) => (
    <div key={i} className={`mb-2 ${line.startsWith('$ ') ? 'text-teal-400' : ''}`}>{line}</div>
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
