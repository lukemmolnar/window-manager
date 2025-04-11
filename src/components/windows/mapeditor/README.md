# Gridmap Editor for SlumTerm

This directory contains the implementation of the Gridmap Editor for the SlumTerm virtual tabletop system. The editor allows users to create and edit grid-based maps for tabletop role-playing games.

## Components

- **MapEditorWindow.jsx**: Main window component that integrates all subcomponents
- **MapCanvas.jsx**: Canvas component for rendering and interacting with the grid map
- **MapToolbar.jsx**: Toolbar with editing tools and file operations
- **LayerPanel.jsx**: Panel for managing layers (create, toggle visibility, reorder)
- **utils/mapUtils.js**: Utility functions for map operations

## Integration with SlumTerm

The Gridmap Editor is integrated with the SlumTerm system in a similar way to the Markdown Editor:

1. When a user clicks on a file with the `.map` extension in the file explorer, the MapEditorWindow will open
2. The MapEditorWindow loads the map data from the file and displays it in the grid view
3. Users can edit the map using various tools and save the changes back to the file

## Map File Format (.map)

Map files use a JSON format to store the grid data:

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
      "cells": [
        { "x": 0, "y": 0, "type": "wall" },
        { "x": 1, "y": 0, "type": "wall" }
      ]
    },
    {
      "name": "objects",
      "visible": true,
      "cells": [
        { "x": 2, "y": 1, "type": "door" }
      ]
    }
  ],
  "tokenPositions": [],
  "metadata": {
    "author": "username",
    "created": "ISO date",
    "modified": "ISO date"
  }
}
```

## Features

- **Grid-based editing**: Place walls, floors, doors, and other map elements on a grid
- **Layer management**: Create, rename, reorder, and toggle visibility of layers
- **Zoom and pan**: Adjust the view to focus on different parts of the map
- **File operations**: Create new maps, open existing maps, save changes

## Future Plans

- **Multiplayer support**: Allow multiple players to view and interact with the map
- **Token placement**: Add player and monster tokens to the map
- **Line of sight**: Implement fog of war and dynamic lighting
- **Map scripting**: Add interactivity to map elements

## Usage

1. Create a new `.map` file in the file explorer
2. Click on the file to open it in the Gridmap Editor
3. Use the toolbar to select tools for editing the map
4. Save your changes

## Development Notes

- The grid map editor uses the HTML Canvas API for rendering
- Map data is stored in JSON format compatible with the server's file system
- Map editing operations use immutable data patterns to avoid direct state mutation
