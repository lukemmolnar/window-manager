/**
 * Map editor utility functions
 */

/**
 * Creates a new empty map with default settings
 * @param {string} name - Name of the map
 * @param {number} width - Width of the map in cells
 * @param {number} height - Height of the map in cells
 * @param {number} gridSize - Size of each grid cell in pixels
 * @returns {Object} A new map object
 */
export const createEmptyMap = (name = 'New Map', width = 20, height = 15, gridSize = 32) => {
  return {
    version: '1.0',
    name,
    gridSize,
    width,
    height,
    defaultTile: 'floor',
    layers: [
      {
        name: 'terrain',
        visible: true,
        cells: []
      }
    ],
    tokenPositions: [],
    metadata: {
      author: 'user',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  };
};

/**
 * Parses a map file string into a map object
 * @param {string} mapContent - The string content of the map file
 * @returns {Object} The parsed map object
 * @throws {Error} If the map file is invalid
 */
export const parseMapFile = (mapContent) => {
  try {
    const mapData = JSON.parse(mapContent);
    
    // Validate the map structure
    if (!mapData.version || !mapData.layers || !Array.isArray(mapData.layers)) {
      throw new Error('Invalid map file format');
    }
    
    // Ensure all cells have a rotation property
    mapData.layers.forEach(layer => {
      if (layer.cells && Array.isArray(layer.cells)) {
        layer.cells.forEach(cell => {
          // If rotation doesn't exist, add it with default value of 0
          if (cell.rotation === undefined) {
            cell.rotation = 0;
          } else {
            // Ensure rotation is a number
            cell.rotation = Number(cell.rotation);
          }
        });
      }
    });
    
    console.log("Parsed map data with proper rotation values:", mapData);
    return mapData;
  } catch (err) {
    console.error('Error parsing map file:', err);
    throw new Error('Failed to parse map file. It may be corrupted or in an invalid format.');
  }
};

/**
 * Serializes a map object to a string
 * @param {Object} mapData - The map object to serialize
 * @returns {string} The serialized map as a JSON string
 */
export const serializeMap = (mapData) => {
  try {
    // Update the modified timestamp
    const updatedMapData = {
      ...mapData,
      metadata: {
        ...mapData.metadata,
        modified: new Date().toISOString()
      }
    };
    
      // CRITICAL FIX: Process all cells to ensure they have rotation property
      if (updatedMapData.layers && Array.isArray(updatedMapData.layers)) {
        updatedMapData.layers = updatedMapData.layers.map(layer => {
          if (layer.cells && Array.isArray(layer.cells)) {
            layer.cells = layer.cells.map(cell => {
              // Get the most current rotation value - prioritize global state
              const globalRotation = window.currentMapRotation;
              
              // If rotation doesn't exist, add it with current global value or default to 0
              if (cell.rotation === undefined) {
                return { ...cell, rotation: globalRotation !== undefined ? Number(globalRotation) : 0 };
              }
              
              // If global rotation is set, use it to update existing cells
              if (globalRotation !== undefined) {
                return { ...cell, rotation: Number(globalRotation) };
              }
              
              // Otherwise ensure rotation is a number (not string)
              if (typeof cell.rotation !== 'number') {
                return { ...cell, rotation: Number(cell.rotation) };
              }
              
              return cell;
            });
          }
          return layer;
        });
      }
    
    // Use custom replacer function to ensure rotation values are preserved
    return JSON.stringify(updatedMapData, (key, value) => {
      // Always include rotation in the output
      if (key === 'rotation') {
        // If value is undefined, return 0
        return value === undefined ? 0 : Number(value);
      }
      return value;
    }, 2);
  } catch (err) {
    console.error('Error serializing map:', err);
    throw new Error('Failed to serialize map data.');
  }
};

/**
 * Finds a cell in a specific layer at the given coordinates
 * @param {Object} mapData - The map data
 * @param {number} layerIndex - The index of the layer to search in
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @returns {Object|null} The cell object if found, null otherwise
 */
export const findCellInLayer = (mapData, layerIndex, x, y) => {
  if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return null;
  
  const layer = mapData.layers[layerIndex];
  return layer.cells.find(cell => cell.x === x && cell.y === y) || null;
};

/**
 * Adds or updates a cell in a layer
 * @param {Object} mapData - The map data
 * @param {number} layerIndex - The index of the layer to update
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {string} type - The type of the cell
 * @param {number} tileId - The ID of the tile (optional)
 * @param {number} rotation - The rotation angle in degrees (0, 90, 180, 270) (optional)
 * @returns {Object} The updated map data
 */
export const setCellInLayer = (mapData, layerIndex, x, y, type, tileId, rotation = 0) => {
  if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return mapData;
  
  // Use global rotation state as fallback if available
  const rotationValue = rotation !== undefined ? rotation : (window.currentMapRotation || 0);
  
  // Ensure rotation is a number with explicit conversion
  const numRotation = parseInt(rotationValue, 10) || 0;
  
  console.log(`setCellInLayer called with: x=${x}, y=${y}, type=${type}, tileId=${tileId}`);
  console.log(`Using rotation: ${numRotation} (converted from ${rotation}, global=${window.currentMapRotation})`);
  
  // Clone the map data to avoid direct state mutation
  const newMapData = { ...mapData };
  const layerData = { ...newMapData.layers[layerIndex] };
  
  // Clone the cells array
  layerData.cells = [...layerData.cells];
  
  // Find if the cell already exists in this layer
  const existingCellIndex = layerData.cells.findIndex(cell => cell.x === x && cell.y === y);
  
  // Create cell data with required properties
  const cellData = { x, y, type };
  
  // Add tileId if provided
  if (tileId !== undefined) {
    cellData.tileId = tileId;
  }
  
  // Always include rotation in the cell data, even if it's 0
  // This ensures rotation is explicitly stored in the map file
  cellData.rotation = numRotation;
  
  if (existingCellIndex !== -1) {
    console.log(`Updating existing cell at (${x}, ${y}) with rotation=${rotation}`);
    // Update existing cell, preserving any properties not explicitly changed
    layerData.cells[existingCellIndex] = { 
      ...layerData.cells[existingCellIndex], 
      ...cellData 
    };
    
    // Log the updated cell to verify rotation was properly set
    console.log("Updated cell:", layerData.cells[existingCellIndex]);
  } else {
    console.log(`Adding new cell at (${x}, ${y}) with rotation=${rotation}`);
    // Add new cell
    layerData.cells.push(cellData);
    
    // Log the added cell to verify rotation was properly set
    console.log("Added cell:", cellData);
  }
  
  // Update the layer in the map data
  newMapData.layers[layerIndex] = layerData;
  
  return newMapData;
};

/**
 * Removes a cell from a layer
 * @param {Object} mapData - The map data
 * @param {number} layerIndex - The index of the layer to update
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @returns {Object} The updated map data
 */
export const removeCellFromLayer = (mapData, layerIndex, x, y) => {
  if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return mapData;
  
  // Clone the map data to avoid direct state mutation
  const newMapData = { ...mapData };
  const layerData = { ...newMapData.layers[layerIndex] };
  
  // Remove the cell if it exists
  layerData.cells = layerData.cells.filter(cell => !(cell.x === x && cell.y === y));
  
  // Update the layer in the map data
  newMapData.layers[layerIndex] = layerData;
  
  return newMapData;
};

/**
 * Gets all visible cells at a specific coordinate across all layers
 * @param {Object} mapData - The map data
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @returns {Array} Array of cells at the coordinate, from bottom to top layer
 */
export const getCellsAtCoordinate = (mapData, x, y) => {
  if (!mapData || !mapData.layers) return [];
  
  const cells = [];
  
  mapData.layers.forEach((layer, index) => {
    if (layer.visible) {
      const cell = findCellInLayer(mapData, index, x, y);
      if (cell) {
        cells.push({ ...cell, layerIndex: index });
      }
    }
  });
  
  return cells;
};

/**
 * Converts screen coordinates to grid coordinates
 * @param {number} screenX - The x screen coordinate
 * @param {number} screenY - The y screen coordinate
 * @param {number} gridSize - The size of each grid cell
 * @param {Object} viewportOffset - The viewport offset { x, y }
 * @returns {Object} The grid coordinates { x, y }
 */
export const screenToGridCoordinates = (screenX, screenY, gridSize, viewportOffset) => {
  const gridX = Math.floor((screenX - viewportOffset.x) / gridSize);
  const gridY = Math.floor((screenY - viewportOffset.y) / gridSize);
  return { x: gridX, y: gridY };
};

/**
 * Converts grid coordinates to screen coordinates
 * @param {number} gridX - The x grid coordinate
 * @param {number} gridY - The y grid coordinate
 * @param {number} gridSize - The size of each grid cell
 * @param {Object} viewportOffset - The viewport offset { x, y }
 * @returns {Object} The screen coordinates { x, y }
 */
export const gridToScreenCoordinates = (gridX, gridY, gridSize, viewportOffset) => {
  const screenX = gridX * gridSize + viewportOffset.x;
  const screenY = gridY * gridSize + viewportOffset.y;
  return { x: screenX, y: screenY };
};

/**
 * Converts JSON map data to ASCII format for the roguelike game engine
 * @param {Object} mapData - The map data in JSON format
 * @returns {string} The map data in ASCII format
 */
export const convertMapToAscii = (mapData) => {
  // Create a 2D array filled with void spaces
  const width = mapData.width;
  const height = mapData.height;
  const asciiMap = Array(height).fill().map(() => Array(width).fill(' ')); // ' ' for void
  
  // Process each layer from bottom to top
  mapData.layers.forEach(layer => {
    if (!layer.visible) return;
    
    // Process each cell in the layer
    layer.cells.forEach(cell => {
      // Skip cells outside the map bounds
      if (cell.x < 0 || cell.x >= width || cell.y < 0 || cell.y >= height) return;
      
      // Map cell types to ASCII characters
      let asciiChar;
      switch(cell.type) {
        case 'wall':
          asciiChar = '#';
          break;
        case 'floor':
          asciiChar = '.';
          break;
        case 'door':
          asciiChar = '+';
          break;
        case 'grass':
          asciiChar = '"';
          break;
        case 'ashes':
          asciiChar = "'";
          break;
        case 'stairs':
          asciiChar = '>';
          break;
        case 'spawn':
          asciiChar = '@';
          break;
        default:
          // For unknown types, use a default character
          asciiChar = '?';
      }
      
      // Place the character in the grid
      asciiMap[cell.y][cell.x] = asciiChar;
    });
  });
  
  // Convert 2D array to string with newlines
  return asciiMap.map(row => row.join('')).join('\n');
};

/**
 * Converts ASCII map to JSON format
 * @param {string} asciiMap - The map data in ASCII format
 * @param {string} name - Optional name for the map
 * @returns {Object} The map data in JSON format
 */
export const convertAsciiToMap = (asciiMap, name = 'Imported Map') => {
  const lines = asciiMap.trim().split('\n');
  const height = lines.length;
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
  
  // Create a basic map structure
  const mapData = createEmptyMap(name, width, height);
  
  // Create a terrain layer
  const terrainCells = [];
  
  // Process each character in the ASCII map
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      let cellType;
      
      // Map ASCII characters to cell types
      switch(char) {
        case '#':
          cellType = 'wall';
          break;
        case '.':
          cellType = 'floor';
          break;
        case '+':
          cellType = 'door';
          break;
        case '"':
          cellType = 'grass';
          break;
        case "'":
          cellType = 'ashes';
          break;
        case '>':
          cellType = 'stairs';
          break;
        case '@':
          cellType = 'spawn';
          // Could also mark this as a player spawn point
          break;
        case ' ':
          // Void/empty space, skip
          continue;
        default:
          // Unknown character, interpret as custom type
          cellType = `custom-${char}`;
      }
      
      // Add the cell to the terrain layer
      terrainCells.push({ x, y, type: cellType });
    }
  }
  
  // Update the terrain layer with the cells
  mapData.layers[0].cells = terrainCells;
  
  return mapData;
};
