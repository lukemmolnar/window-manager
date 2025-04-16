import TextNode from './TextNode';

/**
 * Node type registry
 * Export all node types from this file to easily import them elsewhere
 */

const nodeTypes = {
  // Add all node types here
  text: TextNode,
  // Additional node types can be added here in the future
};

export default nodeTypes;
