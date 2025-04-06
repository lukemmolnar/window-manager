/**
 * Clear Command
 * Clears the terminal output
 */
import { Command } from '../../Command.js';

export class ClearCommand extends Command {
  constructor() {
    super();
    this.name = 'clear';
    this.aliases = ['cl'];
    this.description = 'Clear terminal output';
    this.usage = 'clear';
    this.category = 'Core';
    this.args = [];
  }

  async execute(args, context) {
    // Return an empty string which the terminal component will interpret as clearing the terminal
    // The terminal component will replace the history array with an empty array
    return '__CLEAR_TERMINAL__'; // Special flag that will be processed by the terminal
  }
}
