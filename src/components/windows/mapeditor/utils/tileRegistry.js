/**
 * Tile registry and helper functions for managing sprite sheet tiles
 */

// Tile dimensions and sprite sheet configuration
export const TILE_SIZE = 48; // Size of each tile in pixels
export const TILESET_COLS = 16; // Number of columns in the sprite sheet (adjust based on actual width)

// Path to the floor tileset
export const FLOOR_TILESET_PATH = '/assets/sheets/floors/uf_terrain_sheet.png';

// Named sections for better organization
export const TILE_SECTIONS = {
  BLUE_FLOORS: { startIndex: 0, count: 5, name: "Blue Stone Floors" },
  GRAY_FLOORS: { startIndex: 16, count: 5, name: "Gray Stone Floors" },
  DARK_FLOORS: { startIndex: 32, count: 5, name: "Dark Stone Floors" },
  DIRT: { startIndex: 48, count: 2, name: "Dirt" },
  GRASS: { startIndex: 64, count: 2, name: "Grass" },
  SAND: { startIndex: 80, count: 2, name: "Sand" },
  STONE_PATTERN: { startIndex: 96, count: 3, name: "Stone Pattern" },
  CHECKERED: { startIndex: 112, count: 3, name: "Checkered" },
  // Add more sections as needed
};

/**
 * Calculates pixel coordinates in the sprite sheet for a given tile index
 * @param {number} tileIndex - The index of the tile
 * @returns {Object} Object with source coordinates for the tile
 */
export const getTileCoordinates = (tileIndex) => {
  const col = tileIndex % TILESET_COLS;
  const row = Math.floor(tileIndex / TILESET_COLS);
  
  return {
    sourceX: col * TILE_SIZE,
    sourceY: row * TILE_SIZE,
    sourceWidth: TILE_SIZE,
    sourceHeight: TILE_SIZE,
    // Include calculated positions for easier debugging
    col, row
  };
};

/**
 * Gets a descriptive name for a tile based on its index
 * @param {number} tileIndex - The index of the tile
 * @returns {string} A human-readable name for the tile
 */
export const getTileName = (tileIndex) => {
  // Find which section this tile belongs to
  for (const [sectionKey, section] of Object.entries(TILE_SECTIONS)) {
    if (tileIndex >= section.startIndex && tileIndex < section.startIndex + section.count) {
      const tileNumber = tileIndex - section.startIndex + 1;
      return `${section.name} ${tileNumber}`;
    }
  }
  
  // Fallback if not in a named section
  return `Tile ${tileIndex}`;
};
