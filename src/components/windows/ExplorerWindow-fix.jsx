// This is a patch file that contains only important modifications to fix the file persistence issue
// You should compare this with your existing ExplorerWindow.jsx and integrate these changes

// KEY CHANGES:

// 1. In handleFileSelect function, add this line AFTER setting the selected file:
/*
    // Make sure parent folders are expanded so the file is visible on reload
    expandParentFolders(file.path);
*/

// 2. In loadExplorerState function, when restoring a file, add this code to ensure proper path setting:
/*
    // Important: Update the currentPath to ensure parent directories are visible
    if (restoredFile.type === 'file') {
      // For files, set the current path to the parent directory
      const parentPath = getParentDirectoryPath(restoredFile.path);
      setCurrentPath(parentPath);
    } else {
      // For directories, set the current path to the directory itself
      setCurrentPath(restoredFile.path);
    }
*/

// 3. Add a debounce for explorer state saving by adding a new ref:
/*
    const explorerSaveTimeoutRef = useRef(null); // New ref for debounced explorer state saving
*/

// 4. Modify the useEffect that saves explorer state to add debounce:
/*
  // Save explorer state to IndexedDB when it changes
  useEffect(() => {
    // Early return if state hasn't been loaded yet (prevents overwriting with default values)
    if (!stateLoadedRef.current) return;
    
    // Clear any existing timeout
    if (explorerSaveTimeoutRef.current) {
      clearTimeout(explorerSaveTimeoutRef.current);
    }
    
    // Save the explorer state to IndexedDB with debounce
    explorerSaveTimeoutRef.current = setTimeout(() => {
      console.log(`Saving explorer state for window ${nodeId}:`, {
        selectedFile,
        expandedFolders,
        activeTab
      });
      
      saveExplorerState({
        id: nodeId,
        content: {
          selectedFile,
          expandedFolders,
          activeTab
        }
      }).catch(error => {
        console.error(`Failed to save explorer state for window ${nodeId} to IndexedDB:`, error);
      });
    }, 300); // 300ms debounce
    
    // Clear timeout on cleanup
    return () => {
      if (explorerSaveTimeoutRef.current) {
        clearTimeout(explorerSaveTimeoutRef.current);
      }
    };
  }, [selectedFile, expandedFolders, activeTab, nodeId]);
*/

// 5. Modify the initial directory loading code to ensure selected files have their parent folders expanded:
/*
  // Load initial directory contents
  useEffect(() => {
    // Load public files for all users
    fetchPublicDirectoryContents('/', true).then(() => {
      // After files are loaded, try to restore expanded state for the selected file
      if (selectedFile) {
        console.log('Ensuring parent folders for selected file are expanded:', selectedFile.path);
        expandParentFolders(selectedFile.path);
      }
    });
    
    // Load private files for admin users
    if (isAdmin) {
      fetchDirectoryContents('/', true).catch(error => {
        console.error('Failed to load private files:', error);
        // Set a specific error message for private files without affecting public files
        setFiles([]);
        if (activeTab === 'private') {
          setErrorMessage('Failed to load private files. Please ensure your admin directory exists.');
        }
      });
    }
  }, [isAdmin, activeTab]);
*/

// 6. Always set stateLoaded to true in loadExplorerState even if no state is found:
/*
  if (savedState && savedState.content) {
    // ... existing code ...
  } else {
    // Even if no state is loaded, mark as loaded to allow future saves
    stateLoadedRef.current = true;
  }
*/
