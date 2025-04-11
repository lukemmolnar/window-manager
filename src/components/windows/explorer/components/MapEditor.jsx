import React, { useState, useRef, useEffect } from 'react';
import { Map, Save } from 'lucide-react';
import { createEmptyMap, serializeMap, parseMapFile } from '../../mapeditor/utils/mapUtils';

// Import sub-components
import MapToolbar from '../../mapeditor/MapToolbar';
import MapCanvas from '../../mapeditor/MapCanvas';
import LayerPanel from '../../mapeditor/LayerPanel';

/**
 * Map Editor component for use within the FileContent area
 * This component handles the editing of .map files in the file explorer
 */
const MapEditor = ({ fileContent, selectedFile, onSave }) => {
  // State for map data
  const [mapData, setMapData] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [currentTool, setCurrentTool] = useState('select');
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);

  // Load map data when fileContent changes
  useEffect(() => {
    try {
      if (fileContent) {
        const parsedMap = parseMapFile(fileContent);
        setMapData(parsedMap);
        setCurrentLayer(0);
        setIsDirty(false);
        setError(null);
      } else {
        // Create a new map if no content
        setMapData(createEmptyMap());
        setIsDirty(true);
      }
    } catch (err) {
      console.error('Error parsing map file:', err);
      setError('Failed to parse map file. Creating a new map.');
      setMapData(createEmptyMap());
      setIsDirty(true);
    }
  }, [fileContent]);

  // Handler for saving the map
  const handleSaveMap = () => {
    if (!mapData) return;
    
    try {
      // Serialize the map data to JSON string
      const mapContent = serializeMap(mapData);
      
      // Call the parent onSave function
      onSave(mapContent);
      
      setIsDirty(false);
    } catch (err) {
      console.error('Error saving map:', err);
      setError('Failed to save map file.');
    }
  };

  // Handler for map edits
  const handleEdit = (x, y, tool) => {
    if (!mapData || !mapData.layers || !mapData.layers[currentLayer]) return;
    
    // Clone the current map data to avoid direct state mutation
    const newMapData = { ...mapData };
    const layerData = { ...newMapData.layers[currentLayer] };
    
    // Find if the cell already exists in this layer
    const existingCellIndex = layerData.cells.findIndex(cell => cell.x === x && cell.y === y);
    
    if (tool === 'erase') {
      // If erasing and the cell exists, remove it
      if (existingCellIndex !== -1) {
        layerData.cells = layerData.cells.filter((_, index) => index !== existingCellIndex);
      }
    } else {
      // If a cell already exists at this position, update it
      if (existingCellIndex !== -1) {
        layerData.cells[existingCellIndex] = { x, y, type: tool };
      } else {
        // Otherwise, add a new cell
        layerData.cells.push({ x, y, type: tool });
      }
    }
    
    // Update the layer in the map data
    newMapData.layers[currentLayer] = layerData;
    
    // Update state
    setMapData(newMapData);
    setIsDirty(true);
  };

  // Layer management functions
  const handleToggleLayerVisibility = (layerIndex) => {
    if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return;
    
    const newMapData = { ...mapData };
    newMapData.layers[layerIndex] = {
      ...newMapData.layers[layerIndex],
      visible: !newMapData.layers[layerIndex].visible
    };
    
    setMapData(newMapData);
    setIsDirty(true);
  };

  const handleAddLayer = () => {
    if (!mapData) return;
    
    const newLayerName = `Layer ${mapData.layers.length + 1}`;
    const newLayer = {
      name: newLayerName,
      visible: true,
      cells: []
    };
    
    const newMapData = { 
      ...mapData,
      layers: [...mapData.layers, newLayer]
    };
    
    setMapData(newMapData);
    setCurrentLayer(newMapData.layers.length - 1);
    setIsDirty(true);
  };

  const handleRemoveLayer = (layerIndex) => {
    if (!mapData || !mapData.layers || mapData.layers.length <= 1) return;
    
    const newMapData = { ...mapData };
    newMapData.layers = newMapData.layers.filter((_, index) => index !== layerIndex);
    
    setMapData(newMapData);
    
    // Adjust current layer if necessary
    if (currentLayer >= newMapData.layers.length) {
      setCurrentLayer(newMapData.layers.length - 1);
    }
    
    setIsDirty(true);
  };

  const handleMoveLayerUp = (layerIndex) => {
    if (!mapData || !mapData.layers || layerIndex >= mapData.layers.length - 1) return;
    
    const newMapData = { ...mapData };
    const layers = [...newMapData.layers];
    
    // Swap layers
    [layers[layerIndex], layers[layerIndex + 1]] = [layers[layerIndex + 1], layers[layerIndex]];
    
    newMapData.layers = layers;
    setMapData(newMapData);
    
    // Update current layer if necessary
    if (currentLayer === layerIndex) {
      setCurrentLayer(layerIndex + 1);
    } else if (currentLayer === layerIndex + 1) {
      setCurrentLayer(layerIndex);
    }
    
    setIsDirty(true);
  };

  const handleMoveLayerDown = (layerIndex) => {
    if (!mapData || !mapData.layers || layerIndex <= 0) return;
    
    const newMapData = { ...mapData };
    const layers = [...newMapData.layers];
    
    // Swap layers
    [layers[layerIndex], layers[layerIndex - 1]] = [layers[layerIndex - 1], layers[layerIndex]];
    
    newMapData.layers = layers;
    setMapData(newMapData);
    
    // Update current layer if necessary
    if (currentLayer === layerIndex) {
      setCurrentLayer(layerIndex - 1);
    } else if (currentLayer === layerIndex - 1) {
      setCurrentLayer(layerIndex);
    }
    
    setIsDirty(true);
  };

  const handleRenameLayer = (layerIndex) => {
    if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return;
    
    // In a real implementation, this would use a dialog component
    const newName = prompt('Enter new layer name:', mapData.layers[layerIndex].name);
    if (!newName) return;
    
    const newMapData = { ...mapData };
    newMapData.layers[layerIndex] = {
      ...newMapData.layers[layerIndex],
      name: newName
    };
    
    setMapData(newMapData);
    setIsDirty(true);
  };

  // If map data isn't loaded yet, show a loading state
  if (!mapData) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-teal-300">Loading map editor...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      {/* Toolbar */}
      <MapToolbar 
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        onSave={handleSaveMap}
        onUndo={() => console.log('Undo not implemented')}
        onRedo={() => console.log('Redo not implemented')}
        onClear={() => {
          setMapData(createEmptyMap(mapData.name));
          setIsDirty(true);
        }}
      />
      
      {/* Error message */}
      {error && (
        <div className="p-2 bg-red-900 text-red-200 text-sm">
          {error}
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas for map editing */}
        <MapCanvas 
          mapData={mapData}
          currentLayer={currentLayer}
          currentTool={currentTool}
          onEdit={handleEdit}
        />
        
        {/* Layer panel */}
        <LayerPanel 
          layers={mapData.layers}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          onToggleLayerVisibility={handleToggleLayerVisibility}
          onAddLayer={handleAddLayer}
          onRemoveLayer={handleRemoveLayer}
          onMoveLayerUp={handleMoveLayerUp}
          onMoveLayerDown={handleMoveLayerDown}
          onRenameLayer={handleRenameLayer}
        />
      </div>
    </div>
  );
};

export default MapEditor;
