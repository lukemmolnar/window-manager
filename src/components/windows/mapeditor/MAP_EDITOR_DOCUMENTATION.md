# Map Editor Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Hierarchy](#component-hierarchy)
4. [Data Structures](#data-structures)
5. [Core Components](#core-components)
6. [Utility Modules](#utility-modules)
7. [Features & Functionality](#features--functionality)
8. [State Management](#state-management)
9. [Event Handling](#event-handling)
10. [Integration Points](#integration-points)
11. [Known Issues & Improvements](#known-issues--improvements)

## Overview

The Map Editor is a grid-based map creation tool for the SlumTerm virtual tabletop system. It allows users to create, edit, and save tile-based maps with multiple layers, dynamic tilesets, and various tile types.

### Key Features
- Multi-layer map editing
- Dynamic tileset loading from marketplace
- Tile rotation support
- Pan and zoom functionality
- Brush size support for efficient editing
- Real-time preview
- JSON-based map file format (.map)

## Architecture

The Map Editor follows a hierarchical component structure with clear separation of concerns:

```
MapEditorWindow (State Management & Orchestration)
├── MapToolbar (Tool Selection & Operations)
├── MapCanvas (Rendering & User Interaction)
├── LayerPanel (Layer Management)
└── TilePalette (Tile Selection)
    └── TilesetSelector (Tileset Management)
```

### Data Flow
1. **User Input** → MapCanvas → MapEditorWindow (via callbacks)
2. **State Updates** → MapEditorWindow → All child components (via props)
3. **Tile Selection** → TilePalette → MapEditorWindow → MapCanvas

## Component Hierarchy

### 1. MapEditorWindow (Main Container)
- **Location**: `MapEditorWindow.jsx`
- **Purpose**: Main orchestrator that manages all state and coordinates sub-components
- **Key Responsibilities**:
  - Map data state management
  - Tool and tile selection state
  - File loading/saving
  - Coordinating updates between components

### 2. MapCanvas (Rendering Engine)
- **Location**: `mapeditor/MapCanvas.jsx`
- **Purpose**: Handles all canvas rendering and user interactions
- **Key Responsibilities**:
  - Grid rendering
  - Tile rendering with tileset support
  - Mouse/keyboard event handling
  - Viewport management (pan/zoom)
  - Brush size support

### 3. MapToolbar (Tool Interface)
- **Location**: `mapeditor/MapToolbar.jsx`
- **Purpose**: Provides tool selection and map operations
- **Key Responsibilities**:
  - Tool selection UI
  - Save/load operations
  - Undo/redo (planned)
  - Clear map function

### 4. LayerPanel (Layer Management)
- **Location**: `mapeditor/LayerPanel.jsx`
- **Purpose**: Manages map layers
- **Key Responsibilities**:
  - Layer visibility toggle
  - Layer opacity control
  - Add/remove layers
  - Reorder layers
  - Rename layers

### 5. TilePalette (Tile Selection)
- **Location**: `mapeditor/TilePalette.jsx`
- **Purpose**: Tile selection and marketplace integration
- **Key Responsibilities**:
  - Display available tiles
  - Tile type selection
  - Rotation controls
  - Marketplace window creation

### 6. TilesetSelector (Tileset Management)
- **Location**: `mapeditor/TilesetSelector.jsx`
- **Purpose**: Dynamic tileset loading and selection
- **Key Responsibilities**:
  - Load tilesets from API
  - Display tileset grid
  - Handle tile selection

## Data Structures

### Map File Format (.map)

```json
{
  "version": "1.0",
  "name": "Map Name",
  "gridSize": 32,
  "width": 20,
  "height": 15,
  "defaultTile": "floor",
  "layers": [
    {
      "name": "terrain",
      "visible": true,
      "opacity": 1.0,
      "cells": [
        {
          "x": 0,
          "y": 0,
          "type": "wall",
          "tileId": 5,
          "tilesetId": "tileset-123",
          "rotation": 0
        }
      ]
    }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "scale": 1
  },
  "tokenPositions": [],
  "metadata": {
    "author": "username",
    "created": "2024-01-01T00:00:00Z",
    "modified": "2024-01-01T00:00:00Z"
  }
}
```

### Cell Data Structure
```javascript
{
  x: number,          // Grid X coordinate
  y: number,          // Grid Y coordinate
  type: string,       // 'floor', 'wall', 'door', 'shadow', etc.
  tileId: number,     // Tile index in tileset (optional)
  tilesetId: string,  // Tileset identifier (optional)
  rotation: number    // Rotation in degrees (0, 90, 180, 270)
}
```

### Layer Data Structure
```javascript
{
  name: string,       // Layer name
  visible: boolean,   // Layer visibility
  opacity: number,    // Layer opacity (0-1)
  cells: Cell[]       // Array of cells in this layer
}
```

## Core Components

### MapEditorWindow State Variables

```javascript
// Map data and editing state
mapData              // Complete map data object
currentLayer         // Index of active layer
currentTool          // Selected tool ('select', 'floor', 'wall', etc.)
isDirty              // Unsaved changes flag
error                // Error message display

// Tile selection state
selectedTileId       // Currently selected tile ID
selectedTilesetId    // Currently selected tileset ID
selectedTileType     // Tile type category
selectedRotation     // Tile rotation (0, 90, 180, 270)
```

### MapCanvas Features

1. **Rendering Pipeline**
   - Clear canvas
   - Draw background
   - Draw grid cells
   - Render each visible layer
   - Apply layer opacity
   - Draw hover indicator
   - Show tool preview

2. **Interaction Modes**
   - Left Click: Apply current tool
   - Right Click: Erase
   - Middle Click: Pan
   - Spacebar + Drag: Pan
   - Scroll: Zoom

3. **Coordinate Systems**
   - Screen coordinates (pixels)
   - Grid coordinates (cells)
   - Viewport offset for panning

## Utility Modules

### mapUtils.js

Key functions:
- `createEmptyMap()` - Create new map with defaults
- `parseMapFile()` - Parse JSON map data
- `serializeMap()` - Convert map to JSON string
- `setCellInLayer()` - Add/update cell in layer
- `removeCellFromLayer()` - Remove cell from layer
- `screenToGridCoordinates()` - Convert mouse position to grid
- `gridToScreenCoordinates()` - Convert grid to screen position

### dynamicTileRegistry.js

Manages dynamic tileset loading:
- Fetches tileset data from API
- Caches tileset images
- Provides tile selection interface
- Handles tileset categories

### tileRegistry.js

Static tile definitions (legacy):
- Predefined tile types
- Default tile appearances
- Fallback rendering

## Features & Functionality

### 1. Multi-Layer Editing
- Create multiple layers
- Toggle layer visibility
- Adjust layer opacity
- Reorder layers
- Current layer highlighting

### 2. Tile System
- Dynamic tileset loading
- Tile rotation (0°, 90°, 180°, 270°)
- Multiple tile types (floor, wall, door, shadow)
- Tileset marketplace integration

### 3. Tools
- **Select**: No editing
- **Floor**: Place floor tiles
- **Wall**: Place wall tiles
- **Door**: Place door tiles
- **Shadow**: Place shadow tiles
- **Erase**: Remove tiles

### 4. Viewport Control
- Pan: Middle mouse or spacebar + drag
- Zoom: Mouse wheel
- Viewport persistence in save file
- Reset view function

### 5. Brush Support
- Variable brush sizes
- Centered on cursor
- Visual preview
- Boundary checking

## State Management

### State Flow
1. **User Action** → Event Handler → State Update → Re-render
2. **File Load** → Parse → Update State → Render
3. **Tool Change** → Update Tool State → Update Canvas Cursor
4. **Tile Selection** → Update Selection State → Ready for Placement

### Key State Updates

```javascript
// Tile placement
handleEdit(x, y, tool, rotation, tileId, tilesetId)
  → setCellInLayer()
  → setMapData()
  → setIsDirty(true)

// Tile selection
handleSelectTile(tileId, tilesetId)
  → setSelectedTileId()
  → setSelectedTilesetId()
  → setCurrentTool()

// Layer management
handleToggleLayerVisibility(layerIndex)
  → Update layer.visible
  → setMapData()
  → setIsDirty(true)
```

## Event Handling

### Mouse Events
- `onMouseDown` - Start drawing/panning
- `onMouseMove` - Continue drawing/panning, update hover
- `onMouseUp` - End drawing/panning
- `onWheel` - Zoom in/out
- `onContextMenu` - Prevent right-click menu

### Keyboard Events
- `Space` - Hold for pan mode
- Future: Hotkeys for tools

### Canvas Interaction Logic
```javascript
if (spacebar pressed || middle mouse) {
  // Pan mode
} else if (right mouse) {
  // Erase mode
} else if (left mouse) {
  // Apply current tool
}
```

## Integration Points

### 1. File System Integration
- Loads .map files from file explorer
- Saves to localStorage (demo)
- Future: Server-side file operations

### 2. Marketplace Integration
- Dynamic tileset loading
- User tileset selection
- Tileset caching

### 3. Window System Integration
- Window state management
- Command handling
- Focus management

## Known Issues & Improvements

### Current Issues

1. **Shadow Tile Handling**
   - Complex logic to ensure tileId is always present
   - Multiple validation points in code

2. **Rotation State**
   - Uses global `window.currentMapRotation`
   - Should be refactored to proper state management

3. **Debug Code**
   - Console.log statements throughout
   - Debug UI elements visible
   - Should use proper debug system

4. **Performance**
   - Full canvas redraw on every change
   - Could optimize with dirty rectangle tracking

### Suggested Improvements

1. **Code Quality**
   - Remove debug code
   - Extract magic numbers to constants
   - Improve error handling
   - Add proper TypeScript types

2. **Features**
   - Implement undo/redo
   - Add copy/paste functionality
   - Grid snapping options
   - Keyboard shortcuts

3. **UI/UX**
   - Better tool icons
   - Keyboard shortcut hints
   - Status bar with coordinates
   - Mini-map overview

4. **Architecture**
   - Move state to context/reducer
   - Separate rendering logic
   - Create custom hooks
   - Improve component composition

## Development Guidelines

### Adding New Tile Types
1. Add type to tool selection in MapToolbar
2. Add rendering logic in MapCanvas.drawTile()
3. Update tile palette categories
4. Add to mapUtils cell type validation

### Adding New Tools
1. Add tool to MapToolbar
2. Implement tool logic in MapCanvas.handleCellEdit()
3. Update cursor/preview rendering
4. Add tool state to MapEditorWindow

### Extending Tilesets
1. Upload tileset through marketplace
2. Define tileset sections/categories
3. Tileset auto-loads in map editor
4. Tiles available in palette

## Next Steps

1. **Clean up debug code and console logs**
2. **Add proper JSDoc comments to all functions**
3. **Create TypeScript type definitions**
4. **Implement proper error boundaries**
5. **Add unit tests for utility functions**
6. **Optimize rendering performance**
7. **Improve state management architecture**
