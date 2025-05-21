/**
 * Dynamic tile registry and helper functions for managing tileset images
 * This version supports loading tilesets from the server
 */
import axios from 'axios';
import API_CONFIG from '../../../../config/api';

// Tile dimensions and sprite sheet configuration
export const TILE_SIZE = 48; // Size of each tile in pixels
export const DEFAULT_TILESET_COLS = 16; // Default number of columns in the sprite sheet

// Import default tilesets for fallback
import defaultFloorTilesetImage from '../../../../assets/sheets/floors/uf_terrain_sheet.png';
import defaultWallTilesetImage from '/sheets/walls/uf_terrain_sheet_walls.png';
import defaultShadowTilesetImage from '/sheets/shadows/uf_terrain_shadows.png';

// Dynamic tileset registry
let tilesets = [];
let sections = {
  floor: {},
  wall: {},
  shadow: {},
  door: {},
  object: {}
};
let tilesetImages = {};
let selectedTilesets = [];
let initialized = false;

// Default sections (same as original tileRegistry)
export const DEFAULT_FLOOR_SECTIONS = {
  BLUE_FLOORS: { startIndex: 0, count: 5, name: "Blue Stone Floors" },
  GRAY_FLOORS: { startIndex: 16, count: 5, name: "Gray Stone Floors" },
  DARK_FLOORS: { startIndex: 32, count: 5, name: "Dark Stone Floors" },
  DIRT: { startIndex: 48, count: 2, name: "Dirt" },
  GRASS: { startIndex: 64, count: 2, name: "Grass" },
  SAND: { startIndex: 80, count: 2, name: "Sand" },
  STONE_PATTERN: { startIndex: 96, count: 3, name: "Stone Pattern" },
  CHECKERED: { startIndex: 112, count: 3, name: "Checkered" },
};

export const DEFAULT_WALL_SECTIONS = {
  STONE_WALLS: { startIndex: 0, count: 8, name: "Stone Walls" },
  BRICK_WALLS: { startIndex: 16, count: 8, name: "Brick Walls" },
  WOOD_WALLS: { startIndex: 32, count: 4, name: "Wooden Walls" },
};

export const DEFAULT_SHADOW_SECTIONS = {
  SHADOWS: { startIndex: 0, count: 4, name: "Shadows" }
};

/**
 * Initialize the tile registry with user-selected tilesets
 * @returns {Promise<boolean>} True if initialization succeeded
 */
