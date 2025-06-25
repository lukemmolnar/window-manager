/**
 * Movement Range Calculation
 * Uses flood-fill algorithm to determine valid movement tiles within range
 */

/**
 * Check if a tile is passable for movement calculation
 */
function isPassableForMovement(x, y, mapData) {
  if (!mapData.layers) return true;

  // Check all visible layers for obstacles
  for (const layer of mapData.layers) {
    if (!layer.visible) continue;

    const cell = layer.cells.find(c => c.x === x && c.y === y);
    if (cell) {
      // Walls block movement, doors and other types allow passage
      if (cell.type === 'wall') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get valid neighbors within map boundaries
 */
function getValidNeighbors(x, y, mapData) {
  const neighbors = [];
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];

  for (const { dx, dy } of directions) {
    const newX = x + dx;
    const newY = y + dy;

    // Check bounds
    if (newX >= 0 && newX < mapData.width && newY >= 0 && newY < mapData.height) {
      neighbors.push({ x: newX, y: newY });
    }
  }

  return neighbors;
}

/**
 * Calculate movement range using flood-fill algorithm
 * @param {Object} startPos - Starting position {x, y}
 * @param {number} maxRange - Maximum movement range in tiles
 * @param {Object} mapData - Map data with layers and obstacles
 * @param {Array} playerPositions - Other player positions to avoid
 * @param {number} currentUserId - Current user ID to exclude from blocking
 * @returns {Set} Set of coordinate strings "x,y" representing valid movement tiles
 */
export function calculateMovementRange(startPos, maxRange, mapData, playerPositions = [], currentUserId = null) {
  const visited = new Set();
  const validTiles = new Set();
  const queue = [{ ...startPos, distance: 0 }];
  
  // Create set of blocked positions (other players)
  const blockedPositions = new Set();
  playerPositions.forEach(player => {
    // Don't block current user's position
    if (player.user_id !== currentUserId) {
      blockedPositions.add(`${player.x},${player.y}`);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = `${current.x},${current.y}`;

    // Skip if already visited
    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);

    // Add to valid tiles if within range (exclude starting position)
    if (current.distance > 0 && current.distance <= maxRange) {
      validTiles.add(currentKey);
    }

    // Stop expanding if we've reached max range
    if (current.distance >= maxRange) {
      continue;
    }

    // Get neighbors and add passable ones to queue
    const neighbors = getValidNeighbors(current.x, current.y, mapData);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if already visited
      if (visited.has(neighborKey)) {
        continue;
      }

      // Skip if blocked by another player
      if (blockedPositions.has(neighborKey)) {
        continue;
      }

      // Skip if not passable
      if (!isPassableForMovement(neighbor.x, neighbor.y, mapData)) {
        continue;
      }

      // Add to queue with incremented distance
      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        distance: current.distance + 1
      });
    }
  }

  return validTiles;
}

/**
 * Check if a position is within movement range
 * @param {Object} pos - Position to check {x, y}
 * @param {Set} movementRange - Set of valid movement positions
 * @returns {boolean} True if position is valid for movement
 */
export function isPositionInRange(pos, movementRange) {
  return movementRange.has(`${pos.x},${pos.y}`);
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
 * Get movement cost between two adjacent tiles
 * Can be extended later for different terrain types
 */
export function getMovementCost(from, to, mapData) {
  // Basic implementation - all moves cost 1
  // Can be extended for different terrain types in the future
  return 1;
}

/**
 * Calculate the shortest distance between two points using the movement range
 * This is useful for UI feedback showing how far a destination is
 */
export function getDistanceToPosition(startPos, targetPos, mapData, playerPositions = [], currentUserId = null) {
  // Simple BFS to find shortest path distance
  const visited = new Set();
  const queue = [{ ...startPos, distance: 0 }];
  const targetKey = `${targetPos.x},${targetPos.y}`;
  
  // Create set of blocked positions (other players)
  const blockedPositions = new Set();
  playerPositions.forEach(player => {
    if (player.user_id !== currentUserId) {
      blockedPositions.add(`${player.x},${player.y}`);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = `${current.x},${current.y}`;

    if (currentKey === targetKey) {
      return current.distance;
    }

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);

    const neighbors = getValidNeighbors(current.x, current.y, mapData);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      if (visited.has(neighborKey)) {
        continue;
      }

      // Allow movement to target even if blocked by player
      if (blockedPositions.has(neighborKey) && neighborKey !== targetKey) {
        continue;
      }

      if (!isPassableForMovement(neighbor.x, neighbor.y, mapData) && neighborKey !== targetKey) {
        continue;
      }

      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        distance: current.distance + 1
      });
    }
  }

  return -1; // No path found
}
