/**
 * Utility functions for the canvas editor
 */

/**
 * Generate a unique ID for a node or edge
 * @param {string} prefix - Prefix for the ID (e.g., 'node' or 'edge')
 * @returns {string} Unique ID
 */
export const generateId = (prefix = 'node') => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Calculate the distance between two points
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {number} Distance
 */
export const distance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
};

/**
 * Check if a point is inside a node
 * @param {Object} point - Point to check {x, y}
 * @param {Object} node - Node {x, y, width, height}
 * @returns {boolean} True if point is inside node
 */
export const isPointInNode = (point, node) => {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
};

/**
 * Get connection points for edges based on the fromSide and toSide
 * @param {Object} fromNode - Source node {x, y, width, height}
 * @param {Object} toNode - Target node {x, y, width, height}
 * @param {string} fromSide - Side of source node to connect from ('top', 'right', 'bottom', 'left')
 * @param {string} toSide - Side of target node to connect to ('top', 'right', 'bottom', 'left')
 * @returns {Object} Connection points {source: {x, y}, target: {x, y}}
 */
export const getConnectionPoints = (fromNode, toNode, fromSide = 'right', toSide = 'left') => {
  const source = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  // Source node connection point
  switch (fromSide) {
    case 'top':
      source.x = fromNode.x + fromNode.width / 2;
      source.y = fromNode.y;
      break;
    case 'right':
      source.x = fromNode.x + fromNode.width;
      source.y = fromNode.y + fromNode.height / 2;
      break;
    case 'bottom':
      source.x = fromNode.x + fromNode.width / 2;
      source.y = fromNode.y + fromNode.height;
      break;
    case 'left':
      source.x = fromNode.x;
      source.y = fromNode.y + fromNode.height / 2;
      break;
    default:
      source.x = fromNode.x + fromNode.width;
      source.y = fromNode.y + fromNode.height / 2;
  }

  // Target node connection point
  switch (toSide) {
    case 'top':
      target.x = toNode.x + toNode.width / 2;
      target.y = toNode.y;
      break;
    case 'right':
      target.x = toNode.x + toNode.width;
      target.y = toNode.y + toNode.height / 2;
      break;
    case 'bottom':
      target.x = toNode.x + toNode.width / 2;
      target.y = toNode.y + toNode.height;
      break;
    case 'left':
      target.x = toNode.x;
      target.y = toNode.y + toNode.height / 2;
      break;
    default:
      target.x = toNode.x;
      target.y = toNode.y + toNode.height / 2;
  }

  return { source, target };
};

/**
 * Calculate the best connection sides for two nodes
 * @param {Object} fromNode - Source node {x, y, width, height}
 * @param {Object} toNode - Target node {x, y, width, height}
 * @returns {Object} Best sides {fromSide, toSide}
 */
export const calculateBestConnectionSides = (fromNode, toNode) => {
  // Calculate center points
  const fromCenter = {
    x: fromNode.x + fromNode.width / 2,
    y: fromNode.y + fromNode.height / 2
  };
  const toCenter = {
    x: toNode.x + toNode.width / 2,
    y: toNode.y + toNode.height / 2
  };

  // Calculate angle between centers
  const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
  
  // Convert angle to degrees
  const degrees = (angle * 180) / Math.PI;
  
  // Determine from side based on angle
  let fromSide;
  if (degrees >= -45 && degrees < 45) {
    fromSide = 'right';
  } else if (degrees >= 45 && degrees < 135) {
    fromSide = 'bottom';
  } else if (degrees >= 135 || degrees < -135) {
    fromSide = 'left';
  } else {
    fromSide = 'top';
  }
  
  // Calculate opposite side for target
  let toSide;
  switch (fromSide) {
    case 'right': toSide = 'left'; break;
    case 'bottom': toSide = 'top'; break;
    case 'left': toSide = 'right'; break;
    case 'top': toSide = 'bottom'; break;
    default: toSide = 'left';
  }
  
  return { fromSide, toSide };
};

/**
 * Draw an arrow at the end of a line
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X coordinate of arrow tip
 * @param {number} y - Y coordinate of arrow tip
 * @param {number} angle - Angle of the line in radians
 * @param {number} size - Size of the arrow
 */
export const drawArrow = (ctx, x, y, angle, size = 10) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/**
 * Draw a connection line between two points with optional arrow
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} source - Source point {x, y}
 * @param {Object} target - Target point {x, y}
 * @param {string} color - Line color
 * @param {boolean} showSourceArrow - Whether to show an arrow at the source
 * @param {boolean} showTargetArrow - Whether to show an arrow at the target
 */
export const drawConnection = (ctx, source, target, color = '#14b8a6', showSourceArrow = false, showTargetArrow = true) => {
  const angle = Math.atan2(target.y - source.y, target.x - source.x);
  
  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  
  // Draw arrows
  ctx.fillStyle = color;
  if (showSourceArrow) {
    drawArrow(ctx, source.x, source.y, angle + Math.PI);
  }
  if (showTargetArrow) {
    drawArrow(ctx, target.x, target.y, angle);
  }
};

/**
 * Convert a canvas color code to an actual color
 * @param {string} colorCode - Color code (e.g., '1', '2', '#FF0000')
 * @returns {string} CSS color value
 */
export const getCanvasColor = (colorCode) => {
  // Map of preset colors
  const colorMap = {
    '1': '#ef4444', // red
    '2': '#f97316', // orange
    '3': '#eab308', // yellow
    '4': '#22c55e', // green
    '5': '#06b6d4', // cyan
    '6': '#a855f7'  // purple
  };
  
  // If colorCode is a preset, return the mapped color
  if (colorMap[colorCode]) {
    return colorMap[colorCode];
  }
  
  // Otherwise, return the color code as is (assuming it's a valid CSS color)
  return colorCode || '#14b8a6'; // Default to teal if no color provided
};

/**
 * Create a new empty canvas with the JSONCanvas format
 * @returns {Object} Empty canvas data
 */
export const createEmptyCanvas = () => {
  return {
    nodes: [],
    edges: []
  };
};

/**
 * Create a new text node with default properties
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Node text content
 * @returns {Object} New text node
 */
export const createTextNode = (x, y, text = 'New note') => {
  return {
    id: generateId('node'),
    type: 'text',
    x,
    y,
    width: 200,
    height: 100,
    text
  };
};

/**
 * Create a new edge connecting two nodes
 * @param {string} fromNode - ID of source node
 * @param {string} toNode - ID of target node
 * @param {string} fromSide - Side of source node ('top', 'right', 'bottom', 'left')
 * @param {string} toSide - Side of target node ('top', 'right', 'bottom', 'left')
 * @returns {Object} New edge
 */
export const createEdge = (fromNode, toNode, fromSide = 'right', toSide = 'left') => {
  return {
    id: generateId('edge'),
    fromNode,
    toNode,
    fromSide,
    toSide,
    fromEnd: 'none',
    toEnd: 'arrow'
  };
};
