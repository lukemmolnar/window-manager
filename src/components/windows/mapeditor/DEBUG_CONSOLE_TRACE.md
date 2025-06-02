# Complete Console Debugging Trace for Tileset ID & Tile ID

## 🔍 How to Debug Tileset/Tile ID Issues

You now have comprehensive console logging throughout the entire data flow. Here's exactly what to look for:

## 🎯 Step-by-Step Console Log Flow

### **Step 1: Tile Selection in TilePalette**
When you click a tile, look for these logs:

```
🎯 [TilePalette] FAVORITE TILE CLICKED: {tileIndex: X, tilesetId: "abc123", ...}
🚀 [TilePalette] Calling onSelectTile with: X abc123
```
OR for regular tiles:
```
🎯 [TilePalette] REGULAR TILE CLICKED: {tileIndex: X, tilesetId: "abc123", ...}
🚀 [TilePalette] Calling onSelectTile with: X abc123
```

**✅ CHECK**: Are both `tileIndex` and `tilesetId` populated correctly?

---

### **Step 2: MapEditorWindow Receives Selection**
Look for this log immediately after tile selection:

```
🟠 TILE SELECTION RECEIVED in MapEditorWindow: {
  newTileId: X,
  newTilesetId: "abc123",
  previousTileId: Y,
  previousTilesetId: "def456",
  currentTileType: "floor"
}
```

**✅ CHECK**: Are `newTileId` and `newTilesetId` the same values from Step 1?

---

### **Step 3: Canvas Click/Edit**
When you click on the canvas, look for these logs:

```
🎨 RENDERING TILE: {
  position: "(5, 3)",
  type: "floor",
  tileId: X,
  tilesetId: "abc123",
  rotation: 0,
  hasRegistryInit: true,
  availableTilesets: ["abc123", "def456"]
}
```

AND:

```
MapCanvas EDIT: At (5, 3) using tool=floor, passing tileId=X, rotation=0
```

For shadow tiles specifically:
```
SHADOW TILE EDIT: At (5, 3) tileId=X - IMPORTANT! Verify this ID is preserved!
```

**✅ CHECK**: Are the `tileId` and `tilesetId` still correct from your selection?

---

### **Step 4: MapEditorWindow.handleEdit**
Look for this comprehensive log:

```
============== EDIT CELL ==============
MapEditorWindow received edit with rotation: 0
Cell coordinates: (5, 3), Tool: floor, tileId: X, tilesetId: "abc123"
```

For shadow tiles:
```
Using tileId: X for shadow tile at (5, 3)
Setting cell in layer 0 with tileId: X, tilesetId: "abc123", rotation: 0
```

**✅ CHECK**: Are all parameters correct as they enter the final storage function?

---

### **Step 5: mapUtils.setCellInLayer (Final Storage)**
This is the **CRITICAL** step where data is actually stored:

```
setCellInLayer called with: x=5, y=3, type=floor, tileId=X, tilesetId="abc123"
Using rotation: 0 (converted from 0, global=undefined)
```

For shadow tiles specifically:
```
EDIT: Shadow tile at (5, 3) - Incoming tileId: X, tilesetId: "abc123", type: number
EDIT: Shadow tile tileId set to: X
```

Then either:
```
Updating existing cell at (5, 3) with rotation=0, tilesetId="abc123"
Updated cell: {x: 5, y: 3, type: "floor", tileId: X, tilesetId: "abc123", rotation: 0}
```

OR:
```
Adding new cell at (5, 3) with rotation=0, tilesetId="abc123"
Added cell: {x: 5, y: 3, type: "floor", tileId: X, tilesetId: "abc123", rotation: 0}
```

**✅ CHECK**: Is the final stored cell object complete with all expected properties?

---

## 🚨 Common Issues to Look For

### **Issue 1: Tile Selection Not Working**
**Symptoms**: You can't see selected tiles highlighted
**Look for**: Missing or incorrect logs in Steps 1-2
**Possible causes**: 
- TilePalette not calling `onSelectTile` 
- `selectedTileId`/`selectedTilesetId` not updating in MapEditorWindow

### **Issue 2: Wrong Tile Being Placed**
**Symptoms**: Different tile appears than what you selected
**Look for**: Values changing between Steps 1-5
**Possible causes**: 
- State not updating correctly in MapEditorWindow
- Canvas using wrong tile ID values

### **Issue 3: Missing Tileset ID**
**Symptoms**: Tiles render as fallback colors instead of images
**Look for**: `tilesetId: null` or `tilesetId: undefined` in any step
**Possible causes**: 
- TilePalette not providing tilesetId
- mapUtils not storing tilesetId correctly

### **Issue 4: Shadow Tiles Specific Issues**
**Symptoms**: Shadow tiles don't work correctly
**Look for**: Special shadow tile logs in Steps 3-5
**Key check**: `EDIT: Shadow tile tileId set to: X` should show the correct value

---

## 🔧 Quick Debug Commands

Add these to your browser console while debugging:

```javascript
// Check current map editor state
console.log('Current selection:', {
  selectedTileId: window.selectedTileId,
  selectedTilesetId: window.selectedTilesetId,
  selectedTileType: window.selectedTileType
});

// Check what's in localStorage
console.log('Last saved map:', localStorage.getItem('last_saved_map_pretty'));

// Check debug map data
console.log('Debug map data:', localStorage.getItem('debug_mapData'));
```

---

## 🎯 Testing Procedure

1. **Open browser console** (F12)
2. **Clear console** logs (click clear button)
3. **Select a tile** from the palette
4. **Verify Steps 1-2** logs appear correctly
5. **Click on canvas** to place tile
6. **Verify Steps 3-5** logs appear correctly
7. **Check final cell object** has all expected properties

---

## ✅ Success Indicators

You'll know everything is working when you see:

1. ✅ **Tile selection logs** show correct tileId and tilesetId
2. ✅ **MapEditorWindow logs** show state updating correctly  
3. ✅ **Canvas logs** show correct values being passed
4. ✅ **mapUtils logs** show complete cell object being stored
5. ✅ **Tiles render correctly** on the canvas (not fallback colors)

## 🔴 Failure Indicators

Look for these red flags:

1. 🔴 **Missing tilesetId**: `tilesetId: null` or `undefined` anywhere
2. 🔴 **Missing tileId**: `tileId: undefined` especially for shadow tiles
3. 🔴 **Type mismatches**: `type: string` when expecting `type: number`
4. 🔴 **Fallback rendering**: `🔴 FALLBACK RENDERING` messages
5. 🔴 **Silent failures**: Expected logs not appearing

Use this trace to pinpoint exactly where your tileset ID and tile ID data is getting lost or corrupted!
