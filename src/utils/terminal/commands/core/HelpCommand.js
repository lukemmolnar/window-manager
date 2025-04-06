/**
 * Help Command
 * Provides help information for available commands
 */
import { Command } from '../../Command.js';
import { generateHelp } from '../../executor.js';

export class HelpCommand extends Command {
  constructor() {
    super();
    this.name = 'help';
    this.aliases = ['h'];
    this.description = 'Show help for available commands';
    this.usage = 'help [command]';
    this.category = 'Core';
    this.args = [
      {
        name: 'command',
        description: 'Command name to get help for',
        required: false
      }
    ];
  }

  async execute(args, context) {
    // If a specific command is requested, show help for that command
    if (args && args.length > 0) {
      return generateHelp(args[0]);
    }
    
    // Otherwise, show general help
    return generateHelp();
  }
}
