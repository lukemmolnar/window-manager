# Canvas Editor

The Canvas Editor is an Obsidian-style node-based editor that allows you to create, edit, and connect text nodes with arrows. This editor is integrated into the file explorer for `.canvas` files.

## Getting Started

1. Create a new `.canvas` file in the file explorer or open an existing one
2. The Canvas Editor will automatically open when you select a `.canvas` file
3. You'll see a blank canvas or the previously saved content

## Features

### Creating Nodes

There are two ways to create new text nodes:

1. **Using the toolbar**:
   - Click the "Add Node" button in the toolbar
   - Enter your text in the popup dialog
   - Click "Create" to add the node to the canvas

2. **Using drag and drop**:
   - Find the "Drag to create" panel in the top-left corner
   - Drag the "Text Node" item onto the canvas
   - Drop it where you want the node to appear

### Editing Nodes

There are two ways to edit nodes:

1. **Using the toolbar**:
   - Click once on a node to select it
   - Click the "Edit" button that appears in the toolbar
   - A text area will appear, allowing you to modify the content

2. **Using the node's edit button**:
   - Hover over any node to reveal an edit button in its top-right corner
   - Click the edit button to enter edit mode

When editing:
- Press **Ctrl+Enter** or click outside the node to save your changes
- Press **Escape** to cancel editing

### Connecting Nodes

Nodes have connection handles that are visible on all four sides (top, right, bottom, left):

1. Look for the teal circular dots on each node
2. Click and drag from any handle to another node's handle 
3. Release to create a connection arrow
4. Connections can flow in any direction between nodes
5. You can have multiple connections between the same nodes

Note: The connection handles are currently always visible for better usability while this feature is being developed.

### Managing Elements

- **Select** elements by clicking on them
- **Delete** selected elements using the "Delete" button in the toolbar
- **Move** nodes by dragging them around the canvas
- **Pan** the canvas by dragging in empty space
- **Zoom** using the scroll wheel or the controls in the bottom-right

### Saving Your Work

- Your canvas is automatically saved as you work
- You can manually save by clicking the "Save" button in the toolbar

## Tips

- Use the minimap in the bottom-right to navigate large canvases
- Press "Delete" on your keyboard to remove selected elements
- Hold Shift while selecting to select multiple elements
- Hover over nodes to reveal the edit button in the top-right corner

## Example Usage

Try opening the `sample.canvas` file to see an example of what you can create with the Canvas Editor.
