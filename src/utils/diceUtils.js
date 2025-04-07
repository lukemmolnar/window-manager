/**
 * Utility functions for dice rolling
 */

/**
 * Roll dice based on a dice expression
 * @param {number} diceType - The type of dice (e.g., 6, 20, 100)
 * @param {number} numDice - Number of dice to roll
 * @param {number} modifier - Modifier to add to the total
 * @returns {Object} Object containing results and total
 */
export const rollDice = (diceType, numDice, modifier = 0) => {
  const results = [];
  let total = 0;
  
  // Roll each die
  for (let i = 0; i < numDice; i++) {
    const result = Math.floor(Math.random() * diceType) + 1;
    results.push(result);
    total += result;
  }
  
  // Add modifier to total
  total += modifier;
  
  return {
    diceType,
    numDice,
    modifier,
    results,
    total,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Parse a dice roll expression (e.g., "2d6+3")
 * @param {string} expression - The dice expression to parse
 * @returns {Object|null} Parsed dice roll parameters or null if invalid
 */
export const parseDiceExpression = (expression) => {
  // Basic regex to match dice roll syntax like "2d6+3"
  const diceRegex = /^(\d+)d(\d+)([+-]\d+)?$/i;
  const match = expression.match(diceRegex);
  
  if (!match) {
    return null;
  }
  
  return {
    numDice: parseInt(match[1], 10),
    diceType: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0
  };
};

/**
 * Format the results of a dice roll for display
 * @param {Object} rollResult - The result of a dice roll
 * @returns {string} Formatted string for display
 */
export const formatRollResult = (rollResult) => {
  const { diceType, numDice, modifier, results, total } = rollResult;
  
  let output = [];
  
  // Format the expression
  let expression = `${numDice}d${diceType}`;
  if (modifier > 0) {
    expression += `+${modifier}`;
  } else if (modifier < 0) {
    expression += `${modifier}`;
  }
  
  output.push(`Roll: ${expression}`);
  
  // Format the individual results
  if (results.length > 1) {
    output.push(`Results: [${results.join(', ')}]`);
  } else {
    output.push(`Result: ${results[0]}`);
  }
  
  // Format the total with modifier calculation if needed
  if (modifier !== 0) {
    let calculation = `${results.reduce((a, b) => a + b, 0)}`;
    if (modifier > 0) {
      calculation += ` + ${modifier}`;
    } else if (modifier < 0) {
      calculation += ` - ${Math.abs(modifier)}`;
    }
    output.push(`Total: ${calculation} = ${total}`);
  } else {
    output.push(`Total: ${total}`);
  }
  
  return output.join('\n');
};

/**
 * Validate if a dice type is valid
 * @param {number} diceType - The dice type to validate
 * @returns {boolean} Whether the dice type is valid
 */
export const isValidDiceType = (diceType) => {
  // Allow any dice from d2 to d100
  return diceType >= 2 && diceType <= 100;
};
