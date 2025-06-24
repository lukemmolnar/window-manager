/**
 * Client-side fog of war utility for instant calculations and performance optimization
 * Mirrors the server-side logic in windowmanager-api/models/exploredTiles.js
 */

/**
 * Calculate visible tiles based on player position and view distance
 * This mirrors the exact server logic for consistency
 * @param {number} playerX - Player's X position
 * @param {number} playerY - Player's Y position  
 * @param {number} viewDistance - Player's view distance
 * @returns {Array} Array of visible tile coordinates
 */
export const calculateVisibleTiles = (playerX, playerY, viewDistance) => {
  const visibleTiles = [];
  
  // Calculate smoothed circular visibility - reduces 0.5 to eliminate single-tile edge protrusions
  for (let dx = -viewDistance; dx <= viewDistance; dx++) {
    for (let dy = -viewDistance; dy <= viewDistance; dy++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Include tiles within the smoothed view distance radius
      // Subtracting 0.5 creates a more filled circle without jagged single-tile edges
      if (distance <= viewDistance - 0.5) {
        visibleTiles.push({
          x: playerX + dx,
          y: playerY + dy
        });
      }
    }
  }
  
  return visibleTiles;
};

/**
 * Calculate fog of war data instantly on the client for immediate visual feedback
 * @param {number} playerX - Player's X position
 * @param {number} playerY - Player's Y position
 * @param {number} viewDistance - Player's view distance
 * @param {number} mapWidth - Map width in tiles
 * @param {number} mapHeight - Map height in tiles
 * @param {Set} exploredTilesCache - Client-side cache of explored tiles (Set of "x,y" strings)
 * @returns {Object} Fog of war data with visible, explored, and unexplored tiles
 */
export const calculateFogOfWarPredicted = (playerX, playerY, viewDistance, mapWidth, mapHeight, exploredTilesCache = new Set()) => {
  try {
    // Calculate visible tiles from current position (same as server)
    const allVisibleTiles = calculateVisibleTiles(playerX, playerY, viewDistance);
    
    // Filter visible tiles to only include those within map bounds
    const visibleTiles = allVisibleTiles.filter(tile => 
      tile.x >= 0 && tile.x < mapWidth && tile.y >= 0 && tile.y < mapHeight
    );
    
    // Update explored tiles cache with newly visible tiles
    const newlyExploredTiles = [];
    visibleTiles.forEach(tile => {
      const tileKey = `${tile.x},${tile.y}`;
      if (!exploredTilesCache.has(tileKey)) {
        exploredTilesCache.add(tileKey);
        newlyExploredTiles.push(tile);
      }
    });
    
    // Generate all map tiles to determine unexplored ones
    const unexploredTiles = [];
    for (let x = 0; x < mapWidth; x++) {
      for (let y = 0; y < mapHeight; y++) {
        const tileKey = `${x},${y}`;
        if (!exploredTilesCache.has(tileKey)) {
          unexploredTiles.push({ x, y });
        }
      }
    }
    
    // Convert explored cache to array (excluding currently visible)
    const visibleSet = new Set(visibleTiles.map(tile => `${tile.x},${tile.y}`));
    const exploredButNotVisible = Array.from(exploredTilesCache)
      .filter(coord => !visibleSet.has(coord))
      .map(coord => {
        const [x, y] = coord.split(',').map(Number);
        return { x, y };
      });
    
    return {
      visible: visibleTiles,
      explored: exploredButNotVisible,
      unexplored: unexploredTiles,
      newlyExplored: newlyExploredTiles // For determining if server sync is needed
    };
  } catch (error) {
    console.error('Error calculating predicted fog of war:', error);
    throw error;
  }
};

/**
 * Initialize explored tiles cache from server data
 * @param {Object} serverFogData - Fog data from server containing visible, explored arrays
 * @returns {Set} Set of explored tile coordinates as "x,y" strings
 */
