/**
 * Legacy Party Commands
 * Provides backward compatibility for old party command syntax
 */
import { Command } from '../../Command.js';

// Base class for legacy party commands
class LegacyPartyCommand extends Command {
  constructor(options) {
    super();
    Object.assign(this, options);
    this.category = 'Legacy';
  }

  // Redirect to the main party command
  async execute(args, context) {
    // Check if executeCommand is available in context
    if (!context || typeof context.executeCommand !== 'function') {
      return `Cannot execute ${this.name}: Missing executeCommand function in context`;
    }
    
    // Build the redirected command
    const redirectCommand = `party ${this.redirectSubcommand} ${args.join(' ')}`;
    
    // Execute the redirected command
    return context.executeCommand(redirectCommand);
  }
}

// Create Party Command (legacy)
export class CreatePartyCommand extends LegacyPartyCommand {
  constructor() {
    super({
      name: 'create-party',
      aliases: ['cp'],
      description: 'Create a new party (admin only) [Legacy Command]',
      usage: 'create-party "Party Name"',
      redirectSubcommand: 'create',
      args: [
        {
          name: 'party_name',
          description: 'Name of the party to create',
          required: true
        }
      ]
    });
  }
}

// Join Party Command (legacy)
export class JoinPartyCommand extends LegacyPartyCommand {
  constructor() {
    super({
      name: 'join-party',
      aliases: ['jp'],
      description: 'Join an existing party [Legacy Command]',
      usage: 'join-party <party_id or party_name>',
      redirectSubcommand: 'join',
      args: [
        {
          name: 'party_identifier',
          description: 'ID or name of the party to join',
          required: true
        }
      ]
    });
  }
}

// Leave Party Command (legacy)
export class LeavePartyCommand extends LegacyPartyCommand {
  constructor() {
    super({
      name: 'leave-party',
      aliases: ['lp'],
      description: 'Leave your current party [Legacy Command]',
      usage: 'leave-party',
      redirectSubcommand: 'leave',
      args: []
    });
  }
}

// Parties Command (legacy)
export class PartiesCommand extends LegacyPartyCommand {
  constructor() {
    super({
      name: 'parties',
      aliases: [],
      description: 'Show party information or list parties [Legacy Command]',
      usage: 'parties [list]',
      redirectSubcommand: '', // Will be determined in execute
      args: [
        {
          name: 'subcommand',
          description: 'Optional "list" to show all parties',
          required: false
        }
      ]
    });
  }
  
  // Override execute to handle the list subcommand
  async execute(args, context) {
    if (!context || typeof context.executeCommand !== 'function') {
      return `Cannot execute ${this.name}: Missing executeCommand function in context`;
    }
    
    // If first arg is "list", redirect to party list, otherwise to party info
    const redirectSubcommand = args.length > 0 && args[0].toLowerCase() === 'list' 
      ? 'list' 
      : '';
      
    // Build the redirected command
    const redirectCommand = `party ${redirectSubcommand}`;
    
    // Execute the redirected command
    return context.executeCommand(redirectCommand);
  }
}
