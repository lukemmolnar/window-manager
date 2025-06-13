import React, { useState, useEffect } from 'react';
import { 
  Save, Undo, Redo, Trash2, Copy, Square, Circle, 
  Grid, ZoomIn, ZoomOut, Download, Upload, Plus, Minus,
  Layers, MousePointer, Hammer, Wand2, FileText, Settings,
  Home
} from 'lucide-react';

/**
 * Toolbar component for the Map Editor and Game Window
 */
const MapToolbar = ({ 
  mode = 'edit', // 'edit' or 'game'
  onSave, 
  onUndo, 
  onRedo, 
  onClear, 
  onExportAscii, 
  onImportAscii,
  onToggleGrid,
  onResetView,
  showGrid = true,
  saveStatus = 'saved', // default to 'saved'
  mapData,
  onApplyProperties,
  // Game mode specific props
  gameTitle,
  gameSubtitle,
  isDM = false
}) => {
  const [showProperties, setShowProperties] = useState(false);
  const [mapName, setMapName] = useState(mapData?.name || 'New Map');
  const [mapWidth, setMapWidth] = useState(mapData?.width || 20);
  const [mapHeight, setMapHeight] = useState(mapData?.height || 15);
  const [mapGridSize, setMapGridSize] = useState(mapData?.gridSize || 32);
  const [error, setError] = useState(null);

  // Update state when mapData changes
  useEffect(() => {
    if (mapData) {
      setMapName(mapData.name || 'New Map');
      setMapWidth(mapData.width || 20);
      setMapHeight(mapData.height || 15);
      setMapGridSize(mapData.gridSize || 32);
    }
  }, [mapData]);

  // Handle applying property changes
  const handleApplyProperties = () => {
    // Validate inputs
    if (mapWidth < 1 || mapWidth > 100) {
      setError('Width must be between 1 and 100');
      return;
    }
    if (mapHeight < 1 || mapHeight > 100) {
      setError('Height must be between 1 and 100');
      return;
    }
    if (mapGridSize < 16 || mapGridSize > 64) {
      setError('Grid size must be between 16 and 64');
      return;
    }

    // Clear any errors
    setError(null);

    // Apply changes
    onApplyProperties({
      name: mapName,
      width: Number(mapWidth),
      height: Number(mapHeight),
      gridSize: Number(mapGridSize)
    });
  };

  // Handle number input changes with validation
  const handleNumberChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setter(value === '' ? '' : Number(value));
    }
  };

  // Toggle properties panel
  const toggleProperties = () => {
    setShowProperties(!showProperties);
  };

  return (
    <>
      <div className="flex justify-between items-center p-2 bg-stone-800 border-b border-stone-700">
        {mode === 'edit' ? (
          /* File operations - Edit Mode */
          <div className="flex space-x-1 items-center">
            <button 
              onClick={onSave}
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Save map"
            >
              <Save size={18} />
            </button>
            <button 
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Clear map"
              onClick={onClear}
            >
              <Trash2 size={18} />
            </button>
            <button 
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Export as PNG"
            >
              <Download size={18} />
            </button>
            <button 
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Import tileset"
            >
              <Upload size={18} />
            </button>
            <div className="h-6 border-r border-stone-700 mx-1"></div>
            <button 
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Export as ASCII"
              onClick={onExportAscii}
            >
              <FileText size={18} />
            </button>
            <button 
              className="p-2 hover:bg-stone-700 rounded text-teal-400"
              title="Import from ASCII"
              onClick={onImportAscii}
            >
              <Upload size={18} />
            </button>
          </div>
        ) : (
          /* Game info - Game Mode */
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-teal-100">
              {gameTitle || 'Game View'}
            </span>
            {gameSubtitle && (
              <span className="text-xs text-stone-400">
                {gameSubtitle}
              </span>
            )}
            {isDM && (
              <span className="text-xs bg-amber-800 text-amber-200 px-2 py-1 rounded">
                DM
              </span>
            )}
          </div>
        )}

        {/* Empty space in the middle to maintain layout */}
        <div className="flex-1"></div>

        {/* View options */}
        <div className="flex space-x-1">
          <button
            onClick={onToggleGrid}
            className={`p-2 hover:bg-stone-700 rounded ${
              showGrid ? 'text-teal-400' : 'text-stone-500'
            }`}
            title={showGrid ? "Hide grid" : "Show grid"}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={onResetView}
            className="p-2 hover:bg-stone-700 rounded text-teal-400"
            title="Return to origin (0,0)"
          >
            <Home size={18} />
          </button>
          {mode === 'edit' && (
            <button 
              className={`p-2 hover:bg-stone-700 rounded ${showProperties ? 'bg-stone-700 text-teal-300' : 'text-teal-400'}`}
              title="Map Properties"
              onClick={toggleProperties}
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>
      
      {/* Properties Panel - Expandable - Edit Mode Only */}
      {mode === 'edit' && showProperties && (
        <div className="bg-stone-800 border-b border-stone-700 p-2 grid grid-cols-5 gap-2 items-center text-sm">
          {error && (
            <div className="col-span-5 bg-red-900/30 text-red-400 p-2 rounded mb-2 text-xs">
              {error}
            </div>
          )}
          
          <div className="flex items-center">
            <label className="mr-2 text-stone-400">Width:</label>
            <input
              type="text"
              value={mapWidth}
              onChange={handleNumberChange(setMapWidth)}
              className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
            />
          </div>
          
          <div className="flex items-center">
            <label className="mr-2 text-stone-400">Height:</label>
            <input
              type="text"
              value={mapHeight}
              onChange={handleNumberChange(setMapHeight)}
              className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
            />
          </div>
          
          <div className="flex items-center">
            <label className="mr-2 text-stone-400">Grid Size:</label>
            <input
              type="text"
              value={mapGridSize}
              onChange={handleNumberChange(setMapGridSize)}
              className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleApplyProperties}
              className="bg-teal-700 hover:bg-teal-600 text-white px-3 py-1 rounded text-xs flex items-center"
            >
              <Save size={14} className="mr-1" />
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MapToolbar;
