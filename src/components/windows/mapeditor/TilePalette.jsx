import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Heart, RotateCw, CheckCircle, XCircle, Store } from 'lucide-react';
import axios from 'axios';
import API_CONFIG from '../../../config/api';
import { 
  TILE_SIZE,
  getTileName,
  getTileCoordinates
} from './utils/tileRegistry';

// Import the dynamic tile registry
import dynamicTileRegistry from './utils/dynamicTileRegistry';

// Debug helper to log API requests and responses
const logApiCall = (method, url, status, data) => {
  console.log(`API ${method} ${url} - Status: ${status}`);
  console.log('Data:', data);
};

/**
 * Enhanced TilePalette component with marketplace integration
 */
const TilePalette = ({ 
  onSelectTile, 
  selectedTileId = 0, 
  selectedTilesetId = null,
  tileType = 'floor',
  onChangeTileType,
  selectedRotation = 0,
  onRotateTile,
  createWindow
}) => {
  // CRITICAL DEBUG: Check if onSelectTile is a function
  console.log('🚨 TilePalette props check:', {
    onSelectTile: typeof onSelectTile,
    onSelectTileExists: !!onSelectTile,
    isFunction: typeof onSelectTile === 'function'
  });

  // NEW DEBUG: Check render state
  console.log('🎯 TilePalette render state:', {
    selectedTileId,
    selectedTilesetId,
    tileType,
    propsReceived: {
      selectedTileId: typeof selectedTileId,
      selectedTilesetId: typeof selectedTilesetId,
      tileType: typeof tileType
    }
  });

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
  const [tilesetImages, setTilesetImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(null); // Filter by section for floor
  const [currentWallSection, setCurrentWallSection] = useState(null); // Filter by section for wall
  const [currentShadowSection, setCurrentShadowSection] = useState(null);
  const [sections, setSections] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const initialTileTypeRef = useRef(tileType);
  const [showFavoritesSection, setShowFavoritesSection] = useState(true);
  const [marketplaceStatus, setMarketplaceStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  
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

  // Initialize dynamic tile registry
  useEffect(() => {
    const initRegistry = async () => {
      setLoading(true);
      try {
        await dynamicTileRegistry.initializeTileRegistry();
        
        // Get all sections
        const allSections = dynamicTileRegistry.getAllSections();
        setSections(allSections);
        
        // Get selected tilesets to load individual images
        const selectedTilesets = dynamicTileRegistry.getSelectedTilesets();
        const images = {};
        
        // Load each tileset image individually by ID
        for (const tileset of selectedTilesets) {
          images[tileset.id] = dynamicTileRegistry.getTilesetImageForCategory(tileType, tileset.id);
        }
        
        setTilesetImages(images);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing dynamic tile registry:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initRegistry();
  }, []);

  // Load favorite tiles when component mounts
  useEffect(() => {
    loadFavoriteTiles();
  }, []);

  // Check if the currently selected tile is a favorite
  useEffect(() => {
    checkIsFavorite();
  }, [selectedTileId, tileType, selectedTilesetId]);

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
      if (!token || !selectedTilesetId) {
        setIsFavorited(false);
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/favorite-tiles/check/${selectedTileId}/${tileType}/${selectedTilesetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      logApiCall('GET', `/favorite-tiles/check/${selectedTileId}/${tileType}/${selectedTilesetId}`, response.status, response.data);
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
        { 
          tileIndex: selectedTileId, 
          tileType,
          tilesetId: selectedTilesetId // Include tileset ID for favorites
        },
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
      if (!token || !selectedTilesetId) return;

      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/favorite-tiles/${selectedTileId}/${tileType}/${selectedTilesetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      logApiCall('DELETE', `/favorite-tiles/${selectedTileId}/${tileType}/${selectedTilesetId}`, response.status, response.data);
      
      // Reload favorite tiles
      await loadFavoriteTiles();
      setIsFavorited(false);
    } catch (error) {
      console.error('Error removing tile from favorites:', error);
    }
  };

  // Function to open the marketplace window
  const openMarketplace = () => {
    if (createWindow) {
      setMarketplaceStatus('loading');
      
      try {
        // Create the marketplace window
        createWindow({
          type: 'marketplace',
          title: 'Tileset Marketplace',
          width: 900,
          height: 700
        });
        
        setMarketplaceStatus('success');
      } catch (error) {
        console.error('Error opening marketplace window:', error);
        setMarketplaceStatus('error');
      }
    } else {
      console.warn('createWindow function not provided');
      setMarketplaceStatus('error');
    }
  };

  // Function to refresh tilesets after marketplace changes
  const refreshTilesets = async () => {
    setLoading(true);
    try {
      await dynamicTileRegistry.refreshTileRegistry();
      
      // Get all sections
      const allSections = dynamicTileRegistry.getAllSections();
      setSections(allSections);
      
      // Get selected tilesets to load individual images
      const selectedTilesets = dynamicTileRegistry.getSelectedTilesets();
      const images = {};
      
      // Load each tileset image individually by ID
      for (const tileset of selectedTilesets) {
        images[tileset.id] = dynamicTileRegistry.getTilesetImageForCategory(tileType, tileset.id);
      }
      
      setTilesetImages(images);
      setMarketplaceStatus('success');
    } catch (error) {
      console.error('Error refreshing tilesets:', error);
      setMarketplaceStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Render a tile canvas with specific tileset
  const renderTileCanvas = (tileIndex, tilesetId, size = 40, rotation = 0) => {
    const image = tilesetImages[tilesetId];
    
    if (!image) return null;
    
    return (
      <canvas
        ref={canvas => {
          if (canvas && image) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, size, size);
            
            // Calculate coordinates
            const { sourceX, sourceY } = getTileCoordinates(tileIndex);
            
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

  // Get tiles to display based on current section filter and tile type
  // UPDATED: Now returns objects with both tilesetId and tileId
  const displayTiles = useMemo(() => {
    if (!isInitialized) return [];
    
    const categorySections = sections[tileType] || {};
    
    let sectionFilter = null;
    if (tileType === 'floor') sectionFilter = currentSection;
    else if (tileType === 'wall') sectionFilter = currentWallSection;
    else if (tileType === 'shadow') sectionFilter = currentShadowSection;
    
    let result = [];
    
    // If no section filter, show all tiles for this category
    if (!sectionFilter) {
      // Collect all tiles from all sections with tileset information
      for (const [sectionKey, section] of Object.entries(categorySections)) {
        const { startIndex, count, tilesetId } = section;
        for (let i = 0; i < count; i++) {
          result.push({
            tileIndex: startIndex + i,
            tilesetId: tilesetId,
            sectionKey: sectionKey,
            sectionName: section.name,
            tilesetName: section.tilesetName
          });
        }
      }
    } else {
      // Show only tiles from the selected section
      const section = categorySections[sectionFilter];
      if (section) {
        const { startIndex, count, tilesetId } = section;
        result = Array.from({ length: count }, (_, i) => ({
          tileIndex: startIndex + i,
          tilesetId: tilesetId,
          sectionKey: sectionFilter,
          sectionName: section.name,
          tilesetName: section.tilesetName
        }));
      }
    }
    
    return result;
  }, [isInitialized, sections, tileType, currentSection, currentWallSection, currentShadowSection]);

  // Get section options for the dropdown
  const sectionOptions = useMemo(() => {
    if (!isInitialized) return [];
    
    const categorySections = sections[tileType] || {};
    
    return Object.entries(categorySections).map(([key, section]) => ({
      value: key,
      label: `${section.name} (${section.tilesetName})`
    }));
  }, [isInitialized, sections, tileType]);

  // Enhanced tile selection handler with comprehensive debugging
  const handleTileSelection = (tileId, tilesetId, source = 'unknown') => {
    console.log('🚀 [TilePalette] handleTileSelection called:', {
      source,
      tileId: { value: tileId, type: typeof tileId },
      tilesetId: { value: tilesetId, type: typeof tilesetId },
      tilesetIdIsNull: tilesetId === null,
      tilesetIdIsUndefined: tilesetId === undefined,
      onSelectTileType: typeof onSelectTile,
      onSelectTileExists: !!onSelectTile
    });

    if (typeof onSelectTile === 'function') {
      console.log('🟢 [TilePalette] Calling onSelectTile with params:', tileId, tilesetId);
      onSelectTile(tileId, tilesetId);
      
      // Verify the call was made by checking if parameters were passed correctly
      setTimeout(() => {
        console.log('🔍 [TilePalette] Post-call verification - parameters sent:', {
          tileId,
          tilesetId,
          bothDefined: tileId !== undefined && tilesetId !== undefined
        });
      }, 0);
    } else {
      console.error('🔴 [TilePalette] onSelectTile is not a function!', {
        receivedType: typeof onSelectTile,
        receivedValue: onSelectTile
      });
    }
  };

  return (
    <div className="bg-stone-800 border-t border-stone-700 p-2 max-h-64 overflow-y-auto">
      {/* Tile Type Selector with Marketplace Button */}
      <div className="flex flex-col space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-mono text-teal-400">TILE TYPE</h3>
          
          {/* Buttons for Selected Tile */}
          <div className="flex items-center">
            {/* Refresh Button */}
            <button 
              className="text-green-400 hover:text-green-300 flex items-center mr-2"
              onClick={refreshTilesets}
              disabled={loading}
              title="Refresh Tilesets"
            >
              <RotateCw size={16} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs">{loading ? '' : ''}</span>
            </button>
            
            {/* Rotate Button */}
            <button 
              className="text-blue-400 hover:text-blue-300 flex items-center mr-2"
              onClick={() => {
                // Calculate the new rotation value
                const newRotation = (localRotation + 90) % 360;
                
                // Update local state immediately for visual feedback
                setLocalRotation(newRotation);
                
                // Then notify parent (if callback exists) 
                if (typeof onRotateTile === 'function') {
                  onRotateTile(newRotation);
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
                <span className="text-xs"></span>
              </button>
            ) : (
              <button 
                className="text-gray-400 hover:text-pink-500 flex items-center mr-2"
                onClick={addToFavorites}
                title="Add to favorites"
                disabled={isAddingToFavorites}
              >
                <Heart size={16} className="mr-1" />
                <span className="text-xs">{isAddingToFavorites ? '' : ''}</span>
              </button>
            )}
          </div>
        </div>
        
        {addFavoriteError && (
          <div className="text-red-500 text-xs mb-2">{addFavoriteError}</div>
        )}
        
        {/* Tile Type Select */}
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
                  key={`fav-${tile.tileset_id || 'unknown'}-${tile.tile_type}-${tile.tile_index}`}
                  className={`rounded cursor-pointer border ${
                    selectedTileId === tile.tile_index && 
                    tileType === tile.tile_type &&
                    selectedTilesetId === (tile.tileset_id || null)
                      ? 'bg-teal-900 border-teal-500' 
                      : 'hover:bg-stone-700 border-transparent'
                  }`}
                  onClick={() => {
                    console.log('🎯 [TilePalette] FAVORITE TILE CLICKED:', {
                      tileIndex: tile.tile_index,
                      tilesetId: tile.tileset_id,
                      tileType: tile.tile_type,
                      currentSelected: { selectedTileId, selectedTilesetId, tileType },
                      rawTileData: tile
                    });
                    
                    // Use the enhanced handler
                    handleTileSelection(tile.tile_index, tile.tileset_id || null, 'favorite');
                    
                    // Change tile type if needed
                    if (tile.tile_type !== tileType) {
                      console.log('🔄 [TilePalette] Changing tile type from', tileType, 'to', tile.tile_type);
                      onChangeTileType(tile.tile_type);
                    }
                  }}
                  title={getTileName(tile.tile_index, tile.tile_type)}
                >
                  <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                    {tile.tileset_id && tilesetImages[tile.tileset_id]
                      ? renderTileCanvas(
                          tile.tile_index, 
                          tile.tileset_id, 
                          40, 
                          selectedTileId === tile.tile_index && 
                          tileType === tile.tile_type && 
                          selectedTilesetId === tile.tileset_id ? selectedRotation : 0
                        )
                      : <div className="w-full h-full flex items-center justify-center text-xs text-stone-500">Loading</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Section filter dropdown */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-mono text-teal-400">
          {tileType === 'floor' ? 'FLOORS' : 
          tileType === 'wall' ? 'WALLS' : 
          tileType === 'shadow' ? 'SHADOWS' : 
          tileType === 'door' ? 'DOORS' : 'TILES'}
        </h3>
        
        {/* Section filter dropdown */}
        {tileType !== 'door' && (
          <select 
            className="bg-stone-700 text-teal-300 text-xs rounded p-1 border-none"
            value={
              tileType === 'floor' ? currentSection || "" : 
              tileType === 'wall' ? currentWallSection || "" : 
              tileType === 'shadow' ? currentShadowSection || "" : ""
            }
            onChange={(e) => {
              const value = e.target.value || null;
              if (tileType === 'floor') setCurrentSection(value);
              else if (tileType === 'wall') setCurrentWallSection(value);
              else if (tileType === 'shadow') setCurrentShadowSection(value);
            }}
          >
            <option value="">All Tiles</option>
            {sectionOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* Door tile simple selector */}
      {tileType === 'door' && (
        <div className="mb-2">
          <div className="grid grid-cols-2 gap-2">
            <div 
              className="bg-stone-700 p-3 rounded cursor-pointer border-2 border-teal-500 text-center"
              onClick={() => {
                console.log('🚪 [TilePalette] DOOR TILE CLICKED');
                handleTileSelection(0, null, 'door');
              }}
            >
              <div className="bg-slate-900 h-10 w-full flex items-center justify-center">
                <div className="bg-amber-700 h-5 w-8"></div>
              </div>
              <div className="mt-1 text-xs text-teal-300">Basic Door</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tiles grid - shown for all tile types except door */}
      {tileType !== 'door' && (
        loading ? (
          <div className="text-center p-4 text-stone-400">Loading...</div>
        ) : displayTiles.length === 0 ? (
          <div className="text-center p-6 text-stone-400 bg-stone-900 rounded-lg border border-stone-700">
            <div className="mb-4">
              <Store size={48} className="mx-auto text-stone-500 mb-3" />
              <h3 className="text-lg font-semibold text-teal-400 mb-2">No Tilesets Available</h3>
              <p className="text-sm mb-4">
                You haven't selected any tilesets for {tileType} tiles yet. 
                Visit the marketplace to browse and select tilesets to use in your maps.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1 justify-items-center">
            {displayTiles.map(tile => (
              <div
                key={`${tile.tilesetId}-${tile.tileIndex}`}
                className={`rounded cursor-pointer border ${
                  selectedTileId === tile.tileIndex && selectedTilesetId === tile.tilesetId
                    ? 'bg-teal-900 border-teal-500' 
                    : 'hover:bg-stone-700 border-transparent'
                }`}
                onClick={() => {
                  // NEW DEBUG: Add selection check before existing logs
                  console.log('🔍 TILE SELECTION CHECK:', {
                    clickedTile: { tileIndex: tile.tileIndex, tilesetId: tile.tilesetId },
                    currentSelection: { selectedTileId, selectedTilesetId },
                    matches: {
                      tileIdMatch: selectedTileId === tile.tileIndex,
                      tilesetIdMatch: selectedTilesetId === tile.tilesetId,
                      bothMatch: selectedTileId === tile.tileIndex && selectedTilesetId === tile.tilesetId
                    },
                    types: {
                      selectedTileIdType: typeof selectedTileId,
                      selectedTilesetIdType: typeof selectedTilesetId,
                      tileTileIndexType: typeof tile.tileIndex,
                      tileTilesetIdType: typeof tile.tilesetId
                    }
                  });

                  console.log('🟢 [TilePalette] REGULAR TILE CLICKED:', {
                    tileIndex: tile.tileIndex,
                    tilesetId: tile.tilesetId,
                    sectionName: tile.sectionName,
                    tilesetName: tile.tilesetName,
                    currentSelected: { selectedTileId, selectedTilesetId, tileType },
                    rawTileData: tile
                  });
                  
                  // Use the enhanced handler
                  handleTileSelection(tile.tileIndex, tile.tilesetId, 'regular');
                }}
                title={`${tile.sectionName} - ${dynamicTileRegistry.getTileName(tile.tileIndex, tileType)} (${tile.tilesetName})`}
              >
                <div className="w-10 h-10 bg-stone-900 relative overflow-hidden flex items-center justify-center">
                  {renderTileCanvas(
                    tile.tileIndex, 
                    tile.tilesetId, 
                    40, 
                    selectedTileId === tile.tileIndex && selectedTilesetId === tile.tilesetId ? selectedRotation : 0
                  )}
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
