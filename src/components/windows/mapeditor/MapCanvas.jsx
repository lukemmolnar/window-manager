import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Grid } from 'lucide-react';
import { screenToGridCoordinates, gridToScreenCoordinates } from './utils/mapUtils';

/**
 * The main canvas component for the Grid Map Editor
 * Handles rendering and interaction with the grid map
 */
const MapCanvas = ({ mapData, currentLayer, currentTool, onEdit }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [gridSize, setGridSize] = useState(32);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMouseButton, setActiveMouseButton] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

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
    
    // Validate coordinates are within map boundaries
    if (gridCoords.x < 0 || gridCoords.x >= mapData.width || 
        gridCoords.y < 0 || gridCoords.y >= mapData.height) {
      // Coordinates outside map boundary - do nothing
      console.log(`Cell at (${gridCoords.x}, ${gridCoords.y}) is outside map boundaries (${mapData.width}x${mapData.height})`);
      return;
    }
    
    // Call onEdit with the grid coordinates and current tool
    onEdit(gridCoords.x, gridCoords.y, currentTool);
  };

  // Set up ResizeObserver to update canvas dimensions
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };
    
    // Initial size update
    updateCanvasSize();
    
    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0) {
        updateCanvasSize();
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Update hover cell when mouse moves
  const updateHoverCell = (e) => {
    if (!canvasRef.current || !mapData) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const gridCoords = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
    
    // Only set hover cell if it's within map boundaries
    if (gridCoords.x >= 0 && gridCoords.x < mapData.width && 
        gridCoords.y >= 0 && gridCoords.y < mapData.height) {
      setHoverCell(gridCoords);
    } else {
      // Clear hover cell when outside map boundaries
      setHoverCell(null);
    }
  };

  // Handle keyboard events for spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space key
      if (e.key === ' ' || e.keyCode === 32) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      // Space key
      if (e.key === ' ' || e.keyCode === 32) {
        setIsSpacePressed(false);
        setIsDragging(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    
    // Draw a clear boundary around the map area
    const mapWidthPx = mapData.width * gridSize;
    const mapHeightPx = mapData.height * gridSize;
    const mapStartX = offsetX;
    const mapStartY = offsetY;
    
    // Draw boundary with more visible color
    ctx.strokeStyle = '#f97316'; // Orange-500
    ctx.lineWidth = 2;
    ctx.strokeRect(mapStartX, mapStartY, mapWidthPx, mapHeightPx);
    
    // Add small corner markers for extra visibility
    const cornerSize = 8;
    ctx.fillStyle = '#f97316'; // Orange-500
    
    // Top-left corner
    ctx.fillRect(mapStartX - 1, mapStartY - 1, cornerSize, cornerSize);
    
    // Top-right corner
    ctx.fillRect(mapStartX + mapWidthPx - cornerSize + 1, mapStartY - 1, cornerSize, cornerSize);
    
    // Bottom-left corner
    ctx.fillRect(mapStartX - 1, mapStartY + mapHeightPx - cornerSize + 1, cornerSize, cornerSize);
    
    // Bottom-right corner
    ctx.fillRect(mapStartX + mapWidthPx - cornerSize + 1, mapStartY + mapHeightPx - cornerSize + 1, cornerSize, cornerSize);
    
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
    
    // Right mouse button (2) or middle mouse button (1) for panning
    if (e.button === 2 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault(); // Prevent default scrolling behavior for middle mouse button
    } 
    // Left mouse button (0) for drawing
    else if (e.button === 0 && !isSpacePressed && currentTool !== 'select') {
      handleCanvasClick(e);
    }
    // If space is pressed and left mouse button is clicked (0), also start dragging
    else if (e.button === 0 && isSpacePressed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    // Always update hover cell
    updateHoverCell(e);
    
    // Handle dragging for pan with right mouse button (2), middle mouse button (1),
    // or spacebar + any mouse button
    if (isDragging && (activeMouseButton === 2 || activeMouseButton === 1 || 
        (isSpacePressed && activeMouseButton === 0))) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setViewportOffset({
        x: viewportOffset.x + dx,
        y: viewportOffset.y + dy
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    // Handle spacebar + mouse move (even without button press)
    else if (isSpacePressed && !isDragging) {
      // Start dragging when space is pressed and mouse moves
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    // Handle continuous drawing while mouse is down
    else if (activeMouseButton === 0 && !isSpacePressed && currentTool !== 'select') {
      handleCanvasClick(e);
    }
  };

  const handleMouseUp = () => {
    // Only stop dragging if we're not using spacebar navigation
    if (!isSpacePressed) {
      setIsDragging(false);
    }
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
    <div 
      ref={containerRef}
      className="flex-1 relative flex overflow-hidden bg-stone-900"
    >
      <div className="absolute top-2 left-2 bg-stone-800 p-2 rounded text-xs text-teal-400 flex items-center z-10">
        <Grid size={14} className="mr-1" />
        <span>Grid Size: {gridSize}px</span>
      </div>
      
      <canvas 
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full border border-stone-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
      />
      <div className="absolute bottom-2 right-2 bg-stone-800 p-2 rounded text-xs text-teal-400 z-10">
        {currentTool && <span>Tool: {currentTool}</span>}
        {hoverCell && <span className="ml-2">Position: ({hoverCell.x}, {hoverCell.y})</span>}
      </div>
    </div>
  );
};

export default MapCanvas;
