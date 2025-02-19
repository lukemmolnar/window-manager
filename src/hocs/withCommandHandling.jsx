import React from 'react';
import { WINDOW_TYPES } from '../utils/windowTypes';

/**
 * Higher-Order Component that adds command handling capabilities to window components.
 * This HOC provides a standardized way to handle commands across different window types,
 * particularly focusing on window transformation commands.
 *
 * @param {React.Component} WrappedComponent - The window component to enhance with command handling
 * @returns {React.Component} - A new component with command handling capabilities
 */
const withCommandHandling = (WrappedComponent) => {
  // Return a new component that includes the command handling functionality
  return function WithCommandHandling({ 
    transformWindow, // Function to change window type
    nodeId,         // Unique identifier for the window
    ...props        // All other props passed to the window
  }) {
    /**
     * Handles commands entered in the window.
     * Currently supports window transformation commands (e.g., 'terminal', 'editor', etc.)
     * Can be extended to handle other command types in the future.
     *
     * @param {string} command - The command string to process
     * @returns {boolean} - Whether the command was handled
     */
    const handleCommand = (command) => {
      // Convert command to lowercase for case-insensitive comparison
      const cmd = command.toLowerCase();
      
      // Check if the command matches any window type
      // This allows commands like 'terminal', 'editor', 'explorer', 'preview'
      const isWindowTypeCommand = Object.keys(WINDOW_TYPES).some(
        type => type.toLowerCase() === cmd
      );

      if (isWindowTypeCommand) {
        // Get the actual window type constant from our types enum
        const requestedType = WINDOW_TYPES[cmd.toUpperCase()];
        
        // Log the transformation request for debugging
        console.log(`Transforming window ${nodeId} to ${requestedType}`);
        
        // Execute the transformation
        transformWindow(nodeId, requestedType);
        
        // Return true to indicate the command was handled
        return true;
      }
      
      // Return false if the command wasn't handled by this HOC
      // This allows the wrapped component to handle other commands if needed
      return false;
    };
    
    // Render the wrapped component with both the original props
    // and our new command handler
    return (
      <WrappedComponent 
        {...props} 
        transformWindow={transformWindow}
        nodeId={nodeId}
        onCommand={handleCommand}
      />
    );
  };
};

export default withCommandHandling;