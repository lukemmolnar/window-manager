import { Command } from '../../Command';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class GameCommand extends Command {
  constructor() {
    super();
    this.name = 'game';
    this.aliases = ['g'];
    this.description = 'Transform window into game view';
    this.usage = 'game';
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
    context.transformWindow(context.nodeId, WINDOW_TYPES.GAME);
    
    // This will be displayed only momentarily before the window transforms
    return 'Transforming to game window...';
  }
}
