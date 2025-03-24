import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Ref to track if state has been loaded from IndexedDB
  const stateLoadedRef = useRef(false);
  
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
          
          let restoredFile = null;
          
          // Update state with saved values
          if (savedState.content.selectedFile) {
            restoredFile = savedState.content.selectedFile;
            console.log(`[DEBUG] Restoring selected file:`, restoredFile);
            setSelectedFile(restoredFile);
          } else {
            console.log(`[DEBUG] No selected file to restore`);
          }
          
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
          
  // If a file was restored, load its content (regardless of file type)
  if (restoredFile && restoredFile.type === 'file') {
    console.log(`[DEBUG] About to fetch content for ${restoredFile.path}`);
    
    // Set the preview mode for markdown files
    if (restoredFile.name.endsWith('.md')) {
      console.log(`[DEBUG] Setting preview mode for markdown file`);
      setShowPreview(true);
    }
    
    // Schedule file content fetch for the next event loop to ensure it runs
    // after all state updates have been processed
    setTimeout(() => {
      console.log(`[DEBUG] Scheduled content fetch for ${restoredFile.path}`);
      
      // Use handleFileSelect to ensure all the necessary state updates happen
      // This will trigger the content fetch as a side effect
      handleFileSelect(restoredFile);
    }, 0);
  } else {
    console.log(`[DEBUG] No file to restore content for`);
  }
        } else {
          console.log(`[DEBUG] No valid saved state found or state already loaded`);
        }
      } catch (error) {
        console.error(`[DEBUG] Failed to load explorer state:`, error);
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
    if (!stateLoadedRef.current) return;
    
    // Save the explorer state to IndexedDB
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
    
  }, [selectedFile, expandedFolders, activeTab, nodeId]);

  // Load initial directory contents
  useEffect(() => {
    // Load public files for all users
    handleFetchPublicDirectoryContents();
    
    // Load private files for admin users
    if (isAdmin) {
      handleFetchDirectoryContents().catch(error => {
        console.error('Failed to load private files:', error);
        // Set a specific error message for private files without affecting public files
        setFiles([]);
        if (activeTab === 'private') {
          setErrorMessage('Failed to load private files. Please ensure your admin directory exists.');
        }
      });
    }
  }, [isAdmin]);

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
  const handleFileSelect = (file) => {
    // If it's a directory, handle it differently
    if (file.type === 'directory') {
      handleFolderSelect(file);
      return;
    }
    
    setSelectedFile(file);
    
    // We don't change the current path when selecting a file
    // This prevents the file tree from reloading unnecessarily
    
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
      // Refresh the appropriate file list based on the active tab
      if (activeTab === 'public') {
        handleFetchPublicDirectoryContents('/', true);
      } else {
        handleFetchDirectoryContents('/', true);
      }
    } else if (cmd === 'preview' && selectedFile?.name.endsWith('.md')) {
      setShowPreview(!showPreview);
      if (editMode) {
        setEditMode(false); // Exit edit mode when switching to preview
      }
    } else if (cmd === 'edit' && selectedFile?.name.endsWith('.md')) {
      toggleEditMode();
    } else if (cmd === 'save' && editMode && selectedFile?.name.endsWith('.md')) {
      handleSaveFileContent();
    } else if (cmd === 'new-file' && isAdmin) {
      openCreateDialog('file');
    } else if (cmd === 'new-folder' && isAdmin) {
      openCreateDialog('directory');
    } else if (cmd === 'rename' && isAdmin && selectedFile) {
      openRenameDialog(selectedFile);
    } else if (cmd === 'delete' && isAdmin && selectedFile) {
      openDeleteDialog(selectedFile);
    } else if (cmd === 'public') {
      setActiveTab('public');
    } else if (cmd === 'private' && isAdmin) {
      setActiveTab('private');
    }
  };

  return {
    // State
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
    isAdmin,
    
    // State setters
    setNewItemName,
    setNewName,
    setFileContent,
    
    // Methods
    handleFetchPublicDirectoryContents,
    handleFetchDirectoryContents,
    handleFileSelect,
    toggleFolder,
    handleSaveFileContent,
    toggleEditMode,
    handleMarkdownChange,
    openCreateDialog,
    closeCreateDialog,
    createNewItem,
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
    handleCommand
  };
};

export default useExplorerState;
