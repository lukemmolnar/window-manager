# SLUMNET Terminal Command System Documentation

## Overview

The SLUMNET Terminal Command System is a modular, extensible framework for handling terminal commands in a structured way. Inspired by bash and modern CLI parsers, it provides a robust foundation for command processing with features like argument validation, command aliases, quoted text extraction, and categorized help output.

```
                Command Input
                     │
                     ▼
┌────────────────────────────────────┐
│           Tokenization             │ ◀── Handles quotes, whitespace, etc.
└────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────┐
│        Command Resolution          │ ◀── Registry lookup, alias handling
└────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────┐
│        Argument Processing         │ ◀── Validation, defaults
└────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────┐
│         Command Execution          │ ◀── Context injection, error handling
└────────────────────────────────────┘
                     │
                     ▼
              Command Output
```

## Core Components

### Command Base Class (`Command.js`)

The foundation of the command system is the `Command` class, which provides a consistent interface for all commands. Each command extends this base class and implements the `execute` method.

```javascript
class Command {
  constructor() {
    this.name = '';            // Primary command name
    this.aliases = [];         // Alternative names
    this.description = '';     // Help text
    this.usage = '';           // Usage example
    this.category = 'General'; // Category for grouping in help
    this.args = [];            // Argument definitions
  }

  async execute(args, context) {
    // Command implementation
  }
}
```

### Command Registry (`registry.js`)

The registry is a central store for all commands, providing methods to register, find, and list commands.

Key responsibilities:
- Register new commands
- Look up commands by name or alias
- Provide lists of all registered commands or by category

### Parser (`parser.js` and `tokenizer.js`)

The parser consists of two main components:

1. **Tokenizer**: Converts input strings into tokens, handling quoted text and whitespace
2. **Parser**: Processes tokens into commands and arguments

