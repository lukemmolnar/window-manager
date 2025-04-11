import React, { useRef, useEffect, useState } from 'react';
import { Grid } from 'lucide-react';

/**
 * The main canvas component for the Grid Map Editor
 * This is a placeholder implementation that shows a simple grid
 */
const MapCanvas = ({ mapData, currentLayer, currentTool, onEdit }) => {
  const canvasRef = useRef(null);
  const [gridSize, setGridSize] = useState(32);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Set up the canvas and draw the initial grid
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
    
    // Draw grid
    ctx.strokeStyle = '#44403c'; // Stone-700 from Tailwind
    ctx.lineWidth = 1;

    // Adjust for viewport offset
    const offsetX = viewportOffset.x % gridSize;
    const offsetY = viewportOffset.y % gridSize;
    
    // Draw vertical lines
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // If we have map data, we would render it here
    if (mapData && mapData.layers && mapData.layers.length > 0) {
      // This is a placeholder for actual rendering code
      // In a real implementation, we would iterate through the cells in the current layer
      // and draw the appropriate tiles/sprites for each cell
      
      // Example:
      // const currentLayerData = mapData.layers[currentLayer];
      // currentLayerData.cells.forEach(cell => {
      //   drawTile(ctx, cell.x * gridSize + offsetX, cell.y * gridSize + offsetY, cell.type);
      // });
      
      // For now, just show a placeholder indicator
      ctx.fillStyle = '#14b8a6'; // Teal-500 from Tailwind
      ctx.font = '16px monospace';
      ctx.fillText('Map Data Will Render Here', width / 2 - 120, height / 2);
    }
    
  }, [gridSize, viewportOffset, mapData, currentLayer]);

  // Handle canvas mouse events for dragging the viewport
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setViewportOffset({
      x: viewportOffset.x + dx,
      y: viewportOffset.y + dy
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      />
    </div>
  );
};

export default MapCanvas;
