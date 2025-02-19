/**
 * Contains utility functions for window-specific calculations and operations.
 * These functions focus on spatial relationships and window bounds rather than
 * tree structure manipulation.
 */

/**
 * Calculates the bounds of windows in the tree. Each window gets its position
 * and size as percentages of the available space.
 * 
 * @param {Node} node - The node to calculate bounds for
 * @param {Object} available - The available space in percentages
 * @returns {Array} Array of objects containing window IDs and their bounds
 */
export const getWindowBounds = (node, available = { x: 0, y: 0, width: 100, height: 100 }) => {
    if (node.type === 'window') {
      return [{
        id: node.id,
        bounds: {
          left: available.x,
          top: available.y,
          right: available.x + available.width,
          bottom: available.y + available.height,
          width: available.width,
          height: available.height,
          centerX: available.x + (available.width / 2),
          centerY: available.y + (available.height / 2)
        }
      }];
    }
  
    // For split nodes, recursively get bounds of children
    const bounds = [];
    
    if (node.direction === 'horizontal') {
      const firstHalf = {
        x: available.x,
        y: available.y,
        width: available.width * node.splitRatio,
        height: available.height
      };
      const secondHalf = {
        x: available.x + (available.width * node.splitRatio),
        y: available.y,
        width: available.width * (1 - node.splitRatio),
        height: available.height
      };
      bounds.push(...getWindowBounds(node.first, firstHalf));
      bounds.push(...getWindowBounds(node.second, secondHalf));
    } else {
      const firstHalf = {
        x: available.x,
        y: available.y,
        width: available.width,
        height: available.height * node.splitRatio
      };
      const secondHalf = {
        x: available.x,
        y: available.y + (available.height * node.splitRatio),
        width: available.width,
        height: available.height * (1 - node.splitRatio)
      };
      bounds.push(...getWindowBounds(node.first, firstHalf));
      bounds.push(...getWindowBounds(node.second, secondHalf));
    }
  
    return bounds;
  };
  
  /**
   * Determines if two windows are adjacent in a specific direction.
   * Uses a small tolerance value to account for floating-point calculations.
   * 
   * @param {Object} window1 - First window with bounds
   * @param {Object} window2 - Second window with bounds
   * @param {string} direction - Direction to check ('left', 'right', 'up', 'down')
   * @returns {boolean} Whether the windows are adjacent
   */
  export const areWindowsAdjacent = (window1, window2, direction) => {
    const tolerance = 0.01; // 1% tolerance for floating point comparisons
    
    switch (direction) {
      case 'left':
        return Math.abs(window1.bounds.left - window2.bounds.right) < tolerance &&
               !(window1.bounds.bottom < window2.bounds.top || window1.bounds.top > window2.bounds.bottom);
      case 'right':
        return Math.abs(window1.bounds.right - window2.bounds.left) < tolerance &&
               !(window1.bounds.bottom < window2.bounds.top || window1.bounds.top > window2.bounds.bottom);
      case 'up':
        return Math.abs(window1.bounds.top - window2.bounds.bottom) < tolerance &&
               !(window1.bounds.right < window2.bounds.left || window1.bounds.left > window2.bounds.right);
      case 'down':
        return Math.abs(window1.bounds.bottom - window2.bounds.top) < tolerance &&
               !(window1.bounds.right < window2.bounds.left || window1.bounds.left > window2.bounds.right);
      default:
        return false;
    }
  };
  
  /**
   * Finds the next window in a specified direction from the active window.
   * 
   * @param {Node} rootNode - The root node of the window tree
   * @param {string} activeNodeId - ID of the currently active window
   * @param {string} direction - Direction to look for the next window
   * @returns {string|null} ID of the next window, or null if none found
   */
  export const findNextWindow = (rootNode, activeNodeId, direction) => {
    const allWindows = getWindowBounds(rootNode);
    const activeWindow = allWindows.find(w => w.id === activeNodeId);
    if (!activeWindow) return null;
  
    const adjacentWindows = allWindows.filter(w => 
      w.id !== activeNodeId && areWindowsAdjacent(activeWindow, w, direction)
    );
  
    if (adjacentWindows.length === 0) return null;
  
    // Sort adjacent windows based on position and direction
    let nextWindow;
    switch (direction) {
      case 'left':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerX !== b.bounds.centerX
            ? b.bounds.centerX - a.bounds.centerX
            : a.bounds.centerY - b.bounds.centerY
        )[0];
        break;
      case 'right':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerX !== b.bounds.centerX
            ? a.bounds.centerX - b.bounds.centerX
            : a.bounds.centerY - b.bounds.centerY
        )[0];
        break;
      case 'up':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerY !== b.bounds.centerY
            ? b.bounds.centerY - a.bounds.centerY
            : a.bounds.centerX - b.bounds.centerX
        )[0];
        break;
      case 'down':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerY !== b.bounds.centerY
            ? a.bounds.centerY - b.bounds.centerY
            : a.bounds.centerX - b.bounds.centerX
        )[0];
        break;
    }
  
    return nextWindow?.id || null;
  };