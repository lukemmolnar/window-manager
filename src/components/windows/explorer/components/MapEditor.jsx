import React, { useState, useRef, useEffect } from 'react';
import { Map, Save, FileDown } from 'lucide-react';
import { 
  createEmptyMap, 
  serializeMap, 
  parseMapFile, 
  convertMapToAscii, 
  convertAsciiToMap 
} from '../../mapeditor/utils/mapUtils';

// Import sub-components
import MapToolbar from '../../mapeditor/MapToolbar';
import MapCanvas from '../../mapeditor/MapCanvas';
import LayerPanel from '../../mapeditor/LayerPanel';
import TilePalette from '../../mapeditor/TilePalette';

/**
 * Map Editor component for use within the FileContent area
 * This component handles the editing of .map files in the file explorer
 */
const MapEditor = ({ fileContent, selectedFile, onSave }) => {
  // State for map data
  const [mapData, setMapData] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [currentTool, setCurrentTool] = useState('floor'); // Default to floor instead of select
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [showAsciiModal, setShowAsciiModal] = useState(false);
  const [asciiContent, setAsciiContent] = useState('');
  const [asciiImportText, setAsciiImportText] = useState('');
  const [asciiModalMode, setAsciiModalMode] = useState('export'); // 'export' or 'import'
  const [selectedTileId, setSelectedTileId] = useState(0);
  const [showGrid, setShowGrid] = useState(true); // State for grid visibility
  
  // Reference for auto-save functionality
  const autoSaveTimeoutRef = useRef(null);

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
  
  // Auto-save when map data changes
  useEffect(() => {
    // If the map is dirty (has unsaved changes), auto-save after a delay
    if (isDirty && mapData) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set save status to 'saving'
      setSaveStatus('saving');
      
      // Set a new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveMap();
      }, 1000); // 1 second debounce
    }
    
    // Cleanup function to clear the timeout when component unmounts
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, mapData]);

  // Handler for saving the map
  const handleSaveMap = () => {
    if (!mapData) return;
    
    try {
      // Serialize the map data to JSON string
      const mapContent = serializeMap(mapData);
      
      // Debug logs to track the data flow
      console.log('[DEBUG] Map Editor - Saving map data:', {
        mapDataExists: !!mapData,
        serializedLength: mapContent?.length,
        serializedPreview: mapContent?.substring(0, 100) + '...',
        selectedFile: selectedFile?.path
      });
      
      // Set status to saving
      setSaveStatus('saving');
      
      // Call the parent onSave function
      onSave(mapContent);
      
      // Update state
      setIsDirty(false);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving map:', err);
      setError('Failed to save map file.');
      setSaveStatus('error');
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
      // Create the cell data based on the tool type
      let cellData = { x, y, type: tool };
      
      // For floor tiles, include the selected tile ID
      if (tool === 'floor') {
        cellData.tileId = selectedTileId;
      }
      
      // If a cell already exists at this position, update it
      if (existingCellIndex !== -1) {
        layerData.cells[existingCellIndex] = cellData;
      } else {
        // Otherwise, add a new cell
        layerData.cells.push(cellData);
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
    if (!mapData || !mapData.layers || !mapData.layers[layerIndex] || !newName) return;
    
    const newMapData = { ...mapData };
    newMapData.layers[layerIndex] = {
      ...newMapData.layers[layerIndex],
      name: newName
    };
    
    setMapData(newMapData);
    setIsDirty(true);
  };

  // Handler for exporting to ASCII
  const handleExportAscii = () => {
    if (!mapData) return;
    
    try {
      // Convert the map data to ASCII
      const ascii = convertMapToAscii(mapData);
      setAsciiContent(ascii);
      setAsciiModalMode('export');
      setShowAsciiModal(true);
    } catch (err) {
      console.error('Error exporting to ASCII:', err);
      setError('Failed to export map to ASCII format.');
    }
  };

  // Handler for importing from ASCII
  const handleImportAscii = () => {
    setAsciiImportText('');
    setAsciiModalMode('import');
    setShowAsciiModal(true);
  };

  // Handler for confirming ASCII import
  const handleConfirmAsciiImport = () => {
    if (!asciiImportText.trim()) {
      setError('No ASCII content to import.');
      return;
    }
    
    try {
      // Convert ASCII to map data
      const newMapData = convertAsciiToMap(asciiImportText, mapData.name);
      
      // Preserve metadata from existing map if possible
      if (mapData.metadata) {
        newMapData.metadata = {
          ...newMapData.metadata,
          author: mapData.metadata.author || 'user',
          modified: new Date().toISOString()
        };
      }
      
      // Update the map data
      setMapData(newMapData);
      setIsDirty(true);
      setShowAsciiModal(false);
    } catch (err) {
      console.error('Error importing from ASCII:', err);
      setError('Failed to import ASCII map. The format may be invalid.');
    }
  };

  // Handler for downloading the ASCII map
  const handleDownloadAscii = () => {
    if (!asciiContent) return;
    
    try {
      // Create a blob with the ASCII content
      const blob = new Blob([asciiContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mapData.name || 'map'}.txt`;
      
      // Append the anchor to the document, click it, and remove it
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up by revoking the object URL
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading ASCII map:', err);
      setError('Failed to download ASCII map.');
    }
  };


  // Handler for applying map property changes
  const handleApplyProperties = (properties) => {
    if (!mapData) return;

    const newMapData = { 
      ...mapData,
      name: properties.name,
      width: properties.width,
      height: properties.height,
      gridSize: properties.gridSize
    };

    // Update map data
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
        onSave={handleSaveMap}
        onUndo={() => console.log('Undo not implemented')}
        onRedo={() => console.log('Redo not implemented')}
        onClear={() => {
          setMapData(createEmptyMap(mapData.name));
          setIsDirty(true);
        }}
        onExportAscii={handleExportAscii}
        onImportAscii={handleImportAscii}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showGrid={showGrid}
        saveStatus={saveStatus}
        mapData={mapData}
        onApplyProperties={handleApplyProperties}
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
          selectedTileId={selectedTileId}
          onEdit={handleEdit}
          showGrid={showGrid}
        />
        
        {/* Layer panel with integrated tile palette */}
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
          selectedTileId={selectedTileId}
          onSelectTile={setSelectedTileId}
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
        />
      </div>
      
      
      {/* ASCII Modal */}
      {showAsciiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-stone-800 border border-stone-700 rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-stone-700">
              <h2 className="text-lg font-semibold text-teal-300">
                {asciiModalMode === 'export' ? 'ASCII Map Export' : 'Import ASCII Map'}
              </h2>
              <button 
                onClick={() => setShowAsciiModal(false)}
                className="p-1 hover:bg-stone-700 rounded text-teal-400"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-auto">
              {asciiModalMode === 'export' ? (
                <div className="flex flex-col h-full">
                  <p className="mb-4 text-sm text-stone-300">
                    This is the ASCII representation of your map. Each character represents a cell type:
                    <br />
                    <code className="bg-stone-900 px-1 rounded">
                      # = Wall, . = Floor, + = Door, " = Grass, ' = Ashes, &gt; = Stairs, @ = Spawn
                    </code>
                  </p>
                  <pre className="bg-stone-900 p-4 rounded font-mono text-teal-100 text-sm overflow-auto flex-1 whitespace-pre">
                    {asciiContent}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <p className="mb-4 text-sm text-stone-300">
                    Paste ASCII map content below. Each character represents a cell type:
                    <br />
                    <code className="bg-stone-900 px-1 rounded">
                      # = Wall, . = Floor, + = Door, " = Grass, ' = Ashes, &gt; = Stairs, @ = Spawn
                    </code>
                  </p>
                  <textarea 
                    className="bg-stone-900 p-4 rounded font-mono text-teal-100 text-sm overflow-auto flex-1 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={asciiImportText}
                    onChange={e => setAsciiImportText(e.target.value)}
                    placeholder="Paste ASCII map here..."
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-700 flex justify-end space-x-2">
              <button 
                onClick={() => setShowAsciiModal(false)}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-teal-100"
              >
                Cancel
              </button>
              
              {asciiModalMode === 'export' ? (
                <button 
                  onClick={handleDownloadAscii}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded text-teal-100 flex items-center"
                >
                  <FileDown size={16} className="mr-2" />
                  Download ASCII
                </button>
              ) : (
                <button 
                  onClick={handleConfirmAsciiImport}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded text-teal-100"
                >
                  Import
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEditor;
