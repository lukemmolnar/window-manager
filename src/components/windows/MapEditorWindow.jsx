import React, { useState, useEffect } from 'react';
import { Map } from 'lucide-react';
import MapCanvas from './mapeditor/MapCanvas';
import MapToolbar from './mapeditor/MapToolbar';
import LayerPanel from './mapeditor/LayerPanel';

/**
 * Map Editor Window Component
 * This window allows users to create and edit grid-based maps
 */
const MapEditorWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  // State for map data
  const [mapData, setMapData] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [currentTool, setCurrentTool] = useState('select');
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);

  // Load map data from file when selected
  useEffect(() => {
    if (windowState?.selectedFile?.path && windowState.selectedFile.name.endsWith('.map')) {
      loadMapFromFile(windowState.selectedFile.path);
    }
  }, [windowState?.selectedFile]);

  // Handler for loading a map file
  const loadMapFromFile = async (filePath) => {
    try {
      // Reset state for new file
      setError(null);
      
      // If there's no file path, create a new empty map
      if (!filePath) {
        createNewMap();
        return;
      }
      
      // This is a placeholder - in a real implementation, we would fetch the content
      // from the server using a similar approach to how the file explorer works
      
      // For now, create a simple map structure
      // In the future, this would parse the JSON from the file
      setMapData({
        version: "1.0",
        name: "Sample Map",
        gridSize: 32,
        width: 20,
        height: 15,
        defaultTile: "floor",
        layers: [
          {
            name: "terrain",
            visible: true,
            cells: []
          },
          {
            name: "objects",
            visible: true,
            cells: []
          }
        ],
        tokenPositions: [],
        metadata: {
          author: "user",
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      });
      
      setCurrentLayer(0);
      setIsDirty(false);
    } catch (err) {
      console.error('Error loading map:', err);
      setError('Failed to load map file. It may be corrupted or in an unsupported format.');
    }
  };

  // Create a new empty map
  const createNewMap = () => {
    setMapData({
      version: "1.0",
      name: "New Map",
      gridSize: 32,
      width: 20,
      height: 15,
      defaultTile: "floor",
      layers: [
        {
          name: "terrain",
          visible: true,
          cells: []
        }
      ],
      tokenPositions: [],
      metadata: {
        author: "user",
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    });
    setCurrentLayer(0);
    setIsDirty(true);
  };

  // Handler for saving the map
  const handleSaveMap = async () => {
    if (!mapData) return;
    if (!windowState?.selectedFile?.path) {
      // Would normally prompt for save location
      setError('No file path specified for saving.');
      return;
    }
    
    try {
      // Update modified timestamp
      const updatedMapData = {
        ...mapData,
        metadata: {
          ...mapData.metadata,
          modified: new Date().toISOString()
        }
      };
      
      // This is a placeholder - in a real implementation, we would save the content
      // to the server using a similar approach to how the file explorer works
      console.log('Saving map:', JSON.stringify(updatedMapData, null, 2));
      
      setMapData(updatedMapData);
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

  const handleRenameLayer = (layerIndex, newName) => {
    if (!mapData || !mapData.layers || !mapData.layers[layerIndex]) return;
    
    // Use the provided name instead of prompting
    if (!newName || newName.trim() === '') return;
    
    const newMapData = { ...mapData };
    newMapData.layers[layerIndex] = {
      ...newMapData.layers[layerIndex],
      name: newName
    };
    
    setMapData(newMapData);
    setIsDirty(true);
    
    // Save the changes to the file
    handleSaveMap();
  };

  // Show placeholder if no file is loaded
  if (!mapData) {
    return (
      <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
        <div className="p-2 border-b border-stone-700">
          <h2 className="text-lg font-semibold flex items-center">
            <Map className="mr-2" size={18} />
            Map Editor
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <Map size={48} className="mx-auto mb-4 text-teal-500" />
            <h3 className="text-xl mb-2">Grid Map Editor</h3>
            <p className="text-stone-400">
              {error ? (
                <span className="text-red-400">{error}</span>
              ) : (
                <>
                  Select a .map file to edit, or create a new one.
                  <br />
                  <button 
                    className="mt-4 px-4 py-2 bg-teal-800 hover:bg-teal-700 rounded text-white"
                    onClick={createNewMap}
                  >
                    Create New Map
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render the map editor with all components
  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="p-2 border-b border-stone-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Map className="mr-2" size={18} />
          {mapData.name} {isDirty && '*'}
        </h2>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>
      
      {/* Toolbar */}
      <MapToolbar 
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        onSave={handleSaveMap}
        onUndo={() => console.log('Undo not implemented')}
        onRedo={() => console.log('Redo not implemented')}
        onClear={() => createNewMap()}
      />
      
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

export default MapEditorWindow;
