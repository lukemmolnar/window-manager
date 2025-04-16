import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  FLOOR_TILESET_PATH,
  WALL_TILESET_PATH,
  TILE_SIZE, 
  TILESET_COLS,
  getTileCoordinates, 
  getTileName, 
  TILE_SECTIONS,
  WALL_TILE_SECTIONS
} from './utils/tileRegistry';

/**
 * Component for displaying and selecting tiles from a tileset
 */
const TilePalette = ({ 
  onSelectTile, 
  selectedTileId = 0, 
  tileType = 'floor',
  onChangeTileType
}) => {
  const [floorTilesetImage, setFloorTilesetImage] = useState(null);
  const [wallTilesetImage, setWallTilesetImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(null); // Filter by section for floor
  const [currentWallSection, setCurrentWallSection] = useState(null); // Filter by section for wall
  const [totalFloorTiles, setTotalFloorTiles] = useState(0);
  const [totalWallTiles, setTotalWallTiles] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const initialTileTypeRef = useRef(tileType);
  
  // Available tile types
  const tileTypes = [
    { id: 'floor', name: 'Floor' },
    { id: 'wall', name: 'Wall' },
    { id: 'door', name: 'Door' }
  ];
  
  // Store the initial tile type to handle first render properly
  useEffect(() => {
    initialTileTypeRef.current = tileType;
  }, []);

  // Track the actual columns detected in the image
  const [actualColumns, setActualColumns] = useState(TILESET_COLS);
  
  // Load the tileset images
  useEffect(() => {
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
      
      if (wallTilesetImage || tileType !== 'wall') {
        setLoading(false);
        setIsInitialized(true); // Mark as initialized after image loads
      }
    };
    floorImg.onerror = () => {
      console.error('Failed to load floor tileset image');
      if (wallTilesetImage || tileType !== 'wall') {
        setLoading(false);
        setIsInitialized(true);
      }
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
      
      if (floorTilesetImage || tileType !== 'floor') {
        setLoading(false);
        setIsInitialized(true); // Mark as initialized after image loads
      }
    };
    wallImg.onerror = () => {
      console.error('Failed to load wall tileset image');
      if (floorTilesetImage || tileType !== 'floor') {
        setLoading(false);
        setIsInitialized(true);
      }
    };
    wallImg.src = WALL_TILESET_PATH;
  }, []);

  // Force a re-render when the component first mounts
  useEffect(() => {
    const currentImage = tileType === 'floor' ? floorTilesetImage : wallTilesetImage;
    if (currentImage && !isInitialized) {
      setIsInitialized(true);
    }
  }, [tileType, floorTilesetImage, wallTilesetImage, isInitialized]);
  
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

  return (
    <div className="bg-stone-800 border-t border-stone-700 p-2 max-h-64 overflow-y-auto">
      {/* Tile Type Selector */}
      <div className="flex flex-col space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-mono text-teal-400">TILE TYPE</h3>
        </div>
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
                    <canvas
                      ref={canvas => {
                        if (canvas && wallTilesetImage) {
                          const ctx = canvas.getContext('2d');
                          ctx.clearRect(0, 0, 40, 40);
                          
                          // Calculate coordinates based on actual columns in the sheet
                          const col = tileIndex % actualColumns;
                          const row = Math.floor(tileIndex / actualColumns);
                          const sourceX = col * TILE_SIZE;
                          const sourceY = row * TILE_SIZE;
                          
                          // Center the tile in the canvas
                          ctx.drawImage(
                            wallTilesetImage,
                            sourceX, // sourceX
                            sourceY, // sourceY
                            TILE_SIZE, // sourceWidth
                            TILE_SIZE, // sourceHeight
                            0, // destX
                            0, // destY
                            40, // destWidth
                            40  // destHeight
                          );
                        }
                      }}
                      width={40}
                      height={40}
                      className="mx-auto"
                      style={{ display: 'block' }}
                    />
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
                  <canvas
                    ref={canvas => {
                      if (canvas && floorTilesetImage) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, 40, 40);
                        
                        // Calculate coordinates based on actual columns in the sheet
                        // (This overrides the getTileCoordinates from tileRegistry.js)
                        const col = tileIndex % actualColumns;
                        const row = Math.floor(tileIndex / actualColumns);
                        const sourceX = col * TILE_SIZE;
                        const sourceY = row * TILE_SIZE;
                        
                        // Center the tile in the canvas
                        ctx.drawImage(
                          floorTilesetImage,
                          sourceX, // sourceX
                          sourceY, // sourceY
                          TILE_SIZE, // sourceWidth
                          TILE_SIZE, // sourceHeight
                          0, // destX
                          0, // destY
                          40, // destWidth
                          40  // destHeight
                        );
                      }
                    }}
                    width={40}
                    height={40}
                    className="mx-auto" // Add margin auto to center the canvas horizontally
                    style={{ display: 'block' }} // Make canvas a block element
                  />
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
