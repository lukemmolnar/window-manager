import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Grid } from 'lucide-react';
import { screenToGridCoordinates, gridToScreenCoordinates } from './utils/mapUtils';
import dynamicTileRegistry from './utils/dynamicTileRegistry';
import API_CONFIG from '../../../config/api';

/**
 * The main canvas component for the Grid Map Editor
 * Handles rendering and interaction with the grid map
 */
const MapCanvas = ({ 
  mapData, 
  currentLayer, 
  currentTool, 
  selectedTileId = 0,
  selectedTilesetId = null,
  selectedRotation = 0,
  onEdit, 
  showGrid = true, 
  resetViewRef,
  brushSize = 1,
  // Add the onViewportChange prop to save viewport changes
  onViewportChange = null
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Initialize with default values, will be overridden if mapData contains viewport info
  const [gridSize, setGridSize] = useState(32);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMouseButton, setActiveMouseButton] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [tilesetImages, setTilesetImages] = useState({});
  const [tilesetColumns, setTilesetColumns] = useState({});
  const [isRegistryInitialized, setIsRegistryInitialized] = useState(false);

    // Function to save viewport changes
    const saveViewport = useCallback(() => {
      if (onViewportChange) {
        onViewportChange({
          x: viewportOffset.x,
          y: viewportOffset.y,
          scale: gridSize / 32 // Store scale as a ratio of the default grid size
        });
      }
    }, [viewportOffset, gridSize, onViewportChange]);
  
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
  
  // ENHANCED DEBUG: Track when critical props change
  useEffect(() => {
    console.log('🔄 [MapCanvas] Props Changed - selectedTilesetId:', {
      selectedTilesetId: { value: selectedTilesetId, type: typeof selectedTilesetId },
      selectedTileId: { value: selectedTileId, type: typeof selectedTileId },
      selectedRotation: { value: selectedRotation, type: typeof selectedRotation },
      currentTool,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [selectedTilesetId, selectedTileId, selectedRotation, currentTool]);
  
  // Initialize dynamic tile registry on component mount
  useEffect(() => {
    const initializeTilesets = async () => {
      console.log('MapCanvas: Initializing dynamic tile registry...');
      
      // Initialize the registry (now loads ALL available tilesets for rendering)
      const success = await dynamicTileRegistry.initializeTileRegistry();
      
      if (success) {
        // Get ALL available tilesets (for rendering any tile)
        const allTilesets = dynamicTileRegistry.getAllTilesets();
        console.log(`MapCanvas: Found ${allTilesets.length} total tilesets for rendering`);
        
        // Load tileset images for ALL tilesets (so any tile can be rendered)
        const loadedImages = {};
        const loadedColumns = {};
        
        for (const tileset of allTilesets) {
          if (tileset.sections && tileset.sections.length > 0) {
            // Get the pre-loaded image from the registry
            const img = dynamicTileRegistry.getTilesetImageById(tileset.id);
            
            if (img) {
              // Calculate columns based on image width
              const cols = Math.floor(img.width / dynamicTileRegistry.TILE_SIZE);
              loadedColumns[tileset.id] = cols;
              loadedImages[tileset.id] = img;
              console.log(`MapCanvas: Loaded tileset ${tileset.name} with ${cols} columns`);
            } else {
              console.warn(`MapCanvas: Could not load image for tileset ${tileset.name}`);
            }
          }
        }
        
        setTilesetImages(loadedImages);
        setTilesetColumns(loadedColumns);
        setIsRegistryInitialized(true);
        
        console.log(`MapCanvas: Initialization complete - ${Object.keys(loadedImages).length} tileset images loaded for rendering`);
      } else {
        console.log('MapCanvas: No tilesets available or initialization failed');
        setIsRegistryInitialized(true);
      }
    };
    
    initializeTilesets();
  }, []);

  /**
   * Draw a tile on the canvas based on its type and tile ID
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position on canvas
   * @param {number} y - Y position on canvas
   * @param {number} size - Size of the tile
   * @param {Object} cell - The cell data including type and tileId
   */
  const drawTile = (ctx, x, y, size, cell) => {
    const { type, tileId, rotation = 0, tilesetId } = cell;
    
    // console.log('🎨 RENDERING TILE:', {
    //   position: `(${cell.x}, ${cell.y})`,
    //   type,
    //   tileId,
    //   tilesetId,
    //   rotation,
    //   hasRegistryInit: isRegistryInitialized,
    //   availableTilesets: Object.keys(tilesetImages)
    // }
    ;
    
    // If registry is not initialized or no tilesets are loaded, use fallback rendering
    if (!isRegistryInitialized || Object.keys(tilesetImages).length === 0) {
      console.log('🔴 FALLBACK RENDERING: Registry not initialized or no tilesets loaded');
      // Fall back to color-based rendering
      switch(type) {
        case 'wall':
          ctx.fillStyle = '#6b7280'; // Gray
          ctx.fillRect(x, y, size, size);
          break;
        case 'floor':
          ctx.fillStyle = '#1e293b'; // Slate-800
          ctx.fillRect(x, y, size, size);
          break;
        case 'shadow':
          ctx.fillStyle = '#BF40BF'; // Purple
          ctx.fillRect(x, y, size, size);
          break;
        case 'door':
          if (rotation !== 0) {
            ctx.save();
            ctx.translate(x + size/2, y + size/2);
            const angleInRadians = (rotation * Math.PI) / 180;
            ctx.rotate(angleInRadians);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-size/4, -size/4, size/2, size/2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(x + size/4, y + size/4, size/2, size/2);
          }
          break;
        default:
          ctx.fillStyle = '#ef4444'; // Red-500
          ctx.fillRect(x, y, size, size);
      }
      
      if (showGrid) {
        ctx.strokeStyle = '#44403c';
        ctx.strokeRect(x, y, size, size);
      }
      return;
    }
    
    // Get the appropriate tileset image for this tile
    let tilesetImage = null;
    let columns = dynamicTileRegistry.DEFAULT_TILESET_COLS;
    
    // First try to use the specific tileset ID if provided
    if (tilesetId && tilesetImages[tilesetId]) {
      tilesetImage = tilesetImages[tilesetId];
      columns = tilesetColumns[tilesetId] || columns;
    } else {
      // Otherwise, find the first tileset that has sections for this category
      const selectedTilesets = dynamicTileRegistry.getSelectedTilesets();
      for (const tileset of selectedTilesets) {
        if (tileset.sections && tileset.sections.some(s => s.category === type)) {
          if (tilesetImages[tileset.id]) {
            tilesetImage = tilesetImages[tileset.id];
            columns = tilesetColumns[tileset.id] || columns;
            break;
          }
        }
      }
    }
    
    // If we have a tileset image and a valid tile ID, draw from the tileset
    if (tilesetImage && tileId !== undefined && ['floor', 'wall', 'shadow'].includes(type)) {
      // Calculate coordinates based on the tileset's column count
      const col = tileId % columns;
      const row = Math.floor(tileId / columns);
      const sourceX = col * dynamicTileRegistry.TILE_SIZE;
      const sourceY = row * dynamicTileRegistry.TILE_SIZE;
      
      // Handle rotation
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(x + size/2, y + size/2);
        const angleInRadians = (rotation * Math.PI) / 180;
        ctx.rotate(angleInRadians);
        
        ctx.drawImage(
          tilesetImage,
          sourceX, sourceY, dynamicTileRegistry.TILE_SIZE, dynamicTileRegistry.TILE_SIZE,
          -size/2, -size/2, size, size
        );
        
        ctx.restore();
      } else {
        ctx.drawImage(
          tilesetImage,
          sourceX, sourceY, dynamicTileRegistry.TILE_SIZE, dynamicTileRegistry.TILE_SIZE,
          x, y, size, size
        );
      }
      
      // Draw grid lines on top only if showGrid is true
      if (showGrid) {
        ctx.strokeStyle = '#44403c'; // Stone-700
        ctx.strokeRect(x, y, size, size);
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
      case 'shadow':
        // Default floor if no tileId or image failed to load
        ctx.fillStyle = '#BF40BF'; // Slate-800
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
    
    // ENHANCED DEBUG: Log current props at the moment of editing
    console.log('🎯 [MapCanvas] handleCellEdit ENTRY - Current Props State:', {
      selectedTileId: { value: selectedTileId, type: typeof selectedTileId },
      selectedTilesetId: { value: selectedTilesetId, type: typeof selectedTilesetId },
      selectedRotation: { value: selectedRotation, type: typeof selectedRotation },
      currentTool,
      overrideTool,
      propsReceived: {
        selectedTileIdFromProps: selectedTileId,
        selectedTilesetIdFromProps: selectedTilesetId,
        selectedRotationFromProps: selectedRotation
      },
      isUndefined: {
        selectedTileId: selectedTileId === undefined,
        selectedTilesetId: selectedTilesetId === undefined,
        selectedRotation: selectedRotation === undefined
      },
      isNull: {
        selectedTileId: selectedTileId === null,
        selectedTilesetId: selectedTilesetId === null,
        selectedRotation: selectedRotation === null
      }
    });
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridCoords = screenToGridCoordinates(mouseX, mouseY, gridSize, viewportOffset);
        
    // Basic validation if the center point is outside map boundaries
    if (gridCoords.x < 0 || gridCoords.x >= mapData.width || 
        gridCoords.y < 0 || gridCoords.y >= mapData.height) {
      // Coordinates outside map boundary - do nothing
      return;
    }
    
    // Use the override tool if provided, otherwise use the current tool
    const toolToUse = overrideTool || currentTool;
    
    // Only edit if using a tool other than select
    if (toolToUse === 'select') return;
    
    // For brush size of 1, just edit the single cell
    if (brushSize === 1) {
  
      // Use the selectedRotation prop directly
      const rotation = parseInt(selectedRotation, 10) || 0;
      
      // CRITICAL DEBUG: Log the exact tileId being sent from MapCanvas
      console.log(`MapCanvas EDIT: At (${gridCoords.x}, ${gridCoords.y}) using tool=${toolToUse}, passing tileId=${selectedTileId}, rotation=${rotation}`);
      
      // This is especially important for shadow tiles
      if (toolToUse === 'shadow') {
        console.log(`SHADOW TILE EDIT: At (${gridCoords.x}, ${gridCoords.y}) tileId=${selectedTileId} - IMPORTANT! Verify this ID is preserved!`);
      }
      
      // Pass rotation, selectedTileId, and selectedTilesetId
      onEdit(gridCoords.x, gridCoords.y, toolToUse, rotation, selectedTileId, selectedTilesetId);
  
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
        
        // CRITICAL: For brush operations, also add logging for shadow tiles
        if (toolToUse === 'shadow') {
          console.log(`BRUSH: Shadow tile at (${cellX}, ${cellY}) with tileId=${selectedTileId}`);
        }
        
        onEdit(cellX, cellY, toolToUse, rotation, selectedTileId, selectedTilesetId);
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
          // ctx.fillStyle = '#0f172a'; // Very dark slate blue
          ctx.fillStyle = '#042f2e'; // Very dark slate blue
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
    ctx.strokeStyle = '#5eead4'; // Orange-500
    ctx.lineWidth = 2;
    ctx.strokeRect(mapStartX, mapStartY, mapWidthPx, mapHeightPx);
    
    // Add small corner markers for extra visibility
    const cornerSize = 8;
    ctx.fillStyle = '#5eead4'; // Orange-500
    
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
    tilesetImages,
    tilesetColumns,
    isRegistryInitialized,
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
  useEffect(() => {
    if (isRegistryInitialized && Object.keys(tilesetImages).length > 0 && canvasRef.current && mapData) {
      // Call drawCanvas without adding it to dependency array
      drawCanvas();
    }
  }, [isRegistryInitialized, tilesetImages, mapData]); // Trigger redraw when tilesets are loaded

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
