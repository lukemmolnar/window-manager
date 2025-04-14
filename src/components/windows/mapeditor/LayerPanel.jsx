import React from 'react';
import { Eye, EyeOff, Layers, Plus, Trash2, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';
import TilePalette from './TilePalette';

/**
 * Layer panel component for the Map Editor
 * Allows for managing layers (visibility, order, etc) and selecting tiles
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
  selectedTileId = 0,
  onSelectTile,
  currentTool,
  setCurrentTool
}) => {
  return (
    <div className="w-64 bg-stone-800 border-l border-stone-700 flex flex-col overflow-hidden">
      {/* Tile Type and Palette Section */}
      <div className="border-b border-stone-700">
        <TilePalette 
          selectedTileId={selectedTileId}
          onSelectTile={onSelectTile}
          tileType={currentTool}
          onChangeTileType={setCurrentTool}
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
                      
                      {/* Layer name */}
                      <span className="text-sm">{layer.name}</span>
                    </div>
                    
                    {/* Layer operations */}
                    <div className="flex">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameLayer(actualIndex);
                        }}
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
