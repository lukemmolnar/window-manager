# Explorer Window Component

This directory contains a modular implementation of the ExplorerWindow component. The code has been refactored to improve maintainability and make it easier to extend functionality.

## Architecture Overview

The ExplorerWindow has been split into several components and modules following a clean separation of concerns:

```
explorer/
├── ExplorerWindow.jsx              # Main component (orchestrator)
├── state/
│   └── useExplorerState.js         # Custom hook for state management
├── components/
│   ├── FileTree.jsx                # Tree view UI and navigation
│   ├── FileContent.jsx             # Content viewing/editing panel
│   ├── CommandInput.jsx            # Command input field
│   └── dialogs/
│       └── FileDialogs.jsx         # Dialog components for file operations
├── api/
│   └── fileOperations.js           # API calls and file operations
├── utils/
│   ├── fileUtils.js                # File-related utility functions
│   └── markdownUtils.js            # Markdown-specific utilities
└── README.md                       # This documentation file
```

## Component Responsibilities

### ExplorerWindow.jsx
- Acts as the main component that orchestrates all other components
- Retrieves state and operations from useExplorerState
- Passes down props to child components

### useExplorerState.js
- Centralizes all state management
- Handles state persistence and retrieval
- Implements business logic for all user interactions
- Provides functions for file operations

### FileTree.jsx
- Displays the directory structure
- Handles file/folder selection
- Manages UI for drag and drop operations

### FileContent.jsx
- Displays file content based on file type
- Provides editing interface for markdown files
- Renders markdown preview

### CommandInput.jsx
- Provides command input interface
- Handles command execution

### FileDialogs.jsx
- Contains dialog components for creating, renaming, and deleting files/folders

### fileOperations.js
- Encapsulates API calls to the server
- Handles error states and response parsing

### fileUtils.js and markdownUtils.js
- Provide utility functions for file and markdown operations

## Data Flow

1. User interactions in UI components trigger functions received from useExplorerState
2. useExplorerState processes these actions, updates state, and interacts with the API as needed
3. State changes flow back to UI components through props

## Adding Support for New File Types

To add support for new file types (e.g., canvas files, audio files, images):

1. Update `fileUtils.js` to recognize and provide appropriate icons for the new file types
2. Extend `FileContent.jsx` to render the new file types appropriately
3. If needed, add specific utility files (similar to markdownUtils.js) for the new file types
4. Update state in `useExplorerState.js` to handle any special behaviors for the new file types

## State Management

The component uses a custom hook approach for state management, which offers several advantages:

- Centralizes state logic in one place
- Makes the main component simpler and more declarative
- Allows for easier testing of business logic
- Simplifies adding new features or file type support

This approach is more maintainable than using a context provider for this specific use case, as the component tree is not deeply nested. If the component structure becomes more complex in the future, the code could be adapted to use a context provider instead.
