import { Command } from '../../Command';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class MarketplaceCommand extends Command {
  constructor() {
    super();
    this.name = 'marketplace';
    this.aliases = ['market'];
    this.description = 'Transform window into tileset marketplace';
    this.usage = 'marketplace';
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
    context.transformWindow(context.nodeId, WINDOW_TYPES.MARKETPLACE);
    
    // This will be displayed only momentarily before the window transforms
    return 'Transforming to marketplace window...';
  }
}