export const initializeExploredTilesCache = (serverFogData) => {
  const exploredCache = new Set();
  
  if (serverFogData?.visible) {
    serverFogData.visible.forEach(tile => {
      exploredCache.add(`${tile.x},${tile.y}`);
    });
  }
  
  if (serverFogData?.explored) {
    serverFogData.explored.forEach(tile => {
      exploredCache.add(`${tile.x},${tile.y}`);
    });
  }
  
  return exploredCache;
};

/**
 * Check if new tiles were actually explored (not just made visible)
 * @param {Array} newlyExploredTiles - Array of newly explored tiles from prediction
 * @returns {boolean} True if new areas were explored and server sync is needed
 */
export const hasNewExplorations = (newlyExploredTiles) => {
  return newlyExploredTiles && newlyExploredTiles.length > 0;
};

/**
 * Create a debounced function for server synchronization
 * @param {Function} syncFunction - Function to call for server sync
 * @param {number} delay - Debounce delay in milliseconds (default 300ms)
 * @returns {Function} Debounced sync function
 */
export const createDebouncedSync = (syncFunction, delay = 300) => {
  let timeoutId = null;
  let lastSyncTime = 0;
  
  const debouncedFunc = (...args) => {
    const now = Date.now();
    
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Don't sync if we just synced recently (prevent duplicate requests)
    if (now - lastSyncTime < delay) {
      return;
    }
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      lastSyncTime = Date.now();
      syncFunction(...args);
      timeoutId = null;
    }, delay);
  };
  
  // Cleanup function for component unmount
  debouncedFunc.cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFunc;
};

/**
 * Performance-optimized fog calculation for movement
 * This is the main function that provides instant feedback with smart server sync
 * @param {Object} params - Parameters object
 * @param {number} params.playerX - Player's X position
 * @param {number} params.playerY - Player's Y position
 * @param {number} params.viewDistance - Player's view distance
 * @param {number} params.mapWidth - Map width in tiles
 * @param {number} params.mapHeight - Map height in tiles
 * @param {Set} params.exploredTilesCache - Client-side cache of explored tiles
 * @param {Function} params.setFogOfWarData - React setState function for fog data
 * @param {Function} params.debouncedServerSync - Debounced server sync function
 * @returns {boolean} True if new explorations occurred and server sync was triggered
 */
export const updateFogOfWarOptimized = ({
  playerX,
  playerY,
  viewDistance,
  mapWidth,
  mapHeight,
  exploredTilesCache,
  setFogOfWarData,
  debouncedServerSync
}) => {
  try {
    // Calculate fog instantly for immediate visual feedback
    const newFogData = calculateFogOfWarPredicted(
      playerX, 
      playerY, 
      viewDistance, 
      mapWidth, 
      mapHeight, 
      exploredTilesCache
    );
    
    // Update fog data immediately for instant response
    setFogOfWarData({
      visible: newFogData.visible,
      explored: newFogData.explored,
      unexplored: newFogData.unexplored
    });
    
    // Check if server sync is needed (only if new areas were explored)
    const needsServerSync = hasNewExplorations(newFogData.newlyExplored);
    
    if (needsServerSync && debouncedServerSync) {
      // Trigger debounced server sync only when new areas are explored
      debouncedServerSync();
      console.log(`[FOG OPTIMIZATION] New explorations detected, triggering server sync`);
    }
    
    return needsServerSync;
  } catch (error) {
    console.error('Error in optimized fog update:', error);
    // Fallback: still update fog but don't crash
    return false;
  }
};

/**
 * Merge server fog data with client cache to handle any discrepancies
 * @param {Object} serverFogData - Fresh fog data from server
 * @param {Set} exploredTilesCache - Current client cache
 * @returns {Set} Updated explored tiles cache
 */
export const mergeServerFogData = (serverFogData, exploredTilesCache) => {
  // Server data is authoritative, so reinitialize cache with server data
  const newCache = initializeExploredTilesCache(serverFogData);
  
  // Log any discrepancies for debugging
  const clientSize = exploredTilesCache.size;
  const serverSize = newCache.size;
  
  if (Math.abs(clientSize - serverSize) > 5) {
    console.log(`[FOG SYNC] Cache size difference detected: client=${clientSize}, server=${serverSize}`);
  }
  
  return newCache;
};
