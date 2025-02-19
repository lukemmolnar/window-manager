import { useEffect } from 'react';
import { WINDOW_TYPES } from '../utils/windowTypes';

/**
 * A custom hook that manages keyboard shortcuts for window operations.
 * This hook centralizes all keyboard-related logic for the window manager.
 * 
 * @param {Object} handlers - Object containing callback functions for various window operations
 * @param {Function} handlers.onSplitVertical - Handler for vertical split command
 * @param {Function} handlers.onSplitHorizontal - Handler for horizontal split command
 * @param {Function} handlers.onClose - Handler for window close command
 * @param {Function} handlers.createNewWindow - Handler for creating new windows
 * @param {boolean} hasActiveWindow - Whether there is currently an active window
 * @param {boolean} hasRootNode - Whether there is a root node in the tree
 */
export const useKeyboardShortcuts = ({
  onSplitVertical,
  onSplitHorizontal,
  onClose,
  createNewWindow,
  hasActiveWindow,
  hasRootNode
}) => {
  useEffect(() => {
    // Handler for keyboard events
    const handleKeyDown = (e) => {
      // Only handle ctrl/cmd key combinations
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (e.shiftKey) {
          // Ctrl+Shift+Enter: Horizontal split
          if (hasActiveWindow) {
            onSplitHorizontal();
          } else {
            createNewWindow(WINDOW_TYPES.TERMINAL);
          }
        } else {
          // Ctrl+Enter: Vertical split
          if (hasActiveWindow) {
            onSplitVertical();
          } else {
            createNewWindow(WINDOW_TYPES.TERMINAL);
          }
        }
      } else if (e.key === 'Backspace') {
        // Only allow closing if we have an active window and root node
        if (hasActiveWindow && hasRootNode) {
          e.preventDefault();
          onClose();
        }
      }
    };

    // Add event listener for keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener on unmount
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSplitVertical,
    onSplitHorizontal,
    onClose,
    createNewWindow,
    hasActiveWindow,
    hasRootNode
  ]);
};