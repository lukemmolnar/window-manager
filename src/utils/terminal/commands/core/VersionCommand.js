/**
 * Version Command
 * Displays the terminal version information
 */
import { Command } from '../../Command.js';

export class VersionCommand extends Command {
  constructor() {
    super();
    this.name = 'version';
    this.aliases = ['v'];
    this.description = 'Show terminal version information';
    this.usage = 'version';
    this.category = 'Core';
    this.args = [];
  }

  async execute(args, context) {
    return 'SLUMNET Terminal v1.0.0';
  }
}
