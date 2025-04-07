/**
 * Debug Command
 * Toggles debug mode (admin only)
 */
import { Command } from '../../Command.js';

export class DebugCommand extends Command {
  constructor() {
    super();
    this.name = 'debug';
    this.aliases = ['dbg'];
    this.description = 'Toggle debug mode - (admin only)';
    this.usage = 'debug';
    this.category = 'Admin';
    this.args = [];
  }

  async execute(args, context) {
    // Check if user is admin
    if (!context.user?.is_admin) {
      return 'Access denied: Admin privileges required';
    }

    // Check if DebugLogger is available
    if (!context || !context.debugLogger) {
      return 'Cannot toggle debug mode: Missing debug logger in context';
    }
    
    // Toggle debug mode
    const debugEnabled = context.debugLogger.toggleDebug();
    
    // Return appropriate message
    return debugEnabled 
      ? 'Debug mode enabled. Console logs are now visible.' 
      : 'Debug mode disabled. Console logs are now hidden.';
  }
}
