import React from 'react';
import { 
  Save, Undo, Redo, Trash2, Copy, Square, Circle, 
  Grid, ZoomIn, ZoomOut, Download, Upload, Plus, Minus,
  Layers, MousePointer, Hammer, Wand2, FileText, Settings
} from 'lucide-react';

/**
 * Toolbar component for the Map Editor
 */
const MapToolbar = ({ 
  onSave, 
  onUndo, 
  onRedo, 
  onClear, 
  onExportAscii, 
  onImportAscii,
  onShowProperties,
  onToggleGrid,
  showGrid = true,
  saveStatus = 'saved' // default to 'saved'
}) => {

  return (
    <div className="flex justify-between items-center p-2 bg-stone-800 border-b border-stone-700">
      {/* File operations */}
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
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Manage layers"
        >
          <Layers size={18} />
        </button>
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Map Properties"
          onClick={onShowProperties}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

export default MapToolbar;
