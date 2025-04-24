import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  FLOOR_TILESET_PATH,
  WALL_TILESET_PATH,
  SHADOW_TILESET_PATH, // Import the shadow path
  TILE_SIZE,
  TILESET_COLS,
  getTileCoordinates, 
  getTileName, 
  TILE_SECTIONS,
  WALL_TILE_SECTIONS,
  SHADOW_TILE_SECTIONS
} from './utils/tileRegistry';
import { Heart, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import API_CONFIG from '../../../config/api';

// Debug helper to log API requests and responses
const logApiCall = (method, url, status, data) => {
  console.log(`API ${method} ${url} - Status: ${status}`);
  console.log('Data:', data);
};

/**
 * Component for displaying and selecting tiles from a tileset
 */
const TilePalette = ({ 
  onSelectTile, 
  selectedTileId = 0, 
  tileType = 'floor',
  onChangeTileType,
  selectedRotation = 0,
  onRotateTile
}) => {
  // Local state to track rotation, will sync back to parent
  const [localRotation, setLocalRotation] = useState(selectedRotation);
  
  // Sync with parent's rotation when it changes
  useEffect(() => {
    setLocalRotation(selectedRotation);
  }, [selectedRotation]);
  const [favoriteTiles, setFavoriteTiles] = useState([]);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [addFavoriteError, setAddFavoriteError] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [floorTilesetImage, setFloorTilesetImage] = useState(null);
  const [wallTilesetImage, setWallTilesetImage] = useState(null);
  const [shadowTilesetImage, setShadowTilesetImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(null); // Filter by section for floor
  const [currentWallSection, setCurrentWallSection] = useState(null); // Filter by section for wall
  const [currentShadowSection, setCurrentShadowSection] = useState(null);
  const [totalFloorTiles, setTotalFloorTiles] = useState(0);
  const [totalWallTiles, setTotalWallTiles] = useState(0);
  const [totalShadowTiles, setTotalShadowTiles] = useState(0); // Add state for shadow tiles count
  const [isInitialized, setIsInitialized] = useState(false);
  const initialTileTypeRef = useRef(tileType);
  const [showFavoritesSection, setShowFavoritesSection] = useState(true);
  
  // Available tile types
  const tileTypes = [
    { id: 'floor', name: 'Floor' },
    { id: 'wall', name: 'Wall' },
    { id: 'shadow', name: 'Shadow' },
    { id: 'door', name: 'Door' }
  ];
  
  // Store the initial tile type to handle first render properly
  useEffect(() => {
    initialTileTypeRef.current = tileType;
  }, []);

  // Track the actual columns detected in the image
  const [actualColumns, setActualColumns] = useState(TILESET_COLS);

  // Load favorite tiles when component mounts
  useEffect(() => {
    loadFavoriteTiles();
  }, []);

  // Check if the currently selected tile is a favorite
  useEffect(() => {
    checkIsFavorite();
  }, [selectedTileId, tileType]);

// Function to load favorite tiles
const loadFavoriteTiles = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    console.log('Fetching favorite tiles from:', `${API_CONFIG.BASE_URL}/favorite-tiles`);
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/favorite-tiles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    logApiCall('GET', '/favorite-tiles', response.status, response.data);
    
    // Ensure we have an array, even if the response is unexpected
    if (Array.isArray(response.data)) {
      setFavoriteTiles(response.data);
    } else if (response.data && Array.isArray(response.data.favorites)) {
      setFavoriteTiles(response.data.favorites);
    } else {
      console.error('Unexpected response format for favorite tiles:', response.data);
      setFavoriteTiles([]);
    }
  } catch (error) {
    console.error('Error loading favorite tiles from server:', error);
    setFavoriteTiles([]);
  }
};

// Function to check if selected tile is a favorite
const checkIsFavorite = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/favorite-tiles/check/${selectedTileId}/${tileType}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    logApiCall('GET', `/favorite-tiles/check/${selectedTileId}/${tileType}`, response.status, response.data);
    setIsFavorited(response.data.isFavorite);
  } catch (error) {
    console.error('Error checking favorite status from server:', error);
    setIsFavorited(false);
  }
};

