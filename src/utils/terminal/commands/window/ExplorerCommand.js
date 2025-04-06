/**
 * Explorer Command
 * Transform window to Explorer type
 */
import { Command } from '../../Command.js';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class ExplorerCommand extends Command {
  constructor() {
    super();
    this.name = 'explorer';
    this.aliases = ['ex'];
    this.description = 'Transform window into file explorer';
    this.usage = 'explorer';
    this.category = 'Window';
    this.args = [];
  }

  async execute(args, context) {
    // Check if the transform function is provided in the context
    if (!context || typeof context.transformWindow !== 'function') {
      return 'Cannot transform window: Missing transform function in context';
    }
    
    // Check if the node ID is provided in the context
    if (!context.nodeId) {
      return 'Cannot transform window: Missing node ID in context';
    }
    
    // Transform the window
    context.transformWindow(context.nodeId, WINDOW_TYPES.EXPLORER);
    
    // This will be displayed only momentarily before the window transforms
    return 'Transforming to explorer window...';
  }
}
