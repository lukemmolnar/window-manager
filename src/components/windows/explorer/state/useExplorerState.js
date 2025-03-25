import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useWindowState } from '../../../../context/WindowStateContext';
import { WINDOW_TYPES } from '../../../../utils/windowTypes';
import { saveExplorerState, getExplorerState } from '../../../../services/indexedDBService';
import { createMarkdownConverter } from '../utils/markdownUtils';
import { 
  fetchPublicDirectoryContents, 
  fetchDirectoryContents, 
  fetchPublicFileContent, 
  fetchFileContent,
  saveFileContent as apiSaveFileContent,
  createNewItem as apiCreateNewItem,
  renameItem as apiRenameItem,
  deleteItem as apiDeleteItem,
  moveItem as apiMoveItem
} from '../api/fileOperations';
import { 
  getParentDirectoryPath, 
  expandParentFolders, 
  getActiveFolderPath 
} from '../utils/fileUtils';

const useExplorerState = (nodeId, windowState, updateWindowState) => {
  // Get auth context to check if user is admin
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;
  
  // Get window state context for additional persistence
  const { setActiveWindow } = useWindowState();
  
  // Refs to track state loading and saving
  const stateLoadedRef = useRef(false);
  const explorerSaveTimeoutRef = useRef(null); // New ref for debounced explorer state saving
  
  // Reference to store the saved state that needs to be restored after files are loaded
  const pendingStateRestoreRef = useRef(null);
  const fileLoadedRef = useRef(false);
  
  // Use state from windowState or initialize with defaults
  const [files, setFiles] = useState([]);
  const [publicFiles, setPublicFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(windowState?.currentPath || '/');
  const [selectedFile, setSelectedFile] = useState(windowState?.selectedFile || null);
  const [expandedFolders, setExpandedFolders] = useState(windowState?.expandedFolders || {});
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [fileContent, setFileContent] = useState(windowState?.fileContent || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPreview, setShowPreview] = useState(windowState?.showPreview || false);
  const [activeTab, setActiveTab] = useState(windowState?.activeTab || 'public'); // 'public' or 'private'
  
  // Additional state for markdown editing
  const [editMode, setEditMode] = useState(windowState?.editMode || false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  // State for file/folder creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState('file'); // 'file' or 'directory'
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // State for file/folder renaming
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  
  // State for file/folder deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for drag and drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  
  // For auto-save functionality and editor references
  const saveTimeoutRef = useRef(null);
  
  // Create markdown converter
  const converter = createMarkdownConverter();

  // Load explorer state from IndexedDB on mount
  useEffect(() => {
    const loadExplorerState = async () => {
      console.log(`[DEBUG] Starting to load explorer state for window ${nodeId}`);
      try {
        // Try to load explorer state from IndexedDB
        const savedState = await getExplorerState(nodeId);
        console.log(`[DEBUG] Retrieved state from IndexedDB:`, savedState);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`[DEBUG] Valid saved state found for window ${nodeId}:`, savedState.content);
          
          // Store the saved state in the ref for later restoration after files are loaded
          pendingStateRestoreRef.current = savedState.content;
          
          // Restore expanded folders and active tab immediately
          if (savedState.content.expandedFolders) {
            console.log(`[DEBUG] Restoring expanded folders`);
            setExpandedFolders(savedState.content.expandedFolders);
          }
          
          if (savedState.content.activeTab) {
            console.log(`[DEBUG] Restoring active tab: ${savedState.content.activeTab}`);
            setActiveTab(savedState.content.activeTab);
          }
          
          // Mark as loaded
          stateLoadedRef.current = true;
        } else {
          console.log(`[DEBUG] No valid saved state found or state already loaded`);
          // Even if no state is loaded, mark as loaded to allow future saves
          stateLoadedRef.current = true;
        }
      } catch (error) {
        console.error(`[DEBUG] Failed to load explorer state:`, error);
        // Ensure we still mark state as loaded even if there's an error
        stateLoadedRef.current = true;
      }
    };
    
    loadExplorerState();
  }, [nodeId]);
  
  // Handle window activation
  useEffect(() => {
    if (windowState?.isActive) {
      // Save this as the active explorer window
      setActiveWindow(nodeId, WINDOW_TYPES.EXPLORER);
    }
  }, [windowState?.isActive, nodeId, setActiveWindow]);
  
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
      console.log(`[DEBUG] Saving explorer state for window ${nodeId}:`, {
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
        console.error(`[DEBUG] Failed to save explorer state for window ${nodeId} to IndexedDB:`, error);
      });
    }, 300); // 300ms debounce
    
    // Clear timeout on cleanup
    return () => {
      if (explorerSaveTimeoutRef.current) {
        clearTimeout(explorerSaveTimeoutRef.current);
      }
    };
  }, [selectedFile, expandedFolders, activeTab, nodeId]);

  // Load initial directory contents and restore selected file afterward
  useEffect(() => {
    console.log('[DEBUG] Starting to load directory contents');
    
    // First, load the files
    const loadFilesAndRestoreSelection = async () => {
      try {
        // Load public files for all users
        await handleFetchPublicDirectoryContents('/', true);
        
        // Load private files for admin users (if applicable)
        if (isAdmin) {
          try {
            await handleFetchDirectoryContents('/', true);
          } catch (error) {
            console.error('Failed to load private files:', error);
            setFiles([]);
            if (activeTab === 'private') {
              setErrorMessage('Failed to load private files. Please ensure your admin directory exists.');
            }
          }
        }
        
        // Mark files as loaded
        fileLoadedRef.current = true;
        
        // Now that files are loaded, restore the selected file if we have one pending
        if (pendingStateRestoreRef.current && pendingStateRestoreRef.current.selectedFile) {
          const restoredFile = pendingStateRestoreRef.current.selectedFile;
          console.log(`[DEBUG] Now restoring selected file after files are loaded:`, restoredFile);
          
          // Set the selected file
          setSelectedFile(restoredFile);
          
          // Update the current path to ensure parent directories are visible
          if (restoredFile.type === 'file') {
            // For files, set the current path to the parent directory
            const parentPath = getParentDirectoryPath(restoredFile.path);
            setCurrentPath(parentPath);
          } else {
            // For directories, set the current path to the directory itself
            setCurrentPath(restoredFile.path);
          }
          
          // Ensure parent folders are expanded
          setExpandedFolders(prev => expandParentFolders(restoredFile.path, prev));
          
          // If it's a file, load its content
          if (restoredFile.type === 'file') {
            console.log(`[DEBUG] Loading content for restored file: ${restoredFile.path}`);
            
            // Set the preview mode for markdown files
            if (restoredFile.name.endsWith('.md')) {
              console.log(`[DEBUG] Setting preview mode for markdown file`);
              setShowPreview(true);
            }
            
            // Use handleFileSelect to load the file content
            // Use setTimeout to ensure this happens after state updates
            setTimeout(() => {
              console.log(`[DEBUG] Executing delayed file selection for: ${restoredFile.path}`);
              handleFileSelect(restoredFile, true);
            }, 100);
          }
          
          // Clear the pending restore
          pendingStateRestoreRef.current = null;
        } else {
          console.log('[DEBUG] No file to restore or files not loaded yet');
        }
      } catch (error) {
        console.error('[DEBUG] Error in loadFilesAndRestoreSelection:', error);
      }
    };
    
    loadFilesAndRestoreSelection();
  }, [isAdmin, activeTab]);

  // Reset content states when switching tabs
  useEffect(() => {
    // Clear file content and reset view states when changing tabs
    setSelectedFile(null);
    setFileContent('');
    setShowPreview(false);
    setEditMode(false);
    setSaveStatus('saved');
    setErrorMessage('');
    
    // Reset current path to root for the selected tab
    setCurrentPath('/');
  }, [activeTab]);

  // Auto-save functionality with debounce
  useEffect(() => {
    // Only auto-save if in edit mode, user is admin, and we have a markdown file selected
    if (editMode && isAdmin && selectedFile && selectedFile.name.endsWith('.md') && fileContent) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set status to saving
      setSaveStatus('saving');
      
      // Set a new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveFileContent();
      }, 1000); // 1 second debounce
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fileContent, editMode, isAdmin, selectedFile]);

  // Update window state when relevant state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        currentPath,
        selectedFile,
        expandedFolders,
        fileContent,
        showPreview,
        editMode,
        saveStatus,
        activeTab
      });
    }
  }, [currentPath, selectedFile, expandedFolders, fileContent, showPreview, editMode, saveStatus, activeTab, updateWindowState]);
  
  // Fetch public directory contents
  const handleFetchPublicDirectoryContents = async (publicPath = '/', refreshAll = false) => {
    setIsTreeLoading(true);
    setErrorMessage('');
    
    const result = await fetchPublicDirectoryContents(publicPath, refreshAll);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setPublicFiles(result.files);
      
      // Only update the current path if we're not refreshing the entire tree
      if (!refreshAll) {
        setCurrentPath(publicPath);
      }
      
      // If we refreshed the entire tree, make sure the current path's parent folders are expanded
      if (refreshAll && currentPath !== '/') {
        setExpandedFolders(prev => expandParentFolders(currentPath, prev));
      }
    }
    
    setIsTreeLoading(false);
    return result; // Return result so we can chain promises
  };
  
  // Fetch public file content
  const handleFetchPublicFileContent = async (filePath) => {
    setIsContentLoading(true);
    setErrorMessage('');
    
    const result = await fetchPublicFileContent(filePath);
    
    if (result.error) {
      setErrorMessage(result.error);
      setSaveStatus('error');
    } else {
      setFileContent(result.content);
      setSaveStatus('saved');
    }
    
    setIsContentLoading(false);
  };
  
  // Fetch private directory contents
  const handleFetchDirectoryContents = async (path = '/', refreshAll = false) => {
    setIsTreeLoading(true);
    setErrorMessage('');
    
    const result = await fetchDirectoryContents(path, refreshAll);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setFiles(result.files);
      
      // Only update the current path if we're not refreshing the entire tree
      if (!refreshAll) {
        setCurrentPath(path);
      }
      
      // If we refreshed the entire tree, make sure the current path's parent folders are expanded
      if (refreshAll && currentPath !== '/') {
        setExpandedFolders(prev => expandParentFolders(currentPath, prev));
      }
    }
    
    setIsTreeLoading(false);
    return result; // Return result so we can chain promises
  };
  
  // Fetch private file content
  const handleFetchFileContent = async (filePath) => {
    setIsContentLoading(true);
    setErrorMessage('');
    
    const result = await fetchFileContent(filePath);
    
    if (result.error) {
      setErrorMessage(result.error);
      setSaveStatus('error');
    } else {
      setFileContent(result.content);
      setSaveStatus('saved');
    }
    
    setIsContentLoading(false);
  };
  
  // Save file content
  const handleSaveFileContent = async () => {
    // Check if filePath is valid
    if (!selectedFile || !selectedFile.path || selectedFile.path.trim() === '') {
      setErrorMessage('No file selected. Please select a file first.');
      setSaveStatus('error');
      return;
    }
    
    setSaveStatus('saving');
    
    const result = await apiSaveFileContent(selectedFile.path, fileContent);
    
    if (result.error) {
      setErrorMessage(result.error);
      setSaveStatus('error');
    } else {
      setErrorMessage('');
      setSaveStatus('saved');
    }
  };
  
  // Toggle folder expansion
  const toggleFolder = (folderPath, folder) => {
    const isExpanding = !expandedFolders[folderPath];
    
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: isExpanding
    }));
    
    // If we're expanding the folder, also set it as the current path
    if (isExpanding) {
      setCurrentPath(folderPath);
      setSelectedFile(folder);
    }
  };
  
  // Create a new file or folder
  const createNewItem = async () => {
    if (!newItemName.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    
    setIsCreating(true);
    setErrorMessage('');
    
    // Get the active folder path where the new item should be created
    const activeFolderPath = getActiveFolderPath(selectedFile, currentPath);
    
    const result = await apiCreateNewItem(activeTab, activeFolderPath, newItemName, createType);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      // Close the dialog and reset the form
      setShowCreateDialog(false);
      setNewItemName('');
      
      // Refresh the entire file tree from the root
      if (activeTab === 'public') {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
      
      // If it's a directory, expand it
      if (createType === 'directory' && result.path) {
        setExpandedFolders(prev => ({
          ...prev,
          [result.path]: true
        }));
      }
    }
    
    setIsCreating(false);
  };
  
  // Open the create dialog
  const openCreateDialog = (type) => {
    setCreateType(type);
    setNewItemName('');
    setErrorMessage('');
    setShowCreateDialog(true);
  };
  
  // Close the create dialog
  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setNewItemName('');
    setErrorMessage('');
  };
  
  // Open the rename dialog
  const openRenameDialog = (item) => {
    if (!isAdmin) {
      setErrorMessage('Admin access required to rename files.');
      return;
    }
    
    setItemToRename(item);
    setNewName(item.name);
    setErrorMessage('');
    setShowRenameDialog(true);
  };
  
  // Close the rename dialog
  const closeRenameDialog = () => {
    setShowRenameDialog(false);
    setItemToRename(null);
    setNewName('');
    setErrorMessage('');
  };
  
  // Rename a file or folder
  const renameItem = async () => {
    if (!newName.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    
    if (!itemToRename) {
      setErrorMessage('No item selected for renaming');
      return;
    }
    
    setIsRenaming(true);
    setErrorMessage('');
    
    const result = await apiRenameItem(itemToRename.path, newName);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      // Close the dialog and reset the form
      setShowRenameDialog(false);
      setItemToRename(null);
      setNewName('');
      
      // If the renamed item was selected, update the selected file
      if (selectedFile && selectedFile.path === itemToRename.path) {
        setSelectedFile(null);
      }
      
      // Refresh the appropriate file list
      if (itemToRename.isPublic) {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    }
    
    setIsRenaming(false);
  };
  
  // Open the delete dialog
  const openDeleteDialog = (item) => {
    if (!isAdmin) {
      setErrorMessage('Admin access required to delete files.');
      return;
    }
    
    setItemToDelete(item);
    setErrorMessage('');
    setShowDeleteDialog(true);
  };
  
  // Close the delete dialog
  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
    setErrorMessage('');
  };
  
  // Delete a file or folder
  const handleDeleteItem = async () => {
    if (!itemToDelete) {
      setErrorMessage('No item selected for deletion');
      return;
    }
    
    setIsDeleting(true);
    setErrorMessage('');
    
    const result = await apiDeleteItem(itemToDelete.path);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      // Close the dialog
      setShowDeleteDialog(false);
      setItemToDelete(null);
      
      // If the deleted item was selected, clear the selection
      if (selectedFile && selectedFile.path === itemToDelete.path) {
        setSelectedFile(null);
        setFileContent('');
        setShowPreview(false);
        if (editMode) {
          setEditMode(false);
        }
      }
      
      // Refresh the appropriate file list
      if (itemToDelete.isPublic) {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    }
    
    setIsDeleting(false);
  };
  
  // Handle drag start event
  const handleDragStart = (e, item) => {
    if (!isAdmin) return;
    
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add dragging class to the element
    e.currentTarget.classList.add('dragging');
    
    // Remove the class after a short delay to ensure it's applied
    setTimeout(() => {
      if (e.currentTarget) {
        e.currentTarget.classList.remove('dragging');
      }
    }, 100);
  };
  
  // Handle drag over event
  const handleDragOver = (e, folder) => {
    if (!isAdmin || !draggedItem) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dropping into directories
    if (folder.type === 'directory') {
      setDropTarget(folder);
      e.dataTransfer.dropEffect = 'move';
      
      // Add drop-target class to the element
      e.currentTarget.classList.add('drop-target');
    }
  };
  
  // Handle drag over for the file tree container (to allow dropping to root)
  const handleContainerDragOver = (e) => {
    if (!isAdmin || !draggedItem) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Set root as the drop target
    const rootFolder = {
      type: 'directory',
      path: draggedItem.isPublic ? '/public' : '/',
      name: 'Root'
    };
    setDropTarget(rootFolder);
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle drag leave event
  const handleDragLeave = (e) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    // Remove drop-target class from the element
    e.currentTarget.classList.remove('drop-target');
  };
  
  // Handle drag leave for the container
  const handleContainerDragLeave = (e) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };
  
  // Handle drop event
  const handleDrop = async (e, targetFolder) => {
    if (!isAdmin || !draggedItem || !targetFolder) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Reset drop target
    setDropTarget(null);
    
    // Remove drop-target class from the element
    e.currentTarget.classList.remove('drop-target');
    
    // Only allow dropping into directories
    if (targetFolder.type !== 'directory') {
      return;
    }
    
    // Check if dropping on itself
    if (draggedItem.path === targetFolder.path) {
      return;
    }
    
    // Check if dropping in current location (parent folder is the same)
    const draggedParent = getParentDirectoryPath(draggedItem.path);
    if (draggedParent === targetFolder.path) {
      return;
    }
    
    setIsMoving(true);
    setErrorMessage('');
    
    const result = await apiMoveItem(draggedItem.path, targetFolder.path);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      // If the moved item was selected, clear the selection
      if (selectedFile && selectedFile.path === draggedItem.path) {
        setSelectedFile(null);
        setFileContent('');
        setShowPreview(false);
        if (editMode) {
          setEditMode(false);
        }
      }
      
      // Refresh the appropriate file list
      if (draggedItem.isPublic) {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    }
    
    // Clear drag state
    setDraggedItem(null);
    setIsMoving(false);
  };
  
  // Handle drop event for the container (moving to root)
  const handleContainerDrop = async (e) => {
    if (!isAdmin || !draggedItem || !dropTarget) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Process the drop using the dropTarget which was set in handleContainerDragOver
    const targetFolder = dropTarget;
    
    // Reset drop target
    setDropTarget(null);
    
    // Check if dropping in current location (parent folder is the same)
    const draggedParent = getParentDirectoryPath(draggedItem.path);
    if (draggedParent === targetFolder.path) {
      return;
    }
    
    setIsMoving(true);
    setErrorMessage('');
    
    const result = await apiMoveItem(draggedItem.path, targetFolder.path);
    
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      // If the moved item was selected, clear the selection
      if (selectedFile && selectedFile.path === draggedItem.path) {
        setSelectedFile(null);
        setFileContent('');
        setShowPreview(false);
        if (editMode) {
          setEditMode(false);
        }
      }
      
      // Refresh the appropriate file list
      if (draggedItem.isPublic) {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    }
    
    // Clear drag state
    setDraggedItem(null);
    setIsMoving(false);
  };
  
  // Handle folder selection
  const handleFolderSelect = (folder) => {
    // Update the current path to the selected folder's path
    setCurrentPath(folder.path);
    
    // Set the selected folder
    setSelectedFile(folder);
    
    // Expand the folder
    setExpandedFolders(prev => ({
      ...prev,
      [folder.path]: true
    }));
    
    // Reset content and preview
    setFileContent('');
    setShowPreview(false);
    
    // Reset edit mode
    if (editMode) {
      setEditMode(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (file, skipTabSwitch = false) => {
    // Check if this selection should change the active tab, but skip when restoring files
    if (!skipTabSwitch) {
      if (file.setTab) {
        setActiveTab(file.setTab);
      } else if (file.isPublic !== undefined) {
        // Update active tab based on file's isPublic property
        setActiveTab(file.isPublic ? 'public' : 'private');
      }
    }

    // If it's a directory, handle it differently
    if (file.type === 'directory') {
      handleFolderSelect(file);
      return;
    }
    
    setSelectedFile(file);
    
    // Make sure parent folders are expanded so the file is visible on reload
    setExpandedFolders(prev => expandParentFolders(file.path, prev));
    
    // Set current path to the parent directory for better context
    const parentPath = getParentDirectoryPath(file.path);
    setCurrentPath(parentPath);
    
    // Reset edit mode when selecting a new file
    if (editMode) {
      setEditMode(false);
    }
    
    // Fetch content for all file types
    if (file.isPublic) {
      // Fetch public file content
      handleFetchPublicFileContent(file.path);
    } else {
      // Fetch private file content (admin only)
      handleFetchFileContent(file.path);
    }
    
    // Only set preview mode for markdown files
    if (file.name.endsWith('.md')) {
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isAdmin) {
      setErrorMessage('Admin access required to edit files.');
      return;
    }
    
    if (!selectedFile || !selectedFile.name.endsWith('.md')) {
      setErrorMessage('Only markdown files can be edited.');
      return;
    }
    
    setEditMode(!editMode);
    // When switching to preview mode, ensure preview is shown
    if (editMode) {
      setShowPreview(true);
    }
  };
  
  // Handle markdown content change
  const handleMarkdownChange = (e) => {
    setFileContent(e.target.value);
  };
  
  // Handle commands (for the command input)
  const handleCommand = (cmd) => {
    // Commands:
    // - refresh: refresh file list
    // - preview: toggle markdown preview
    // - edit: toggle edit mode (admin only)
    // - save: manually save the current file
    // - new-file: create a new file (admin only)
    // - new-folder: create a new folder (admin only)
    // - rename: rename selected file or folder (admin only)
    // - delete: delete selected file or folder (admin only)
    // - public: switch to public files tab
    // - private: switch to private files tab (admin only)
    
    if (cmd === 'refresh') {
      if (activeTab === 'public') {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    } else if (cmd === 'preview' && selectedFile?.name.endsWith('.md')) {
      setShowPreview(!showPreview);
      if (editMode) {
        setEditMode(false);
      }
    } else if (cmd === 'edit' && selectedFile?.name.endsWith('.md')) {
      toggleEditMode();
    } else if (cmd === 'save' && editMode && selectedFile?.name.endsWith('.md')) {
      handleSaveFileContent();
    } else if (cmd === 'new-file' && isAdmin) {
      openCreateDialog('file');
    } else if (cmd === 'new-folder' && isAdmin) {
      openCreateDialog('directory');
    } else if (cmd === 'rename' && selectedFile && isAdmin) {
      openRenameDialog(selectedFile);
    } else if (cmd === 'delete' && selectedFile && isAdmin) {
      openDeleteDialog(selectedFile);
    } else if (cmd === 'public') {
      setActiveTab('public');
    } else if (cmd === 'private' && isAdmin) {
      setActiveTab('private');
    } else {
      setErrorMessage(`Unknown command: ${cmd}`);
    }
  };

  return {
    files,
    publicFiles,
    currentPath,
    selectedFile,
    expandedFolders,
    isTreeLoading,
    isContentLoading,
    fileContent,
    errorMessage,
    showPreview,
    activeTab,
    editMode,
    saveStatus,
    showCreateDialog,
    createType, 
    newItemName,
    isCreating,
    showRenameDialog,
    itemToRename,
    newName,
    isRenaming,
    showDeleteDialog,
    itemToDelete,
    isDeleting,
    draggedItem,
    dropTarget,
    isMoving,
    converter,
    handleFetchPublicDirectoryContents,
    handleFetchDirectoryContents,
    handleSaveFileContent,
    toggleFolder,
    createNewItem,
    openCreateDialog,
    closeCreateDialog,
    openRenameDialog,
    closeRenameDialog,
    renameItem,
    openDeleteDialog,
    closeDeleteDialog,
    handleDeleteItem,
    handleDragStart,
    handleDragOver,
    handleContainerDragOver,
    handleDragLeave,
    handleContainerDragLeave,
    handleDrop,
    handleContainerDrop,
    handleFileSelect,
    toggleEditMode,
    handleMarkdownChange,
    handleCommand,
    setNewItemName,
    setNewName,
    setErrorMessage,
    setFileContent,
    setSelectedFile
  };
};

export default useExplorerState;
