import React, { useRef, useEffect, useState } from 'react';
import { Grid } from 'lucide-react';
import { screenToGridCoordinates, gridToScreenCoordinates } from './utils/mapUtils';

/**
 * The main canvas component for the Grid Map Editor
 * Handles rendering and interaction with the grid map
 */
const MapCanvas = ({ mapData, currentLayer, currentTool, onEdit }) => {
  const canvasRef = useRef(null);
  const [gridSize, setGridSize] = useState(32);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMouseButton, setActiveMouseButton] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);

  /**
   * Draw a tile on the canvas based on its type
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position on canvas
   * @param {number} y - Y position on canvas
   * @param {number} size - Size of the tile
   * @param {string} type - Type of the tile (wall, floor, door, etc.)
   */
  const drawTile = (ctx, x, y, size, type) => {
    switch(type) {
      case 'wall':
        ctx.fillStyle = '#6b7280'; // Gray
        ctx.fillRect(x, y, size, size);
        break;
      case 'floor':
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(x, y, size, size);
        break;
      case 'door':
        // Draw floor first
        ctx.fillStyle = '#1e293b'; // Slate background
        ctx.fillRect(x, y, size, size);
        // Then draw door
        ctx.fillStyle = '#b45309'; // Amber-700
        ctx.fillRect(x + size/4, y + size/4, size/2, size/2);
        break;
      // Add more tile types as needed
      default:
        // Unknown tile type, draw placeholder
        ctx.fillStyle = '#ef4444'; // Red-500
        ctx.fillRect(x, y, size, size);
    }
    
    // Draw grid lines on top
    ctx.strokeStyle = '#44403c'; // Stone-700
    ctx.strokeRect(x, y, size, size);
  };

  /**
   * Handle canvas click to edit map cells
   */
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !mapData || currentTool === 'select' || !onEdit) return;
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridCoords = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
    
    // Call onEdit with the grid coordinates and current tool
    onEdit(gridCoords.x, gridCoords.y, currentTool);
  };

  // Update hover cell when mouse moves
  const updateHoverCell = (e) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const gridCoords = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
    setHoverCell(gridCoords);
  };

  // Set up the canvas and draw the grid and map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background color
    ctx.fillStyle = '#1c1917'; // Stone-900 from Tailwind
    ctx.fillRect(0, 0, width, height);
    
    // Adjust for viewport offset
    const offsetX = viewportOffset.x;
    const offsetY = viewportOffset.y;
    
    // Draw default grid background - useful for visualizing empty spaces
    for (let x = 0; x < mapData.width; x++) {
      for (let y = 0; y < mapData.height; y++) {
        const screenX = Math.floor(x * gridSize + offsetX);
        const screenY = Math.floor(y * gridSize + offsetY);
        
        // Only draw if visible on screen
        if (screenX > -gridSize && screenX < width && 
            screenY > -gridSize && screenY < height) {
          // Draw a subtle background for all cells
          ctx.fillStyle = '#0f172a'; // Very dark slate blue
          ctx.fillRect(screenX, screenY, gridSize, gridSize);
        }
      }
    }
    
    // Draw map data (cells from each layer)
    if (mapData && mapData.layers && mapData.layers.length > 0) {
      // Render each visible layer from bottom to top
      mapData.layers.forEach((layer, layerIndex) => {
        if (!layer.visible) return;
        
        // Draw cells
        layer.cells.forEach(cell => {
          // Calculate screen position for this cell
          const screenX = Math.floor(cell.x * gridSize + offsetX);
          const screenY = Math.floor(cell.y * gridSize + offsetY);
          
          // Draw the tile if it's visible on screen
          if (screenX > -gridSize && screenX < width && 
              screenY > -gridSize && screenY < height) {
            drawTile(ctx, screenX, screenY, gridSize, cell.type);
          }
        });
        
        // Highlight current layer with a subtle border if it matches the currentLayer
        if (layerIndex === currentLayer) {
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.5)'; // Teal with opacity
          ctx.lineWidth = 2;
          
          layer.cells.forEach(cell => {
            const screenX = Math.floor(cell.x * gridSize + offsetX);
            const screenY = Math.floor(cell.y * gridSize + offsetY);
            
            if (screenX > -gridSize && screenX < width && 
                screenY > -gridSize && screenY < height) {
              ctx.strokeRect(screenX, screenY, gridSize, gridSize);
            }
          });
        }
      });
    }
    
    // Draw grid on top
    ctx.strokeStyle = '#44403c'; // Stone-700 from Tailwind
    ctx.lineWidth = 1;
    
    // Calculate grid line positioning
    const gridOffsetX = offsetX % gridSize;
    const gridOffsetY = offsetY % gridSize;
    
    // Draw vertical lines
    for (let x = gridOffsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = gridOffsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw hover highlight
    if (hoverCell) {
      const screenX = Math.floor(hoverCell.x * gridSize + offsetX);
      const screenY = Math.floor(hoverCell.y * gridSize + offsetY);
      
      ctx.fillStyle = 'rgba(20, 184, 166, 0.3)'; // Teal with opacity
      ctx.fillRect(screenX, screenY, gridSize, gridSize);
      
      // Show tool indicator
      ctx.fillStyle = '#14b8a6';
      ctx.font = '12px monospace';
      ctx.fillText(currentTool, screenX + 5, screenY + 15);
    }
    
  }, [gridSize, viewportOffset, mapData, currentLayer, hoverCell, currentTool]);

  // Handle canvas mouse events
  const handleMouseDown = (e) => {
    // Prevent context menu on right click
    if (e.button === 2) {
      e.preventDefault();
    }
    
    setActiveMouseButton(e.button);
    
    // Right mouse button (2) for panning
    if (e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } 
    // Left mouse button (0) for drawing
    else if (e.button === 0 && currentTool !== 'select') {
      handleCanvasClick(e);
    }
  };

  const handleMouseMove = (e) => {
    // Always update hover cell
    updateHoverCell(e);
    
    // Handle dragging for pan
    if (isDragging && activeMouseButton === 2) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setViewportOffset({
        x: viewportOffset.x + dx,
        y: viewportOffset.y + dy
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    } 
    // Handle continuous drawing while mouse is down
    else if (activeMouseButton === 0 && currentTool !== 'select') {
      handleCanvasClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveMouseButton(null);
  };

  const handleWheel = (e) => {
    // Zoom in/out with mouse wheel
    if (e.deltaY < 0) {
      // Zoom in - increase grid size
      setGridSize(prev => Math.min(prev + 4, 64));
    } else {
      // Zoom out - decrease grid size
      setGridSize(prev => Math.max(prev - 4, 16));
    }
  };

  return (
    <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-stone-900">
      <div className="absolute top-2 left-2 bg-stone-800 p-2 rounded text-xs text-teal-400 flex items-center">
        <Grid size={14} className="mr-1" />
        <span>Grid Size: {gridSize}px</span>
      </div>
      
      <canvas 
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-stone-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
      />
      <div className="absolute bottom-2 right-2 bg-stone-800 p-2 rounded text-xs text-teal-400">
        {currentTool && <span>Tool: {currentTool}</span>}
        {hoverCell && <span className="ml-2">Position: ({hoverCell.x}, {hoverCell.y})</span>}
      </div>
    </div>
  );
};

export default MapCanvas;
