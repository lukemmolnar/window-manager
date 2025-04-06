/**
 * Party Command
 * Manages D&D party functionality with subcommands
 */
import { Command } from '../../Command.js';
import { extractQuotedText } from '../../parser/parser.js';

export class PartyCommand extends Command {
  constructor() {
    super();
    this.name = 'party';
    this.aliases = ['p'];
    this.description = 'Party system commands';
    this.usage = 'party [subcommand] [arguments]';
    this.category = 'Party';
    this.args = [
      {
        name: 'subcommand',
        description: 'Subcommand to execute (create, join, leave, list, info, delete)',
        required: false
      }
    ];
    
    // Available subcommands
    this.subcommands = {
      create: this.createParty,
      join: this.joinParty,
      leave: this.leaveParty,
      list: this.listParties,
      info: this.partyInfo,
      delete: this.deleteParty
    };
  }

  async execute(args, context) {
    // If no subcommand is provided, default to 'info'
    const subcommand = args[0]?.toLowerCase() || 'info';
    
    // Check if the subcommand exists
    if (!Object.keys(this.subcommands).includes(subcommand)) {
      return 'Unknown party subcommand. Available subcommands: create, join, leave, list, info, delete';
    }
    
    // Execute the appropriate subcommand
    return this.subcommands[subcommand].call(this, args.slice(1), context);
  }

  /* Subcommand handlers */

  async createParty(args, context) {
    // Check if user is admin
    if (!context.user?.is_admin) {
      return 'Access denied: Admin privileges required';
    }
    
    // Check party context availability
    if (!context.createParty) {
      return 'Cannot create party: Missing party context';
    }
    
    // Extract party name from quotes or just take the remaining arguments
    let partyName;
    const extractedText = extractQuotedText(args.join(' '));
    
    if (extractedText) {
      partyName = extractedText.quoted;
    } else {
      partyName = args.join(' ');
    }
    
    if (!partyName) {
      return 'Usage: party create "Party Name"';
    }
    
    const creatingMessage = `Creating party "${partyName}"...`;
    
    try {
      const result = await context.createParty(partyName);
      return `${creatingMessage}\nParty "${partyName}" created successfully with ID ${result.id}`;
    } catch (error) {
      if (error.response?.status === 400) {
        return `${creatingMessage}\nError: ${error.response.data.message}`;
      } else {
        console.error('Error creating party:', error);
        return `${creatingMessage}\nError creating party. Please try again.`;
      }
    }
  }

  async joinParty(args, context) {
    // Check party context availability
    if (!context.joinParty || !context.parties) {
      return 'Cannot join party: Missing party context';
    }
    
    if (args.length === 0) {
      return 'Usage: party join <party_id or party_name>';
    }
    
    const partyIdentifier = args.join(' ');
    const joiningMessage = `Joining party "${partyIdentifier}"...`;
    
    try {
      // Try to get the party by ID first
      let partyId = parseInt(partyIdentifier);
      
      if (isNaN(partyId)) {
        // If it's not a number, assume it's a name
        // Find the party by name
        const party = context.parties.find(p => 
          p.name.toLowerCase() === partyIdentifier.toLowerCase()
        );
        
        if (!party) {
          return `${joiningMessage}\nParty "${partyIdentifier}" not found`;
        }
        
        partyId = party.id;
      }
      
      // Try to join the party
      const joinResponse = await context.joinParty(partyId);
      
      if (joinResponse.message?.includes('Already a member')) {
        return `${joiningMessage}\nYou are already a member of this party`;
      } else {
        return `${joiningMessage}\nJoined party "${joinResponse.party.name}" successfully`;
      }
    } catch (error) {
      console.error('Error joining party:', error);
      if (error.response?.status === 404) {
        return `${joiningMessage}\nParty not found`;
      } else {
        return `${joiningMessage}\nError joining party. Please try again.`;
      }
    }
  }

  async leaveParty(args, context) {
    // Check party context availability
    if (!context.leaveParty || !context.currentParty) {
      return 'Cannot leave party: Missing party context';
    }
    
    const leavingMessage = 'Leaving current party...';
    
    try {
      if (!context.currentParty) {
        return `${leavingMessage}\nYou are not currently in a party`;
      }
      
      // Leave the party
      await context.leaveParty();
      return `${leavingMessage}\nLeft party "${context.currentParty.name}" successfully`;
    } catch (error) {
      console.error('Error leaving party:', error);
      return `${leavingMessage}\nError leaving party. Please try again.`;
    }
  }

  async listParties(args, context) {
    // Check party context availability
    if (!context.refreshParties || !context.parties) {
      return 'Cannot list parties: Missing party context';
    }
    
    const fetchingMessage = 'Fetching parties...';
    
    try {
      await context.refreshParties();
      if (context.parties.length === 0) {
        return `${fetchingMessage}\nNo parties available`;
      } else {
        return [
          fetchingMessage,
          'Available parties:',
          ...context.parties.map(party => 
            `ID: ${party.id} | Name: ${party.name} | Members: ${party.member_count} | Created by: ${party.creator_name}`
          )
        ].join('\n');
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      return `${fetchingMessage}\nError fetching parties. Please try again.`;
    }
  }

  async partyInfo(args, context) {
    // Check party context availability
    if (!context.refreshParty || !context.currentParty) {
      return 'Cannot show party info: Missing party context';
    }
    
    const fetchingMessage = 'Fetching current party...';
    
    try {
      await context.refreshParty();
      
      if (!context.currentParty) {
        return `${fetchingMessage}\nYou are not currently in a party. Use "party list" to see available parties or "party join <id>" to join one.`;
      } else {
        return [
          fetchingMessage,
          `Current party: ${context.currentParty.name} (ID: ${context.currentParty.id})`,
          `Created by: ${context.currentParty.creator_name}`,
          `Created at: ${new Date(context.currentParty.created_at).toLocaleString()}`,
          `Members (${context.currentParty.members?.length || 0}):`,
          ...(context.currentParty.members || []).map(member => 
            `- ${member.username}${member.is_admin ? ' (Admin)' : ''}${member.id === context.currentParty.creator_id ? ' (Creator)' : ''}`
          )
        ].join('\n');
      }
    } catch (error) {
      console.error('Error fetching current party:', error);
      return `${fetchingMessage}\nError fetching current party. Please try again.`;
    }
  }

  async deleteParty(args, context) {
    // Check if user is admin
    if (!context.user?.is_admin) {
      return 'Access denied: Admin privileges required';
    }
    
    // Check party context availability
    if (!context.deleteParty) {
      return 'Cannot delete party: Missing party context';
    }
    
    if (args.length === 0) {
      return 'Usage: party delete <party_id>';
    }
    
    const partyIdToDelete = parseInt(args[0]);
    if (isNaN(partyIdToDelete)) {
      return 'Invalid party ID. Please provide a valid numeric ID.';
    }
    
    const deletingMessage = `Deleting party with ID ${partyIdToDelete}...`;
    
    try {
      const result = await context.deleteParty(partyIdToDelete);
      if (result.success) {
        return `${deletingMessage}\nParty with ID ${partyIdToDelete} has been deleted successfully.`;
      } else {
        return `${deletingMessage}\nFailed to delete party: ${result.message || 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Error deleting party:', error);
      return `${deletingMessage}\nError deleting party. Please try again.`;
    }
  }
}
