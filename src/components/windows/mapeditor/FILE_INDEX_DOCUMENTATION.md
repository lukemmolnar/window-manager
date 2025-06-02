# Map Editor File Index & Function Reference

## File Structure Overview

```
mapeditor/
├── 📄 Core Components
│   ├── LayerPanel.jsx           - Layer management UI (add, remove, reorder, visibility)
│   ├── MapCanvas.jsx            - Main canvas rendering & user interaction
│   ├── MapPropertiesPanel.jsx   - Map settings and properties editor
│   ├── MapToolbar.jsx           - Tool selection and file operations
│   ├── TilePalette.jsx          - Tile selection interface with marketplace
│   └── TilesetSelector.jsx      - Dynamic tileset loading and selection
│
├── 📁 components/
│   └── OpacitySlider.jsx        - Custom opacity control component
│
├── 📁 utils/
│   ├── dynamicTileRegistry.js   - Dynamic tileset loading & caching system
│   ├── mapUtils.js              - Core map data operations (CRUD, serialization)
│   └── tileRegistry.js          - Static tile definitions (legacy)
│
├── 📁 styles/
│   └── RangeSlider.css          - Styling for range input components
│
└── 📄 Documentation
    ├── MAP_EDITOR_DOCUMENTATION.md  - Complete architectural guide
    ├── FILE_INDEX_DOCUMENTATION.md  - This file index
    └── README.md                     - Basic usage guide
```

## Component Responsibilities

### 🎯 **Core Components**

#### **LayerPanel.jsx**
**Purpose**: Layer management interface
**Key Functions**:
- Layer visibility toggle
- Layer opacity control
- Add/remove layers
- Reorder layers (up/down)
- Rename layers
- Current layer selection

#### **MapCanvas.jsx** 
**Purpose**: Main rendering engine and user interaction
**Key Functions**:
- Canvas rendering pipeline
- Mouse/keyboard event handling
- Grid coordinate transformations
- Tile rendering with rotation support
- Viewport management (pan/zoom)
- Brush size support
- Tool preview and hover indicators

#### **MapPropertiesPanel.jsx**
**Purpose**: Map configuration and settings
**Key Functions**:
- Map dimensions editing
- Grid size configuration
- Map metadata management
- Export/import settings

#### **MapToolbar.jsx**
**Purpose**: Tool selection and file operations
**Key Functions**:
- Tool selection (select, floor, wall, door, shadow, erase)
- Save/load operations
- Undo/redo (planned)
- Clear map function
- Brush size control

#### **TilePalette.jsx**
**Purpose**: Tile selection and marketplace integration
**Key Functions**:
- Tile type category selection
- Individual tile selection from tilesets
- Rotation controls
- Marketplace window creation
- Active tile highlighting

#### **TilesetSelector.jsx**
**Purpose**: Dynamic tileset management
**Key Functions**:
- Load tilesets from API
- Display tileset grid interface
- Handle tile selection events
- Cache tileset images
- Category filtering

### 🔧 **Utility Modules**

#### **utils/dynamicTileRegistry.js**
**Purpose**: Dynamic tileset loading and caching system
**Key Functions**:
- Fetch tileset data from API
- Image loading and caching
- Tileset section management
- User selection persistence
- Performance optimization

#### **utils/mapUtils.js**
**Purpose**: Core map data operations
**Key Functions**:
- Map creation and initialization
- File parsing and serialization
- Cell CRUD operations
- Coordinate transformations
- Data validation
- ASCII conversion utilities

#### **utils/tileRegistry.js**
**Purpose**: Static tile definitions (legacy)
**Key Functions**:
- Predefined tile type definitions
- Default tile appearance settings
- Fallback rendering support

### 🎨 **UI Components**

#### **components/OpacitySlider.jsx**
**Purpose**: Custom opacity control component
**Key Functions**:
- Opacity value input
- Visual feedback
- Event handling
- Value validation

## Data Flow Architecture

```
User Input → MapCanvas → MapEditorWindow (State) → All Components
     ↓
TilePalette → TilesetSelector → dynamicTileRegistry → API
     ↓
mapUtils → File Operations → Storage/Server
```

## Function Categories by Purpose

### 🎨 **Rendering Functions**
- `MapCanvas.drawTile()` - Individual tile rendering
- `MapCanvas.drawCanvas()` - Full canvas rendering pipeline
- `TilesetSelector.renderTileGrid()` - Tileset display

### 🎯 **Event Handlers**
- `MapCanvas.handleCellEdit()` - Cell editing operations
- `MapCanvas.handleMouseDown/Move/Up()` - Mouse interaction
- `TilePalette.handleSelectTile()` - Tile selection
- `LayerPanel.handleToggleVisibility()` - Layer controls

### 💾 **Data Operations**
- `mapUtils.setCellInLayer()` - Cell placement
- `mapUtils.removeCellFromLayer()` - Cell removal
- `mapUtils.serializeMap()` - Save operations
- `mapUtils.parseMapFile()` - Load operations

### 🔄 **State Management**
- `MapEditorWindow.handleEdit()` - Central edit dispatcher
- `MapEditorWindow.handleSelectTile()` - Tile selection state
- `MapEditorWindow.handleRotateTile()` - Rotation state
- `LayerPanel.handleLayerChange()` - Layer state

### 🌐 **API & External**
- `dynamicTileRegistry.initializeTileRegistry()` - Load tilesets
- `dynamicTileRegistry.fetchTilesetData()` - API calls
- `TilesetSelector.loadTilesetImage()` - Image loading

## Extension Points

### Adding New Tile Types
1. Add to `MapToolbar` tool selection
2. Implement rendering in `MapCanvas.drawTile()`
3. Add to `TilePalette` categories
4. Update `mapUtils` validation

### Adding New Tools
1. Add to `MapToolbar` UI
2. Implement logic in `MapCanvas.handleCellEdit()`
3. Add state to `MapEditorWindow`
4. Update cursor/preview rendering

### Adding New Features
1. Follow established callback pattern
2. Use `mapUtils` for data operations
3. Update relevant UI components
4. Maintain state in `MapEditorWindow`

## Performance Considerations

### Optimization Opportunities
- **Canvas Rendering**: Currently full redraw - could use dirty rectangles
- **Tileset Loading**: Images cached but could use service worker
- **State Updates**: Some redundant re-renders possible
- **Memory Usage**: Large maps could benefit from virtualization

### Current Bottlenecks
1. **Full canvas redraws** on every change
2. **Global rotation state** using window object
3. **Debug logging** throughout production code
4. **Synchronous file operations** in demo mode

## Next Steps for Documentation

1. ✅ **File Index** (This document)
2. 🔄 **Individual File JSDoc** (In progress)
3. ⏳ **Function Cross-Reference**
4. ⏳ **API Documentation Generation**
5. ⏳ **Visual Function Maps**
6. ⏳ **Usage Examples**

---

*This documentation provides a complete overview of the map editor architecture. Each file will be individually documented with comprehensive JSDoc comments for every function.*
