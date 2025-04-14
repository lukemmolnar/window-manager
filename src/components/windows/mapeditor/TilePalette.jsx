import React, { useEffect, useState, useMemo } from 'react';
import { 
  FLOOR_TILESET_PATH, 
  TILE_SIZE, 
  getTileCoordinates, 
  getTileName, 
  TILE_SECTIONS 
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
  const [tilesetImage, setTilesetImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(null); // Filter by section
  const [totalTiles, setTotalTiles] = useState(0);
  
  // Available tile types
  const tileTypes = [
    { id: 'select', name: 'Select' },
    { id: 'floor', name: 'Floor' },
    { id: 'wall', name: 'Wall' },
    { id: 'door', name: 'Door' },
    { id: 'erase', name: 'Erase' }
  ];
  
  // Load the tileset image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setTilesetImage(img);
      
      // Calculate total available tiles based on image dimensions
      const cols = Math.floor(img.width / TILE_SIZE);
      const rows = Math.floor(img.height / TILE_SIZE);
      const total = cols * rows;
      
      console.log(`Detected ${total} tiles (${cols}x${rows}) in the sprite sheet`);
      setTotalTiles(total);
      setLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load tileset image');
      setLoading(false);
    };
    img.src = FLOOR_TILESET_PATH;
  }, []);
  
  // Get tiles to display based on current section filter
  const displayTiles = useMemo(() => {
    if (currentSection === null) {
      // Show all tiles up to the calculated total
      return Array.from({ length: totalTiles }, (_, i) => i);
    } else {
      // Show only tiles from the selected section
      const section = TILE_SECTIONS[currentSection];
      return Array.from({ length: section.count }, (_, i) => section.startIndex + i);
    }
  }, [currentSection, totalTiles]);

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
      
      {/* Only show floor tile palette when floor type is selected */}
      {tileType === 'floor' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-mono text-teal-400">FLOOR STYLES</h3>
            
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
      
      {/* Wall tile simple selector - shown when wall type is selected */}
      {tileType === 'wall' && (
        <div className="mb-2">
          <h3 className="text-sm font-mono text-teal-400 mb-2">WALL STYLE</h3>
          <div className="grid grid-cols-2 gap-2">
            <div 
              className="bg-stone-700 p-3 rounded cursor-pointer border-2 border-teal-500 text-center"
              onClick={() => onSelectTile(0)}
            >
              <div className="bg-slate-600 h-10 w-full"></div>
              <div className="mt-1 text-xs text-teal-300">Basic Wall</div>
            </div>
          </div>
        </div>
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
      
      {/* Floor tile palette - shown when floor type is selected */}
      {tileType === 'floor' && (
        loading ? (
          <div className="text-center p-4 text-stone-400">Loading tile set...</div>
        ) : !tilesetImage ? (
          <div className="text-center p-4 text-red-400">Failed to load tile set</div>
        ) : (
          <div className="grid grid-cols-5 gap-1 justify-items-center">
            {displayTiles.map(tileIndex => (
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
                      if (canvas && tilesetImage) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, 40, 40);
                        
                        const { sourceX, sourceY } = getTileCoordinates(tileIndex);
                        
                        // Center the tile in the canvas
                        ctx.drawImage(
                          tilesetImage,
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
