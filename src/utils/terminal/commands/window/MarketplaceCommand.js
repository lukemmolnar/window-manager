import { Command } from '../../Command';
import { WINDOW_TYPES } from '../../../constants';

export class MarketplaceCommand extends Command {
  constructor() {
    super();
    this.name = 'marketplace';
    this.aliases = ['market'];
    this.description = 'Open the Tileset Marketplace window';
    this.usage = 'marketplace';
    this.category = 'Window';
    this.args = [];
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
