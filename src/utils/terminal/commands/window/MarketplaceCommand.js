/**
 * Terminal command for opening the Marketplace window
 */
import { Command } from '../../Command';
import { WINDOW_TYPES } from '../../../constants';

export class MarketplaceCommand extends Command {
  constructor() {
    super({
      name: 'marketplace',
      description: 'Open the Tileset Marketplace window',
      usage: 'marketplace',
      examples: [
        { command: 'marketplace', description: 'Open the Tileset Marketplace' }
      ]
    });
  }

  async execute(args, context) {
    const { createWindow } = context;
    
    const windowId = createWindow({
      type: WINDOW_TYPES.MARKETPLACE,
      title: 'Tileset Marketplace',
      width: 900,
      height: 700
    });

    return {
      message: 'Opening Tileset Marketplace window...',
      success: true,
      data: { windowId }
    };
  }
}