Additional utilities:
- `extractQuotedText`: Extracts text enclosed in quotes (", ', or `)

### Command Executor (`executor.js`)

The executor is responsible for:
- Finding the appropriate command in the registry
- Validating command arguments
- Providing execution context
- Executing the command and handling errors

### Command Loader (`commandLoader.js`)

The loader imports all command classes and registers them with the registry during initialization.

## Command Structure

### Metadata

Each command provides metadata that describes its purpose and usage:

- `name`: The primary command identifier
- `aliases`: Alternative names for the command
- `description`: A brief description for help text
- `usage`: Usage example for help text 
- `category`: Grouping category for organized help output

### Arguments

Commands define their expected arguments with metadata:

```javascript
this.args = [
  {
    name: 'argName',
    description: 'Description of the argument',
    required: true|false
  }
];
```

This metadata is used for:
- Validating input
- Generating help text
- Providing context-aware error messages

### Execution Context

Commands receive a rich execution context with access to application state and functionality:

- User information (`user`)
- Window management (`nodeId`, `transformWindow`)
- Party system (`currentParty`, `createParty`, etc.)
- Utility functions (`debugLogger`, etc.)
- Original command text (`original`)

This context injection pattern allows commands to access needed functionality without tight coupling to implementation details.

## Categories of Commands

Commands are organized by category for better organization and discoverability:

1. **Core Commands**: Basic functionality like help, clear, version
   - `HelpCommand`: Display available commands
   - `ClearCommand`: Clear terminal output
   - `VersionCommand`: Show terminal version
   - `RollCommand`: Roll dice with specified parameters

2. **Window Commands**: Transform the current window
   - `WindowCommand`: Base class for window transformations
   - `TerminalCommand`: Transform to terminal
   - `ExplorerCommand`: Transform to file explorer
   - `ChatCommand`: Transform to chat window

3. **Admin Commands**: Administrative functionality
   - `AdminCommand`: Access admin panel
   - `DebugCommand`: Toggle debug mode
   - `AnnouncementCommand`: Set system-wide announcements

4. **Party Commands**: Manage D&D parties
   - `PartyCommand`: Main command with subcommands
     - create, join, leave, list, info, delete
   - Legacy party commands for backward compatibility

## Special Features

### Subcommand System

For complex commands with multiple operations, the system supports subcommands:

```javascript
// In PartyCommand
this.subcommands = {
  create: this.createParty,
  join: this.joinParty,
  // other subcommands...
};

async execute(args, context) {
  const subcommand = args[0]?.toLowerCase() || 'default';
  return this.subcommands[subcommand].call(this, args.slice(1), context);
}
```

### Legacy Command Support

The system provides backward compatibility for existing commands through redirection:

```javascript
// Legacy command example
async execute(args, context) {
  return context.executeCommand(`party join ${args.join(' ')}`);
}
```

### Admin-Only Command Restriction

Commands can implement access control:

```javascript
async execute(args, context) {
  if (!context.user?.is_admin) {
    return 'Access denied: Admin privileges required';
  }
  // Command implementation for admins...
}
```

## Creating New Commands

### Step 1: Create a Command Class

Start by creating a new file in the appropriate directory:
- `src/utils/terminal/commands/core/` - Basic commands
- `src/utils/terminal/commands/window/` - Window manipulation
- `src/utils/terminal/commands/admin/` - Admin functionality
- `src/utils/terminal/commands/party/` - Party-related commands
- Or create a new category directory

Example command class template:

```javascript
import { Command } from '../../Command.js';

export class ExampleCommand extends Command {
  constructor() {
    super();
    this.name = 'example';
    this.aliases = ['ex'];
    this.description = 'Example command description';
    this.usage = 'example [arg1] [arg2]';
    this.category = 'Custom';
    this.args = [
      {
        name: 'arg1',
        description: 'First argument',
        required: false
      }
    ];
  }

  async execute(args, context) {
    // Command implementation
    return `Executed example command with args: ${args.join(', ')}`;
  }
}
```

### Step 2: Register the Command

Import and register your command in `commandLoader.js`:

```javascript
import { ExampleCommand } from './commands/custom/ExampleCommand.js';

// In registerCommands function
const commands = [
  // existing commands...
  new ExampleCommand(),
];
```

### Step 3: Add Context Requirements

If your command needs access to specific functionality or state, ensure it's provided in the context object in `TerminalWindow.jsx`:

```javascript
// In TerminalWindow.jsx, processCommand function
const context = {
  // existing context...
  customFeature: customFeatureValue
};
```

## Command Context Reference

The following context properties are available to commands:

| Property | Type | Description |
|----------|------|-------------|
| `original` | string | Original command text |
| `user` | object | Current user information |
| `nodeId` | string | Current window node ID |
| `transformWindow` | function | Function to transform window type |
| `updateAnnouncement` | function | Function to set system announcements |
| `parties` | array | Available parties |
| `currentParty` | object | Current party information |
| `joinParty` | function | Function to join a party |
| `leaveParty` | function | Function to leave current party |
| `createParty` | function | Function to create new party |
| `refreshParty` | function | Function to refresh party data |
| `refreshParties` | function | Function to refresh all parties |
| `deleteParty` | function | Function to delete a party |
| `parseDiceExpression` | function | Function to parse dice notation |
| `rollDice` | function | Function to roll dice |
| `formatRollResult` | function | Function to format dice results |
| `isValidDiceType` | function | Function to validate dice type |
| `debugLogger` | object | Debug logging utilities |
| `clearTerminal` | function | Function to clear terminal output |
| `executeCommand` | function | Function to execute another command |

## Examples

### Simple Command

```javascript
import { Command } from '../../Command.js';

export class HelloCommand extends Command {
  constructor() {
    super();
    this.name = 'hello';
    this.aliases = ['hi'];
    this.description = 'Say hello to a user';
    this.usage = 'hello [username]';
    this.category = 'Greeting';
    this.args = [
      {
        name: 'username',
        description: 'Name to greet',
        required: false
      }
    ];
  }

  async execute(args, context) {
    const name = args[0] || context.user?.username || 'World';
    return `Hello, ${name}!`;
  }
}
```

### Command with Subcommands

```javascript
import { Command } from '../../Command.js';

export class TestCommand extends Command {
  constructor() {
    super();
    this.name = 'test';
    this.aliases = ['t'];
    this.description = 'Test various functions';
    this.usage = 'test <subcommand>';
    this.category = 'Utilities';
    this.args = [
      {
        name: 'subcommand',
        description: 'Subcommand to execute',
        required: true
      }
    ];
    
    this.subcommands = {
      echo: this.echoText,
      random: this.randomNumber
    };
  }

  async execute(args, context) {
    const subcommand = args[0]?.toLowerCase();
    
    if (!subcommand || !this.subcommands[subcommand]) {
      return `Unknown subcommand. Available: ${Object.keys(this.subcommands).join(', ')}`;
    }
    
    return this.subcommands[subcommand].call(this, args.slice(1), context);
  }
  
  async echoText(args, context) {
    return args.join(' ') || 'No text provided to echo';
  }
  
  async randomNumber(args, context) {
    const max = parseInt(args[0]) || 100;
    return `Random number: ${Math.floor(Math.random() * max)}`;
  }
}
```

## Best Practices

1. **Categorize Commands**
   - Place commands in appropriate category directories
   - Set descriptive category name in command metadata

2. **Provide Helpful Documentation**
   - Set clear description and usage examples
   - Include argument documentation

3. **Use Context Appropriately**
   - Validate context properties before use
   - Report clear errors when required context is missing

4. **Implement Access Control**
   - Check user permissions at the beginning of execution
   - Return clear access denied messages

5. **Handle Errors Gracefully**
   - Use try/catch to handle unexpected errors
   - Return user-friendly error messages

## Troubleshooting

### Command Not Found

If your command isn't being recognized:

1. Ensure it's properly imported and registered in `commandLoader.js`
2. Check that the class name matches the export name
3. Verify the command name and aliases don't conflict with existing commands

### Context Missing

If context properties are undefined:

1. Check that the property is being provided in the `processCommand` function in `TerminalWindow.jsx`
2. Add proper validation in your command to check context properties
3. Return clear error messages when required context is missing

### Command Execution Fails

If a command fails during execution:

1. Check browser console for JavaScript errors
2. Ensure all async operations have proper error handling
3. Verify that functions being called from context exist and work as expected
