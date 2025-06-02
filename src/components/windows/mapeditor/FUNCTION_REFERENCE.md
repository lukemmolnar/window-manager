# Map Editor Complete Function Reference

## Overview
This document provides a comprehensive reference of all functions within the map editor system, organized by file and functionality.

## How to Generate Visual Documentation

### 1. Install JSDoc
```bash
npm install -g jsdoc
# or locally in the project
cd window-manager && npm install --save-dev jsdoc
```

### 2. Generate Documentation
```bash
# From the mapeditor directory
jsdoc -c jsdoc.json

# Or add to package.json scripts:
# "docs": "jsdoc -c src/components/windows/mapeditor/jsdoc.json"
```

### 3. View Documentation
The generated documentation will be in `./docs/` directory with interactive HTML pages showing:
- **Function lists** with descriptions
- **Parameter details** with types
- **Return value documentation**
- **Cross-references** between functions
- **Search functionality**
- **Visual navigation** tree

---

## Function Categories by File

### 🎯 **MapEditorWindow.jsx** - State Orchestrator
**Purpose**: Central state management and coordination

#### State Management Functions
- `loadMapFromFile(filePath)` - Loads map data from file path
- `createNewMap()` - Creates new empty map with default settings
- `handleSaveMap()` - Saves current map to file/localStorage

#### Edit Operations
- `handleEdit(x, y, tool, rotation, tileId, tilesetId)` - Central edit dispatcher
- `handleSelectTile(tileId, tilesetId)` - Handles tile selection from palette
- `handleChangeTileType(tileType)` - Changes tile category (floor, wall, etc.)
- `handleRotateTile(rotation)` - Sets tile rotation angle

#### Layer Management Dispatchers
- `handleToggleLayerVisibility(layerIndex)` - Toggles layer visibility
- `handleAddLayer()` - Adds new layer to map
- `handleRemoveLayer(layerIndex)` - Removes layer from map
- `handleMoveLayerUp(layerIndex)` - Moves layer up in render order
- `handleMoveLayerDown(layerIndex)` - Moves layer down in render order
- `handleRenameLayer(layerIndex, newName)` - Renames a layer

---

### 🎨 **MapCanvas.jsx** - Rendering Engine
**Purpose**: Canvas rendering and user interaction

#### Core Rendering Functions
- `drawCanvas()` - Main rendering pipeline, draws entire map
- `drawTile(ctx, cell, layer)` - Renders individual tile with rotation
- `drawGrid(ctx)` - Draws grid overlay
- `drawHoverIndicator(ctx)` - Shows tile preview at cursor
- `drawBrushPreview(ctx)` - Shows brush size preview

#### Interaction Functions
- `handleMouseDown(e)` - Initiates drawing/editing
- `handleMouseMove(e)` - Continues drawing, updates hover
- `handleMouseUp(e)` - Ends drawing operation
- `handleMouseLeave(e)` - Clears hover indicators

#### Coordinate Functions
- `getCanvasCoordinates(e)` - Converts screen to canvas coordinates
- `getGridCoordinates(canvasX, canvasY)` - Converts canvas to grid coordinates
- `isValidGridPosition(x, y)` - Validates grid coordinates

#### Cell Operations
- `handleCellEdit(x, y)` - Handles individual cell editing
- `applyBrushEdit(centerX, centerY)` - Applies brush-size editing
- `getCellsInBrush(centerX, centerY, brushSize)` - Gets cells affected by brush

---

### 🎛️ **LayerPanel.jsx** - Layer Management UI
**Purpose**: Layer controls and tile palette integration

#### Layer Management Functions
- `toggleOpacityControls(layerIndex, e)` - Shows/hides opacity controls
- `handleStartEditing(e, layerIndex)` - Starts layer name editing
- `handleSaveLayerName(layerIndex)` - Saves edited layer name
- `handleInputKeyDown(e, layerIndex)` - Handles keyboard input during editing

#### UI State Functions
- `useEffect()` - Focuses input when editing starts

---

### 🎨 **TilePalette.jsx** - Tile Selection Interface
**Purpose**: Tile selection and marketplace integration

#### Tile Selection Functions
- `handleTileClick(tileId, tilesetId)` - Handles tile selection from grid
- `handleTileTypeChange(type)` - Changes tile category
- `handleRotationChange(rotation)` - Changes tile rotation

#### Marketplace Integration
- `handleOpenMarketplace()` - Opens marketplace window
- `loadUserSelectedTilesets()` - Loads user's selected tilesets

#### UI Functions
- `renderTileGrid()` - Renders available tiles
- `renderRotationControls()` - Shows rotation buttons

---

### 🛠️ **MapToolbar.jsx** - Tool Selection
**Purpose**: Tool selection and file operations

#### Tool Management Functions
- `handleToolSelect(tool)` - Changes current editing tool
- `handleBrushSizeChange(size)` - Changes brush size

#### File Operations
- `handleSave()` - Triggers save operation
- `handleClear()` - Clears map data
- `handleUndo()` - Undo last operation (planned)
- `handleRedo()` - Redo last operation (planned)

---

### 🎚️ **TilesetSelector.jsx** - Dynamic Tileset Loading
**Purpose**: Loads and displays tilesets from API

