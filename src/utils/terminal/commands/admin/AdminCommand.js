/**
 * Admin Command
 * Transform window to Admin panel (admin only)
 */
import { Command } from '../../Command.js';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class AdminCommand extends Command {
  constructor() {
    super();
    this.name = 'admin';
    this.aliases = ['adm'];
    this.description = 'Access admin panel (admin only)';
    this.usage = 'admin';
    this.category = 'Admin';
    this.args = [];
  }

  async execute(args, context) {
    // Check if user is admin
    if (!context.user?.is_admin) {
      return 'Access denied: Admin privileges required';
    }

    // Check if the transform function is provided in the context
    if (!context || typeof context.transformWindow !== 'function') {
      return 'Cannot transform window: Missing transform function in context';
    }
    
    // Check if the node ID is provided in the context
    if (!context.nodeId) {
      return 'Cannot transform window: Missing node ID in context';
    }
    
    // Transform the window
    context.transformWindow(context.nodeId, WINDOW_TYPES.ADMIN);
    
    // This will be displayed only momentarily before the window transforms
    return 'Transforming to admin panel...';
  }
}
