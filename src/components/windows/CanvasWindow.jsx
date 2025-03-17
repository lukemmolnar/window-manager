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
  Minus, 
  Save, 
  FileText, 
  Trash2, 
  Edit, 
  Link as LinkIcon,
  Square,
  Type
} from 'lucide-react';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useWindowState } from '../../context/WindowStateContext';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { saveCanvasState, getCanvasState } from '../../services/indexedDBService';

// Custom node types
const TextNode = ({ data }) => {
  return (
    <div className="p-2 bg-stone-800 border border-stone-700 rounded shadow-md">
      <div className="text-teal-400 text-sm whitespace-pre-wrap">{data.text}</div>
    </div>
  );
};

const GroupNode = ({ data }) => {
  return (
    <div 
      className="p-2 bg-stone-900 border border-stone-700 rounded shadow-md"
      style={{ backgroundColor: data.color ? `rgba(${data.color}, 0.2)` : 'rgba(20, 20, 20, 0.7)' }}
    >
      <div className="text-teal-300 font-bold mb-1">{data.label || 'Group'}</div>
      <div className="text-teal-400 text-sm">{data.children?.length || 0} items</div>
    </div>
  );
};

// Node types configuration
const nodeTypes = {
  text: TextNode,
  group: GroupNode
};

const CanvasWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Get auth context to check if user is admin
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;
  
  // Get window state context for additional persistence
  const { setActiveWindow } = useWindowState();
  
  // Ref to track if state has been loaded from IndexedDB
  const stateLoadedRef = useRef(false);
  
  // Use state from windowState or initialize with defaults
  const [canvasName, setCanvasName] = useState(windowState?.canvasName || 'Untitled Canvas');
  const [currentCanvasPath, setCurrentCanvasPath] = useState(windowState?.currentCanvasPath || null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  // ReactFlow states
  const [nodes, setNodes, onNodesChange] = useNodesState(windowState?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(windowState?.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // UI states
  const [selectedElements, setSelectedElements] = useState([]);
  const [showNodeCreator, setShowNodeCreator] = useState(false);
  const [newNodeType, setNewNodeType] = useState('text');
  const [newNodeText, setNewNodeText] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeColor, setNewNodeColor] = useState('');
  
  // For auto-save functionality
  const saveTimeoutRef = useRef(null);
  
  // Load canvas state from IndexedDB on mount
  useEffect(() => {
    const loadCanvasState = async () => {
      try {
        // Try to load canvas state from IndexedDB
        const savedState = await getCanvasState(nodeId);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`Loaded canvas state for window ${nodeId} from IndexedDB:`, savedState.content);
          
          // Update state with saved values
          if (savedState.content.nodes) {
            setNodes(savedState.content.nodes);
          }
          
          if (savedState.content.edges) {
            setEdges(savedState.content.edges);
          }
          
          if (savedState.content.canvasName) {
            setCanvasName(savedState.content.canvasName);
          }
          
          if (savedState.content.currentCanvasPath) {
            setCurrentCanvasPath(savedState.content.currentCanvasPath);
          }
          
          // Mark as loaded
          stateLoadedRef.current = true;
        }
      } catch (error) {
        console.error(`Failed to load canvas state for window ${nodeId} from IndexedDB:`, error);
      }
    };
    
    loadCanvasState();
  }, [nodeId, setNodes, setEdges]);
  
  // Handle window activation
  useEffect(() => {
    if (isActive) {
      // Save this as the active canvas window
      setActiveWindow(nodeId, WINDOW_TYPES.CANVAS);
    }
  }, [isActive, nodeId, setActiveWindow]);
  
  // Save canvas state to IndexedDB when it changes
  useEffect(() => {
    if (!stateLoadedRef.current) return;
    
    // Save the canvas state to IndexedDB
    saveCanvasState({
      id: nodeId,
      content: {
        nodes,
        edges,
        canvasName,
        currentCanvasPath
      }
    }).catch(error => {
      console.error(`Failed to save canvas state for window ${nodeId} to IndexedDB:`, error);
    });
    
  }, [nodes, edges, canvasName, currentCanvasPath, nodeId]);
  
  // Update window state when relevant state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        nodes,
        edges,
        canvasName,
        currentCanvasPath,
        saveStatus
      });
    }
  }, [nodes, edges, canvasName, currentCanvasPath, saveStatus, updateWindowState]);
  
  // Auto-save functionality with debounce
  useEffect(() => {
    // Only auto-save if we have a path and user is admin
    if (currentCanvasPath && isAdmin) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set status to saving
      setSaveStatus('saving');
      
      // Set a new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        saveCanvas();
      }, 2000); // 2 second debounce
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, currentCanvasPath, isAdmin]);
  
  // Handle connection (edge) creation
  const onConnect = useCallback((params) => {
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
      if (!type) return;
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: type === 'text' 
          ? { text: 'New text node' } 
          : { label: 'New Group', color: '20, 184, 166' },
        style: type === 'group' 
          ? { width: 400, height: 400, backgroundColor: 'rgba(20, 184, 166, 0.1)' } 
          : undefined
      };
      
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );
  
  // Load canvas from file
  const loadCanvas = async (filePath) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }
      
      // Fetch file content from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CONTENT}?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        // If response is 403, it means the user doesn't have admin access
        if (response.status === 403) {
          setErrorMessage('Admin access required to view file content.');
        } else {
          setErrorMessage(`Failed to load canvas: ${response.statusText}`);
        }
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      try {
        const canvasData = JSON.parse(data.content);
        
        if (canvasData.nodes && canvasData.edges) {
          setNodes(canvasData.nodes);
          setEdges(canvasData.edges);
          setCurrentCanvasPath(filePath);
          
          // Extract canvas name from file path
          const pathParts = filePath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          setCanvasName(fileName.replace('.canvas', ''));
          
          setSaveStatus('saved');
        } else {
          setErrorMessage('Invalid canvas file format.');
        }
      } catch (parseError) {
        console.error('Error parsing canvas file:', parseError);
        setErrorMessage('Failed to parse canvas file. Invalid format.');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading canvas:', error);
      setErrorMessage(`Error loading canvas: ${error.message}`);
      setSaveStatus('error');
      setIsLoading(false);
    }
  };
  
  // Save canvas to file
  const saveCanvas = async () => {
    try {
      // Check if we have a path
      if (!currentCanvasPath) {
        setErrorMessage('No file path specified. Please save as a new file first.');
        setSaveStatus('error');
        return;
      }
      
      setSaveStatus('saving');
      
      const canvasData = {
        nodes,
        edges
      };
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_SAVE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          path: currentCanvasPath,
          content: JSON.stringify(canvasData, null, 2)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save canvas: ${response.statusText}`);
      }
      
      setSaveStatus('saved');
      setErrorMessage('');
    } catch (error) {
      console.error('Error saving canvas:', error);
      setErrorMessage(`Error saving canvas: ${error.message}`);
      setSaveStatus('error');
    }
  };
  
  // Create a new node
  const createNode = (type) => {
    if (!reactFlowInstance) return;
    
    const position = {
      x: Math.random() * 400,
      y: Math.random() * 400
    };
    
    let newNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {}
    };
    
    if (type === 'text') {
      newNode.data = { text: newNodeText || 'New text node' };
    } else if (type === 'group') {
      newNode.data = { 
        label: newNodeLabel || 'New Group', 
        color: newNodeColor || '20, 184, 166' 
      };
      newNode.style = { 
        width: 400, 
        height: 400, 
        backgroundColor: `rgba(${newNodeColor || '20, 184, 166'}, 0.1)` 
      };
    }
    
    setNodes((nds) => nds.concat(newNode));
    setShowNodeCreator(false);
    setNewNodeText('');
    setNewNodeLabel('');
    setNewNodeColor('');
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
  
  // Handle command input
  const handleCommand = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const cmd = e.target.value.trim();
      onCommand(cmd);
      e.target.value = '';
      
      // Commands:
      // - save: save the canvas
      // - load [path]: load a canvas from a file
      // - new-text: create a new text node
      // - new-group: create a new group node
      // - delete: delete selected elements
      if (cmd === 'save') {
        saveCanvas();
      } else if (cmd.startsWith('load ')) {
        const path = cmd.substring(5).trim();
        loadCanvas(path);
      } else if (cmd === 'new-text') {
        setNewNodeType('text');
        setShowNodeCreator(true);
      } else if (cmd === 'new-group') {
        setNewNodeType('group');
        setShowNodeCreator(true);
      } else if (cmd === 'delete') {
        deleteSelected();
      }
    }
  };
  
  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">{canvasName}</span>
          {saveStatus === 'saving' && <span className="text-yellow-400 text-xs ml-2">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-green-400 text-xs ml-2">Saved</span>}
          {saveStatus === 'error' && <span className="text-red-400 text-xs ml-2">Error!</span>}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => saveCanvas()}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
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
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
            title="Add text node"
          >
            <Type size={14} />
            Text
          </button>
          
          <button 
            onClick={() => {
              setNewNodeType('group');
              setShowNodeCreator(true);
            }}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
            title="Add group node"
          >
            <Square size={14} />
            Group
          </button>
          
          {selectedElements.length > 0 && (
            <button 
              onClick={deleteSelected}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
              title="Delete selected"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="p-2 bg-red-900 text-red-200 text-sm">
          {errorMessage}
        </div>
      )}
      
      {/* Node creator dialog */}
      {showNodeCreator && (
        <div className="p-2 border-b border-stone-700 bg-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold">
              {newNodeType === 'text' ? 'New Text Node' : 'New Group Node'}
            </span>
            <button
              onClick={() => setShowNodeCreator(false)}
              className="p-1 rounded hover:bg-stone-700 text-stone-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          {newNodeType === 'text' ? (
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
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                placeholder="Group label"
                className="w-full bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
              />
              <select
                value={newNodeColor}
                onChange={(e) => setNewNodeColor(e.target.value)}
                className="w-full bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
              >
                <option value="20, 184, 166">Teal</option>
                <option value="244, 63, 94">Red</option>
                <option value="234, 179, 8">Yellow</option>
                <option value="59, 130, 246">Blue</option>
                <option value="168, 85, 247">Purple</option>
                <option value="34, 197, 94">Green</option>
              </select>
              <div className="flex justify-end">
                <button
                  onClick={() => createNode('group')}
                  className="px-2 py-1 bg-teal-700 text-teal-100 hover:bg-teal-600 rounded text-xs"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Canvas area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-teal-300">Loading canvas...</span>
          </div>
        ) : (
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
            nodeTypes={nodeTypes}
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
            <Background color="#44403c" gap={16} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'group':
                    return node.data.color ? `rgba(${node.data.color}, 0.6)` : 'rgba(20, 184, 166, 0.6)';
                  default:
                    return '#14b8a6';
                }
              }}
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
                <div 
                  className="flex items-center gap-1 p-1 bg-stone-700 rounded cursor-grab"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/reactflow/type', 'group');
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <Square size={14} />
                  <span className="text-xs">Group Node</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>
      
      {/* Command input */}
      <div className="p-2 flex items-center gap-2 border-t border-stone-700">
        <span className="text-teal-400">$</span>
        <input
          ref={focusRef}
          type="text"
          onKeyDown={handleCommand}
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          placeholder="Commands: save, load [path], new-text, new-group, delete"
        />
      </div>
    </div>
  );
};

export default CanvasWindow;
