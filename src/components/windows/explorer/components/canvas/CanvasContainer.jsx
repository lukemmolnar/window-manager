import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  generateId, 
  isPointInNode, 
  createTextNode, 
  createEdge,
  calculateBestConnectionSides,
  getConnectionPoints,
  drawConnection,
  getCanvasColor
} from '../../utils/canvasUtils';
import TextNode from './TextNode';

/**
 * CanvasContainer handles the infinite canvas, viewport, and interactions
 */
const CanvasContainer = ({ 
  canvasData, 
  onChange,
  readOnly = false
}) => {
  // State for viewport and interaction
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeIds, setDraggedNodeIds] = useState([]);

  // Refs for canvas elements
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const interactionLayerRef = useRef(null);

  // Get the currently selected node
  const selectedNode = canvasData.nodes.find(node => node.id === selectedNodeIds[0]);

  // Draw the canvas with nodes and edges
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Apply viewport transformation
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw background grid (optional)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 / scale;
    
    const gridSize = 20;
    const startX = Math.floor(-offset.x / scale / gridSize) * gridSize;
    const startY = Math.floor(-offset.y / scale / gridSize) * gridSize;
    const endX = Math.ceil((width - offset.x) / scale / gridSize) * gridSize;
    const endY = Math.ceil((height - offset.y) / scale / gridSize) * gridSize;
    
    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
    
    // Draw edges
    canvasData.edges.forEach(edge => {
      const sourceNode = canvasData.nodes.find(n => n.id === edge.fromNode);
      const targetNode = canvasData.nodes.find(n => n.id === edge.toNode);
      
      if (sourceNode && targetNode) {
        // Get connection points
        const points = getConnectionPoints(
          sourceNode, 
          targetNode, 
          edge.fromSide, 
          edge.toSide
        );
        
        // Draw the connection
        drawConnection(
          ctx, 
          points.source, 
          points.target, 
          getCanvasColor(edge.color),
          edge.fromEnd === 'arrow',
          edge.toEnd === 'arrow'
        );
      }
    });
    
    // Restore the context
    ctx.restore();
  }, [canvasData, offset, scale]);

  // Resize canvas to fit container
  const resizeCanvas = useCallback(() => {
    if (!containerRef.current || !canvasRef.current || !interactionLayerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const interactionLayer = interactionLayerRef.current;
    
    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    interactionLayer.width = container.clientWidth;
    interactionLayer.height = container.clientHeight;
    
    // Redraw canvas
    drawCanvas();
  }, [drawCanvas]);

  // Initialize and set up event listeners
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  // Redraw canvas when data changes
  useEffect(() => {
    drawCanvas();
  }, [canvasData, drawCanvas, selectedNodeIds, scale, offset]);

  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    e.preventDefault();
    
    const { deltaY } = e;
    const direction = deltaY > 0 ? -1 : 1;
    
    // Calculate zoom
    const factor = 0.1;
    const newScale = Math.max(0.1, scale * (1 + direction * factor));
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new offset to zoom around mouse position
    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);
    
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Handle mouse down for panning and selection
  const handleMouseDown = (e) => {
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas coordinates
    const canvasX = (mouseX - offset.x) / scale;
    const canvasY = (mouseY - offset.y) / scale;
    
    // Check if clicked on a node
    const nodeUnderMouse = canvasData.nodes.find(node => 
      isPointInNode({ x: canvasX, y: canvasY }, node)
    );
    
    if (nodeUnderMouse) {
      // Select the node
      if (e.shiftKey) {
        // Add to selection if holding shift
        setSelectedNodeIds(prev => 
          prev.includes(nodeUnderMouse.id) 
            ? prev.filter(id => id !== nodeUnderMouse.id) 
            : [...prev, nodeUnderMouse.id]
        );
      } else if (!selectedNodeIds.includes(nodeUnderMouse.id)) {
        // Replace selection
        setSelectedNodeIds([nodeUnderMouse.id]);
      }
      
      // Prepare for dragging
      setIsDragging(true);
      setDraggedNodeIds(selectedNodeIds.includes(nodeUnderMouse.id) 
        ? selectedNodeIds 
        : [nodeUnderMouse.id]
      );
    } else {
      // Start panning
      setIsPanning(true);
      setPanStart({ x: mouseX, y: mouseY });
      
      // Clear selection unless shift is held
      if (!e.shiftKey) {
        setSelectedNodeIds([]);
      }
    }
  };

  // Handle mouse move for panning and dragging
  const handleMouseMove = (e) => {
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas coordinates
    const canvasX = (mouseX - offset.x) / scale;
    const canvasY = (mouseY - offset.y) / scale;
    
    // Handle panning
    if (isPanning) {
      const deltaX = mouseX - panStart.x;
      const deltaY = mouseY - panStart.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setPanStart({ x: mouseX, y: mouseY });
    }
    
    // Handle dragging
    if (isDragging && draggedNodeIds.length > 0 && !readOnly) {
      // Calculate the delta from last mouse position
      const lastMousePos = {
        x: (panStart.x - offset.x) / scale,
        y: (panStart.y - offset.y) / scale
      };
      
      const deltaX = canvasX - lastMousePos.x;
      const deltaY = canvasY - lastMousePos.y;
      
      // Update node positions
      const updatedNodes = canvasData.nodes.map(node => {
        if (draggedNodeIds.includes(node.id)) {
          return {
            ...node,
            x: node.x + deltaX,
            y: node.y + deltaY
          };
        }
        return node;
      });
      
      // Update canvas data
      onChange({
        ...canvasData,
        nodes: updatedNodes
      });
      
      // Update pan start
      setPanStart({ x: mouseX, y: mouseY });
    }
    
    // Check for node under mouse for hover effect
    const nodeUnderMouse = canvasData.nodes.find(node => 
      isPointInNode({ x: canvasX, y: canvasY }, node)
    );
    
    setHoveredNodeId(nodeUnderMouse?.id || null);
  };

  // Handle mouse up to stop panning and dragging
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDragging(false);
    setDraggedNodeIds([]);
  };

  // Handle node selection
  const handleNodeSelect = (nodeId) => {
    setSelectedNodeIds([nodeId]);
  };

  // Handle node text change
  const handleNodeTextChange = (nodeId, text) => {
    const updatedNodes = canvasData.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          text
        };
      }
      return node;
    });
    
    onChange({
      ...canvasData,
      nodes: updatedNodes
    });
  };

  // Handle node resize
  const handleNodeResize = (nodeId, width, height) => {
    const updatedNodes = canvasData.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          width,
          height
        };
      }
      return node;
    });
    
    onChange({
      ...canvasData,
      nodes: updatedNodes
    });
  };

  // Handle node move
  const handleNodeMove = (nodeId, x, y) => {
    const updatedNodes = canvasData.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          x,
          y
        };
      }
      return node;
    });
    
    onChange({
      ...canvasData,
      nodes: updatedNodes
    });
  };

  // Add a new text node at a specific position
  const addTextNode = (x, y, text = 'New note') => {
    if (readOnly) return;
    
    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - offset.x) / scale;
    const canvasY = (y - offset.y) / scale;
    
    // Create a new node
    const newNode = createTextNode(canvasX, canvasY, text);
    
    // Add to canvas data
    onChange({
      ...canvasData,
      nodes: [...canvasData.nodes, newNode]
    });
    
    // Select the new node
    setSelectedNodeIds([newNode.id]);
    
    // Start editing the new node
    setEditingNodeId(newNode.id);
    
    return newNode.id;
  };

  // Create a connection between two nodes
  const connectNodes = (sourceId, targetId) => {
    if (readOnly) return;
    
    // Find the nodes
    const sourceNode = canvasData.nodes.find(n => n.id === sourceId);
    const targetNode = canvasData.nodes.find(n => n.id === targetId);
    
    if (!sourceNode || !targetNode) return;
    
    // Calculate best connection sides
    const { fromSide, toSide } = calculateBestConnectionSides(sourceNode, targetNode);
    
    // Create a new edge
    const newEdge = createEdge(sourceId, targetId, fromSide, toSide);
    
    // Add to canvas data
    onChange({
      ...canvasData,
      edges: [...canvasData.edges, newEdge]
    });
    
    return newEdge.id;
  };

  // Delete selected nodes and their connections
  const deleteSelected = () => {
    if (readOnly || selectedNodeIds.length === 0) return;
    
    // Filter out selected nodes
    const updatedNodes = canvasData.nodes.filter(node => 
      !selectedNodeIds.includes(node.id)
    );
    
    // Filter out edges connected to deleted nodes
    const updatedEdges = canvasData.edges.filter(edge => 
      !selectedNodeIds.includes(edge.fromNode) && 
      !selectedNodeIds.includes(edge.toNode)
    );
    
    // Update canvas data
    onChange({
      ...canvasData,
      nodes: updatedNodes,
      edges: updatedEdges
    });
    
    // Clear selection
    setSelectedNodeIds([]);
  };

  // Start editing a node
  const startNodeEditing = (nodeId) => {
    setEditingNodeId(nodeId);
  };

  // Stop editing a node
  const stopNodeEditing = () => {
    setEditingNodeId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-stone-900"
      tabIndex={0} // Make container focusable for keyboard shortcuts
      onKeyDown={(e) => {
        // Delete key to remove selected nodes
        if (e.key === 'Delete' && !readOnly) {
          deleteSelected();
        }
      }}
    >
      {/* Canvas for rendering edges */}
      <canvas 
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      
      {/* Interaction layer */}
      <canvas 
        ref={interactionLayerRef}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={(e) => {
          if (readOnly) return;
          
          // Get mouse position
          const rect = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Add a new node at this position
          addTextNode(mouseX, mouseY);
        }}
      />
      
      {/* Node elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {canvasData.nodes.map(node => (
          node.type === 'text' && (
            <TextNode
              key={node.id}
              node={node}
              selected={selectedNodeIds.includes(node.id)}
              onSelect={handleNodeSelect}
              onChange={handleNodeTextChange}
              onResize={handleNodeResize}
              onMove={handleNodeMove}
              scale={scale}
              isEditing={editingNodeId === node.id}
              onStartEditing={startNodeEditing}
              onStopEditing={stopNodeEditing}
            />
          )
        ))}
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-stone-800 p-2 rounded shadow">
        <button 
          className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-white"
          onClick={() => setScale(scale + 0.1)}
        >
          +
        </button>
        <button 
          className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-white"
          onClick={() => setScale(Math.max(0.1, scale - 0.1))}
        >
          -
        </button>
        <button 
          className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-white"
          onClick={() => {
            // Reset view
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CanvasContainer;
