# Canvas State Loading Error Fix Guide

## The Issue

You're experiencing the following error when opening a canvas file:

```
Failed to load canvas state for window 1742238849976 from IndexedDB: NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
    at db-operations.js:36:28
    at new Promise (<anonymous>)
    at getData (db-operations.js:35:10)
    at async loadCanvasState (CanvasWindow.jsx:95:28)
```

There's also a warning about React Flow node types:

```
[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.
```

## Root Cause Analysis

### IndexedDB Error

This error occurs when trying to access an object store in IndexedDB that doesn't exist. This typically happens when:

1. The database schema has changed between versions
2. The database has become corrupted
3. There's a mismatch between the expected schema and the actual one

In this case, the `CANVAS_STATES` store in IndexedDB that's used to save the state of canvas windows cannot be found, which causes the error.

### React Flow Warning

The second issue is a performance warning from React Flow. When you create new object references (like `nodeTypes` or `edgeTypes`) on each render, it can cause unnecessary re-renders. React Flow is suggesting to either:

1. Define the nodeTypes object outside the component
2. Use memoization (via `useMemo`) to prevent recreating the object on each render

## Solution

We've implemented a two-part solution:

### 1. IndexedDB Reset Button

A reset button has been added to the application (in the bottom right corner) that will:
- Delete all IndexedDB databases associated with the application
- Reload the page to create fresh databases with the correct schema

This button is added via the `reset-indexeddb.js` script, which is already included in your `index.html`.

### 2. Canvas Fix

To fix the React Flow warning and improve canvas support, the following changes have been implemented:

- Created a shared `canvasNodeTypes.js` utility that exports the node types
- Updated both `CanvasWindow.jsx` and `CanvasPreview.jsx` to use this shared object
- Added proper canvas file support to the `ExplorerWindow.jsx` component to view canvas files

## How to Fix the Issue

1. Launch your application in the browser
2. Look for the red "Reset IndexedDB" button in the bottom right corner
3. Click the button and confirm the reset when prompted
4. The page will reload with a fresh IndexedDB database with the correct schema
5. Canvas files should now load correctly without the error

## Prevention

To prevent this issue in the future:

1. When making changes to the database schema, consider adding version migration logic
2. Use consistent imports for shared objects like nodeTypes
3. Consider adding a version field to your database to track schema changes

## Technical Details

The core issue was that the `CANVAS_STATES` object store either:
1. Never existed in the current database
2. Was deleted or renamed at some point
3. The database connection failed to include it in the transaction

The error happens at this point in the code:

```javascript
// In db-operations.js
export const getData = (storeName, id) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly'); // <-- Error happens here
    // ...
  });
}
```

By resetting the IndexedDB database, we allow the application to recreate all object stores with the latest schema, resolving the issue.
