/**
 * Command Loader
 * Loads and registers all terminal commands
 */
import { registry } from './registry.js';

// Import core commands
import { HelpCommand } from './commands/core/HelpCommand.js';
import { ClearCommand } from './commands/core/ClearCommand.js';
import { VersionCommand } from './commands/core/VersionCommand.js';
import { RollCommand } from './commands/core/RollCommand.js';

// Import window commands
import { WindowCommand } from './commands/window/WindowCommand.js';
import { TerminalCommand } from './commands/window/TerminalCommand.js';
import { ExplorerCommand } from './commands/window/ExplorerCommand.js';
import { ChatCommand } from './commands/window/ChatCommand.js';

/**
 * Register all terminal commands with the registry
 * Call this function to initialize the terminal command system
 */
export function registerCommands() {
  const commands = [
    // Core commands
    new HelpCommand(),
    new ClearCommand(),
    new VersionCommand(),
    new RollCommand(),
    
    // Window commands
    new WindowCommand(),
    new TerminalCommand(),
    new ExplorerCommand(),
    new ChatCommand(),
    
    // Additional commands will be added here as they are implemented
  ];
  
  registry.registerAll(commands);
  
  console.log(`Registered ${commands.length} terminal commands`);
  return commands.length;
}

/**
 * Check if a specific command exists in the registry
 * 
 * @param {string} commandName - Name of the command to check
 * @returns {boolean} - True if the command exists
 */
export function hasCommand(commandName) {
  return registry.findCommand(commandName) !== null;
}

/**
 * Get all registered commands
 * 
 * @returns {Array} - Array of all command instances
 */
export function getAllCommands() {
  return registry.getAllCommands();
}
