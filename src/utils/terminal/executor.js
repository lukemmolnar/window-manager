/**
 * Command Executor
 * Handles execution of parsed terminal commands
 */
import { registry } from './registry.js';
import { parse, validateArgs } from './parser/parser.js';

/**
 * Executes a command string with the provided terminal context
 * 
 * @param {string} commandString - Raw command string to execute
 * @param {Object} context - Terminal execution context
 * @returns {Promise<string|Array<string>>} - Command execution result
 */
export async function executeCommand(commandString, context) {
  if (!commandString || typeof commandString !== 'string') {
    return 'No command specified';
  }
  
  try {
    // Parse the command string
    const parsedCommand = parse(commandString);
    
    // Handle parsing errors
    if (parsedCommand.error) {
      return `Command parsing error: ${parsedCommand.error}`;
    }
    
    // Empty command
    if (!parsedCommand.command) {
      return '';
    }
    
    // Find the command in the registry
    const command = registry.findCommand(parsedCommand.command);
    
    // Command not found
    if (!command) {
      return `Unknown command: ${parsedCommand.command}`;
    }
    
    // Validate command arguments
    const validation = validateArgs(parsedCommand.args, command.args);
    if (!validation.valid) {
      return validation.error || `Invalid arguments for ${command.name}`;
    }
    
    // Execute the command
    const result = await command.execute(parsedCommand.args, context);
    return result;
  } catch (error) {
    console.error('Command execution error:', error);
    return `Error executing command: ${error.message}`;
  }
}

/**
 * Generate help text for all available commands or a specific command
 * 
 * @param {string} commandName - Optional command name to get help for
 * @returns {string} - Formatted help text
 */
export function generateHelp(commandName) {
  if (commandName) {
    const command = registry.findCommand(commandName);
    if (command) {
      return command.generateHelp();
    }
    return `Help not available: Unknown command "${commandName}"`;
  }
  
  // Generate help for all commands
  const allCommands = registry.getAllCommands();
  let helpText = 'Available commands:\n';
  
  // Group commands by category for better organization
  const categories = {};
  
  allCommands.forEach(cmd => {
    const category = cmd.category || 'General';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(cmd);
  });
  
  // Build the help text by category
  Object.keys(categories).sort().forEach(category => {
    helpText += `\n${category}:\n`;
    categories[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
      helpText += `  ${cmd.name.padEnd(12)} - ${cmd.description}\n`;
    });
  });
  
  helpText += '\nType "help <command>" for more information on a specific command.';
  return helpText;
}
