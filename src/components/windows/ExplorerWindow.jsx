import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderOpen, FileText, ChevronRight, ChevronDown, File, Coffee, Code, 
  BookOpen, Edit, Eye, Plus, FolderPlus, X, Globe, Lock, FileEdit, Trash2,
  List, ListOrdered, CheckSquare, Bold, Italic, Code as CodeIcon, Link, Heading
} from 'lucide-react';
import showdown from 'showdown';
import path from 'path-browserify';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useWindowState } from '../../context/WindowStateContext';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { saveExplorerState, getExplorerState } from '../../services/indexedDBService';
import './ExplorerWindow.css';

const ExplorerWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
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
  const createInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Initialize Showdown converter for Markdown with enhanced options
  const converter = new showdown.Converter({
    tables: true,
    tasklists: true,
    strikethrough: true,
    emoji: true,
    breaks: true,  // Enable line breaks to be rendered as <br> tags
    simpleLineBreaks: true,
    openLinksInNewWindow: true,
    backslashEscapesHTMLTags: true,
    ghCodeBlocks: true,
    ghCompatibleHeaderId: true,
    ghMentions: true,
    smoothLivePreview: true
  });
  
  // Enable additional extensions
  converter.setFlavor('github');

  // Helper function to expand all parent folders of a path
  const expandParentFolders = (filePath) => {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    
    // Create a new expanded folders object
    const newExpandedFolders = { ...expandedFolders };
    
    // Expand each parent folder
    for (let i = 0; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      newExpandedFolders[currentPath] = true;
    }
    
    setExpandedFolders(newExpandedFolders);
  };

  // Function to fetch public directory contents
  const fetchPublicDirectoryContents = async (publicPath = '/', refreshAll = false) => {
    try {
      setIsTreeLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsTreeLoading(false);
        return;
      }
      
      // If refreshAll is true, start from the root
      const pathToFetch = refreshAll ? '/' : publicPath;
      
      // Fetch public directory contents from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUBLIC_FILES_LIST}?path=${encodeURIComponent(pathToFetch)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        setErrorMessage(`Failed to load public files: ${response.statusText}`);
        setIsTreeLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Transform the data to match our expected format
      const transformedFiles = data.items.map(item => ({
        name: item.name,
        type: item.type,
        path: item.path,
        children: item.children || [],
        isPublic: true
      }));
      
      setPublicFiles(transformedFiles);
      
      // Only update the current path if we're not refreshing the entire tree
      if (!refreshAll) {
        setCurrentPath(publicPath);
      }
      
      setIsTreeLoading(false);
      
      // If we refreshed the entire tree, make sure the current path's parent folders are expanded
      if (refreshAll && currentPath !== '/') {
        expandParentFolders(currentPath);
      }
    } catch (error) {
      console.error('Error fetching public directory contents:', error);
      setErrorMessage('Failed to load public files. Please try again.');
      setIsTreeLoading(false);
    }
  };

  // Function to fetch public file content
  const fetchPublicFileContent = async (filePath) => {
    try {
      setIsContentLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsContentLoading(false);
        return;
      }
      
      // Fetch public file content from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUBLIC_FILE_CONTENT}?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        setErrorMessage(`Failed to load file content: ${response.statusText}`);
        setIsContentLoading(false);
        return;
      }
      
      const data = await response.json();
      setFileContent(data.content);
      setIsContentLoading(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error fetching public file content:', error);
      setErrorMessage(`Error loading file: ${error.message}`);
      setSaveStatus('error');
      setIsContentLoading(false);
    }
  };

  // Function to fetch private directory contents from the server (admin only)
  const fetchDirectoryContents = async (path = '/', refreshAll = false) => {
    try {
      setIsTreeLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsTreeLoading(false);
        return;
      }
      
      // If refreshAll is true, start from the root
      const pathToFetch = refreshAll ? '/' : path;
      
      // Fetch directory contents from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILES_LIST}?path=${encodeURIComponent(pathToFetch)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        // If response is 403, it means the user doesn't have admin access
        if (response.status === 403) {
          setErrorMessage('Admin access required to view files.');
        } else {
          setErrorMessage(`Failed to load files: ${response.statusText}`);
        }
        setIsTreeLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Transform the data to match our expected format
      const transformedFiles = data.items.map(item => ({
        name: item.name,
        type: item.type,
        path: item.path,
        children: item.children || []
      }));
      
      setFiles(transformedFiles);
      
      // Only update the current path if we're not refreshing the entire tree
      if (!refreshAll) {
        setCurrentPath(path);
      }
      
      setIsTreeLoading(false);
      
      // If we refreshed the entire tree, make sure the current path's parent folders are expanded
      if (refreshAll && currentPath !== '/') {
        expandParentFolders(currentPath);
      }
    } catch (error) {
      console.error('Error fetching directory contents:', error);
      setErrorMessage('Failed to load files. Please try again.');
      setIsTreeLoading(false);
    }
  };

  // Function to fetch file content
  const fetchFileContent = async (filePath) => {
    try {
      setIsContentLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsContentLoading(false);
        return;
      }
      
      // Fetch file content from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CONTENT}?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        // If response is 403, it means the user doesn't have admin access
        if (response.status === 403) {
          setErrorMessage('Admin access required to view file content.');
        } else {
          setErrorMessage(`Failed to load file content: ${response.statusText}`);
        }
        setIsContentLoading(false);
        return;
      }
      
      const data = await response.json();
      setFileContent(data.content);
      setIsContentLoading(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error fetching file content:', error);
      setErrorMessage(`Error loading file: ${error.message}`);
      setSaveStatus('error');
      setIsContentLoading(false);
    }
  };
  
  // Function to save file content
  const saveFileContent = async () => {
    try {
      // Check if filePath is valid
      if (!selectedFile || !selectedFile.path || selectedFile.path.trim() === '') {
        setErrorMessage('No file selected. Please select a file first.');
        setSaveStatus('error');
        return;
      }
      
      setSaveStatus('saving');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_SAVE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          path: selectedFile.path,
          content: fileContent
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`);
      }
      
      setSaveStatus('saved');
      setErrorMessage('');
    } catch (error) {
      console.error('Error saving file:', error);
      setErrorMessage(`Error saving file: ${error.message}`);
      setSaveStatus('error');
    }
  };
  
  // Insert markdown syntax at cursor position
  const insertMarkdown = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = fileContent;
    
    // If text is selected, wrap it with prefix and suffix
    if (start !== end) {
      const selectedText = text.substring(start, end);
      const newContent = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      setFileContent(newContent);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = end + prefix.length;
        textarea.focus();
      }, 0);
    } else {
      // No selection, just insert at cursor
      const newContent = text.substring(0, start) + prefix + suffix + text.substring(start);
      setFileContent(newContent);
      
      // Move cursor between prefix and suffix
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
        textarea.focus();
      }, 0);
    }
  };
  
  // Insert list items
  const insertList = (listPrefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = fileContent;
    
    // If text is selected, apply list formatting to each line
    if (start !== end) {
      const selectedText = text.substring(start, end);
      const lines = selectedText.split('\n');
      
      // Format each line as a list item
      const formattedLines = lines.map(line => {
        // Skip empty lines
        if (line.trim() === '') return line;
        
        // For numbered lists, increment the number for each line
        if (listPrefix === '1. ') {
          const index = lines.indexOf(line) + 1;
          return `${index}. ${line}`;
        }
        
        return `${listPrefix}${line}`;
      });
      
      const newContent = text.substring(0, start) + formattedLines.join('\n') + text.substring(end);
      setFileContent(newContent);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + formattedLines.join('\n').length;
        textarea.focus();
      }, 0);
    } else {
      // No selection, just insert at cursor
      const newContent = text.substring(0, start) + listPrefix + text.substring(start);
      setFileContent(newContent);
      
      // Move cursor after the inserted prefix
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + listPrefix.length;
        textarea.focus();
      }, 0);
    }
  };
  
  // Get the current line of text at cursor position
  const getCurrentLine = (text, cursorPos) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lineStartPos = textBeforeCursor.lastIndexOf('\n') + 1;
    const lineEndPos = text.indexOf('\n', cursorPos);
    const actualLineEndPos = lineEndPos !== -1 ? lineEndPos : text.length;
    return text.substring(lineStartPos, actualLineEndPos);
  };
  
  // Handle keyboard events in the editor
  const handleEditorKeyDown = (e) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+B or Cmd+B for bold
      if (e.key === 'b') {
        e.preventDefault();
        insertMarkdown('**', '**');
        return;
      }
      
      // Ctrl+I or Cmd+I for italic
      if (e.key === 'i') {
        e.preventDefault();
        insertMarkdown('*', '*');
        return;
      }
      
      // Ctrl+Shift+L for unordered list
      if (e.shiftKey && e.key === 'L') {
        e.preventDefault();
        insertList('- ');
        return;
      }
      
      // Ctrl+Shift+O for ordered list
      if (e.shiftKey && e.key === 'O') {
        e.preventDefault();
        insertList('1. ');
        return;
      }
      
      // Ctrl+Shift+C for checklist
      if (e.shiftKey && e.key === 'C') {
        e.preventDefault();
        insertList('- [ ] ');
        return;
      }
    }
    
    // Auto-continue lists on Enter
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const cursorPos = textarea.selectionStart;
      const text = fileContent;
      const currentLine = getCurrentLine(text, cursorPos);
      
      // Check for list patterns
      const bulletListMatch = currentLine.match(/^(\s*)(-|\*|\+)\s+(.*)/);
      const numberedListMatch = currentLine.match(/^(\s*)(\d+)\.?\s+(.*)/);
      const checklistMatch = currentLine.match(/^(\s*)(-|\*|\+)\s+\[([ xX])\]\s+(.*)/);
      
      if (bulletListMatch || numberedListMatch || checklistMatch) {
        // Get the indentation and list marker
        let indentation, marker, content;
        
        if (checklistMatch) {
          indentation = checklistMatch[1];
          marker = checklistMatch[2];
          const checkState = checklistMatch[3];
          content = checklistMatch[4];
          
          // If the checklist item is empty, remove the list marker
          if (content.trim() === '') {
            e.preventDefault();
            const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
            const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
            setFileContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart;
              textarea.focus();
            }, 0);
            return;
          }
          
          // Continue the checklist with an unchecked box
          e.preventDefault();
          const newListItem = `\n${indentation}${marker} [ ] `;
          insertMarkdown(newListItem);
          return;
        } else if (bulletListMatch) {
          indentation = bulletListMatch[1];
          marker = bulletListMatch[2];
          content = bulletListMatch[3];
          
          // If the list item is empty, remove the list marker
          if (content.trim() === '') {
            e.preventDefault();
            const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
            const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
            setFileContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart;
              textarea.focus();
            }, 0);
            return;
          }
          
          // Continue the bullet list
          e.preventDefault();
          const newListItem = `\n${indentation}${marker} `;
          insertMarkdown(newListItem);
          return;
        } else if (numberedListMatch) {
          indentation = numberedListMatch[1];
          const number = parseInt(numberedListMatch[2], 10);
          content = numberedListMatch[3];
          
          // If the list item is empty, remove the list marker
          if (content.trim() === '') {
            e.preventDefault();
            const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
            const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
            setFileContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart;
              textarea.focus();
            }, 0);
            return;
          }
          
          // Continue the numbered list with incremented number
          e.preventDefault();
          const newListItem = `\n${indentation}${number + 1}. `;
          insertMarkdown(newListItem);
          return;
        }
      }
    }
    
    // Handle tab for indentation in lists
    if (e.key === 'Tab') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const cursorPos = textarea.selectionStart;
      const text = fileContent;
      const currentLine = getCurrentLine(text, cursorPos);
      
      // Check if we're in a list item
      const listMatch = currentLine.match(/^(\s*)(-|\*|\+|\d+\.|\[[ xX]\])\s+/);
      if (listMatch) {
        e.preventDefault();
        
        // Add or remove indentation based on shift key
        if (e.shiftKey) {
          // Outdent: remove 2 spaces from the beginning if they exist
          if (currentLine.startsWith('  ')) {
            const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
            const lineEnd = text.indexOf('\n', cursorPos);
            const actualLineEnd = lineEnd !== -1 ? lineEnd : text.length;
            
            const newContent = text.substring(0, lineStart) + currentLine.substring(2) + text.substring(actualLineEnd);
            setFileContent(newContent);
            
            // Adjust cursor position
            const newCursorPos = cursorPos - 2;
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = newCursorPos > lineStart ? newCursorPos : lineStart;
              textarea.focus();
            }, 0);
          }
        } else {
          // Indent: add 2 spaces at the beginning
          const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
          const lineEnd = text.indexOf('\n', cursorPos);
          const actualLineEnd = lineEnd !== -1 ? lineEnd : text.length;
          
          const newContent = text.substring(0, lineStart) + '  ' + currentLine + text.substring(actualLineEnd);
          setFileContent(newContent);
          
          // Adjust cursor position
          const newCursorPos = cursorPos + 2;
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            textarea.focus();
          }, 0);
        }
      }
    }
  };
  
  // Handle markdown content change
  const handleMarkdownChange = (e) => {
    setFileContent(e.target.value);
  };

  // Load explorer state from IndexedDB on mount
  useEffect(() => {
    const loadExplorerState = async () => {
      try {
        // Try to load explorer state from IndexedDB
        const savedState = await getExplorerState(nodeId);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`Loaded explorer state for window ${nodeId} from IndexedDB:`, savedState.content);
          
          // Update state with saved values
          if (savedState.content.selectedFile) {
            setSelectedFile(savedState.content.selectedFile);
          }
          
          if (savedState.content.expandedFolders) {
            setExpandedFolders(savedState.content.expandedFolders);
          }
          
          if (savedState.content.activeTab) {
            setActiveTab(savedState.content.activeTab);
          }
          
          // Mark as loaded
          stateLoadedRef.current = true;
        }
      } catch (error) {
        console.error(`Failed to load explorer state for window ${nodeId} from IndexedDB:`, error);
      }
    };
    
    loadExplorerState();
  }, [nodeId]);
  
  // Handle window activation
  useEffect(() => {
    if (isActive) {
      // Save this as the active explorer window
      setActiveWindow(nodeId, WINDOW_TYPES.EXPLORER);
    }
  }, [isActive, nodeId, setActiveWindow]);
  
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
    fetchPublicDirectoryContents();
    
    // Load private files for admin users
    if (isAdmin) {
      fetchDirectoryContents();
    }
  }, [isAdmin]);

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
        saveFileContent();
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
  
  // Focus the input field when the create or rename dialog is shown
  useEffect(() => {
    if (showCreateDialog && createInputRef.current) {
      createInputRef.current.focus();
    }
    if (showRenameDialog && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [showCreateDialog, showRenameDialog]);

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
  
  // Helper function to get the active folder path based on selected item and current path
  const getActiveFolderPath = () => {
    if (selectedFile) {
      // If selected item is a directory, use its path
      if (selectedFile.type === 'directory') {
        return selectedFile.path;
      }
      // If selected item is a file, use its parent directory
      return getParentDirectoryPath(selectedFile.path);
    }
    // Fall back to current path if no file is selected
    return currentPath;
  };
  
  // Create a new file or folder
  const createNewItem = async () => {
    if (!newItemName.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    
    try {
      setIsCreating(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsCreating(false);
        return;
      }
      
      // Determine if we're creating in the public folder or private folder
      const isPublicFolder = activeTab === 'public';
      
      // Get the active folder path where the new item should be created
      const activeFolderPath = getActiveFolderPath();
      
      // Construct the full path for the new item
      let newItemPath;
      if (isPublicFolder) {
        // For public folder, prefix with /public if not already included
        const publicPrefix = activeFolderPath.startsWith('/public') ? '' : '/public';
        newItemPath = path.join(publicPrefix, activeFolderPath, newItemName.trim()).replace(/\\/g, '/');
      } else {
        // For private folder (admin only)
        newItemPath = path.join(activeFolderPath, newItemName.trim()).replace(/\\/g, '/');
      }
      
      // Create the new file or folder
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CREATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: newItemPath,
          type: createType,
          content: createType === 'file' ? '' : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create ${createType}: ${response.statusText}`);
      }
      
      // Close the dialog and reset the form
      setShowCreateDialog(false);
      setNewItemName('');
      
      // Refresh the entire file tree from the root
      if (isPublicFolder) {
        fetchPublicDirectoryContents('/', true);
      } else {
        fetchDirectoryContents('/', true);
      }
      
      // If it's a directory, expand it
      if (createType === 'directory') {
        setExpandedFolders(prev => ({
          ...prev,
          [newItemPath]: true
        }));
      }
      
      setIsCreating(false);
    } catch (error) {
      console.error(`Error creating ${createType}:`, error);
      setErrorMessage(`Failed to create ${createType}: ${error.message}`);
      setIsCreating(false);
    }
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
  
  // Handle key press in the create dialog
  const handleCreateKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewItem();
    } else if (e.key === 'Escape') {
      closeCreateDialog();
    }
  };

  // Open the rename dialog for a file or folder
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
  
  // Open the delete dialog for a file or folder
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
  
  // Handle drag leave event
  const handleDragLeave = (e) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    // Remove drop-target class from the element
    e.currentTarget.classList.remove('drop-target');
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
    
    try {
      setIsMoving(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsMoving(false);
        return;
      }
      
      // Call the API to move the file
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_MOVE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourcePath: draggedItem.path,
          destinationPath: targetFolder.path
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to move ${draggedItem.type}: ${response.statusText}`);
      }
      
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
        fetchPublicDirectoryContents('/', true);
      } else {
        fetchDirectoryContents('/', true);
      }
      
      // Clear drag state
      setDraggedItem(null);
      setIsMoving(false);
    } catch (error) {
      console.error(`Error moving ${draggedItem.type}:`, error);
      setErrorMessage(`Failed to move ${draggedItem.type}: ${error.message}`);
      setDraggedItem(null);
      setIsMoving(false);
    }
  };
  
  // Delete a file or folder
  const deleteItem = async () => {
    if (!itemToDelete) {
      setErrorMessage('No item selected for deletion');
      return;
    }
    
    try {
      setIsDeleting(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsDeleting(false);
        return;
      }
      
      // Delete the file or folder
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_DELETE}?path=${encodeURIComponent(itemToDelete.path)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete ${itemToDelete.type}: ${response.statusText}`);
      }
      
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
        fetchPublicDirectoryContents('/', true);
      } else {
        fetchDirectoryContents('/', true);
      }
      
      setIsDeleting(false);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
      setErrorMessage(`Failed to delete ${itemToDelete.type}: ${error.message}`);
      setIsDeleting(false);
    }
  };
  
  // Handle key press in the rename dialog
  const handleRenameKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      renameItem();
    } else if (e.key === 'Escape') {
      closeRenameDialog();
    }
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
    
    try {
      setIsRenaming(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsRenaming(false);
        return;
      }
      
      // Rename the file or folder
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_RENAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPath: itemToRename.path,
          newName: newName.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to rename ${itemToRename.type}: ${response.statusText}`);
      }
      
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
        fetchPublicDirectoryContents('/', true);
      } else {
        fetchDirectoryContents('/', true);
      }
      
      setIsRenaming(false);
    } catch (error) {
      console.error(`Error renaming ${itemToRename.type}:`, error);
      setErrorMessage(`Failed to rename ${itemToRename.type}: ${error.message}`);
      setIsRenaming(false);
    }
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
  
  // Helper function to get parent directory path
  const getParentDirectoryPath = (filePath) => {
    // Remove trailing slash if present
    const normalizedPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
    // Find the last slash in the path
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    
    if (lastSlashIndex === -1) {
      // No slash found, return root
      return '/';
    }
    
    // Return everything up to the last slash
    return normalizedPath.substring(0, lastSlashIndex) || '/';
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
    
    // If it's a markdown file, fetch its content and show preview
    if (file.name.endsWith('.md')) {
      if (file.isPublic) {
        // Fetch public file content
        fetchPublicFileContent(file.path);
      } else {
        // Fetch private file content (admin only)
        fetchFileContent(file.path);
      }
      setShowPreview(true);
    } else {
      setFileContent('');
      setShowPreview(false);
    }
  };

  // Get file icon based on file extension
  const getFileIcon = (fileName) => {
    if (fileName.endsWith('.md')) return <FileText size={16} className="mr-2" />;
    if (fileName.endsWith('.jsx') || fileName.endsWith('.js')) return <Code size={16} className="mr-2" />;
    if (fileName.endsWith('.json')) return <Coffee size={16} className="mr-2" />;
    if (fileName.endsWith('.css')) return <BookOpen size={16} className="mr-2" />;
    return <File size={16} className="mr-2" />;
  };
  
  // Render the file tree recursively
  const renderFileTree = (items) => {
    // Keep track of the path to the currently selected file to highlight its parent folder
    const selectedFilePath = selectedFile?.path || '';
    const selectedFileParentPath = selectedFile && selectedFile.type !== 'directory' ? 
      getParentDirectoryPath(selectedFilePath) : '';
    
    return items.map(item => {
      if (item.type === 'directory') {
        const isExpanded = expandedFolders[item.path];
        // A folder is considered active if it's the current path OR if it's the parent of the selected file
        const isActive = currentPath === item.path || (selectedFileParentPath === item.path);
        return (
          <div key={item.path} className="ml-2">
            <div 
              className={`flex items-center justify-between py-1 px-1 rounded hover:bg-stone-700 cursor-pointer group ${
                isActive ? 'bg-stone-800 text-teal-300 font-bold' : 
                isExpanded ? 'text-teal-300' : 'text-teal-400'
              } ${dropTarget && dropTarget.path === item.path ? 'bg-teal-900 border border-teal-500' : ''}`}
              onClick={() => toggleFolder(item.path, item)}
              draggable={isAdmin}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={(e) => handleDragLeave(e)}
              onDrop={(e) => handleDrop(e, item)}
            >
              <div className="flex items-center">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FolderOpen size={16} className="ml-1 mr-2" />
                <span className="text-sm">{item.name}</span>
              </div>
              
              {/* Admin-only buttons */}
              {isAdmin && (
                <div className="flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(item);
                    }}
                    className="p-1 rounded hover:bg-stone-600 text-stone-400 hover:text-teal-300 opacity-0 group-hover:opacity-100"
                    title="Rename folder"
                  >
                    <FileEdit size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(item);
                    }}
                    className="p-1 rounded hover:bg-stone-600 text-stone-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    title="Delete folder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            
            {isExpanded && item.children && (
              <div className="ml-2 border-l border-stone-700">
                {renderFileTree(item.children)}
              </div>
            )}
          </div>
        );
      } else {
        const isSelected = selectedFile && selectedFile.path === item.path;
        return (
          <div 
            key={item.path} 
            className={`flex items-center justify-between py-1 px-1 ml-4 rounded cursor-pointer hover:bg-stone-700 group ${isSelected ? 'bg-stone-700 text-teal-300' : 'text-teal-50'}`}
            onClick={() => handleFileSelect(item)}
            draggable={isAdmin}
            onDragStart={(e) => handleDragStart(e, item)}
          >
            <div className="flex items-center">
              {getFileIcon(item.name)}
              <span className="text-sm">{item.name}</span>
            </div>
            
            {/* Admin-only buttons */}
            {isAdmin && (
              <div className="flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openRenameDialog(item);
                  }}
                  className="p-1 rounded hover:bg-stone-600 text-stone-400 hover:text-teal-300 opacity-0 group-hover:opacity-100"
                  title="Rename file"
                >
                  <FileEdit size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog(item);
                  }}
                  className="p-1 rounded hover:bg-stone-600 text-stone-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                  title="Delete file"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        );
      }
    });
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

  // Handle command input
  const handleCommand = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const cmd = e.target.value.trim();
      onCommand(cmd);
      e.target.value = '';
      
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
          fetchPublicDirectoryContents('/', true);
        } else {
          fetchDirectoryContents('/', true);
        }
      } else if (cmd === 'preview' && selectedFile?.name.endsWith('.md')) {
        setShowPreview(!showPreview);
        if (editMode) {
          setEditMode(false); // Exit edit mode when switching to preview
        }
      } else if (cmd === 'edit' && selectedFile?.name.endsWith('.md')) {
        toggleEditMode();
      } else if (cmd === 'save' && editMode && selectedFile?.name.endsWith('.md')) {
        saveFileContent();
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
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* File tree panel */}
        <div className="w-1/3 border-r border-stone-700 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
            <div className="flex items-center">
              <span>FILES</span>
              
              {/* Tabs for switching between public and private files */}
              <div className="flex ml-4">
                <button
                  onClick={() => setActiveTab('public')}
                  className={`px-2 py-1 rounded-t text-xs flex items-center gap-1 ${
                    activeTab === 'public' 
                      ? 'bg-stone-700 text-teal-300' 
                      : 'bg-stone-800 hover:bg-stone-700'
                  }`}
                  title="Public files (readable by all users)"
                >
                  <Globe size={14} />
                  <span>Public</span>
                </button>
                
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('private')}
                    className={`px-2 py-1 rounded-t text-xs flex items-center gap-1 ml-1 ${
                      activeTab === 'private' 
                        ? 'bg-stone-700 text-teal-300' 
                        : 'bg-stone-800 hover:bg-stone-700'
                    }`}
                    title="Private files (admin only)"
                  >
                    <Lock size={14} />
                    <span>Private</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Admin-only file creation buttons */}
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => openCreateDialog('file')}
                  className="p-1 rounded hover:bg-stone-700 text-teal-400"
                  title="Create new file"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => openCreateDialog('directory')}
                  className="p-1 rounded hover:bg-stone-700 text-teal-400"
                  title="Create new folder"
                >
                  <FolderPlus size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto">
            {isTreeLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-teal-300">Loading files...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-2 text-red-400">{errorMessage}</div>
            ) : (
              <div className="p-2 font-mono">
                {activeTab === 'public' ? (
                  // Show public files to all users
                  <>
                    <div className="flex items-center py-1 px-1 text-teal-300">
                      <Globe size={16} className="mr-2" />
                      <span className="text-sm font-bold">Public Files</span>
                    </div>
                    {publicFiles.length > 0 ? (
                      renderFileTree(publicFiles)
                    ) : (
                      <div className="ml-4 text-stone-500 text-sm">No public files available</div>
                    )}
                  </>
                ) : (
                  // Show private files to admin users
                  <>
                    <div className="flex items-center py-1 px-1 text-teal-300">
                      <Lock size={16} className="mr-2" />
                      <span className="text-sm font-bold">Private Files (Admin Only)</span>
                    </div>
                    {files.length > 0 ? (
                      renderFileTree(files)
                    ) : (
                      <div className="ml-4 text-stone-500 text-sm">No private files available</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Create file/folder dialog */}
          {showCreateDialog && (
            <div className="p-2 border-t border-stone-700 bg-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">
                  {createType === 'file' ? 'New File' : 'New Folder'}
                </span>
                <button
                  onClick={closeCreateDialog}
                  className="p-1 rounded hover:bg-stone-700 text-stone-400"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  ref={createInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleCreateKeyPress}
                  placeholder={createType === 'file' ? 'filename.ext' : 'folder name'}
                  className="flex-1 bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
                  disabled={isCreating}
                />
                <button
                  onClick={createNewItem}
                  disabled={isCreating || !newItemName.trim()}
                  className={`px-2 py-1 rounded text-xs ${
                    isCreating || !newItemName.trim()
                      ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                      : 'bg-teal-700 text-teal-100 hover:bg-teal-600'
                  }`}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          )}
          
          {/* Rename file/folder dialog */}
          {showRenameDialog && itemToRename && (
            <div className="p-2 border-t border-stone-700 bg-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">
                  Rename {itemToRename.type === 'directory' ? 'Folder' : 'File'}
                </span>
                <button
                  onClick={closeRenameDialog}
                  className="p-1 rounded hover:bg-stone-700 text-stone-400"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleRenameKeyPress}
                  placeholder="New name"
                  className="flex-1 bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
                  disabled={isRenaming}
                />
                <button
                  onClick={renameItem}
                  disabled={isRenaming || !newName.trim() || newName === itemToRename.name}
                  className={`px-2 py-1 rounded text-xs ${
                    isRenaming || !newName.trim() || newName === itemToRename.name
                      ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                      : 'bg-teal-700 text-teal-100 hover:bg-teal-600'
                  }`}
                >
                  {isRenaming ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </div>
          )}
          
          {/* Delete file/folder confirmation dialog */}
          {showDeleteDialog && itemToDelete && (
            <div className="p-2 border-t border-stone-700 bg-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">
                  Delete {itemToDelete.type === 'directory' ? 'Folder' : 'File'}
                </span>
                <button
                  onClick={closeDeleteDialog}
                  className="p-1 rounded hover:bg-stone-700 text-stone-400"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mb-2 text-sm">
                <p>Are you sure you want to delete <span className="text-red-400 font-bold">{itemToDelete.name}</span>?</p>
                {itemToDelete.type === 'directory' && (
                  <p className="text-red-400 text-xs mt-1">This will delete all files and folders inside it!</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeDeleteDialog}
                  className="px-2 py-1 rounded text-xs bg-stone-700 hover:bg-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteItem}
                  disabled={isDeleting}
                  className={`px-2 py-1 rounded text-xs ${
                    isDeleting
                      ? 'bg-red-900 text-red-300 cursor-not-allowed'
                      : 'bg-red-700 text-red-100 hover:bg-red-600'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}
          
          <div className="p-2 border-t border-stone-700 text-xs">
            {selectedFile ? selectedFile.path : currentPath}
          </div>
        </div>
        
        {/* File content panel (preview or edit) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* Header with file name, status, and controls */}
              <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">{selectedFile.name}</span>
                  {saveStatus === 'saving' && <span className="text-yellow-400 text-xs ml-2">Saving...</span>}
                  {saveStatus === 'saved' && <span className="text-green-400 text-xs ml-2">Saved</span>}
                  {saveStatus === 'error' && <span className="text-red-400 text-xs ml-2">Error!</span>}
                </div>
                
                {/* Only show edit/preview toggle for markdown files and admin users */}
                {selectedFile.name.endsWith('.md') && isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={toggleEditMode}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${editMode ? 'bg-teal-700 text-teal-100' : 'bg-stone-800 hover:bg-stone-700'}`}
                      title={editMode ? "Switch to preview mode" : "Switch to edit mode"}
                    >
                      {editMode ? <Eye size={14} /> : <Edit size={14} />}
                      {editMode ? 'Preview' : 'Edit'}
                    </button>
                    
                    {editMode && (
                      <button 
                        onClick={saveFileContent}
                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
                        title="Save file"
                      >
                        Save
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Error message */}
              {errorMessage && (
                <div className="p-2 bg-red-900 text-red-200 text-sm">
                  {errorMessage}
                </div>
              )}
              
              {/* Content area - either editor or preview */}
              {isContentLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-teal-300">Loading content...</span>
                </div>
              ) : editMode && selectedFile.name.endsWith('.md') && isAdmin ? (
                // Editor mode - only for markdown files and admin users
                <div className="flex-1 flex flex-col">
                  {/* Markdown toolbar */}
                  <div className="p-2 border-b border-stone-700 bg-stone-800 flex flex-wrap gap-2">
                    <button 
                      onClick={() => insertMarkdown('### ')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Heading"
                    >
                      <Heading size={16} />
                    </button>
                    <button 
                      onClick={() => insertMarkdown('**', '**')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Bold"
                    >
                      <Bold size={16} />
                    </button>
                    <button 
                      onClick={() => insertMarkdown('*', '*')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Italic"
                    >
                      <Italic size={16} />
                    </button>
                    <button 
                      onClick={() => insertMarkdown('`', '`')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Inline Code"
                    >
                      <CodeIcon size={16} />
                    </button>
                    <button 
                      onClick={() => insertMarkdown('[', '](url)')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Link"
                    >
                      <Link size={16} />
                    </button>
                    <span className="border-r border-stone-700 h-6"></span>
                    <button 
                      onClick={() => insertList('- ')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Bullet List"
                    >
                      <List size={16} />
                    </button>
                    <button 
                      onClick={() => insertList('1. ')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Numbered List"
                    >
                      <ListOrdered size={16} />
                    </button>
                    <button 
                      onClick={() => insertList('- [ ] ')}
                      className="p-1 rounded hover:bg-stone-700 text-teal-400"
                      title="Checklist"
                    >
                      <CheckSquare size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-2">
                    <textarea
                      ref={textareaRef}
                      className="w-full h-full bg-stone-800 text-teal-50 p-4 resize-none focus:outline-none font-mono"
                      value={fileContent}
                      onChange={handleMarkdownChange}
                      onKeyDown={handleEditorKeyDown}
                      placeholder="# Start typing your markdown here..."
                    />
                  </div>
                </div>
              ) : showPreview ? (
                // Preview mode
                <div className="flex-1 overflow-auto p-4">
                  <div className="markdown-preview text-teal-50">
                    {selectedFile.name.endsWith('.md') ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: converter.makeHtml(fileContent) 
                        }} 
                        className="markdown-content"
                      />
                    ) : (
                      <pre className="font-mono text-sm whitespace-pre-wrap">
                        {fileContent}
                      </pre>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            // No file selected
            <div className="flex items-center justify-center h-full text-stone-600">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4" />
                <p>Select a markdown file to preview</p>
                <p className="text-xs mt-2">Use the 'preview' command to toggle preview mode</p>
                {isAdmin && <p className="text-xs mt-1">Admin users can use the 'edit' command to edit markdown files</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Command input */}
      <div className="p-2 flex items-center gap-2 border-t border-stone-700">
        <span className="text-teal-400">$</span>
        <input
          ref={focusRef}
          type="text"
          onKeyDown={handleCommand}
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          placeholder={isAdmin ? "Commands: refresh, preview, edit, save, new-file, new-folder, rename, delete, public, private" : "Commands: refresh, preview, public"}
        />
      </div>
    </div>
  );
};

export default ExplorerWindow;
