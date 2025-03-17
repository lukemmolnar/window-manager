# Canvas Window Documentation

The Canvas Window is a powerful tool for creating and editing interactive node-based diagrams, similar to Obsidian Canvas. It allows you to create, connect, and organize nodes in a visual workspace.

## Features

- **Interactive Canvas**: Pan and zoom to navigate the workspace
- **Node Types**: Create text nodes and group nodes
- **Connections**: Create connections between nodes
- **Drag and Drop**: Easily create new nodes by dragging from the panel
- **Selection**: Select and manipulate multiple nodes at once
- **Save/Load**: Save and load canvas files in `.canvas` format
- **Persistence**: Canvas state is automatically saved between sessions

## Getting Started

1. Open a Canvas window from the command bar or menu
2. Load an existing canvas file with the `load` command
3. Create nodes by dragging from the panel or using the toolbar buttons
4. Connect nodes by clicking and dragging from one node to another
5. Save your work with the `save` command

## Commands

The Canvas window supports the following commands:

- `save`: Save the current canvas to the current file path
- `load [path]`: Load a canvas from the specified file path (e.g., `load /public/sample.canvas`)
- `new-text`: Create a new text node
- `new-group`: Create a new group node
- `delete`: Delete selected elements

## Node Types

### Text Nodes

Text nodes contain plain text content. They are useful for adding notes, descriptions, or any textual information to your canvas.

To create a text node:
- Click the "Text" button in the toolbar
- Use the `new-text` command
- Drag the "Text Node" item from the panel

### Group Nodes

Group nodes are containers that can visually group related nodes together. They have a label and a background color.

To create a group node:
- Click the "Group" button in the toolbar
- Use the `new-group` command
- Drag the "Group Node" item from the panel

## Working with Nodes

### Selecting Nodes

- Click on a node to select it
- Hold Shift and click to select multiple nodes
- Click and drag in empty space to create a selection box

### Moving Nodes

- Click and drag a selected node to move it
- When multiple nodes are selected, moving one will move all selected nodes

### Editing Nodes

- For text nodes, you can edit the text content when creating the node
- For group nodes, you can set the label and color when creating the node

### Connecting Nodes

To create a connection between nodes:
1. Click on a node (the source)
2. Drag to another node (the target)
3. Release to create the connection

### Deleting Elements

To delete nodes or connections:
1. Select the elements you want to delete
2. Press the Delete key or use the `delete` command
3. Alternatively, click the "Delete" button in the toolbar when elements are selected

## Canvas Files

Canvas files use the `.canvas` extension and are stored in JSON format. They contain:

- A list of nodes with their positions, types, and data
- A list of edges (connections) between nodes

Example canvas files:
- `/public/sample.canvas`: A sample canvas with various node types and connections
- `/example.canvas`: The example canvas provided with the application

## Tips and Tricks

- Use the minimap in the bottom-right corner to navigate large canvases
- The controls in the bottom-left allow you to zoom in/out and fit the view
- You can use the mouse wheel to zoom in and out
- Hold the middle mouse button or space+left mouse button to pan the canvas
- Use groups to organize related nodes and reduce visual clutter
- Save your work frequently using the `save` command

## Keyboard Shortcuts

- Delete: Delete selected elements
- Ctrl+A: Select all elements
- Ctrl+C: Copy selected elements
- Ctrl+V: Paste copied elements
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Ctrl+S: Save (when implemented)
- +: Zoom in
- -: Zoom out
- 0: Reset zoom
- Arrow keys: Move selected nodes
