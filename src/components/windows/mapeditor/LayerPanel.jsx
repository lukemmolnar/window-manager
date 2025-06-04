import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Layers, Plus, Trash2, ArrowUp, ArrowDown, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import TilePalette from './TilePalette';
import OpacitySlider from './components/OpacitySlider';

/**
 * LayerPanel - Layer management and tile selection interface
 * 
 * @component
 * @description Provides comprehensive layer management functionality including:
 * - Layer visibility controls
 * - Layer opacity adjustment
 * - Layer reordering (up/down)
 * - Layer renaming with inline editing
 * - Layer addition and removal
 * - Brush size control
 * - Integrated tile palette
 * 
 * @param {Object} props - Component props
 * @param {Array} props.layers - Array of layer objects with name, visible, cells, opacity properties
 * @param {number} props.currentLayer - Index of the currently selected layer
 * @param {function} props.setCurrentLayer - Callback to change the current layer
 * @param {function} props.onToggleLayerVisibility - Callback to toggle layer visibility
 * @param {function} props.onAddLayer - Callback to add a new layer
 * @param {function} props.onRemoveLayer - Callback to remove a layer
 * @param {function} props.onMoveLayerUp - Callback to move layer up in render order
 * @param {function} props.onMoveLayerDown - Callback to move layer down in render order
 * @param {function} props.onRenameLayer - Callback to rename a layer
 * @param {function} props.onUpdateLayerOpacity - Callback to update layer opacity
 * @param {number} [props.selectedTileId=0] - Currently selected tile ID
 * @param {function} props.onSelectTile - Callback when a tile is selected
 * @param {number} props.selectedRotation - Current tile rotation in degrees
 * @param {function} props.onRotateTile - Callback to rotate tiles
 * @param {string} props.currentTool - Currently selected editing tool
 * @param {function} props.setCurrentTool - Callback to change the current tool
 * @param {number} [props.brushSize=1] - Current brush size for painting
 * @param {function} props.setBrushSize - Callback to change brush size
 * 
 * @example
 * <LayerPanel
 *   layers={mapData.layers}
 *   currentLayer={0}
 *   setCurrentLayer={setCurrentLayer}
 *   onToggleLayerVisibility={handleToggleVisibility}
 *   onAddLayer={handleAddLayer}
 *   onRemoveLayer={handleRemoveLayer}
 *   // ... other props
 * />
 */
