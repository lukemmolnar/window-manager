import { Node } from '../models/Node';

/**
 * Splits a window by ID, ensuring only the target window is affected
 * @param {Node} node - Current node in the tree
 * @param {string} targetId - ID of the window to split
 * @param {string} direction - Split direction ('vertical' or 'horizontal')
 * @param {Node} newWindow - New window to insert
 * @returns {Node} Updated tree structure
 */
export const findFirstWindowId = (node) => {
  if (!node) return null;
  if (node.type === 'window') return node.id;
  return findFirstWindowId(node.first) || findFirstWindowId(node.second);
};

/**
 * Creates a new split by ID, inserting a new window at the specified location
 */
export const splitNodeById = (node, targetId, direction, newWindow) => {
    if (!node) return null;
  
    // If this is the node we want to split
    if (node.id === targetId && node.type === 'window') {
      // Create a new split with the current window and new window
      return Node.createSplit(direction, node, newWindow);
    }
  
    // If this is a split node, recursively check its children
    if (node.type === 'split') {
      // Check if target is in first child
      if (findNodeById(node.first, targetId)) {
        return {
          ...node,
          first: splitNodeById(node.first, targetId, direction, newWindow)
        };
      }
      
      // Check if target is in second child
      if (findNodeById(node.second, targetId)) {
        return {
          ...node,
          second: splitNodeById(node.second, targetId, direction, newWindow)
        };
      }
    }
  
    // If we haven't found the target node, return the original node unchanged
    return node;
  };

export const removeNodeById = (node, targetId) => {
  if (!node) return null;

  if (node.type === 'split') {
    // Only remove if the child is a window node with matching ID
    if (node.first.type === 'window' && node.first.id === targetId) {
      return node.second;
    }
    if (node.second.type === 'window' && node.second.id === targetId) {
      return node.first;
    }

    const firstResult = removeNodeById(node.first, targetId);
    if (firstResult !== node.first) {
      node.first = firstResult;
      return node;
    }

    const secondResult = removeNodeById(node.second, targetId);
    if (secondResult !== node.second) {
      node.second = secondResult;
      return node;
    }
  }

  return node;
};

export const findNodeById = (node, targetId) => {
  if (!node) return null;
  
  if (node.id === targetId && node.type === 'window') return node;
  
  if (node.type === 'split') {
    const firstResult = findNodeById(node.first, targetId);
    if (firstResult) return firstResult;
    
    const secondResult = findNodeById(node.second, targetId);
    if (secondResult) return secondResult;
  }
  
  return null;
};

export const findAllWindowIds = (node) => {
  if (!node) return [];
  if (node.type === 'window') return [node.id];
  return [...findAllWindowIds(node.first), ...findAllWindowIds(node.second)];
};

export const updateSplitRatio = (node, splitId, newRatio) => {
  if (!node) return;

  if (node.type === 'split' && node.id === splitId) {
    node.splitRatio = Math.max(0.2, Math.min(0.8, newRatio));
    return;
  }

  if (node.type === 'split') {
    updateSplitRatio(node.first, splitId, newRatio);
    updateSplitRatio(node.second, splitId, newRatio);
  }
};

/**
 * Finds the sibling window ID of a given window ID
 * Used to determine which window should be active after closing a window
 * @param {Node} node - Current node in the tree
 * @param {string} targetId - ID of the window to find the sibling of
 * @returns {string|null} ID of the sibling window, or null if not found
 */
export const findSiblingWindowId = (node, targetId) => {
  if (!node) return null;
  
  if (node.type === 'split') {
    // Check if the target is a direct child of this split
    if (node.first.type === 'window' && node.first.id === targetId) {
      // Return the ID of the first window found in the second branch
      return node.second.type === 'window' 
        ? node.second.id 
        : findFirstWindowId(node.second);
    }
    if (node.second.type === 'window' && node.second.id === targetId) {
      // Return the ID of the first window found in the first branch
      return node.first.type === 'window' 
        ? node.first.id 
        : findFirstWindowId(node.first);
    }
    
    // Otherwise, recursively check both branches
    const firstResult = findSiblingWindowId(node.first, targetId);
    if (firstResult) return firstResult;
    
    return findSiblingWindowId(node.second, targetId);
  }
  
  return null;
};
