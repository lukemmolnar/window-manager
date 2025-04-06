/**
 * Base Command class that all terminal commands will extend
 * Provides a consistent interface for command execution and metadata
 */
export class Command {
  constructor() {
    this.name = ''; // Primary command name
    this.aliases = []; // Command aliases
    this.description = ''; // Command description
    this.usage = ''; // Usage example
    this.args = []; // Argument definitions
  }

  /**
   * Execute the command with the given arguments and context
   * @param {Array} args - Parsed arguments array
   * @param {Object} context - Terminal context (user, state, etc.)
   * @returns {Promise<string|Array<string>>} - Command output
   */
  async execute(args, context) {
    throw new Error('Command implementation missing');
  }

  /**
   * Generate help text for this command
   * @returns {string} - Formatted help text
   */
  generateHelp() {
    let help = `${this.name} - ${this.description}\n`;
    help += `Usage: ${this.usage}\n`;
    
    if (this.aliases.length > 0) {
      help += `Aliases: ${this.aliases.join(', ')}\n`;
    }
    
    if (this.args.length > 0) {
      help += 'Arguments:\n';
      this.args.forEach(arg => {
        help += `  ${arg.name} - ${arg.description}${arg.required ? ' (required)' : ' (optional)'}\n`;
      });
    }
    
    return help;
  }

  /**
   * Check if a given name matches this command's name or aliases
   * @param {string} name - Command name to check
   * @returns {boolean} - True if name matches command name or aliases
   */
  matches(name) {
    return this.name === name || this.aliases.includes(name);
  }
}
