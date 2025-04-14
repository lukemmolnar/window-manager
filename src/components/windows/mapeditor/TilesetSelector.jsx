import React, { useState, useEffect } from 'react';
import { Image, Check, X } from 'lucide-react';

/**
 * Component for selecting and previewing available tilesets
 */
const TilesetSelector = ({ 
  onSelectTileset, 
  onClose,
  currentTileset
}) => {
  const [tilesets, setTilesets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTileset, setSelectedTileset] = useState(currentTileset || null);
  const [error, setError] = useState(null);

  // Predefined tilesets from the oryx_ultimate_fantasy_1.2 folder
  useEffect(() => {
    // In a real app, this would be fetched from the server or file system
    const availableTilesets = [
      {
        id: 'uf_terrain',
        name: 'Fantasy Terrain',
        path: '/oryx_ultimate_fantasy_1.2/uf_terrain.png',
        preview: '/oryx_ultimate_fantasy_1.2/uf_terrain.png',
        tileSize: 48,
        cols: 16
      },
      {
        id: 'uf_items',
        name: 'Fantasy Items',
        path: '/oryx_ultimate_fantasy_1.2/uf_items.png',
        preview: '/oryx_ultimate_fantasy_1.2/uf_items.png',
        tileSize: 48,
        cols: 16
      },
      {
        id: 'uf_heroes',
        name: 'Fantasy Heroes',
        path: '/oryx_ultimate_fantasy_1.2/uf_heroes.png',
        preview: '/oryx_ultimate_fantasy_1.2/uf_heroes.png',
        tileSize: 48,
        cols: 16
      }
    ];

    setTilesets(availableTilesets);
    setLoading(false);
  }, []);

  const handleSelectTileset = (tileset) => {
    setSelectedTileset(tileset);
  };

  const handleConfirm = () => {
    if (!selectedTileset) {
      setError('Please select a tileset first');
      return;
    }
    onSelectTileset(selectedTileset);
    onClose();
  };

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 w-full max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-teal-400 text-lg font-semibold flex items-center">
          <Image size={20} className="mr-2" />
          Select Tileset
        </h2>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-300"
        >
          <X size={20} />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/30 text-red-400 p-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="p-4 text-center text-stone-400">Loading available tilesets...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {tilesets.map(tileset => (
            <div 
              key={tileset.id}
              className={`p-3 rounded-lg cursor-pointer border ${
                selectedTileset?.id === tileset.id 
                  ? 'border-teal-500 bg-stone-700' 
                  : 'border-stone-700 hover:bg-stone-700/50'
              }`}
              onClick={() => handleSelectTileset(tileset)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-teal-300 font-medium">{tileset.name}</h3>
                {selectedTileset?.id === tileset.id && (
                  <Check size={16} className="text-teal-400" />
                )}
              </div>
              
              <div className="bg-stone-900 rounded h-32 flex items-center justify-center overflow-hidden">
                <img 
                  src={tileset.preview} 
                  alt={tileset.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              <div className="mt-2 text-xs text-stone-400">
                <div>Tile Size: {tileset.tileSize}px</div>
                <div>Columns: {tileset.cols}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-stone-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded text-sm flex items-center"
          disabled={!selectedTileset}
        >
          <Check size={16} className="mr-1" />
          Select Tileset
        </button>
      </div>
    </div>
  );
};

export default TilesetSelector;
