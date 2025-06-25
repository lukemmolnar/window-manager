/**
 * Movement utilities and constants for tactical movement system
 */

// Movement mode constants
export const MOVEMENT_MODES = {
  FREEMOVE: 'freemove',
  TACTICAL: 'tactical'
};

// Default movement configuration
export const MOVEMENT_CONFIG = {
  DEFAULT_RANGE: 6,
  MIN_RANGE: 1,
  MAX_RANGE: 20,
  DEFAULT_MODE: MOVEMENT_MODES.TACTICAL
};

/**
 * Validate movement mode
 */
export function isValidMovementMode(mode) {
  return Object.values(MOVEMENT_MODES).includes(mode);
}

/**
 * Get movement mode display name
 */
export function getMovementModeDisplayName(mode) {
  switch (mode) {
    case MOVEMENT_MODES.FREEMOVE:
      return 'Free Move';
    case MOVEMENT_MODES.TACTICAL:
      return 'Tactical';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a player can be selected for movement
 * @param {Object} player - Player object
 * @param {number} currentUserId - Current user ID
 * @param {boolean} isDM - Whether current user is DM
 * @returns {boolean} True if player can be selected
 */
export function canSelectPlayer(player, currentUserId, isDM) {
  // DMs can select any player
  if (isDM) return true;
  
  // Players can only select themselves
  return player.user_id === currentUserId;
}

/**
 * Check if a position is occupied by another player
 * @param {Object} pos - Position {x, y}
 * @param {Array} playerPositions - Array of player positions
 * @param {number} excludeUserId - User ID to exclude from check
 * @returns {boolean} True if position is occupied
 */
export function isPositionOccupied(pos, playerPositions, excludeUserId = null) {
  return playerPositions.some(player => 
    player.x === pos.x && 
    player.y === pos.y && 
    player.user_id !== excludeUserId
  );
}

/**
 * Get player at specific position
 * @param {Object} pos - Position {x, y}
 * @param {Array} playerPositions - Array of player positions
 * @returns {Object|null} Player object or null if no player at position
 */
export function getPlayerAtPosition(pos, playerPositions) {
  return playerPositions.find(player => 
    player.x === pos.x && player.y === pos.y
  ) || null;
}

/**
 * Calculate grid coordinates from screen coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} gridSize - Size of grid cells
 * @param {Object} viewportOffset - Viewport offset {x, y}
 * @returns {Object} Grid coordinates {x, y}
 */
export function screenToGrid(screenX, screenY, gridSize, viewportOffset) {
  const gridX = Math.floor((screenX - viewportOffset.x) / gridSize);
  const gridY = Math.floor((screenY - viewportOffset.y) / gridSize);
  return { x: gridX, y: gridY };
}

/**
 * Calculate screen coordinates from grid coordinates
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @param {number} gridSize - Size of grid cells
 * @param {Object} viewportOffset - Viewport offset {x, y}
 * @returns {Object} Screen coordinates {x, y}
 */
export function gridToScreen(gridX, gridY, gridSize, viewportOffset) {
  const screenX = gridX * gridSize + viewportOffset.x;
  const screenY = gridY * gridSize + viewportOffset.y;
  return { x: screenX, y: screenY };
}

/**
 * Generate path preview points for drawing arrows
 * @param {Array} path - Array of path coordinates
 * @param {number} gridSize - Size of grid cells
 * @param {Object} viewportOffset - Viewport offset {x, y}
 * @returns {Array} Array of screen coordinates for path visualization
 */
export function generatePathPreview(path, gridSize, viewportOffset) {
  if (path.length === 0) return [];

  return path.map(coord => {
    const screenCoord = gridToScreen(coord.x, coord.y, gridSize, viewportOffset);
    return {
      x: screenCoord.x + gridSize / 2, // Center of tile
      y: screenCoord.y + gridSize / 2  // Center of tile
    };
  });
}

/**
 * Draw arrow between two points on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @param {string} color - Arrow color
 * @param {number} lineWidth - Line width
 */
export function drawArrow(ctx, start, end, color = '#14b8a6', lineWidth = 2) {
  const arrowLength = 10;
  const arrowWidth = 6;
  
  // Calculate angle
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  
  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - arrowLength * Math.cos(angle - Math.PI / 6),
    end.y - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - arrowLength * Math.cos(angle + Math.PI / 6),
    end.y - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

/**
 * Draw path with arrows on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} pathPoints - Array of screen coordinates
 * @param {string} color - Path color
 * @param {number} lineWidth - Line width
 */
export function drawPathWithArrows(ctx, pathPoints, color = '#14b8a6', lineWidth = 3) {
  if (pathPoints.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  
  // Draw path lines
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  ctx.stroke();
  
  // Draw arrows at key points
  for (let i = 0; i < pathPoints.length - 1; i++) {
    // Draw arrow every few segments to avoid clutter
    if (i === pathPoints.length - 2 || i % 3 === 0) {
      drawArrow(ctx, pathPoints[i], pathPoints[i + 1], color, lineWidth);
    }
  }
}

/**
 * Validate movement range value
 * @param {number} range - Movement range to validate
 * @returns {number} Validated range within bounds
 */
export function validateMovementRange(range) {
  const numRange = Number(range);
  if (isNaN(numRange)) return MOVEMENT_CONFIG.DEFAULT_RANGE;
  
  return Math.max(
    MOVEMENT_CONFIG.MIN_RANGE,
    Math.min(MOVEMENT_CONFIG.MAX_RANGE, numRange)
  );
}

/**
 * Convert movement range Set to array of coordinate objects
 * @param {Set} movementRange - Set of coordinate strings
 * @returns {Array} Array of {x, y} objects
 */
export function movementRangeToArray(movementRange) {
  return Array.from(movementRange).map(coordStr => {
    const [x, y] = coordStr.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Get default movement range for a player (can be extended for different character classes)
 * @param {Object} player - Player object
 * @returns {number} Movement range in tiles
 */
export function getPlayerMovementRange(player) {
  // Basic implementation - can be extended for character classes, spells, etc.
  return MOVEMENT_CONFIG.DEFAULT_RANGE;
}
