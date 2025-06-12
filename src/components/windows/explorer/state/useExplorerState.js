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
  moveItem as apiMoveItem,
  getStorageStats as apiGetStorageStats
} from '../api/fileOperations';
import { 
  getParentDirectoryPath, 
  expandParentFolders, 
  getActiveFolderPath,
  shouldUseProseMirrorEditor,
  convertServerFileNameToUser
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
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(windowState?.isFileTreeCollapsed || false);
  
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

  // Track previous node ID to detect window swaps
  const prevNodeIdRef = useRef(nodeId);

  // Load explorer state from IndexedDB on mount or when nodeId changes
  useEffect(() => {
    const loadExplorerState = async () => {
      console.log(`[DEBUG] Starting to load explorer state for window ${nodeId}`);
      
      // If nodeId changed but it's not the first load, it likely means a window swap occurred
      const isSwapDetected = prevNodeIdRef.current !== nodeId && prevNodeIdRef.current !== null;
      if (isSwapDetected) {
        console.log(`[DEBUG] Node ID changed from ${prevNodeIdRef.current} to ${nodeId}, possible window swap detected`);
        // Reset the state loaded flag to force a reload after a swap
        stateLoadedRef.current = false;
        // Clear any pending state
        pendingStateRestoreRef.current = null;
      }
      
      // Update prevNodeIdRef for future comparisons
      prevNodeIdRef.current = nodeId;
      
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
          
          if (savedState.content.editMode !== undefined && isAdmin) {
            console.log(`[DEBUG] Restoring edit mode: ${savedState.content.editMode}`);
            setEditMode(savedState.content.editMode);
          }
          
          if (savedState.content.isFileTreeCollapsed !== undefined) {
            console.log(`[DEBUG] Restoring file tree collapsed state: ${savedState.content.isFileTreeCollapsed}`);
            setIsFileTreeCollapsed(savedState.content.isFileTreeCollapsed);
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
  }, [nodeId, isAdmin]);
  
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
        activeTab,
        editMode,
        isFileTreeCollapsed
      });
      
      saveExplorerState({
        id: nodeId,
        content: {
          selectedFile,
          expandedFolders,
          activeTab,
          editMode,
          isFileTreeCollapsed
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
  }, [selectedFile, expandedFolders, activeTab, editMode, isFileTreeCollapsed, nodeId]);

  // Load initial directory contents and restore selected file afterward
  useEffect(() => {
    console.log('[DEBUG] Starting to load directory contents');
    
    // First, load the files
    const loadFilesAndRestoreSelection = async () => {
      try {
        // Load public files for all users
        await handleFetchPublicDirectoryContents('/', true);
        
      // Load private files for admin users or users with file access (if applicable)
      if (isAdmin || user?.has_file_access) {
        try {
          await handleFetchDirectoryContents('/', true);
        } catch (error) {
          console.error('Failed to load private files:', error);
          setFiles([]);
          if (activeTab === 'private') {
            setErrorMessage('Failed to load private files. Please ensure your directory exists.');
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
              
              // Also restore edit mode if it was saved
              if (pendingStateRestoreRef.current.editMode && isAdmin) {
                console.log(`[DEBUG] Restoring edit mode: ${pendingStateRestoreRef.current.editMode}`);
                setEditMode(pendingStateRestoreRef.current.editMode);
              }
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

  // State for storage statistics
  const [storageStats, setStorageStats] = useState({
    quota: 0,
    used: 0,
    available: 0,
    unlimited: false,
    isLoading: false
  });

  // Fetch storage statistics
  const fetchStorageStats = async () => {
    if (!user?.has_file_access && !isAdmin) return;
    
    setStorageStats(prev => ({ ...prev, isLoading: true }));
    
    try {
      const stats = await apiGetStorageStats();
      if (stats.error) {
        setErrorMessage(stats.error);
        setStorageStats(prev => ({
          ...prev,
          isLoading: false
        }));
      } else {
        setStorageStats({
          quota: stats.quota,
          used: stats.used,
          available: stats.available,
          unlimited: stats.unlimited,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      setStorageStats(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };

  // Fetch storage stats on mount and after file operations
  useEffect(() => {
    if (user?.has_file_access || isAdmin) {
      fetchStorageStats();
    }
  }, [user, isAdmin]);

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
    // Auto-save if user has permission and we have a ProseMirror file selected (.txt/.prosemirror)
    // Allow for admins and users with file_access (for private files)
    // Note: ProseMirror is always "live" so no need to check editMode for these files
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (hasEditPermission && selectedFile && shouldUseProseMirrorEditor(selectedFile.name) && fileContent) {
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
  }, [fileContent, isAdmin, selectedFile, activeTab, user]);

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
  const handleSaveFileContent = async (content) => {
    console.log('[DEBUG] useExplorerState - handleSaveFileContent called:', {
      selectedFilePath: selectedFile?.path,
      selectedFileName: selectedFile?.name,
      contentProvided: content !== undefined,
      // If content is provided, use it, otherwise use the state's fileContent
      contentToSaveType: typeof (content !== undefined ? content : fileContent),
      contentToSaveLength: (content !== undefined ? content : fileContent)?.length || 0,
      contentToSavePreview: typeof (content !== undefined ? content : fileContent) === 'string' 
        ? (content !== undefined ? content : fileContent).substring(0, 100) + '...' 
        : 'not a string'
    });
    
    // Check if filePath is valid
    if (!selectedFile || !selectedFile.path || selectedFile.path.trim() === '') {
      console.error('[DEBUG] handleSaveFileContent - No file selected');
      setErrorMessage('No file selected. Please select a file first.');
      setSaveStatus('error');
      return;
    }
    
    setSaveStatus('saving');
    
    // Use content parameter if provided, otherwise use state's fileContent
    const contentToSave = content !== undefined ? content : fileContent;
    
    console.log('[DEBUG] Sending to API:', {
      path: selectedFile.path,
      contentType: typeof contentToSave,
      contentLength: contentToSave?.length || 0
    });
    
    const result = await apiSaveFileContent(selectedFile.path, contentToSave);
    
    if (result.error) {
      console.error('[DEBUG] API Save Error:', result.error);
      setErrorMessage(result.error);
      setSaveStatus('error');
    } else {
      console.log('[DEBUG] API Save Success:', result);
      setErrorMessage('');
      setSaveStatus('saved');
      
      // If content parameter was provided, update the state's fileContent
      if (content !== undefined) {
        setFileContent(content);
      }
    }
  };
  
  // Toggle folder expansion
  const toggleFolder = (folderPath, folder) => {
    const isExpanding = !expandedFolders[folderPath];
    
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: isExpanding
    }));
    
    if (isExpanding) {
      // If we're expanding the folder, set it as the current path and selected item
      setCurrentPath(folderPath);
      setSelectedFile(folder);
      // Clear file content since we're selecting a folder
      setFileContent('');
      setShowPreview(false);
      if (editMode) {
        setEditMode(false);
      }
    } else {
      // If we're collapsing the folder, check if the currently selected file is within this folder
      if (selectedFile && selectedFile.path.startsWith(folderPath + '/')) {
        // Clear the selection and content if the selected file is within the collapsed folder
        setSelectedFile(null);
        setFileContent('');
        setShowPreview(false);
        if (editMode) {
          setEditMode(false);
        }
        // Reset current path to parent directory
        const parentPath = getParentDirectoryPath(folderPath);
        setCurrentPath(parentPath);
      }
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) {
      setErrorMessage('Admin access required to rename files or file access permission for private files.');
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) {
      setErrorMessage('Admin access required to delete files or file access permission for private files.');
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) return;
    
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission || !draggedItem) return;
    
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission || !draggedItem) return;
    
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    // Remove drop-target class from the element
    e.currentTarget.classList.remove('drop-target');
  };
  
  // Handle drag leave for the container
  const handleContainerDragLeave = (e) => {
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };
  
  // Handle drop event
  const handleDrop = async (e, targetFolder) => {
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission || !draggedItem || !targetFolder) return;
    
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission || !draggedItem || !dropTarget) return;
    
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
    // Allow admins or users with file_access (for private files only)
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    if (!hasEditPermission) {
      setErrorMessage('Admin access required to edit files or file access permission for private files.');
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
    // - edit: toggle edit mode (users with permission)
    // - save: manually save the current file
    // - new-file: create a new file (users with permission)
    // - new-folder: create a new folder (users with permission)
    // - rename: rename selected file or folder (users with permission)
    // - delete: delete selected file or folder (users with permission)
    // - public: switch to public files tab
    // - private: switch to private files tab (users with permission)
    
    // Check permission for file operations
    const hasEditPermission = isAdmin || (user?.has_file_access && activeTab === 'private');
    const canAccessPrivate = isAdmin || user?.has_file_access;
    
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
    } else if (cmd === 'new-file' && hasEditPermission) {
      openCreateDialog('file');
    } else if (cmd === 'new-folder' && hasEditPermission) {
      openCreateDialog('directory');
    } else if (cmd === 'rename' && selectedFile && hasEditPermission) {
      openRenameDialog(selectedFile);
    } else if (cmd === 'delete' && selectedFile && hasEditPermission) {
      openDeleteDialog(selectedFile);
    } else if (cmd === 'public') {
      setActiveTab('public');
    } else if (cmd === 'private' && canAccessPrivate) {
      setActiveTab('private');
    } else {
      setErrorMessage(`Unknown command: ${cmd}`);
    }
  };

  // Toggle file tree collapse
  const toggleFileTreeCollapse = () => {
    setIsFileTreeCollapsed(!isFileTreeCollapsed);
  };
  
  // Handle file or folder export/download
  const handleExportFile = async () => {
    if (!selectedFile) {
      setErrorMessage('No file or folder selected');
      return;
    }
    
    try {
      // If it's a directory, create a zip file
      if (selectedFile.type === 'directory') {
        // Import JSZip dynamically 
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        setErrorMessage('Creating zip file...');
        
        // Function to recursively gather files from a folder
        const addFolderToZip = async (folderPath, zipFolder) => {
          // Determine which API to use based on whether the folder is public or private
          const fetchApi = selectedFile.isPublic ? fetchPublicDirectoryContents : fetchDirectoryContents;
          
          // Fetch directory contents
          const result = await fetchApi(folderPath, false);
          
          if (result.error) {
            throw new Error(`Failed to access folder: ${result.error}`);
          }
          
          // Process each item in the folder
          for (const item of result.files) {
            if (item.type === 'directory') {
              // Create a subfolder in the zip and process recursively
              const newFolder = zipFolder.folder(item.name);
              await addFolderToZip(item.path, newFolder);
            } else {
              // Fetch file content
              const contentApi = selectedFile.isPublic ? fetchPublicFileContent : fetchFileContent;
              const contentResult = await contentApi(item.path);
              
              if (contentResult.error) {
                console.error(`Error loading file content for ${item.path}: ${contentResult.error}`);
                continue;
              }
              
              // Add file to zip
              zipFolder.file(item.name, contentResult.content);
            }
          }
        };
        
        // Start the recursive process from the selected folder
        await addFolderToZip(selectedFile.path, zip);
        
        // Generate the zip file
        const content = await zip.generateAsync({type: 'blob'});
        
        // Create a filename for the zip file (folder name + .zip)
        const zipFileName = `${selectedFile.name}.zip`;
        
        // Create a temporary URL for the blob
        const url = URL.createObjectURL(content);
        
        // Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        
        // Append the anchor to the document, click it, and remove it
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up by revoking the object URL
        URL.revokeObjectURL(url);
        
        // Clear the export message
        setErrorMessage('');
      } else {
        // For single file export, keep existing behavior
        if (!fileContent) {
          setErrorMessage('File has no content');
          return;
        }
        
        // Create a blob with the file content
        const blob = new Blob([fileContent], { type: 'text/plain' });
        
        // Create a temporary URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = convertServerFileNameToUser(selectedFile.name);
        
        // Append the anchor to the document, click it, and remove it
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up by revoking the object URL
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      setErrorMessage(`Failed to export: ${error.message}`);
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
    isFileTreeCollapsed,
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
    isAdmin,
    storageStats,
    fetchStorageStats,
    handleFetchPublicDirectoryContents,
    handleFetchDirectoryContents,
    handleSaveFileContent,
    handleExportFile,
    toggleFolder,
    toggleFileTreeCollapse,
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
