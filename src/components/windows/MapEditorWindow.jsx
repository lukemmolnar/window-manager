import React, { useState, useEffect } from 'react';
import { Map } from 'lucide-react';
import MapCanvas from './mapeditor/MapCanvas';
import MapToolbar from './mapeditor/MapToolbar';
import LayerPanel from './mapeditor/LayerPanel';
import TilePalette from './mapeditor/TilePalette';
import { setCellInLayer, removeCellFromLayer } from './mapeditor/utils/mapUtils';

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
  const [selectedTileId, setSelectedTileId] = useState(0);
  const [selectedTileType, setSelectedTileType] = useState('floor');
  const [selectedRotation, setSelectedRotation] = useState(0); // 0, 90, 180, 270 degrees

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
      console.log("========== SAVING MAP ==========");
      console.log("Current window.currentMapRotation value:", window.currentMapRotation);
      console.log("Current selectedRotation state value:", selectedRotation);
      
      // Update modified timestamp
      const updatedMapData = {
        ...mapData,
        metadata: {
          ...mapData.metadata,
          modified: new Date().toISOString()
        }
      };
      
      // CRITICAL FIX: Ensure every cell has a rotation property BEFORE serialization
      // This guarantees rotation is always in the JSON output
      updatedMapData.layers.forEach(layer => {
        if (layer.cells && Array.isArray(layer.cells)) {
          layer.cells = layer.cells.map(cell => {
            // If rotation doesn't exist, add it with default value of 0
            if (cell.rotation === undefined) {
              return { ...cell, rotation: 0 };
            }
            // Ensure rotation is a number (not string)
            if (typeof cell.rotation !== 'number') {
              return { ...cell, rotation: Number(cell.rotation) };
            }
            return cell;
          });
        }
      });
      
      // Debug: Check if any cells have rotation values
      let rotationCount = 0;
      updatedMapData.layers.forEach(layer => {
        layer.cells.forEach(cell => {
          console.log(`Cell at (${cell.x}, ${cell.y}) has rotation: ${cell.rotation}`);
          rotationCount++;
        });
      });
      
      console.log(`Total cells with rotation property: ${rotationCount}`);
      
      // Use a custom replacer function to ensure rotation is always included in the JSON
      const serializedMap = JSON.stringify(updatedMapData, (key, value) => {
        // Always include rotation in the output
        if (key === 'rotation') {
          return value === undefined ? 0 : Number(value);
        }
        return value;
      }, 2);
      
      console.log('Saving map with explicit rotation values included');
      
      // Actually save the map data to localStorage for demo purposes
      localStorage.setItem('last_saved_map', serializedMap);
      localStorage.setItem('last_saved_map_pretty', JSON.stringify(JSON.parse(serializedMap), null, 2));
      console.log('Map saved to localStorage - check with: localStorage.getItem("last_saved_map_pretty")');
      
      // Update state
      setMapData(updatedMapData);
      setIsDirty(false);
    } catch (err) {
      console.error('Error saving map:', err);
      setError('Failed to save map file.');
    }
  };

  // Handler for map edits
  const handleEdit = (x, y, tool, rotation = 0, selectedTileId) => {
    if (!mapData || !mapData.layers || !mapData.layers[currentLayer]) return;
    
    // Log that we're receiving the rotation value
    console.log("============== EDIT CELL ==============");
    console.log("MapEditorWindow received edit with rotation:", rotation);
    console.log(`Cell coordinates: (${x}, ${y}), Tool: ${tool}`);
    
    // Ensure rotation is a number
    const numRotation = Number(rotation);
    console.log("Rotation converted to number:", numRotation);
    
    let newMapData;
    
    if (tool === 'erase') {
      // If erasing, remove the cell from the layer
      newMapData = removeCellFromLayer(mapData, currentLayer, x, y);
      console.log("Cell erased successfully");
    } else {
      // For tile placement tools (floor, wall, etc.), use the selected tile and rotation
      console.log(`Setting cell in layer ${currentLayer} with tileId: ${selectedTileId}, rotation: ${numRotation}`);
      
      newMapData = setCellInLayer(
        mapData, 
        currentLayer, 
        x, 
        y, 
        tool, 
        selectedTileId, 
        numRotation // Use the numeric rotation value
      );
      
      // Check if the rotation was stored correctly
      const updatedCell = newMapData.layers[currentLayer].cells.find(
        cell => cell.x === x && cell.y === y
      );
      
      if (updatedCell) {
        console.log("Cell updated:", updatedCell);
        if (updatedCell.rotation !== undefined) {
          console.log(`Rotation set successfully: ${updatedCell.rotation}°`);
        } else {
          console.warn("Rotation was not stored in the cell data!");
        }
      } else {
        console.warn("Could not find the updated cell in the map data!");
      }
    }
    
    // Update state
    setMapData(newMapData);
    setIsDirty(true);
    
    // Store to localStorage for debugging
    localStorage.setItem('debug_mapData', JSON.stringify(newMapData));
    console.log("Map data stored to localStorage for debugging");
    console.log("=========================================");
  };
  
  // Handle tile selection
  const handleSelectTile = (tileId) => {
    setSelectedTileId(tileId);
    // When selecting a tile, switch to the corresponding tool
    if (currentTool === 'select' || currentTool === 'erase') {
      setCurrentTool(selectedTileType);
    }
  };
  
  // Handle tile type change
  const handleChangeTileType = (tileType) => {
    setSelectedTileType(tileType);

    if (tileType === 'shadow' && selectedTileId === undefined) {
      onSelectTile(0); // Set a default shadow tile ID
    }
    // When changing tile type, also change the current tool
    if (currentTool !== 'select' && currentTool !== 'erase') {
      setCurrentTool(tileType);
    }
  };
  
  // Handle tile rotation - fixes React async state update issue
  const handleRotateTile = (rotation) => {
    console.log("---------------------------------------");
    console.log("handleRotateTile called with rotation:", rotation);
    
    // Convert to number to ensure consistent handling
    const numRotation = Number(rotation);
    
    // Update the DOM immediately for visual feedback (safely)
    const debugElement = document.getElementById('debug-rotation-value');
    if (debugElement) {
      debugElement.textContent = `Rotation set to: ${numRotation}°`;
    }
    
    // Set window-level variable to ensure it's globally accessible
    window.currentMapRotation = numRotation;
    
    // Update the state
    setSelectedRotation(numRotation);
    
    // Force update any tile displays
    if (document.getElementById('tile-rotation-display')) {
      document.getElementById('tile-rotation-display').textContent = `${numRotation}°`;
    }
    
    // When rotating a tile, make sure we're in a tile placement mode
    if (currentTool === 'select' || currentTool === 'erase') {
      setCurrentTool(selectedTileType);
    }
    
    console.log("Rotation has been set to:", numRotation);
    console.log("Global rotation tracker:", window.currentMapRotation);
    console.log("---------------------------------------");
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
      
      {/* For debugging - hidden in production */}
      <div id="debug-rotation-value" className="p-1 bg-red-800 text-white text-xs">
        Rotation set to: {selectedRotation}°
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas for map editing */}
          <MapCanvas 
            mapData={mapData}
            currentLayer={currentLayer}
            currentTool={currentTool}
            onEdit={handleEdit}
            selectedTileId={selectedTileId}
            selectedRotation={selectedRotation}
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
        
        {/* Tile Palette */}
        <TilePalette 
          onSelectTile={handleSelectTile}
          selectedTileId={selectedTileId}
          tileType={selectedTileType}
          onChangeTileType={handleChangeTileType}
          selectedRotation={selectedRotation}
          onRotateTile={handleRotateTile}
        />
      </div>
    </div>
  );
};

export default MapEditorWindow;
