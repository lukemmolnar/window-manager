import React from 'react';
import { 
  Save, Undo, Redo, Trash2, Copy, Square, Circle, 
  Grid, ZoomIn, ZoomOut, Download, Upload, Plus, Minus,
  Layers, MousePointer, Hammer, Wand2, FileText
} from 'lucide-react';

/**
 * Toolbar component for the Map Editor
 */
const MapToolbar = ({ 
  currentTool, 
  setCurrentTool, 
  onSave, 
  onUndo, 
  onRedo, 
  onClear, 
  onExportAscii, 
  onImportAscii 
}) => {
  const tools = [
    { id: 'select', icon: <MousePointer size={18} />, name: 'Select' },
    { id: 'wall', icon: <Square size={18} />, name: 'Wall' },
    { id: 'floor', icon: <Grid size={18} />, name: 'Floor' },
    { id: 'door', icon: <Minus size={18} />, name: 'Door' },
    { id: 'erase', icon: <Trash2 size={18} />, name: 'Erase' },
  ];

  return (
    <div className="flex justify-between items-center p-2 bg-stone-800 border-b border-stone-700">
      {/* File operations */}
      <div className="flex space-x-1">
        <button 
          onClick={onSave}
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Save map"
        >
          <Save size={18} />
        </button>
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Undo"
          onClick={onUndo}
        >
          <Undo size={18} />
        </button>
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Redo"
          onClick={onRedo}
        >
          <Redo size={18} />
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

      {/* Drawing tools */}
      <div className="flex space-x-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`p-2 rounded hover:bg-stone-700 ${
              currentTool === tool.id ? 'bg-teal-900 text-teal-300' : 'text-teal-400'
            }`}
            title={tool.name}
            onClick={() => setCurrentTool(tool.id)}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* View options */}
      <div className="flex space-x-1">
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          className="p-2 hover:bg-stone-700 rounded text-teal-400"
          title="Manage layers"
        >
          <Layers size={18} />
        </button>
      </div>
    </div>
  );
};

export default MapToolbar;