// Function to add a tile to favorites
const addToFavorites = async () => {
  setIsAddingToFavorites(true);
  setAddFavoriteError(null);
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAddFavoriteError('Authentication required');
      setIsAddingToFavorites(false);
      return;
    }

    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/favorite-tiles`,
      { tileIndex: selectedTileId, tileType },
      { headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        } 
      }
    );
    
    logApiCall('POST', '/favorite-tiles', response.status, response.data);
    
    // Reload favorite tiles
    await loadFavoriteTiles();
    setIsFavorited(true);
  } catch (error) {
    console.error('Error adding tile to favorites:', error);
    setAddFavoriteError(error.response?.data?.message || 'Failed to add to favorites');
  } finally {
    setIsAddingToFavorites(false);
  }
};

// Function to remove a tile from favorites
const removeFromFavorites = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await axios.delete(
      `${API_CONFIG.BASE_URL}/favorite-tiles/${selectedTileId}/${tileType}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    logApiCall('DELETE', `/favorite-tiles/${selectedTileId}/${tileType}`, response.status, response.data);
    
    // Reload favorite tiles
    await loadFavoriteTiles();
    setIsFavorited(false);
  } catch (error) {
    console.error('Error removing tile from favorites:', error);
  }
};

  // Render a tile canvas
  const renderTileCanvas = (tileIndex, tileType, size = 40, rotation = 0) => {
    const image = tileType === 'floor' ? floorTilesetImage : 
    tileType === 'wall' ? wallTilesetImage : 
    shadowTilesetImage;
    
    if (!image) return null;
    
    return (
      <canvas
        ref={canvas => {
          if (canvas && image) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, size, size);
            
            // Calculate coordinates based on actual columns in the sheet
            const col = tileIndex % actualColumns;
            const row = Math.floor(tileIndex / actualColumns);
            const sourceX = col * TILE_SIZE;
            const sourceY = row * TILE_SIZE;
            
            // Save the context state before transformations
            ctx.save();
            
            // Move to the center of the canvas for rotation
            ctx.translate(size/2, size/2);
            
            // Convert degrees to radians and rotate
            const angleInRadians = (rotation * Math.PI) / 180;
            ctx.rotate(angleInRadians);
            
            // Draw the image centered and rotated
            ctx.drawImage(
              image,
              sourceX, // sourceX
              sourceY, // sourceY
              TILE_SIZE, // sourceWidth
              TILE_SIZE, // sourceHeight
              -size/2, // destX (negative half-size to center)
              -size/2, // destY (negative half-size to center)
              size, // destWidth
              size  // destHeight
            );
            
            // Restore the context to its original state
            ctx.restore();
          }
        }}
        width={size}
        height={size}
        className="mx-auto"
        style={{ display: 'block' }}
      />
    );
  };
  
  // Load the tileset images
  useEffect(() => {
    let floorLoaded = false;
    let wallLoaded = false;
    let shadowLoaded = false;

    const checkAllLoaded = () => {
      if (floorLoaded && wallLoaded && shadowLoaded) {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    // Load floor tileset
    const floorImg = new Image();
    floorImg.onload = () => {
      setFloorTilesetImage(floorImg);
      
      // Calculate total available tiles based on image dimensions
      const cols = Math.floor(floorImg.width / TILE_SIZE);
      const rows = Math.floor(floorImg.height / TILE_SIZE);
      const total = cols * rows;
      
      console.log(`Detected ${total} floor tiles (${cols}x${rows}) in the sprite sheet`);
      setActualColumns(cols); // Store the actual number of columns
      setTotalFloorTiles(total);
      floorLoaded = true;
      checkAllLoaded();
    };
    floorImg.onerror = () => {
      console.error('Failed to load floor tileset image');
      floorLoaded = true; // Still mark as loaded to prevent blocking
      checkAllLoaded();
    };
    floorImg.src = FLOOR_TILESET_PATH;
    
    // Load wall tileset
    const wallImg = new Image();
    wallImg.onload = () => {
      setWallTilesetImage(wallImg);
      
      // Calculate total available tiles based on image dimensions
      const cols = Math.floor(wallImg.width / TILE_SIZE);
      const rows = Math.floor(wallImg.height / TILE_SIZE);
      const total = cols * rows;
      
      console.log(`Detected ${total} wall tiles (${cols}x${rows}) in the sprite sheet`);
      setTotalWallTiles(total);
      wallLoaded = true;
      checkAllLoaded();
    };
    wallImg.onerror = () => {
      console.error('Failed to load wall tileset image');
      wallLoaded = true; // Still mark as loaded
      checkAllLoaded();
    };
    wallImg.src = WALL_TILESET_PATH;

    // Load shadow tileset
    const shadowImg = new Image();
    shadowImg.onload = () => {
      setShadowTilesetImage(shadowImg);

      // Calculate total available tiles based on image dimensions
      const cols = Math.floor(shadowImg.width / TILE_SIZE);
      const rows = Math.floor(shadowImg.height / TILE_SIZE);
      const total = cols * rows;

      console.log(`Detected ${total} shadow tiles (${cols}x${rows}) in the sprite sheet`);
      setTotalShadowTiles(total);
      shadowLoaded = true;
      checkAllLoaded();
    };
    shadowImg.onerror = () => {
      console.error('Failed to load shadow tileset image');
      shadowLoaded = true; // Still mark as loaded
      checkAllLoaded();
    };
    shadowImg.src = SHADOW_TILESET_PATH;

  }, []); // Empty dependency array ensures this runs only once on mount

  // Force a re-render when the component first mounts (removed, handled by checkAllLoaded)
  // useEffect(() => { ... });
  
  // Get floor tiles to display based on current section filter
  const displayFloorTiles = useMemo(() => {
    if (currentSection === null) {
      // Show all tiles from the tileset - all positions are valid
      if (totalFloorTiles > 0) {
        // Simply create an array of indices from 0 to totalFloorTiles-1
        return Array.from({ length: totalFloorTiles }, (_, i) => i);
      }
      return [];
    } else {
      // Show only tiles from the selected section
      const section = TILE_SECTIONS[currentSection];
      return Array.from({ length: section.count }, (_, i) => section.startIndex + i);
    }
  }, [currentSection, totalFloorTiles]);
  
  // Get wall tiles to display based on current section filter
  const displayWallTiles = useMemo(() => {
    if (currentWallSection === null) {
      // Show all tiles from the tileset - all positions are valid
      if (totalWallTiles > 0) {
        // Simply create an array of indices from 0 to totalWallTiles-1
        return Array.from({ length: totalWallTiles }, (_, i) => i);
      }
      return [];
    } else {
      // Show only tiles from the selected section
      const section = WALL_TILE_SECTIONS[currentWallSection];
      return Array.from({ length: section.count }, (_, i) => section.startIndex + i);
    }
  }, [currentWallSection, totalWallTiles]);

  // Get shadow tiles to display based on current section filter
  const displayShadowTiles = useMemo(() => {
    if (currentShadowSection === null) {
      // Show all tiles from the tileset
      if (totalShadowTiles > 0) {
        return Array.from({ length: totalShadowTiles }, (_, i) => i);
      }
      return [];
    } else {
      // Show only tiles from the selected section
      const section = SHADOW_TILE_SECTIONS[currentShadowSection];
      // Ensure the section exists and has properties before accessing them
      if (section && typeof section.startIndex === 'number' && typeof section.count === 'number') {
        return Array.from({ length: section.count }, (_, i) => section.startIndex + i);
      }
      console.warn(`Shadow section ${currentShadowSection} not found or invalid.`);
      return []; // Return empty array if section is invalid
    }
  }, [currentShadowSection, totalShadowTiles]);


  return (
    <div className="bg-stone-800 border-t border-stone-700 p-2 max-h-64 overflow-y-auto">
      {/* Tile Type Selector */}
      <div className="flex flex-col space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-mono text-teal-400">TILE TYPE</h3>
          
          {/* Buttons for Selected Tile */}
          <div className="flex items-center">
            {/* Rotate Button */}
            <button 
              className="text-blue-400 hover:text-blue-300 flex items-center mr-2"
              onClick={() => {
                console.log("Rotate button clicked!");
                // Keep track of the previous value for debugging
                console.log("Previous rotation value (local):", localRotation);
                console.log("Previous rotation value (props):", selectedRotation);
                
                // Calculate the new rotation value
                const newRotation = (localRotation + 90) % 360;
                console.log("New rotation value:", newRotation);
                
                // Update local state immediately for visual feedback
                setLocalRotation(newRotation);
                
                // Force update of the DOM display (safely)
                const debugElement = document.getElementById('debug-rotation-value');
                if (debugElement) {
                  debugElement.textContent = `Rotation set to: ${newRotation}°`;
                }
                
                // Update the local rotation display
                const tileRotationDisplay = document.getElementById('tile-rotation-display');
                if (tileRotationDisplay) {
                  tileRotationDisplay.textContent = `${newRotation}°`;
                }
                
                // Then notify parent (if callback exists) 
                if (typeof onRotateTile === 'function') {
                  console.log("Calling parent onRotateTile with:", newRotation);
                  // Pass the value explicitly (not relying on state)
                  onRotateTile(newRotation);
                } else {
                  console.warn("onRotateTile is not a function");
                  // If no callback, the local state update handles the visual feedback
                }
              }}
              title="Rotate tile"
            >
              <RotateCw size={16} className="mr-1" />
              <span className="text-xs" id="tile-rotation-display">{localRotation}°</span>
            </button>
            
            {/* Favorite Button */}
            {isFavorited ? (
              <button 
                className="text-pink-500 hover:text-pink-400 flex items-center mr-2"
                onClick={removeFromFavorites}
                title="Remove from favorites"
              >
                <Heart size={16} fill="currentColor" className="mr-1" />
                <span className="text-xs">Unfavorite</span>
              </button>
            ) : (
              <button 
                className="text-gray-400 hover:text-pink-500 flex items-center mr-2"
                onClick={addToFavorites}
                title="Add to favorites"
                disabled={isAddingToFavorites}
              >
                <Heart size={16} className="mr-1" />
                <span className="text-xs">{isAddingToFavorites ? 'Adding...' : 'Favorite'}</span>
              </button>
            )}
          </div>
        </div>
        
        {addFavoriteError && (
          <div className="text-red-500 text-xs mb-2">{addFavoriteError}</div>
        )}
        
        <select
          className="bg-stone-700 text-teal-300 text-sm rounded p-2 w-full border-none"
          value={tileType}
          onChange={(e) => onChangeTileType(e.target.value)}
        >
          {tileTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </div>
      
      {/* Favorite Tiles Section */}
      {Array.isArray(favoriteTiles) && favoriteTiles.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-mono text-stone-400">FAVORITE TILES</h3>
            <button 
              className="text-xs text-stone-400 hover:text-stone-300"
              onClick={() => setShowFavoritesSection(!showFavoritesSection)}
            >
              {showFavoritesSection ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showFavoritesSection && (
            <div className="grid grid-cols-5 gap-1 justify-items-center mb-3">
              {Array.isArray(favoriteTiles) && favoriteTiles.map((tile) => (
                <div
                  key={`fav-${tile.tile_type}-${tile.tile_index}`}
                  className={`rounded cursor-pointer border ${
                    selectedTileId === tile.tile_index && tileType === tile.tile_type 
                      ? 'bg-teal-900 border-teal-500' 
                      : 'hover:bg-stone-700 border-transparent'
                  }`}
                  onClick={() => {
                    onSelectTile(tile.tile_index);
                    if (tile.tile_type !== tileType) {
                      onChangeTileType(tile.tile_type);
                    }
                  }}
                  title={getTileName(tile.tile_index, tile.tile_type)}
                >
                  <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                    {(tile.tile_type === 'floor' && floorTilesetImage) || 
                     (tile.tile_type === 'wall' && wallTilesetImage) ||
                     (tile.tile_type === 'shadow' && shadowTilesetImage)
                      ? renderTileCanvas(tile.tile_index, tile.tile_type, 40, selectedTileId === tile.tile_index && tileType === tile.tile_type ? selectedRotation : 0)
                      : <div className="w-full h-full flex items-center justify-center text-xs text-stone-500">Loading</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Always include the floor section headings when floor type is selected */}
      {tileType === 'floor' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-mono text-teal-400">FLOORS</h3>
            
            {/* Section filter dropdown */}
            <select 
              className="bg-stone-700 text-teal-300 text-xs rounded p-1 border-none"
              value={currentSection || ""}
              onChange={(e) => setCurrentSection(e.target.value || null)}
            >
              <option value="">All Tiles</option>
              {Object.entries(TILE_SECTIONS).map(([key, section]) => (
                <option key={key} value={key}>{section.name}</option>
              ))}
            </select>
          </div>
        </>
      )}
      
      {/* Wall tile palette - shown when wall type is selected */}
      {tileType === 'wall' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-mono text-teal-400">WALLS</h3>
            
            {/* Section filter dropdown */}
            <select 
              className="bg-stone-700 text-teal-300 text-xs rounded p-1 border-none"
              value={currentWallSection || ""}
              onChange={(e) => setCurrentWallSection(e.target.value || null)}
            >
              <option value="">All Wall Tiles</option>
              {Object.entries(WALL_TILE_SECTIONS).map(([key, section]) => (
                <option key={key} value={key}>{section.name}</option>
              ))}
            </select>
          </div>
          
          {loading ? (
            <div className="text-center p-4 text-stone-400">Loading wall tiles...</div>
          ) : !wallTilesetImage ? (
            <div className="text-center p-4 text-red-400">Failed to load wall tile set</div>
          ) : (
            <div key={`wall-grid-${isInitialized ? 'ready' : 'loading'}`} className="grid grid-cols-5 gap-1 justify-items-center">
              {displayWallTiles.map(tileIndex => (
                <div
                  key={tileIndex}
                  className={`rounded cursor-pointer border ${
                    selectedTileId === tileIndex ? 'bg-teal-900 border-teal-500' : 'hover:bg-stone-700 border-transparent'
                  }`}
                  onClick={() => onSelectTile(tileIndex)}
                  title={getTileName(tileIndex, 'wall')}
                >
                  <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                    {renderTileCanvas(tileIndex, 'wall', 40, selectedTileId === tileIndex ? selectedRotation : 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Shadow tile palette - shown when shadow type is selected */}
      {tileType === 'shadow' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-mono text-teal-400">SHADOWS</h3>
            
            {/* Section filter dropdown */}
            <select 
              className="bg-stone-700 text-teal-300 text-xs rounded p-1 border-none"
              value={currentShadowSection || ""}
              onChange={(e) => setCurrentShadowSection(e.target.value || null)}
            >
              <option value="">All Shadow Tiles</option>
              {Object.entries(SHADOW_TILE_SECTIONS).map(([key, section]) => (
                <option key={key} value={key}>{section.name}</option>
              ))}
            </select>
          </div>
          
          {loading ? (
            <div className="text-center p-4 text-stone-400">Loading shadow tiles...</div>
          ) : !shadowTilesetImage ? (
            <div className="text-center p-4 text-red-400">Failed to load shadow tile set</div>
          ) : (
            <div key={`shadow-grid-${currentShadowSection}-${isInitialized ? 'ready' : 'loading'}`} className="grid grid-cols-5 gap-1 justify-items-center">
              {/* Use the defined displayShadowTiles */}
              {displayShadowTiles.map(tileIndex => (
                <div
                  key={`shadow-${tileIndex}`}
                  className={`rounded cursor-pointer border ${
                    selectedTileId === tileIndex ? 'bg-teal-900 border-teal-500' : 'hover:bg-stone-700 border-transparent'
                  }`}
                  onClick={() => onSelectTile(tileIndex)}
                  title={getTileName(tileIndex, 'shadow')}
                >
                  <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                    {renderTileCanvas(tileIndex, 'shadow', 40, selectedTileId === tileIndex ? selectedRotation : 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Door tile simple selector - shown when door type is selected */}
      {tileType === 'door' && (
        <div className="mb-2">
          <h3 className="text-sm font-mono text-teal-400 mb-2">DOOR STYLE</h3>
          <div className="grid grid-cols-2 gap-2">
            <div 
              className="bg-stone-700 p-3 rounded cursor-pointer border-2 border-teal-500 text-center"
              onClick={() => onSelectTile(0)}
            >
              <div className="bg-slate-900 h-10 w-full flex items-center justify-center">
                <div className="bg-amber-700 h-5 w-8"></div>
              </div>
              <div className="mt-1 text-xs text-teal-300">Basic Door</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floor tile palette - shown when floor type is selected 
          The key addition forces a re-render when initialized changes */}
      {tileType === 'floor' && (
        loading ? (
          <div className="text-center p-4 text-stone-400">Loading tile set...</div>
        ) : !floorTilesetImage ? (
          <div className="text-center p-4 text-red-400">Failed to load tile set</div>
        ) : (
          <div key={`floor-grid-${isInitialized ? 'ready' : 'loading'}`} className="grid grid-cols-5 gap-1 justify-items-center">
            {displayFloorTiles.map(tileIndex => (
              <div
                key={tileIndex}
                className={`rounded cursor-pointer border ${
                  selectedTileId === tileIndex ? 'bg-teal-900 border-teal-500' : 'hover:bg-stone-700 border-transparent'
                }`}
                onClick={() => onSelectTile(tileIndex)}
                title={getTileName(tileIndex)}
              >
                <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                  {renderTileCanvas(tileIndex, 'floor', 40, selectedTileId === tileIndex ? selectedRotation : 0)}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default TilePalette;
