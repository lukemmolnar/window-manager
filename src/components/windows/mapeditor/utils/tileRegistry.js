/**
 * Tile registry and helper functions for managing sprite sheet tiles
 */

// Import the tilesets directly
import terrainTilesetImage from '../../../../assets/sheets/floors/uf_terrain_sheet.png';
import wallTilesetImage from '/sheets/walls/uf_terrain_sheet_walls.png'; // Using absolute path from public folder
import shadowTilesetImage from '/sheets/shadows/uf_terrain_shadows.png'

// Tile dimensions and sprite sheet configuration
export const TILE_SIZE = 48; // Size of each tile in pixels
export const TILESET_COLS = 16; // Number of columns in the sprite sheet (adjust based on actual width)

// Path to the tilesets (using imported images)
export const FLOOR_TILESET_PATH = terrainTilesetImage;
export const WALL_TILESET_PATH = wallTilesetImage;
export const SHADOW_TILESET_PATH = shadowTilesetImage;

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

// Wall tile sections
export const WALL_TILE_SECTIONS = {
  STONE_WALLS: { startIndex: 0, count: 8, name: "Stone Walls" },
  BRICK_WALLS: { startIndex: 16, count: 8, name: "Brick Walls" },
  WOOD_WALLS: { startIndex: 32, count: 4, name: "Wooden Walls" },
  // Add more wall sections as needed
};

export const SHADOW_TILE_SECTIONS = {
  SHADOWS: { startIndex: 0, count: 4, name: "Shadows" }
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
 * @param {string} tileType - The type of tile ('floor', 'wall', etc.)
 * @returns {string} A human-readable name for the tile
 */
export const getTileName = (tileIndex, tileType = 'floor') => {
  // Find which section this tile belongs to
  if (tileType === 'floor') {
    for (const [sectionKey, section] of Object.entries(TILE_SECTIONS)) {
      if (tileIndex >= section.startIndex && tileIndex < section.startIndex + section.count) {
        const tileNumber = tileIndex - section.startIndex + 1;
        return `${section.name} ${tileNumber}`;
      }
    }
    return `Floor Tile ${tileIndex}`;
  } else if (tileType === 'wall') {
    for (const [sectionKey, section] of Object.entries(WALL_TILE_SECTIONS)) {
      if (tileIndex >= section.startIndex && tileIndex < section.startIndex + section.count) {
        const tileNumber = tileIndex - section.startIndex + 1;
        return `${section.name} ${tileNumber}`;
      }
    }
    return `Wall Tile ${tileIndex}`;
  } else if (tileType === 'shadow') {
    for (const [sectionKey, section] of Object.entries(SHADOW_TILE_SECTIONS)) {
      if (tileIndex >= section.startIndex && tileIndex < section.startIndex + section.count) {
        const tileNumber = tileIndex - section.startIndex + 1;
        return `${section.name} ${tileNumber}`;
      }
    }
    return `Shadow Tile ${tileIndex}`;
  } else if (tileType === 'door') {
    return `Door`;
  }
  
  // Fallback if not in a named section or unknown type
  return `Tile ${tileIndex}`;
};
