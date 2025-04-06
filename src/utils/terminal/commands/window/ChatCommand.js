/**
 * Chat Command
 * Transform window to Chat type
 */
import { Command } from '../../Command.js';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class ChatCommand extends Command {
  constructor() {
    super();
    this.name = 'chat';
    this.aliases = ['ch'];
    this.description = 'Transform window into chat window';
    this.usage = 'chat';
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
    context.transformWindow(context.nodeId, WINDOW_TYPES.CHAT);
    
    // This will be displayed only momentarily before the window transforms
    return 'Transforming to chat window...';
  }
}
