/**
 * Terminal command parser
 * Parses and processes command input through multiple stages
 */
import { tokenize, parseCommand } from './tokenizer.js';

/**
 * Represents a parsed command with structured information
 */
export class ParsedCommand {
  constructor(input) {
    this.original = input || '';
    this.tokens = [];
    this.command = '';
    this.args = [];
    this.error = null;
  }
}

/**
 * Parse a command string into a structured ParsedCommand object
 * 
 * @param {string} input - Raw command input string
 * @returns {ParsedCommand} - Parsed command object
 */
export function parse(input) {
  const result = new ParsedCommand(input);
  
  try {
    // Stage 1: Tokenize the input
    result.tokens = tokenize(input);
    
    // Stage 2: Structure the tokens into command and args
    const parsed = parseCommand(result.tokens);
    result.command = parsed.command;
    result.args = parsed.args;
    
    // Stage 3: Variable expansion (if needed in the future)
    // This could expand environment variables, etc.
    // Currently a placeholder for future expansion
    
    // Stage 4: Path expansion (if needed in the future)
    // This could handle glob patterns or ~ expansion
    // Currently a placeholder for future expansion
  } catch (error) {
    result.error = error.message;
  }
  
  return result;
}

/**
 * Validates a command's arguments against its requirements
 * 
 * @param {Array} args - The command arguments
 * @param {Array} argDefs - The command's argument definitions
 * @returns {Object} - Validation result { valid, error }
 */
export function validateArgs(args, argDefs) {
  if (!argDefs || !argDefs.length) {
    return { valid: true };
  }
  
  // Check for required arguments
  const requiredArgs = argDefs.filter(arg => arg.required);
  
  if (args.length < requiredArgs.length) {
    const missingArgs = requiredArgs
      .slice(args.length)
      .map(arg => arg.name)
      .join(', ');
      
    return {
      valid: false,
      error: `Missing required argument(s): ${missingArgs}`
    };
  }
  
  // More advanced validation could be added here
  // such as type checking or value validation
  
  return { valid: true };
}

/**
 * Process quoted arguments in a special way (extract from quotes)
 * This is useful for commands that expect quoted text like announcement
 * 
 * @param {string} input - Original command input
 * @returns {Object|null} - Extracted quoted content or null if no quotes found
 */
export function extractQuotedText(input) {
  if (!input) return null;
  
  // Match text in quotes (single, double, or backticks)
  const match = input.match(/"([^"]*)"|'([^']*)'|`([^`]*)`/);
  if (!match) return null;
  
  // Return the matched quoted text (from whichever quote type was found)
  return {
    quoted: match[1] || match[2] || match[3],
    fullMatch: match[0]
  };
}
