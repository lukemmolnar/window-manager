import React, { useState, useEffect, useCallback } from 'react';
import { 
  createEmptyCanvas, 
  createTextNode, 
  createEdge, 
  generateId 
} from '../../utils/canvasUtils';
import CanvasContainer from './CanvasContainer';
import { 
  Plus, 
  Save, 
  Trash2, 
  Type,
  Link as LinkIcon,
  ArrowRight
} from 'lucide-react';

/**
 * Canvas Editor component that implements the JSONCanvas format
 * This is the main component for editing .canvas files
 */
const CanvasEditor = ({ fileContent, selectedFile, onSave }) => {
  const [canvasData, setCanvasData] = useState(createEmptyCanvas());
  const [canvasName, setCanvasName] = useState('Untitled Canvas');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [showNodeCreator, setShowNodeCreator] = useState(false);
  const [newNodeText, setNewNodeText] = useState('');
  const [showConnectionCreator, setShowConnectionCreator] = useState(false);
  const [connectionNodes, setConnectionNodes] = useState({ source: '', target: '' });

  // Load canvas data when fileContent changes
  useEffect(() => {
    try {
      if (fileContent) {
        setIsLoading(true);
        
        // Parse the JSON canvas file
        const parsed = JSON.parse(fileContent);
        
        // Check if it has the basic JSONCanvas structure
        if (parsed.nodes || parsed.edges) {
          setCanvasData({
            nodes: parsed.nodes || [],
            edges: parsed.edges || []
          });
          
          // Extract canvas name from file path
          if (selectedFile) {
            const pathParts = selectedFile.path.split('/');
            const fileName = pathParts[pathParts.length - 1];
            setCanvasName(fileName.replace('.canvas', ''));
          }
          
          setSaveStatus('saved');
        } else {
          // Create a new canvas if the structure is invalid
          setCanvasData(createEmptyCanvas());
          console.warn('Invalid canvas format, creating new canvas');
        }
        
        setError(null);
      } else {
        // Create a new canvas if no content
        setCanvasData(createEmptyCanvas());
      }
    } catch (err) {
      console.error('Error parsing canvas file:', err);
      setError('Failed to parse canvas file. Creating a new canvas.');
      setCanvasData(createEmptyCanvas());
    } finally {
      setIsLoading(false);
    }
  }, [fileContent, selectedFile]);

  // Save canvas to file
  const handleSaveCanvas = useCallback(() => {
    if (!selectedFile) return;
    
    try {
      // Set status to saving
      setSaveStatus('saving');
      
      // Convert canvasData to proper format for saving
      // Make sure to remove any runtime-only properties
      const saveData = {
        nodes: canvasData.nodes.map(node => ({
          id: node.id,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          text: node.text,
          color: node.color
        })),
        edges: canvasData.edges.map(edge => ({
          id: edge.id,
          fromNode: edge.fromNode,
          toNode: edge.toNode,
          fromSide: edge.fromSide,
          toSide: edge.toSide,
          fromEnd: edge.fromEnd,
          toEnd: edge.toEnd,
          color: edge.color
        }))
      };
      
      // Serialize to JSON
      const jsonData = JSON.stringify(saveData, null, 2);
      
      // Call parent onSave function
      onSave(jsonData);
      
      // Update status
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving canvas:', err);
      setError('Failed to save canvas file.');
      setSaveStatus('error');
    }
  }, [canvasData, selectedFile, onSave]);

  // Auto-save when canvas data changes
  useEffect(() => {
    if (canvasData.nodes.length > 0 || canvasData.edges.length > 0) {
      // Only trigger auto-save if we have content
      const timer = setTimeout(() => {
        handleSaveCanvas();
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timer);
    }
  }, [canvasData, handleSaveCanvas]);

  // Add a new node to the canvas
  const addNode = (type, text) => {
    // Create a node positioned in the center of the visible area
    const centerX = 100;
    const centerY = 100;
    
    let newNode;
    if (type === 'text') {
      newNode = createTextNode(centerX, centerY, text || 'New note');
    } else {
      // Default to text node
      newNode = createTextNode(centerX, centerY, text || 'New note');
    }
    
    // Add node to canvas data
    setCanvasData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    
    // Reset UI state
    setShowNodeCreator(false);
    setNewNodeText('');
    
    return newNode.id;
  };

  // Create a connection between two nodes
  const createConnection = (sourceId, targetId) => {
    // Find nodes to connect
    const sourceNode = canvasData.nodes.find(n => n.id === sourceId);
    const targetNode = canvasData.nodes.find(n => n.id === targetId);
    
    if (!sourceNode || !targetNode) {
      setError('Could not find one or both nodes to connect.');
      return;
    }
    
    // Create the edge and add it to canvas data
    const newEdge = createEdge(sourceId, targetId);
    
    setCanvasData(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
    
    // Reset UI state
    setShowConnectionCreator(false);
    setConnectionNodes({ source: '', target: '' });
    
    return newEdge.id;
  };

  // Delete selected nodes
  const handleDeleteSelected = (nodeIds) => {
    if (!nodeIds || nodeIds.length === 0) return;
    
    // Remove nodes
    const updatedNodes = canvasData.nodes.filter(node => 
      !nodeIds.includes(node.id)
    );
    
    // Remove edges connected to those nodes
    const updatedEdges = canvasData.edges.filter(edge => 
      !nodeIds.includes(edge.fromNode) && 
      !nodeIds.includes(edge.toNode)
    );
    
    // Update canvas data
    setCanvasData({
      nodes: updatedNodes,
      edges: updatedEdges
    });
  };

  // Handle canvas data changes from CanvasContainer
  const handleCanvasChange = (newData) => {
    setCanvasData(newData);
    setSaveStatus('saving');
  };

  // If the canvas is still loading, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-teal-300">Loading canvas editor...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      {/* Toolbar */}
      <div className="p-2 border-b border-stone-700 flex justify-between items-center bg-stone-800">
        <h2 className="text-md font-semibold text-teal-400">{canvasName}</h2>
        
        <div className="flex gap-2">
          <button 
            onClick={handleSaveCanvas}
            className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
            title="Save canvas"
          >
            <Save size={14} />
            Save
          </button>
          
          <button 
            onClick={() => setShowNodeCreator(true)}
            className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
            title="Add text node"
          >
            <Type size={14} />
            Add Note
          </button>
          
          <button 
            onClick={() => setShowConnectionCreator(true)}
            className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
            title="Create connection"
          >
            <ArrowRight size={14} />
            Connect
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-2 bg-red-900 text-red-200 text-sm">
          {error}
        </div>
      )}
      
      {/* Node creator dialog */}
      {showNodeCreator && (
        <div className="p-2 border-b border-stone-700 bg-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold">
              New Text Node
            </span>
            <button
              onClick={() => setShowNodeCreator(false)}
              className="p-1 rounded hover:bg-stone-700 text-stone-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <textarea
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="Enter text content"
              className="w-full bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
              rows={3}
            />
            <div className="flex justify-end">
              <button
                onClick={() => addNode('text', newNodeText)}
                className="px-2 py-1 bg-teal-700 text-teal-100 hover:bg-teal-600 rounded text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Connection creator dialog */}
      {showConnectionCreator && (
        <div className="p-2 border-b border-stone-700 bg-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold">
              Create Connection
            </span>
            <button
              onClick={() => setShowConnectionCreator(false)}
              className="p-1 rounded hover:bg-stone-700 text-stone-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <label className="text-xs w-20">From Node:</label>
              <select
                value={connectionNodes.source}
                onChange={(e) => setConnectionNodes(prev => ({ ...prev, source: e.target.value }))}
                className="flex-1 bg-stone-700 text-teal-400 px-2 py-1 rounded text-xs focus:outline-none"
              >
                <option value="">Select source node</option>
                {canvasData.nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.text ? node.text.substring(0, 20) + (node.text.length > 20 ? '...' : '') : node.id}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 items-center">
              <label className="text-xs w-20">To Node:</label>
              <select
                value={connectionNodes.target}
                onChange={(e) => setConnectionNodes(prev => ({ ...prev, target: e.target.value }))}
                className="flex-1 bg-stone-700 text-teal-400 px-2 py-1 rounded text-xs focus:outline-none"
              >
                <option value="">Select target node</option>
                {canvasData.nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.text ? node.text.substring(0, 20) + (node.text.length > 20 ? '...' : '') : node.id}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => createConnection(connectionNodes.source, connectionNodes.target)}
                disabled={!connectionNodes.source || !connectionNodes.target}
                className={`px-2 py-1 rounded text-xs ${
                  connectionNodes.source && connectionNodes.target
                    ? 'bg-teal-700 text-teal-100 hover:bg-teal-600'
                    : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                }`}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Canvas container */}
      <div className="flex-1 overflow-hidden">
        <CanvasContainer 
          canvasData={canvasData}
          onChange={handleCanvasChange}
          onDeleteSelected={handleDeleteSelected}
        />
      </div>
      
      {/* Status indicator */}
      <div className="px-2 py-1 border-t border-stone-700 bg-stone-800 text-xs flex justify-between">
        <span>
          {canvasData.nodes.length} nodes, {canvasData.edges.length} connections
        </span>
        <span>
          {saveStatus === 'saving' && <span className="text-yellow-400">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-green-400">Saved</span>}
          {saveStatus === 'error' && <span className="text-red-400">Error saving!</span>}
        </span>
      </div>
    </div>
  );
};

export default CanvasEditor;
