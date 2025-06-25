/**
 * A* Pathfinding Algorithm for tactical movement
 * Finds the optimal path between two points considering obstacles
 */

class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift()?.element;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * Calculate Manhattan distance between two points
 */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Get neighbors of a cell within map boundaries
 */
function getNeighbors(x, y, mapData) {
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
 * Check if a tile is passable (not a wall)
 */
function isPassable(x, y, mapData) {
  if (!mapData.layers) return true;

  // Check all visible layers for obstacles
  for (const layer of mapData.layers) {
    if (!layer.visible) continue;

    const cell = layer.cells.find(c => c.x === x && c.y === y);
    if (cell) {
      // Walls block movement, other types allow passage
      if (cell.type === 'wall') {
        return false;
      }
    }
  }

  return true;
}

/**
 * A* pathfinding algorithm
 * @param {Object} start - Starting position {x, y}
 * @param {Object} goal - Goal position {x, y}
 * @param {Object} mapData - Map data with layers and obstacles
 * @returns {Array} Array of coordinates representing the path, or empty array if no path found
 */
export function findPath(start, goal, mapData) {
  // If start and goal are the same, return empty path
  if (start.x === goal.x && start.y === goal.y) {
    return [];
  }

  // If goal is not passable, return empty path
  if (!isPassable(goal.x, goal.y, mapData)) {
    return [];
  }

  const openSet = new PriorityQueue();
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));
  openSet.enqueue(start, fScore.get(startKey));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    const currentKey = `${current.x},${current.y}`;

    if (currentKey === goalKey) {
      // Reconstruct path
      const path = [];
      let pathNode = current;
      
      while (cameFrom.has(`${pathNode.x},${pathNode.y}`)) {
        path.unshift(pathNode);
        pathNode = cameFrom.get(`${pathNode.x},${pathNode.y}`);
      }
      
      return path;
    }

    closedSet.add(currentKey);

    const neighbors = getNeighbors(current.x, current.y, mapData);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Skip if not passable (unless it's the goal)
      if (!isPassable(neighbor.x, neighbor.y, mapData) && neighborKey !== goalKey) {
        continue;
      }

      const tentativeGScore = gScore.get(currentKey) + 1;

      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));
        openSet.enqueue(neighbor, fScore.get(neighborKey));
      }
    }
  }

  // No path found
  return [];
}

/**
 * Calculate the total distance of a path
 */
export function getPathDistance(path) {
  return path.length;
}

/**
 * Simplify path by removing unnecessary waypoints for smoother movement
 */
export function simplifyPath(path) {
  if (path.length <= 2) return path;

  const simplified = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    
    // Check if current point is necessary (change in direction)
    const dir1 = { x: current.x - prev.x, y: current.y - prev.y };
    const dir2 = { x: next.x - current.x, y: next.y - current.y };
    
    if (dir1.x !== dir2.x || dir1.y !== dir2.y) {
      simplified.push(current);
    }
  }
  
  simplified.push(path[path.length - 1]);
  return simplified;
}
