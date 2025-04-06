/**
 * Announcement Command
 * Sets a system-wide announcement (admin only)
 */
import { Command } from '../../Command.js';
import { extractQuotedText } from '../../parser/parser.js';

export class AnnouncementCommand extends Command {
  constructor() {
    super();
    this.name = 'announcement';
    this.aliases = ['ann'];
    this.description = 'Set a system-wide announcement (admin only)';
    this.usage = 'announcement "Your announcement text here"';
    this.category = 'Admin';
    this.args = [
      {
        name: 'text',
        description: 'The announcement text (must be in quotes)',
        required: true
      }
    ];
  }

  async execute(args, context) {
    // Check if user is admin
    if (!context.user?.is_admin) {
      return 'Access denied: Admin privileges required';
    }

    // Check if updateAnnouncement function is available
    if (!context || typeof context.updateAnnouncement !== 'function') {
      return 'Cannot set announcement: Missing updateAnnouncement function in context';
    }
    
    // Extract the quoted text from the original command
    const extractedText = extractQuotedText(context.original || args.join(' '));
    
    if (!extractedText) {
      return 'Usage: announcement "Your announcement text here" (text must be in quotes)';
    }
    
    const announcementText = extractedText.quoted;
    
    // Display setting message
    const settingMessage = `Setting announcement: "${announcementText}"...`;
    
    try {
      // Update the announcement via the context function
      const success = await context.updateAnnouncement(announcementText);
      
      if (success) {
        return [
          settingMessage,
          `Announcement set: "${announcementText}"`,
          'Announcement has been broadcast to all connected users.'
        ].join('\n');
      } else {
        return [
          settingMessage,
          'Failed to set announcement. Please try again.'
        ].join('\n');
      }
    } catch (error) {
      console.error('Error setting announcement:', error);
      return [
        settingMessage,
        'Error setting announcement. Please try again.'
      ].join('\n');
    }
  }
}
