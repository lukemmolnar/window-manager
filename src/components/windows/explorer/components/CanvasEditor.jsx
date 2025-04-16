import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Plus, 
  Save, 
  FileText, 
  Trash2, 
  Type,
  Square,
  Link as LinkIcon,
  Edit,
} from 'lucide-react';

// Import node types from the node registry
import nodeTypes from './nodes';

/**
 * Canvas Editor component for use within the FileContent area
 * This component handles the editing of .canvas files in the file explorer
 */
const CanvasEditor = ({ fileContent, selectedFile, onSave }) => {
  const [canvasName, setCanvasName] = useState('Untitled Canvas');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  // ReactFlow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // UI states
  const [selectedElements, setSelectedElements] = useState([]);
  const [showNodeCreator, setShowNodeCreator] = useState(false);
  const [newNodeType, setNewNodeType] = useState('text');
  const [newNodeText, setNewNodeText] = useState('');
  const [editingNode, setEditingNode] = useState(null);
  
  // For auto-save functionality
  const saveTimeoutRef = useRef(null);
  
  // Setup custom node types with required props
  const customNodeTypes = {};
  
  // Add the TextNode and pass required props
  customNodeTypes.text = (props) => {
    // Create a handler for text updates
    const handleNodeTextChange = (nodeId, newText) => {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                text: newText
              }
            };
          }
          return node;
        })
      );
    };
    
    // Add the onChange handler to node data
    const nodeWithHandlers = {
      ...props,
      data: {
        ...props.data,
        onChange: handleNodeTextChange
      },
      editingNode: editingNode,
      setEditingNode: setEditingNode
    };
    
    // Use the TextNode component from the registry
    return React.createElement(nodeTypes.text, nodeWithHandlers);
  };
  
  // Load canvas data when fileContent changes
  useEffect(() => {
    try {
      if (fileContent) {
        setIsLoading(true);
        
        // Parse the JSON canvas file
        const canvasData = JSON.parse(fileContent);
        
        if (canvasData.nodes && canvasData.edges) {
          // Transform nodes from JSONCanvas format to ReactFlow format
          const transformedNodes = canvasData.nodes.map(node => {
            // Check if node has position as an object or direct x/y properties
            const nodeX = node.position?.x !== undefined ? node.position.x : (node.x || 0);
            const nodeY = node.position?.y !== undefined ? node.position.y : (node.y || 0);
            
            return {
              id: node.id,
              type: node.type,
              // For ReactFlow, use position property
              position: {
                x: nodeX,
                y: nodeY
              },
              // Preserve data, or create default data object with text if not present
              data: node.data || { text: node.text || "Text node" }
            };
          });
          
          console.log('[DEBUG] Transformed nodes:', transformedNodes.length);
          setNodes(transformedNodes);
          setEdges(canvasData.edges);
          
          // Extract canvas name from file path or use from canvas data
          if (canvasData.name) {
            setCanvasName(canvasData.name);
          } else if (selectedFile) {
            const pathParts = selectedFile.path.split('/');
            const fileName = pathParts[pathParts.length - 1];
            setCanvasName(fileName.replace('.canvas', ''));
          }
          
          setSaveStatus('saved');
        } else {
          // Create a new canvas if the structure is invalid
          createNewCanvas();
        }
        
        setIsLoading(false);
        setError(null);
      } else {
        // Create a new canvas if no content
        createNewCanvas();
      }
    } catch (err) {
      console.error('Error parsing canvas file:', err);
      setError('Failed to parse canvas file. Creating a new canvas.');
      createNewCanvas();
      setIsLoading(false);
    }
  }, [fileContent, selectedFile]);
  
  // Auto-save when node/edge data changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      // Only start auto-save if we have actual content
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set save status to 'saving'
      setSaveStatus('saving');
      
      // Set a new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveCanvas();
      }, 1000); // 1 second debounce
    }
    
    // Cleanup function to clear the timeout when component unmounts
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges]);
  
  // Create a new canvas
  const createNewCanvas = () => {
    setNodes([]);
    setEdges([]);
    
    // Set canvas name from file if available
    if (selectedFile) {
      const pathParts = selectedFile.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      setCanvasName(fileName.replace('.canvas', ''));
    } else {
      setCanvasName('Untitled Canvas');
    }
    
    setSaveStatus('saved');
  };
  
  // Save canvas to file
  const handleSaveCanvas = () => {
    if (!selectedFile) return;
    
    try {
      // Transform nodes from ReactFlow format back to JSONCanvas format
      const transformedNodes = nodes.map(node => {
        // Extract position from ReactFlow format
        const nodePosition = node.position || { x: 0, y: 0 };
        
        return {
          id: node.id,
          type: node.type,
          // Store position in a position object for compatibility with JSONCanvas format
          position: {
            x: nodePosition.x,
            y: nodePosition.y
          },
          // Preserve the data object
          data: node.data
        };
      });
      
      // Create canvas data structure
      const canvasData = {
        name: canvasName,
        nodes: transformedNodes,
        edges,
        version: "1.0",
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };
      
      // Debug logs to track the data flow
      console.log('[DEBUG] Canvas Editor - Saving canvas data:', {
        nodesLength: transformedNodes.length,
        edgesLength: edges.length,
        selectedFile: selectedFile?.path
      });
      
      // Set status to saving
      setSaveStatus('saving');
      
      // Serialize to JSON string
      const canvasContent = JSON.stringify(canvasData, null, 2);
      
      // Call the parent onSave function
      onSave(canvasContent);
      
      // Update state
      setSaveStatus('saved');
      setError(null);
    } catch (err) {
      console.error('Error saving canvas:', err);
      setError('Failed to save canvas file.');
      setSaveStatus('error');
    }
  };
  
  // Handle connection (edge) creation
  const onConnect = useCallback((params) => {
    // Create a custom edge with styling and ID
    setEdges((eds) => addEdge({
      ...params,
      id: `edge-${Date.now()}`,
      type: 'default',
      animated: false,
      style: { stroke: '#14b8a6' }
    }, eds));
  }, [setEdges]);
  
  // Handle node selection
  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedElements([...nodes, ...edges]);
  }, []);
  
  // Handle drag over for node creation
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Handle drop for node creation
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow/type');
      if (!type || !reactFlowInstance) return;
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { text: 'New text node' },
      };
      
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );
  
  // Create a new node
  const createNode = (type) => {
    if (!reactFlowInstance) return;
    
    // If we have a viewport, center the node in the visible area
    const position = reactFlowInstance.project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });
    
    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: { text: newNodeText || 'New text node' }
    };
    
    // Add the node and immediately set it to edit mode
    setNodes((nds) => {
      const updatedNodes = nds.concat(newNode);
      setTimeout(() => {
        setEditingNode(newNode.id);
      }, 100);
      return updatedNodes;
    });
    
    setShowNodeCreator(false);
    setNewNodeText('');
  };
  
  // Delete selected elements
  const deleteSelected = () => {
    const selectedNodeIds = selectedElements
      .filter(el => el.type !== 'default')
      .map(el => el.id);
    
    const selectedEdgeIds = selectedElements
      .filter(el => el.type === 'default')
      .map(el => el.id);
    
    setNodes(nodes.filter(node => !selectedNodeIds.includes(node.id)));
    setEdges(edges.filter(edge => !selectedEdgeIds.includes(edge.id)));
    setSelectedElements([]);
  };
  
  // If canvas data isn't loaded yet, show a loading state
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
            onClick={() => {
              setNewNodeType('text');
              setShowNodeCreator(true);
            }}
            className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
            title="Add text node"
          >
            <Type size={14} />
            Add Node
          </button>
          
          {/* Edit button - appears when a node is selected */}
          {selectedElements.length === 1 && selectedElements[0].type === 'text' && (
            <button 
              onClick={() => setEditingNode(selectedElements[0].id)}
              className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
              title="Edit selected node"
            >
              <Edit size={14} />
              Edit
            </button>
          )}
          
          {selectedElements.length > 0 && (
            <button 
              onClick={deleteSelected}
              className="px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs flex items-center gap-1"
              title="Delete selected"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
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
                onClick={() => createNode('text')}
                className="px-2 py-1 bg-teal-700 text-teal-100 hover:bg-teal-600 rounded text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Canvas area */}
      <div className="flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={customNodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={4}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionKeyCode="Shift"
        >
          {/* Empty canvas help message */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-stone-800 bg-opacity-80 p-6 rounded-lg shadow-lg text-center max-w-md">
                <Type size={40} className="mx-auto mb-4 text-teal-500" />
                <h3 className="text-xl text-teal-400 mb-2 font-semibold">Canvas Editor</h3>
                <p className="text-stone-300 mb-4">
                  This is your canvas workspace. Create notes and connect them with arrows.
                </p>
                <ul className="text-left text-stone-300 space-y-2 mb-4">
                  <li>• Click "Add Node" to create a new text node</li>
                  <li>• Hover over a node and click the edit button to edit content</li>
                  <li>• Drag from a node's connection handle (teal dot) to another node to create a connection</li>
                  <li>• Select nodes and press Delete or use the Delete button</li>
                </ul>
                <p className="text-stone-400 text-sm">
                  See canvas-editor-documentation.md for more details
                </p>
              </div>
            </div>
          )}
          <Background color="#44403c" gap={16} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => '#14b8a6'}
            maskColor="rgba(0, 0, 0, 0.5)"
            style={{ backgroundColor: '#292524' }}
          />
          
          <Panel position="top-left" className="bg-stone-800 p-2 rounded shadow-md">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-stone-400">Drag to create:</div>
              <div 
                className="flex items-center gap-1 p-1 bg-stone-700 rounded cursor-grab"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow/type', 'text');
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <Type size={14} />
                <span className="text-xs">Text Node</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default CanvasEditor;