const LayerPanel = ({ 
  layers, 
  currentLayer, 
  setCurrentLayer, 
  onToggleLayerVisibility, 
  onAddLayer, 
  onRemoveLayer, 
  onMoveLayerUp, 
  onMoveLayerDown, 
  onRenameLayer,
  onUpdateLayerOpacity,
  selectedTileId = 0,
  selectedTilesetId = null,
  onSelectTile,
  selectedRotation, // Add prop for receiving rotation state
  onRotateTile,     // Add prop for passing rotation handler
  currentTool,
  setCurrentTool,
  brushSize = 1,
  setBrushSize
}) => {
  // State for tracking which layer is being edited and the current edited name
  const [editingLayerIndex, setEditingLayerIndex] = useState(null);
  const [editedLayerName, setEditedLayerName] = useState('');
  const [expandedOpacityLayers, setExpandedOpacityLayers] = useState({});
  const layerNameInputRef = useRef(null);
  
  /**
   * Toggles opacity control visibility for a specific layer
   * @param {number} layerIndex - Index of the layer to toggle opacity controls for
   * @param {Event} e - Click event object
   * @returns {void}
   */
  const toggleOpacityControls = (layerIndex, e) => {
    e.stopPropagation();
    setExpandedOpacityLayers(prev => ({
      ...prev,
      [layerIndex]: !prev[layerIndex]
    }));
  };
  
  /**
   * Effect to focus the layer name input when editing mode is activated
   * @listens editingLayerIndex
   */
  useEffect(() => {
    if (editingLayerIndex !== null && layerNameInputRef.current) {
      layerNameInputRef.current.focus();
    }
  }, [editingLayerIndex]);
  
  /**
   * Initiates layer name editing mode
   * @param {Event} e - Click event object
   * @param {number} layerIndex - Index of the layer to edit
   * @returns {void}
   */
  const handleStartEditing = (e, layerIndex) => {
    e.stopPropagation();
    setEditingLayerIndex(layerIndex);
    setEditedLayerName(layers[layerIndex].name);
  };
  
  /**
   * Saves the edited layer name and exits editing mode
   * @param {number} layerIndex - Index of the layer being edited
   * @returns {void}
   */
  const handleSaveLayerName = (layerIndex) => {
    if (editedLayerName.trim()) {
      onRenameLayer(layerIndex, editedLayerName);
    }
    setEditingLayerIndex(null);
  };
  
  /**
   * Handles keyboard events in the layer name input field
   * @param {KeyboardEvent} e - Keyboard event object
   * @param {number} layerIndex - Index of the layer being edited
   * @returns {void}
   */
  const handleInputKeyDown = (e, layerIndex) => {
    if (e.key === 'Enter') {
      handleSaveLayerName(layerIndex);
    } else if (e.key === 'Escape') {
      setEditingLayerIndex(null);
    }
  };

  return (
    <div className="w-64 bg-stone-800 border-l border-stone-700 flex flex-col overflow-hidden">
      {/* Brush Size Control */}
      <div className="p-2 border-b border-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-teal-400">BRUSH SIZE:</span>
          <div className="flex items-center">
            <button
              onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
              className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 rounded-l text-teal-300 text-xs focus:outline-none"
            >
              -
            </button>
            <input
                type="number"
                value={brushSize}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0) setBrushSize(value);
                }}
                className="w-10 bg-stone-700 text-xs text-teal-100 px-1 py-0.5 border-x-0 focus:outline-none text-center
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="1"
                max="10"
              />
            <button
              onClick={() => setBrushSize(Math.min(10, brushSize + 1))}
              className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 rounded-r text-teal-300 text-xs focus:outline-none"
            >
              +
            </button>
          </div>
        </div>
        <div className="text-xs text-stone-400 mt-1">
          {brushSize}×{brushSize}
        </div>
      </div>
      
      {/* Tile Type and Palette Section */}
      <div className="border-b border-stone-700">
        <TilePalette 
          selectedTileId={selectedTileId}
          selectedTilesetId={selectedTilesetId} // ← ADD THIS LINE!
          onSelectTile={onSelectTile}
          selectedRotation={selectedRotation}
          onRotateTile={onRotateTile}         
          tileType={currentTool}
          onChangeTileType={setCurrentTool}
          createWindow={() => console.log('Marketplace not available in LayerPanel mode')}
        />
      </div>

      <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
        <div className="flex items-center">
          <Layers size={14} className="mr-2" />
          <span>LAYERS</span>
        </div>
        <button
          onClick={onAddLayer}
          className="p-1 rounded hover:bg-stone-700 text-teal-400"
          title="Add new layer"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        {layers && layers.length > 0 ? (
          <div className="p-2">
            {/* Show layers in reverse order so top layer is shown first */}
            {[...layers].reverse().map((layer, idx) => {
              // Calculate the actual index
              const actualIndex = layers.length - 1 - idx;
              const isActive = currentLayer === actualIndex;
              
              return (
                <div 
                  key={`layer-${actualIndex}`}
                  className={`mb-2 p-2 rounded border ${
                    isActive 
                      ? 'bg-stone-700 border-teal-500 text-teal-300' 
                      : 'bg-stone-800 border-stone-700 text-teal-50 hover:bg-stone-700'
                  }`}
                  onClick={() => setCurrentLayer(actualIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {/* Layer visibility toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLayerVisibility(actualIndex);
                        }}
                        className="mr-2 hover:bg-stone-600 p-1 rounded"
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      
                      {/* Layer name - either editable or static */}
                      {editingLayerIndex === actualIndex ? (
                        <input
                          ref={layerNameInputRef}
                          className="bg-stone-600 text-sm text-teal-100 px-1 py-0.5 rounded border border-teal-500 focus:outline-none"
                          value={editedLayerName}
                          onChange={(e) => setEditedLayerName(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, actualIndex)}
                          onBlur={() => handleSaveLayerName(actualIndex)}
                          onClick={(e) => e.stopPropagation()}
                          size={15}
                        />
                      ) : (
                        <span className="text-sm">{layer.name}</span>
                      )}
                    </div>
                    
                    {/* Layer operations */}
                    <div className="flex">
                      {/* Toggle opacity controls button */}
                      <button
                        onClick={(e) => toggleOpacityControls(actualIndex, e)}
                        className={`p-1 hover:bg-stone-600 rounded ${expandedOpacityLayers[actualIndex] ? 'bg-stone-600' : ''}`}
                        title="Toggle opacity controls"
                      >
                        {expandedOpacityLayers[actualIndex] ? 
                          <ChevronUp size={14} /> : 
                          <ChevronDown size={14} />
                        }
                      </button>
                      <button
                        onClick={(e) => handleStartEditing(e, actualIndex)}
                        className="p-1 hover:bg-stone-600 rounded"
                        title="Rename layer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveLayerUp(actualIndex);
                        }}
                        className="p-1 hover:bg-stone-600 rounded"
                        title="Move layer up"
                        disabled={actualIndex === layers.length - 1}
                      >
                        <ArrowUp size={14} className={actualIndex === layers.length - 1 ? "opacity-30" : ""} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveLayerDown(actualIndex);
                        }}
                        className="p-1 hover:bg-stone-600 rounded"
                        title="Move layer down"
                        disabled={actualIndex === 0}
                      >
                        <ArrowDown size={14} className={actualIndex === 0 ? "opacity-30" : ""} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveLayer(actualIndex);
                        }}
                        className="p-1 hover:bg-red-900 rounded text-red-400 hover:text-red-300"
                        title="Delete layer"
                        disabled={layers.length <= 1}
                      >
                        <Trash2 size={14} className={layers.length <= 1 ? "opacity-30" : ""} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Opacity controls - only shown when expanded */}
                  {expandedOpacityLayers[actualIndex] && (
                    <div 
                      className="mt-2 px-1 pt-2 border-t border-stone-600" 
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center">
                        <div className="text-xs text-stone-400 mr-2 w-14">Opacity:</div>
                        
                        {/* Numeric input */}
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={Math.round((layer.opacity || 1.0) * 100)}
                            onChange={(e) => {
                              // Get the value as a number
                              let value = parseInt(e.target.value, 10);
                              
                              // Validate: ensure it's a number between 0-100
                              if (isNaN(value)) value = 100;
                              value = Math.max(0, Math.min(100, value));
                              
                              // Convert percentage to decimal (0-1 range) and update
                              const opacityValue = value / 100;
                              if (onUpdateLayerOpacity) {
                                onUpdateLayerOpacity(actualIndex, opacityValue);
                              }
                            }}
                            className="w-10 bg-stone-700 text-xs text-teal-100 px-1 py-0.5 rounded border border-stone-600 focus:border-teal-500 focus:outline-none text-center"
                            title="Layer opacity (0-100%)"
                          />
                          <span className="text-xs text-stone-400 ml-1">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-stone-500">No layers defined</span>
          </div>
        )}
      </div>
      
      {/* Layer information */}
      <div className="p-2 border-t border-stone-700 text-xs">
        {layers && currentLayer !== undefined && layers[currentLayer] ? (
          <div>
            <div className="text-stone-400">Selected: {layers[currentLayer].name}</div>
            <div className="text-stone-400">Total cells: {layers[currentLayer].cells?.length || 0}</div>
          </div>
        ) : (
          <div className="text-stone-500">No layer selected</div>
        )}
      </div>
    </div>
  );
};

export default LayerPanel;
