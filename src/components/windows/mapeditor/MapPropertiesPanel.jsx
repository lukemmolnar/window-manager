import React, { useState } from 'react';
import { Grid, Save, Settings, X } from 'lucide-react';

/**
 * Panel for editing map properties
 */
const MapPropertiesPanel = ({ mapData, onApply, onCancel }) => {
  const [width, setWidth] = useState(mapData ? mapData.width : 20);
  const [height, setHeight] = useState(mapData ? mapData.height : 15);
  const [gridSize, setGridSize] = useState(mapData ? mapData.gridSize : 32);
  const [name, setName] = useState(mapData ? mapData.name : 'New Map');
  const [error, setError] = useState(null);

  // Validate input and apply changes
  const handleApply = () => {
    // Validate width and height
    if (width < 1 || width > 100) {
      setError('Width must be between 1 and 100');
      return;
    }
    
    if (height < 1 || height > 100) {
      setError('Height must be between 1 and 100');
      return;
    }
    
    if (gridSize < 16 || gridSize > 64) {
      setError('Grid size must be between 16 and 64');
      return;
    }
    
    // Apply changes
    onApply({
      width: Number(width),
      height: Number(height),
      gridSize: Number(gridSize),
      name
    });
  };

  // Handle input changes
  const handleInputChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setter(value === '' ? '' : Number(value));
    }
  };

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 w-64">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-teal-400 text-sm font-semibold flex items-center">
          <Settings size={16} className="mr-1" />
          Map Properties
        </h2>
        <button
          onClick={onCancel}
          className="text-stone-500 hover:text-stone-300"
        >
          <X size={16} />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/30 text-red-400 p-2 rounded mb-3 text-xs">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Map Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
          />
        </div>
        
        <div>
          <label className="block text-xs text-stone-400 mb-1">Width (cells)</label>
          <input
            type="text"
            value={width}
            onChange={handleInputChange(setWidth)}
            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
          />
        </div>
        
        <div>
          <label className="block text-xs text-stone-400 mb-1">Height (cells)</label>
          <input
            type="text"
            value={height}
            onChange={handleInputChange(setHeight)}
            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
          />
        </div>
        
        <div>
          <label className="block text-xs text-stone-400 mb-1">Grid Size (pixels)</label>
          <input
            type="text"
            value={gridSize}
            onChange={handleInputChange(setGridSize)}
            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600"
          />
        </div>
        
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleApply}
            className="bg-teal-700 hover:bg-teal-600 text-teal-100 px-3 py-1 rounded text-xs flex items-center"
          >
            <Save size={14} className="mr-1" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPropertiesPanel;
