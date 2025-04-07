/**
 * Roll Command
 * Rolls dice with specified parameters
 */
import { Command } from '../../Command.js';

export class RollCommand extends Command {
  constructor() {
    super();
    this.name = 'roll';
    this.aliases = ['r', 'd'];
    this.description = 'Roll dice (e.g., roll 2d6+3)';
    this.usage = 'roll <dice expression>';
    this.category = 'VTT';
    this.args = [
      {
        name: 'expression',
        description: 'Dice expression (e.g., 2d6+3)',
        required: true
      }
    ];
  }

  async execute(args, context) {
    // Check if the dice utilities are available
    if (!context.parseDiceExpression || !context.rollDice || !context.formatRollResult || !context.isValidDiceType) {
      return 'Cannot roll dice: Missing dice utilities in context';
    }
    
    // Get the dice expression
    const diceExpression = args.join('').trim();
    
    if (!diceExpression) {
      return 'Usage: roll <dice expression> (e.g., roll 2d6+3)';
    }
    
    // Parse the dice expression
    const parsedDice = context.parseDiceExpression(diceExpression);
    
    if (!parsedDice) {
      return 'Invalid dice expression. Use format: NdS+M (e.g., 2d6+3)';
    }
    
    const { numDice, diceType, modifier } = parsedDice;
    
    // Validate dice type
    if (!context.isValidDiceType(diceType)) {
      return 'Invalid dice type. Please use dice with 2-100 sides (e.g., d2, d6, d20, d37, d100)';
    }
    
    // Validate number of dice
    if (numDice < 1 || numDice > 20) {
      return 'Please use between 1 and 20 dice';
    }
    
    // Roll the dice
    const result = context.rollDice(diceType, numDice, modifier);
    
    // Format the results with a special marker to display the d20 GIF
    return {
      type: 'dice-roll',
      content: context.formatRollResult(result)
    };
  }
}
