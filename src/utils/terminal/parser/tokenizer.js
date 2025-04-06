/**
 * Tokenizer for terminal command input
 * Breaks input into tokens while respecting quoted strings
 */

/**
 * Tokenize a command string into an array of tokens
 * Supports quotes (single, double, and backticks) for grouping arguments
 * 
 * @param {string} input - Raw command input string
 * @returns {Array<string>} - Array of tokens
 */
export function tokenize(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const tokens = [];
  let currentToken = '';
  let inQuote = false;
  let quoteChar = '';
  
  // Iterate through each character in the input
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];
    
    // Handle quotes (single, double, or backtick)
    if ((char === '"' || char === "'" || char === '`') && 
        (!inQuote || char === quoteChar)) {
      if (inQuote) {
        // End of quoted string
        inQuote = false;
        
        // Add the complete token to our tokens list
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        // Start of quoted string
        inQuote = true;
        quoteChar = char;
        
        // If we have accumulated a token before this quote, add it
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      }
    }
    // Handle spaces (token separators) when not in a quoted string
    else if (char === ' ' && !inQuote) {
      // Space outside quotes marks the end of a token
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = '';
      }
    }
    // Handle escaped characters
    else if (char === '\\' && (nextChar === '"' || nextChar === "'" || nextChar === '`' || nextChar === '\\')) {
      // Skip the backslash and add the escaped character
      currentToken += nextChar;
      i++; // Skip the next character since we've already processed it
    }
    // Any other character gets added to the current token
    else {
      currentToken += char;
    }
  }
  
  // Add the last token if there is one
  if (currentToken) {
    tokens.push(currentToken);
  }
  
  return tokens;
}

/**
 * Parse a tokenized command into a structured command object
 * 
 * @param {Array<string>} tokens - Tokenized command array
 * @returns {Object} - Structured command object { command, args }
 */
export function parseCommand(tokens) {
  if (!tokens || !tokens.length) {
    return { command: '', args: [] };
  }
  
  // First token is the command, rest are args
  const command = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  
  return { command, args };
}
