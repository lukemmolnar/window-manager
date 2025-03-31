// src/utils/commandAliases.js

/**
 * Command aliases mapping
 * Maps short commands to their full versions to provide shortcuts
 * for common terminal commands
 */
export const COMMAND_ALIASES = {
  // Window type aliases
  'ex': 'explorer',
  'ed': 'editor',
  'term': 'terminal',
  'aud': 'audio',
  'ch': 'chat',
  'adm': 'admin',
  'can': 'canvas',
  
  // Other command aliases
  'cl': 'clear',
  'h': 'help',
  'v': 'version',
  'ann': 'announcement',
  'r': 'roll',
  'd': 'roll',
  'dbg': 'debug',
  
  // Party command aliases (new style)
  'p': 'party',
  'pc': 'party create',
  'pj': 'party join',
  'pl': 'party leave',
  'pls': 'party list',
  'pi': 'party info',
  
  // Legacy party command aliases (for backwards compatibility)
  'cp': 'create-party',
  'jp': 'join-party',
  'lp': 'leave-party'
};
