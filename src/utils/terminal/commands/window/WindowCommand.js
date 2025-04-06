/**
 * Window Command
 * Handles transforming the current window to a different window type
 */
import { Command } from '../../Command.js';
import { WINDOW_TYPES } from '../../../windowTypes.js';

export class WindowCommand extends Command {
  constructor() {
    super();
    this.name = 'window';
    this.aliases = ['win'];
    this.description = 'Transform window to a specified window type';
    this.usage = 'window <type>';
    this.category = 'Window';
    this.args = [
      {
        name: 'type',
        description: 'Window type to transform to',
        required: true
      }
    ];
    
    // Valid window types that can be used with this command
    this.validTypes = Object.values(WINDOW_TYPES);
  }

  async execute(args, context) {
    if (!args || args.length === 0) {
      return this.listWindowTypes();
    }
    
    const requestedType = args[0].toUpperCase();
    
    // Check if the requested type is a valid window type
    if (!WINDOW_TYPES[requestedType] && !Object.values(WINDOW_TYPES).includes(requestedType)) {
      return `Unknown window type: ${args[0]}. Use one of: ${Object.keys(WINDOW_TYPES).map(t => t.toLowerCase()).join(', ')}`;
    }
    
    // Get the normalized window type
    const windowType = WINDOW_TYPES[requestedType] || requestedType;
    
    // Check if the transform function is provided in the context
    if (!context || typeof context.transformWindow !== 'function') {
      return 'Cannot transform window: Missing transform function in context';
    }
    
    // Check if the node ID is provided in the context
    if (!context.nodeId) {
      return 'Cannot transform window: Missing node ID in context';
    }
    
    // Transform the window
    context.transformWindow(context.nodeId, windowType);
    
    // This will be displayed only momentarily before the window transforms
    return `Transforming to ${windowType.toLowerCase()} window...`;
  }
  
  // Generate a list of available window types
  listWindowTypes() {
    return [
      'Available window types:',
      ...Object.keys(WINDOW_TYPES).map(type => `  ${type.toLowerCase()}`),
      '',
      'Usage: window <type>'
    ].join('\n');
  }
}
