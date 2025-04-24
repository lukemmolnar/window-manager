import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Grid } from 'lucide-react';
import { screenToGridCoordinates, gridToScreenCoordinates } from './utils/mapUtils';
import { getTileCoordinates, FLOOR_TILESET_PATH, WALL_TILESET_PATH, SHADOW_TILESET_PATH, TILE_SIZE, TILESET_COLS } from './utils/tileRegistry';

/**
 * The main canvas component for the Grid Map Editor
 * Handles rendering and interaction with the grid map
 */
const MapCanvas = ({ 
  mapData, 
  currentLayer, 
  currentTool, 
  selectedTileId = 0,
  selectedRotation = 0,
  onEdit, 
  showGrid = true, 
  resetViewRef,
  brushSize = 1
}) => {
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
  const [floorTilesetImage, setFloorTilesetImage] = useState(null);
  const [wallTilesetImage, setWallTilesetImage] = useState(null);
  const [shadowTilesetImage, setShadowTilesetImage] = useState(null);
  const [actualColumns, setActualColumns] = useState(TILESET_COLS);
  
  // Reset view to origin (0,0) function
  const resetViewToOrigin = useCallback(() => {
    setViewportOffset({ x: 0, y: 0 });
  }, []);

  // Store the reset function in the provided ref
  useEffect(() => {
    if (resetViewRef) {
      resetViewRef.current = resetViewToOrigin;
    }
  }, [resetViewToOrigin, resetViewRef]);
  
  // Load the tileset images on component mount
  useEffect(() => {
    // Load floor tileset
    const floorImg = new Image();
    floorImg.onload = () => {
      // Calculate columns based on the image width
      const cols = Math.floor(floorImg.width / TILE_SIZE);
      console.log(`MapCanvas: Detected ${cols} columns in the floor sprite sheet`);
      
      // Batch state updates to avoid multiple re-renders
      setActualColumns(cols);
      setFloorTilesetImage(floorImg);
    };
    floorImg.onerror = () => console.error('Failed to load floor tileset');
    floorImg.src = FLOOR_TILESET_PATH;
    
    // Load wall tileset
    const wallImg = new Image();
    wallImg.onload = () => {
      setWallTilesetImage(wallImg);
      console.log('MapCanvas: Wall tileset loaded successfully');
    };
    wallImg.onerror = () => console.error('Failed to load wall tileset');
    wallImg.src = WALL_TILESET_PATH;

    const shadowImg = new Image();
    shadowImg.onload = () => {
      setShadowTilesetImage(shadowImg);
      console.log('MapCanvas: Shadow tileset loaded successfully');
    };
    shadowImg.onerror = () => console.error('Failed to load shadow tileset');
    shadowImg.src = SHADOW_TILESET_PATH;
  }, []);

  /**
   * Draw a tile on the canvas based on its type and tile ID
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position on canvas
   * @param {number} y - Y position on canvas
   * @param {number} size - Size of the tile
   * @param {Object} cell - The cell data including type and tileId
   */
  // Pass showGrid to the drawTile function
  const drawTile = (ctx, x, y, size, cell) => {
    const { type, tileId, rotation = 0 } = cell;
    
    // Add debugging for rotation values
    if (rotation !== 0) {
      console.log(`Drawing cell at (${cell.x}, ${cell.y}) with rotation: ${rotation}°`);
    }
    
    // Handle floor tiles with tileset
    if (type === 'floor' && tileId !== undefined && floorTilesetImage) {
      // Calculate coordinates based on actual columns in the sheet
      // instead of using getTileCoordinates which might use the wrong column count
      const col = tileId % actualColumns;
      const row = Math.floor(tileId / actualColumns);
      const sourceX = col * TILE_SIZE;
      const sourceY = row * TILE_SIZE;
      
      // Handle rotation
      if (rotation !== 0) {
        // Save the current context state
        ctx.save();
        
        // Move to the center of the tile position
        ctx.translate(x + size/2, y + size/2);
        
        // Rotate the context by the specified angle (convert degrees to radians)
        const angleInRadians = (rotation * Math.PI) / 180;
        ctx.rotate(angleInRadians);
        
        // Draw the tile, but with coordinates adjusted to draw centered around origin
        ctx.drawImage(
          floorTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          -size/2, -size/2, size, size
        );
        
        // Restore the context to its original state
        ctx.restore();
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      } else {
        // No rotation, draw normally
        ctx.drawImage(
          floorTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          x, y, size, size
        );
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      }
      return;
    }
    
    // Handle wall tiles with tileset
    if (type === 'wall' && tileId !== undefined && wallTilesetImage) {
      // Calculate coordinates based on actual columns in the sheet
      const col = tileId % actualColumns;
      const row = Math.floor(tileId / actualColumns);
      const sourceX = col * TILE_SIZE;
      const sourceY = row * TILE_SIZE;
      
      // Handle rotation
      if (rotation !== 0) {
        // Save the current context state
        ctx.save();
        
        // Move to the center of the tile position
        ctx.translate(x + size/2, y + size/2);
        
        // Rotate the context by the specified angle (convert degrees to radians)
        const angleInRadians = (rotation * Math.PI) / 180;
        ctx.rotate(angleInRadians);
        
        // Draw the tile, but with coordinates adjusted to draw centered around origin
        ctx.drawImage(
          wallTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          -size/2, -size/2, size, size
        );
        
        // Restore the context to its original state
        ctx.restore();
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      } else {
        // No rotation, draw normally
        ctx.drawImage(
          wallTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          x, y, size, size
        );
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      }
      return;
    }

    if (type === 'wall' && tileId !== undefined && shadowTilesetImage) {
      // Calculate coordinates based on actual columns in the sheet
      const col = tileId % actualColumns;
      const row = Math.floor(tileId / actualColumns);
      const sourceX = col * TILE_SIZE;
      const sourceY = row * TILE_SIZE;
      
      // Handle rotation
      if (rotation !== 0) {
        // Save the current context state
        ctx.save();
        
        // Move to the center of the tile position
        ctx.translate(x + size/2, y + size/2);
        
        // Rotate the context by the specified angle (convert degrees to radians)
        const angleInRadians = (rotation * Math.PI) / 180;
        ctx.rotate(angleInRadians);
        
        // Draw the tile, but with coordinates adjusted to draw centered around origin
        ctx.drawImage(
          shadowTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          -size/2, -size/2, size, size
        );
        
        // Restore the context to its original state
        ctx.restore();
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      } else {
        // No rotation, draw normally
        ctx.drawImage(
          shadowTilesetImage,
          sourceX, sourceY, TILE_SIZE, TILE_SIZE,
          x, y, size, size
        );
        
        // Draw grid lines on top only if showGrid is true
        if (showGrid) {
          ctx.strokeStyle = '#44403c'; // Stone-700
          ctx.strokeRect(x, y, size, size);
        }
      }
      return;
    }
    
    // Fall back to original color-based rendering for other types
    switch(type) {
      case 'wall':
        // Fallback if wall tileset image failed to load or tileId is undefined
        ctx.fillStyle = '#6b7280'; // Gray
        ctx.fillRect(x, y, size, size);
        break;
      case 'floor':
        // Default floor if no tileId or image failed to load
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(x, y, size, size);
        break;
      case 'door':
        // For doors, apply rotation to the whole door element
        if (rotation !== 0) {
          // Save the current context state
          ctx.save();
          
          // Move to the center of the tile position
          ctx.translate(x + size/2, y + size/2);
          
          // Rotate the context by the specified angle (convert degrees to radians)
          const angleInRadians = (rotation * Math.PI) / 180;
          ctx.rotate(angleInRadians);
          
          // Draw floor background
          ctx.fillStyle = '#1e293b'; // Slate background
          ctx.fillRect(-size/2, -size/2, size, size);
          
          // Draw door centered
          ctx.fillStyle = '#b45309'; // Amber-700
          ctx.fillRect(-size/4, -size/4, size/2, size/2);
          
          // Restore the context to its original state
          ctx.restore();
        } else {
          // Draw floor first (no rotation)
          ctx.fillStyle = '#1e293b'; // Slate background
          ctx.fillRect(x, y, size, size);
          // Then draw door
          ctx.fillStyle = '#b45309'; // Amber-700
          ctx.fillRect(x + size/4, y + size/4, size/2, size/2);
        }
        break;
      // Add more tile types as needed
      default:
        // Unknown tile type, draw placeholder
        ctx.fillStyle = '#ef4444'; // Red-500
        ctx.fillRect(x, y, size, size);
    }
    
    // Draw grid lines on top only if showGrid is true
    if (showGrid) {
      ctx.strokeStyle = '#44403c'; // Stone-700
      ctx.strokeRect(x, y, size, size);
    }
  };

  /**
   * Handle cell editing with a specific tool or the current selected tool
   */
  const handleCellEdit = (e, overrideTool) => {
    if (!canvasRef.current || !mapData || !onEdit) return;
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridCoords = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
    
    console.log("Editing cell at", gridCoords, "with tool:", overrideTool || currentTool);
    console.log("Current selectedRotation value:", selectedRotation);
    
    // Basic validation if the center point is outside map boundaries
    if (gridCoords.x < 0 || gridCoords.x >= mapData.width || 
        gridCoords.y < 0 || gridCoords.y >= mapData.height) {
      // Coordinates outside map boundary - do nothing
      console.log(`Cell at (${gridCoords.x}, ${gridCoords.y}) is outside map boundaries (${mapData.width}x${mapData.height})`);
      return;
    }
    
    // Use the override tool if provided, otherwise use the current tool
    const toolToUse = overrideTool || currentTool;
    
    // Only edit if using a tool other than select
    if (toolToUse === 'select') return;
    
    // For brush size of 1, just edit the single cell
    if (brushSize === 1) {
  // Add more detailed logs about rotation
  console.log("=================== PLACING TILE ===================");
  console.log("About to call onEdit with rotation:", selectedRotation);
  console.log("Tool being used:", toolToUse);
  console.log("Current selected rotation value:", selectedRotation);
  console.log("At coordinates:", gridCoords);
  
  // Use the selectedRotation prop directly
  const rotation = parseInt(selectedRotation, 10) || 0;
  console.log("Using prop selectedRotation for placement:", rotation);
  
  // Pass rotation as the fourth parameter with additional debugging
  console.log(`Calling onEdit with rotation value: ${rotation} (${typeof rotation})`);
  onEdit(gridCoords.x, gridCoords.y, toolToUse, rotation);
  
  // This log should help us verify the call was made
  console.log("onEdit called with rotation:", rotation);
  console.log("=================================================");
      return;
    }
    
    // For larger brushes, always center around the hover cell
    // This matches the hover indicator logic for consistent behavior
    const halfBrush = Math.floor(brushSize / 2);
    
    // Calculate how to position the brush so the cursor is in the center
    // For even sizes, there's no true center cell, so we offset by half a cell
    const offset = brushSize % 2 === 0 ? 0.5 : 0;
    
    // Apply to all cells in the brush area
    for (let dy = -halfBrush + offset; dy < brushSize - halfBrush + offset; dy++) {
      for (let dx = -halfBrush + offset; dx < brushSize - halfBrush + offset; dx++) {
        const cellX = Math.floor(gridCoords.x + dx);
        const cellY = Math.floor(gridCoords.y + dy);
        
        // Skip if outside map boundaries
        if (cellX < 0 || cellX >= mapData.width || 
            cellY < 0 || cellY >= mapData.height) {
          continue;
        }
        
        // Edit this cell with the current rotation value from props
        const rotation = parseInt(selectedRotation, 10) || 0;
        
        console.log(`Placing brushed tile at (${cellX}, ${cellY}) with rotation: ${rotation}°`);
        onEdit(cellX, cellY, toolToUse, rotation);
      }
    }
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

  // Reference to the canvas context
  const ctxRef = useRef(null);
  
  // Function to draw the canvas contents
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    
    // Log current rotation when drawing canvas for debugging
    console.log("Drawing canvas with selectedRotation:", selectedRotation);

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    
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
    ctx.strokeStyle = '#9c27b0'; // Orange-500
    ctx.lineWidth = 2;
    ctx.strokeRect(mapStartX, mapStartY, mapWidthPx, mapHeightPx);
    
    // Add small corner markers for extra visibility
    const cornerSize = 8;
    ctx.fillStyle = '#9c27b0'; // Orange-500
    
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
        
        // Set layer opacity if defined, default to 1.0 (fully opaque)
        const layerOpacity = layer.opacity !== undefined ? layer.opacity : 1.0;
        ctx.globalAlpha = layerOpacity;
        
        // Draw cells
        layer.cells.forEach(cell => {
          // Calculate screen position for this cell
          const screenX = Math.floor(cell.x * gridSize + offsetX);
          const screenY = Math.floor(cell.y * gridSize + offsetY);
          
          // Draw the tile if it's visible on screen
          if (screenX > -gridSize && screenX < width && 
              screenY > -gridSize && screenY < height) {
            drawTile(ctx, screenX, screenY, gridSize, cell);
          }
        });
        
        // Highlight current layer with a subtle border if it matches the currentLayer (only if showGrid is true)
        if (layerIndex === currentLayer && showGrid) {
          // Make sure we use full opacity for the highlight, regardless of layer opacity
          ctx.globalAlpha = 1.0;
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
        
        // Reset global alpha to default (1.0) after drawing this layer
        ctx.globalAlpha = 1.0;
      });
    }
    
    // Draw grid on top (only if showGrid is true)
    if (showGrid) {
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
    }
    
    // Draw hover highlight
    if (hoverCell) {
      // For brush size of 1, just highlight the single cell
      if (brushSize === 1) {
        const screenX = Math.floor(hoverCell.x * gridSize + offsetX);
        const screenY = Math.floor(hoverCell.y * gridSize + offsetY);
        
        ctx.fillStyle = 'rgba(20, 184, 166, 0.3)'; // Teal with opacity
        ctx.fillRect(screenX, screenY, gridSize, gridSize);
        
        // Show tool indicator
        ctx.fillStyle = '#14b8a6';
        ctx.font = '12px monospace';
        
        // If right mouse button is pressed, show "erase" as the tool
        const displayTool = activeMouseButton === 2 ? 'erase' : currentTool;
        ctx.fillText(displayTool, screenX + 5, screenY + 15);
      } else {
        // For larger brushes, always center around the hoverCell
        const halfBrush = Math.floor(brushSize / 2);
        
        // Calculate how to position the brush so the cursor is in the center
        // For even sizes, there's no true center cell, so we need to offset by half a cell
        const offset = brushSize % 2 === 0 ? 0.5 : 0;
        
        // Generate all cell positions that should be part of the brush
        for (let dy = -halfBrush + offset; dy < brushSize - halfBrush + offset; dy++) {
          for (let dx = -halfBrush + offset; dx < brushSize - halfBrush + offset; dx++) {
            const cellX = Math.floor(hoverCell.x + dx);
            const cellY = Math.floor(hoverCell.y + dy);
            
            // Skip if outside map boundaries
            if (cellX < 0 || cellX >= mapData.width || 
                cellY < 0 || cellY >= mapData.height) {
              continue;
            }
            
            // Calculate screen position (fixed to separate gridSize multiplication from offset)
            const screenX = Math.floor(cellX * gridSize) + offsetX;
            const screenY = Math.floor(cellY * gridSize) + offsetY;
            
            ctx.fillStyle = 'rgba(20, 184, 166, 0.3)'; // Teal with opacity
            ctx.fillRect(screenX, screenY, gridSize, gridSize);
          }
        }
        
        // Show tool indicator centered on the cursor position
        const indicatorX = Math.floor(hoverCell.x * gridSize) + offsetX;
        const indicatorY = Math.floor(hoverCell.y * gridSize) + offsetY;
        
        ctx.fillStyle = '#14b8a6';
        ctx.font = '12px monospace';
        
        // If right mouse button is pressed, show "erase" as the tool
        const displayTool = activeMouseButton === 2 ? 'erase' : currentTool;
        ctx.fillText(`${displayTool} (${brushSize}×${brushSize})`, indicatorX + 5, indicatorY + 15);
      }
    }
  }, [
    gridSize, 
    viewportOffset, 
    mapData, 
    currentLayer, 
    hoverCell, 
    currentTool, 
    activeMouseButton, 
    showGrid, 
    floorTilesetImage,
    wallTilesetImage,
    shadowTilesetImage,
    actualColumns,
    // selectedRotation, // Removed: Toolbar rotation shouldn't trigger full canvas redraw
    brushSize  // Add brushSize as a dependency too for completeness
  ]);
  
  // Call drawCanvas whenever relevant dependencies change
  useEffect(() => {
    if (canvasRef.current && mapData) {
      drawCanvas();
    }
  }, [drawCanvas]);
  
  // Update canvas size when container size changes
  useEffect(() => {
    if (canvasRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      drawCanvas();
    }
  }, [canvasSize, drawCanvas]);

  // Manually trigger a redraw whenever tileset images are loaded
  // Breaking the circular dependency by removing drawCanvas from dependencies
  useEffect(() => {
    if ((floorTilesetImage || wallTilesetImage || shadowTilesetImage) && canvasRef.current && mapData) {
      // Call drawCanvas without adding it to dependency array
      drawCanvas();
    }
  }, [floorTilesetImage, wallTilesetImage, shadowTilesetImage, mapData]); // Removed drawCanvas dependency

  // Handle canvas mouse events
  const handleMouseDown = (e) => {
    // Prevent context menu on right click
    if (e.button === 2) {
      e.preventDefault();
    }
    
    setActiveMouseButton(e.button);
    
    // Middle mouse button (1) for panning
    if (e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault(); // Prevent default scrolling behavior for middle mouse button
    } 
    // Right mouse button (2) for erasing
    else if (e.button === 2 && !isSpacePressed) {
      handleCellEdit(e, 'erase');
    }
    // Left mouse button (0) for drawing with current tool
    else if (e.button === 0 && !isSpacePressed) {
      handleCellEdit(e);
    }
    // If space is pressed, start dragging regardless of which mouse button
    else if (isSpacePressed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    // Always update hover cell
    updateHoverCell(e);
    
    // Handle dragging for pan with middle mouse button (1),
    // or spacebar + any mouse button
    if (isDragging && (activeMouseButton === 1 || isSpacePressed)) {
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
    // Handle continuous drawing while left mouse button is down
    else if (activeMouseButton === 0 && !isSpacePressed) {
      handleCellEdit(e);
    }
    // Handle continuous erasing while right mouse button is down
    else if (activeMouseButton === 2 && !isSpacePressed) {
      handleCellEdit(e, 'erase');
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
    // Get cursor position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Get grid coordinates under cursor before zoom
    const gridCoordsBefore = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
    
    // Calculate new grid size
    let newGridSize;
    if (e.deltaY < 0) {
      // Zoom in - increase grid size
      newGridSize = Math.min(gridSize + 4, 64);
    } else {
      // Zoom out - decrease grid size
      newGridSize = Math.max(gridSize - 4, 16);
    }
    
    // Calculate screen coordinates after zoom with the current viewport offset
    const screenCoordsAfter = {
      x: gridCoordsBefore.x * newGridSize + viewportOffset.x,
      y: gridCoordsBefore.y * newGridSize + viewportOffset.y
    };
    
    // Calculate the difference to maintain cursor position
    const dx = mouseX - screenCoordsAfter.x;
    const dy = mouseY - screenCoordsAfter.y;
    
    // Update grid size and adjust viewport offset
    setGridSize(newGridSize);
    setViewportOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative flex overflow-hidden bg-stone-900"
    >
      <div className="absolute top-2 left-2 bg-stone-800 p-2 rounded text-xs text-teal-400 flex items-center z-10">
        <Grid size={14} className="mr-1" />
        <span>Grid Size: {gridSize}px</span>
        {!showGrid && <span className="ml-2">(Grid Hidden)</span>}
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
        {currentTool && <span>Tool: {activeMouseButton === 2 ? 'erase' : currentTool}</span>}
        {hoverCell && <span className="ml-2">Position: ({hoverCell.x}, {hoverCell.y})</span>}
      </div>
    </div>
  );
};

export default MapCanvas;
