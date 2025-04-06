/**
 * Command Registry
 * Manages the registration and lookup of terminal commands
 */
import { COMMAND_ALIASES } from '../commandAliases.js';

/**
 * Registry of all available terminal commands
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
  }

  /**
   * Register a command with the registry
   * @param {Command} commandInstance - Instance of a Command class
   */
  register(commandInstance) {
    if (!commandInstance || !commandInstance.name) {
      console.error('Cannot register command: Invalid command instance');
      return;
    }

    // Register the main command name
    this.commands.set(commandInstance.name.toLowerCase(), commandInstance);
    
    // Register command aliases
    if (commandInstance.aliases && Array.isArray(commandInstance.aliases)) {
      commandInstance.aliases.forEach(alias => {
        this.aliases.set(alias.toLowerCase(), commandInstance.name.toLowerCase());
      });
    }
  }

  /**
   * Register multiple commands with the registry
   * @param {Array<Command>} commandInstances - Array of Command instances
   */
  registerAll(commandInstances) {
    if (!Array.isArray(commandInstances)) {
      console.error('Cannot register commands: Expected an array of commands');
      return;
    }

    commandInstances.forEach(command => this.register(command));
  }

  /**
   * Find a command by name or alias
   * @param {string} name - Command name or alias
   * @returns {Command|null} - Command instance or null if not found
   */
  findCommand(name) {
    if (!name) return null;
    
    const normalizedName = name.toLowerCase();
    
    // Check if it's a direct command name
    if (this.commands.has(normalizedName)) {
      return this.commands.get(normalizedName);
    }
    
    // Check if it's an alias
    if (this.aliases.has(normalizedName)) {
      const commandName = this.aliases.get(normalizedName);
      return this.commands.get(commandName);
    }
    
    // Check if it's in the legacy COMMAND_ALIASES from commandAliases.js
    if (COMMAND_ALIASES[normalizedName]) {
      const aliasTarget = COMMAND_ALIASES[normalizedName].toLowerCase();
      
      // The alias might point to another command or another alias
      return this.findCommand(aliasTarget);
    }
    
    return null;
  }

  /**
   * Get all registered commands
   * @returns {Array<Command>} - Array of all command instances
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }
}

// Create and export a singleton instance
export const registry = new CommandRegistry();

// Export the class for testing or specialized use cases
export default CommandRegistry;