#### Tileset Loading Functions
- `loadTilesets()` - Fetches available tilesets from API
- `loadTilesetImage(tileset)` - Loads tileset image
- `cacheTilesetData(tileset)` - Caches tileset for performance

#### Selection Functions
- `handleTilesetSelect(tilesetId)` - Selects a tileset
- `handleTileSelect(tileId, tilesetId)` - Selects individual tile

#### UI Functions
- `renderTilesetGrid(tileset)` - Renders tileset tiles
- `renderTilesetInfo(tileset)` - Shows tileset metadata

---

### ⚙️ **utils/mapUtils.js** - Core Data Operations
**Purpose**: Map data manipulation and serialization

#### Map Creation Functions
- `createEmptyMap(width, height, gridSize)` - Creates new map structure
- `initializeLayer(name)` - Creates new layer object

#### Cell Operations
- `setCellInLayer(mapData, layerIndex, x, y, type, tileId, rotation, tilesetId)` - Adds/updates cell
- `removeCellFromLayer(mapData, layerIndex, x, y)` - Removes cell
- `getCellAt(mapData, layerIndex, x, y)` - Retrieves cell data
- `findCellIndex(layer, x, y)` - Finds cell index in layer

#### Serialization Functions
- `serializeMap(mapData)` - Converts map to JSON
- `parseMapFile(jsonData)` - Parses JSON to map data
- `validateMapData(mapData)` - Validates map structure

#### Utility Functions
- `generateMapId()` - Creates unique map identifier
- `calculateMapBounds(mapData)` - Gets map dimensions
- `optimizeMapData(mapData)` - Removes unused data

---

### 🌐 **utils/dynamicTileRegistry.js** - Tileset Management
**Purpose**: Dynamic tileset loading and caching

#### Registry Functions
- `initializeTileRegistry()` - Sets up tileset system
- `getTileRegistry()` - Returns current tileset registry
- `clearTileRegistry()` - Clears cached data

#### API Functions
- `fetchTilesetData(tilesetId)` - Loads tileset from API
- `fetchUserSelectedTilesets()` - Gets user's tilesets
- `saveTilesetSelection(tilesetId)` - Saves user selection

#### Cache Functions
- `cacheTilesetImage(tilesetId, imageData)` - Caches image
- `getCachedTileset(tilesetId)` - Retrieves cached tileset
- `clearTilesetCache()` - Clears image cache

---

### 📊 **utils/tileRegistry.js** - Static Definitions (Legacy)
**Purpose**: Predefined tile types and appearance

#### Tile Definition Functions
- `getTileDefinition(type)` - Gets tile appearance settings
- `getAllTileTypes()` - Returns all available tile types
- `getDefaultTileColor(type)` - Gets default tile color

---

### 🎛️ **components/OpacitySlider.jsx** - UI Component
**Purpose**: Custom opacity control

#### Control Functions
- `handleOpacityChange(value)` - Updates opacity value
- `validateOpacity(value)` - Ensures valid opacity range
- `formatOpacityDisplay(value)` - Formats display text

---

## Function Call Flow Diagrams

### Tile Selection Flow
```
User clicks tile → TilePalette.handleTileClick() 
                → MapEditorWindow.handleSelectTile()
                → MapCanvas updates preview
```

### Cell Editing Flow
```
User clicks canvas → MapCanvas.handleMouseDown()
                  → MapCanvas.handleCellEdit()
                  → MapEditorWindow.handleEdit()
                  → mapUtils.setCellInLayer()
                  → MapCanvas.drawCanvas() (re-render)
```

### Layer Management Flow
```
User clicks layer control → LayerPanel.handleX()
                         → MapEditorWindow.handleX()
                         → Map data updated
                         → MapCanvas.drawCanvas()
```

### File Operations Flow
```
User clicks save → MapToolbar.handleSave()
                → MapEditorWindow.handleSaveMap()
                → mapUtils.serializeMap()
                → localStorage/Server
```

## Extension Patterns

### Adding New Tile Types
1. Add to `MapToolbar` tool selection UI
2. Update `MapCanvas.drawTile()` rendering logic
3. Add to `TilePalette` category system
4. Update `mapUtils` validation functions

### Adding New Tools
1. Add tool to `MapToolbar` UI
2. Implement logic in `MapCanvas.handleCellEdit()`
3. Add state management to `MapEditorWindow`
4. Update cursor/preview rendering

### Adding New Features
1. Follow established callback pattern (child → parent)
2. Use `mapUtils` for all data operations
3. Update relevant UI components
4. Maintain state in `MapEditorWindow`

## Performance Optimization Opportunities

### Current Bottlenecks
1. **Full canvas redraws** - Could use dirty rectangle tracking
2. **Synchronous file operations** - Could use web workers
3. **Memory usage** - Large maps could use virtualization
4. **Image loading** - Could implement progressive loading

### Recommended Improvements
1. Implement **dirty rectangle rendering**
2. Add **virtual scrolling** for large maps
3. Use **web workers** for file operations
4. Implement **tileset streaming** for large tilesets

---

*This function reference provides complete coverage of the map editor codebase. Use JSDoc generation for interactive navigation and detailed parameter documentation.*
