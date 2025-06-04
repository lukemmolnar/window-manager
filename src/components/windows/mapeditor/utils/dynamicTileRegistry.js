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
let allTilesets = []; // All available tilesets (for rendering)
let selectedTilesets = []; // User-selected tilesets (for palette)
let sections = {
  floor: {},
  wall: {},
  shadow: {},
  door: {},
  object: {}
};
let selectedSections = { // Only sections from selected tilesets (for palette)
  floor: {},
  wall: {},
  shadow: {},
  door: {},
  object: {}
};
let tilesetImages = {}; // All tileset images (for rendering)
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
 * Initialize the tile registry - loads ALL available tilesets for rendering,
 * and tracks which ones are selected for the palette
 * @returns {Promise<boolean>} True if initialization succeeded
 */
export const initializeTileRegistry = async () => {
  if (initialized) return true;
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found, initializing with empty state');
      selectedTilesets = [];
      allTilesets = [];
      initialized = true;
      return true;
    }
    
    // Fetch ALL available tilesets (for rendering)
    console.log('Fetching all available tilesets for rendering...');
    const allTilesetsResponse = await axios.get(
      `${API_CONFIG.BASE_URL}/tilesets`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Fetch user-selected tilesets (for palette)
    console.log('Fetching user-selected tilesets for palette...');
    const selectedResponse = await axios.get(
      `${API_CONFIG.BASE_URL}/tilesets/user/selected`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Store all tilesets and selected tilesets
    allTilesets = Array.isArray(allTilesetsResponse.data) ? allTilesetsResponse.data : [];
    selectedTilesets = Array.isArray(selectedResponse.data) ? selectedResponse.data : [];
    
    console.log(`Found ${allTilesets.length} total tilesets, ${selectedTilesets.length} selected`);
    
    // Load images for ALL available tilesets (so any tile can be rendered)
    for (const tileset of allTilesets) {
      if (!tileset.sections || !Array.isArray(tileset.sections)) {
        console.warn(`Tileset ${tileset.id} has no sections`);
        continue;
      }
      
      // Preload tileset image using the API endpoint
      const tilesetImage = new Image();
      tilesetImage.src = `${API_CONFIG.BASE_URL}/tilesets/${tileset.id}/image`;
      
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
      
      // Organize ALL sections by category (for tile name lookups and rendering)
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
    
    // Organize SELECTED sections by category (for palette display) ah
    for (const tileset of selectedTilesets) {
      if (!tileset.sections || !Array.isArray(tileset.sections)) {
        continue;
      }
      
      for (const section of tileset.sections) {
        if (!selectedSections[section.category]) {
          selectedSections[section.category] = {};
        }
        
        const sectionKey = `${tileset.id}_${section.id}`;
        selectedSections[section.category][sectionKey] = {
          tilesetId: tileset.id,
          sectionId: section.id,
          startIndex: section.start_index,
          count: section.count,
          name: section.section_name,
          tilesetName: tileset.name
        };
      }
    }
    
    console.log('Tile registry initialized - all tilesets loaded for rendering, selected tilesets tracked for palette');
    initialized = true;
    
    return true;
  } catch (error) {
    console.error('Failed to initialize tile registry:', error);
    // Initialize with empty state instead of falling back to defaults
    selectedTilesets = [];
    allTilesets = [];
    initialized = true;
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
  // Use selectedTilesets for fallback (palette compatibility)
  for (const tileset of selectedTilesets) {
    if (tileset.sections && tileset.sections.some(s => s.category === category)) {
      if (tilesetImages[tileset.id]) {
        return tilesetImages[tileset.id];
      }
    }
  }
  
  // Return null if no user-selected tileset is available for this category
  return null;
};

/**
 * Get sections for a specific category (for palette display - only selected tilesets)
 * @param {string} category - The tile category (floor, wall, shadow, etc.)
 * @returns {Object} - Object of sections for the category
 */
export const getSectionsForCategory = (category) => {
  return selectedSections[category] || {};
};

/**
 * Get all sections from selected tilesets (for palette display)
 * @returns {Object} - Sections organized by category and tileset
 */
export const getAllSections = () => {
  return selectedSections;
};

/**
 * Get all sections from ALL tilesets (for rendering and tile name lookups)
 * @returns {Object} - All sections organized by category and tileset
 */
export const getAllAvailableSections = () => {
  return sections;
};

/**
 * Get a tileset image by ID (for rendering any tile from any tileset)
 * @param {string} tilesetId - The tileset ID
 * @returns {HTMLImageElement|null} - The tileset image or null if not found
 */
export const getTilesetImageById = (tilesetId) => {
  return tilesetImages[tilesetId] || null;
};

/**
 * Get all available tilesets (for rendering)
 * @returns {Array} - Array of all available tilesets
 */
export const getAllTilesets = () => {
  return allTilesets;
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
  // Use ALL available sections (not just selected) for tile name lookups
  // This ensures tiles from deselected tilesets still get proper names
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
  allTilesets = [];
  selectedTilesets = [];
  sections = {
    floor: {},
    wall: {},
    shadow: {},
    door: {},
    object: {}
  };
  selectedSections = {
    floor: {},
    wall: {},
    shadow: {},
    door: {},
    object: {}
  };
  tilesetImages = {};
  
  // Re-initialize
  return await initializeTileRegistry();
};

export default {
  initializeTileRegistry,
  getTilesetImageForCategory,
  getTilesetImageById,
  getSectionsForCategory,
  getAllSections,
  getAllAvailableSections,
  getAllTilesets,
  getCategories,
  getTileCoordinates,
  getTileName,
  getSelectedTilesets,
  isInitialized,
  refreshTileRegistry,
  TILE_SIZE,
  DEFAULT_TILESET_COLS
};