export const initializeTileRegistry = async () => {
  if (initialized) return true;
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found, using default tilesets');
      initializeWithDefaults();
      return true;
    }
    
    // Fetch user-selected tilesets
    console.log('Fetching user-selected tilesets from server...');
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/tilesets/user/selected`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.log('No selected tilesets found, using defaults');
      initializeWithDefaults();
      return true;
    }
    
    selectedTilesets = response.data;
    tilesets = response.data;
    
    // Process and organize sections by category
    for (const tileset of tilesets) {
      if (!tileset.sections || !Array.isArray(tileset.sections)) {
        console.warn(`Tileset ${tileset.id} has no sections`);
        continue;
      }
      
      // Preload tileset image
      const tilesetImage = new Image();
      tilesetImage.src = `${API_CONFIG.BASE_URL}${tileset.image_path}`;
      
      // Wait for image to load
      await new Promise((resolve) => {
        tilesetImage.onload = resolve;
        tilesetImage.onerror = () => {
          console.error(`Failed to load tileset image for ${tileset.name}`);
          resolve();
        };
      });
      
      // Store the image reference
      tilesetImages[tileset.id] = tilesetImage;
      
      // Organize sections by category
      for (const section of tileset.sections) {
        if (!sections[section.category]) {
          sections[section.category] = {};
        }
        
        const sectionKey = `${tileset.id}_${section.id}`;
        sections[section.category][sectionKey] = {
          tilesetId: tileset.id,
          sectionId: section.id,
          startIndex: section.start_index,
          count: section.count,
          name: section.section_name,
          tilesetName: tileset.name
        };
      }
    }
    
    console.log('Tile registry initialized with user tilesets');
    initialized = true;
    
    // If no tilesets were loaded successfully, fall back to defaults
    if (Object.keys(tilesetImages).length === 0) {
      console.warn('No tileset images were loaded, using defaults');
      initializeWithDefaults();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize tile registry:', error);
    // Fall back to default tilesets
    initializeWithDefaults();
    return false;
  }
};

/**
 * Initialize with default tilesets
 */
const initializeWithDefaults = () => {
  // Create default floor sections
  Object.entries(DEFAULT_FLOOR_SECTIONS).forEach(([key, section]) => {
    sections.floor[key] = {
      tilesetId: 'default_floor',
      sectionId: key,
      startIndex: section.startIndex,
      count: section.count,
      name: section.name,
      tilesetName: 'Default Floor Tileset'
    };
  });
  
  // Create default wall sections
  Object.entries(DEFAULT_WALL_SECTIONS).forEach(([key, section]) => {
    sections.wall[key] = {
      tilesetId: 'default_wall',
      sectionId: key,
      startIndex: section.startIndex,
      count: section.count,
      name: section.name,
      tilesetName: 'Default Wall Tileset'
    };
  });
  
  // Create default shadow sections
  Object.entries(DEFAULT_SHADOW_SECTIONS).forEach(([key, section]) => {
    sections.shadow[key] = {
      tilesetId: 'default_shadow',
      sectionId: key,
      startIndex: section.startIndex,
      count: section.count,
      name: section.name,
      tilesetName: 'Default Shadow Tileset'
    };
  });
  
  // Add default images
  tilesetImages['default_floor'] = defaultFloorTilesetImage;
  tilesetImages['default_wall'] = defaultWallTilesetImage;
  tilesetImages['default_shadow'] = defaultShadowTilesetImage;
  
  initialized = true;
};

/**
 * Get a tileset image for a specific category
 * @param {string} category - The tile category (floor, wall, shadow, etc.)
 * @param {string|null} tilesetId - Optional specific tileset ID
 * @returns {HTMLImageElement|null} - The tileset image or null if not found
 */
export const getTilesetImageForCategory = (category, tilesetId = null) => {
  // If a specific tileset ID is provided and exists, return that
  if (tilesetId && tilesetImages[tilesetId]) {
    return tilesetImages[tilesetId];
  }
  
  // Otherwise, find the first tileset that has sections for this category
  for (const tileset of tilesets) {
    if (tileset.sections && tileset.sections.some(s => s.category === category)) {
      if (tilesetImages[tileset.id]) {
        return tilesetImages[tileset.id];
      }
    }
  }
  
  // Fall back to default images
  if (category === 'floor') return tilesetImages['default_floor'] || defaultFloorTilesetImage;
  if (category === 'wall') return tilesetImages['default_wall'] || defaultWallTilesetImage;
  if (category === 'shadow') return tilesetImages['default_shadow'] || defaultShadowTilesetImage;
  
  // If no appropriate tileset found, return the default floor tileset as a last resort
  return tilesetImages['default_floor'] || defaultFloorTilesetImage;
};

/**
 * Get sections for a specific category
 * @param {string} category - The tile category (floor, wall, shadow, etc.)
 * @returns {Object} - Object of sections for the category
 */
export const getSectionsForCategory = (category) => {
  return sections[category] || {};
};

/**
 * Get all sections from all tilesets
 * @returns {Object} - Sections organized by category and tileset
 */
export const getAllSections = () => {
  return sections;
};

/**
 * Get all available categories
 * @returns {string[]} - Array of category names
 */
export const getCategories = () => {
  return Object.keys(sections).filter(category => 
    Object.keys(sections[category]).length > 0
  );
};

/**
 * Get tile coordinates in the sprite sheet
 * @param {number} tileIndex - The index of the tile
 * @param {number} cols - Number of columns in the sprite sheet
 * @returns {Object} - Object with source coordinates for the tile
 */
export const getTileCoordinates = (tileIndex, cols = DEFAULT_TILESET_COLS) => {
  const col = tileIndex % cols;
  const row = Math.floor(tileIndex / cols);
  
  return {
    sourceX: col * TILE_SIZE,
    sourceY: row * TILE_SIZE,
    sourceWidth: TILE_SIZE,
    sourceHeight: TILE_SIZE,
    col, 
    row
  };
};

/**
 * Gets a descriptive name for a tile based on its index
 * @param {number} tileIndex - The index of the tile
 * @param {string} tileType - The type of tile ('floor', 'wall', etc.)
 * @param {string|null} tilesetId - Optional specific tileset ID
 * @returns {string} A human-readable name for the tile
 */
export const getTileName = (tileIndex, tileType = 'floor', tilesetId = null) => {
  // Find which section this tile belongs to
  const categorySections = sections[tileType] || {};
  
  for (const [sectionKey, section] of Object.entries(categorySections)) {
    // Skip sections from other tilesets if a specific tileset ID is provided
    if (tilesetId && section.tilesetId !== tilesetId) continue;
    
    if (tileIndex >= section.startIndex && tileIndex < section.startIndex + section.count) {
      const tileNumber = tileIndex - section.startIndex + 1;
      return `${section.name} ${tileNumber} (${section.tilesetName})`;
    }
  }
  
  // Fallback if no section matches
  return `${tileType.charAt(0).toUpperCase() + tileType.slice(1)} Tile ${tileIndex}`;
};

/**
 * Get tilesets that have been selected by the user
 * @returns {Array} - Array of selected tilesets
 */
export const getSelectedTilesets = () => {
  return selectedTilesets;
};

/**
 * Check if the registry has been initialized
 * @returns {boolean} - True if initialized
 */
export const isInitialized = () => {
  return initialized;
};

/**
 * Force re-initialization of the tile registry
 * Useful when user selects new tilesets in the marketplace
 */
export const refreshTileRegistry = async () => {
  initialized = false;
  tilesets = [];
  sections = {
    floor: {},
    wall: {},
    shadow: {},
    door: {},
    object: {}
  };
  tilesetImages = {};
  selectedTilesets = [];
  
  // Re-initialize
  return await initializeTileRegistry();
};

export default {
  initializeTileRegistry,
  getTilesetImageForCategory,
  getSectionsForCategory,
  getAllSections,
  getCategories,
  getTileCoordinates,
  getTileName,
  getSelectedTilesets,
  isInitialized,
  refreshTileRegistry,
  TILE_SIZE,
  DEFAULT_TILESET_COLS
};
