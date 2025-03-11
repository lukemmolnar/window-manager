import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, ChevronRight, ChevronDown, File, Coffee, Code, BookOpen } from 'lucide-react';
import showdown from 'showdown';
import API_CONFIG from '../../config/api';
import './ExplorerWindow.css';

const ExplorerWindow = ({ nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Use state from windowState or initialize with defaults
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(windowState?.currentPath || '/');
  const [selectedFile, setSelectedFile] = useState(windowState?.selectedFile || null);
  const [expandedFolders, setExpandedFolders] = useState(windowState?.expandedFolders || {});
  const [isLoading, setIsLoading] = useState(true);
  const [fileContent, setFileContent] = useState(windowState?.fileContent || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPreview, setShowPreview] = useState(windowState?.showPreview || false);
  
  // Initialize Showdown converter for Markdown
  const converter = new showdown.Converter({
    tables: true,
    tasklists: true,
    strikethrough: true,
    emoji: true
  });

  // Function to fetch directory contents from the server
  const fetchDirectoryContents = async (path = '/') => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }
      
      // Fetch directory contents from the server
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILES_LIST}?path=${encodeURIComponent(path)}`,
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
        setIsLoading(false);
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
      setCurrentPath(path);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching directory contents:', error);
      setErrorMessage('Failed to load files. Please try again.');
      setIsLoading(false);
    }
  };

  // Function to fetch file content
  const fetchFileContent = async (filePath) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setIsLoading(false);
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
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      setFileContent(data.content);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching file content:', error);
      setErrorMessage('Failed to load file content. Please try again.');
      setIsLoading(false);
    }
  };

  // Load initial directory contents
  useEffect(() => {
    fetchDirectoryContents();
  }, []);

  // Update window state when relevant state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        currentPath,
        selectedFile,
        expandedFolders,
        fileContent,
        showPreview
      });
    }
  }, [currentPath, selectedFile, expandedFolders, fileContent, showPreview, updateWindowState]);

  // Toggle folder expansion
  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    // If it's a markdown file, fetch its content and show preview
    if (file.name.endsWith('.md')) {
      fetchFileContent(file.path);
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
    return items.map(item => {
      if (item.type === 'directory') {
        const isExpanded = expandedFolders[item.path];
        return (
          <div key={item.path} className="ml-2">
            <div 
              className={`flex items-center py-1 px-1 rounded hover:bg-stone-700 cursor-pointer ${isExpanded ? 'text-teal-300' : 'text-teal-400'}`}
              onClick={() => toggleFolder(item.path)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <FolderOpen size={16} className="ml-1 mr-2" />
              <span className="text-sm">{item.name}</span>
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
            className={`flex items-center py-1 px-1 ml-4 rounded cursor-pointer hover:bg-stone-700 ${isSelected ? 'bg-stone-700 text-teal-300' : 'text-teal-50'}`}
            onClick={() => handleFileSelect(item)}
          >
            {getFileIcon(item.name)}
            <span className="text-sm">{item.name}</span>
          </div>
        );
      }
    });
  };

  // Handle command input
  const handleCommand = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const cmd = e.target.value.trim();
      onCommand(cmd);
      e.target.value = '';
      
      // Example commands:
      // - refresh: refresh file list
      // - preview: toggle markdown preview
      if (cmd === 'refresh') {
        fetchDirectoryContents(currentPath);
      } else if (cmd === 'preview' && selectedFile?.name.endsWith('.md')) {
        setShowPreview(!showPreview);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* File tree panel */}
        <div className="w-1/3 border-r border-stone-700 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center">
            <span>PROJECT FILES</span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {isLoading && !fileContent ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-teal-300">Loading...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-2 text-red-400">{errorMessage}</div>
            ) : (
              <div className="p-2 font-mono">
                {renderFileTree(files)}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-stone-700 text-xs">
            {selectedFile ? selectedFile.path : currentPath}
          </div>
        </div>
        
        {/* File preview panel - only shown for markdown files */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile && showPreview ? (
            <>
              <div className="p-2 border-b border-stone-700 font-mono text-sm">
                <span>{selectedFile.name}</span>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-teal-300">Loading content...</span>
                  </div>
                ) : (
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
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-stone-600">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4" />
                <p>Select a markdown file to preview</p>
                <p className="text-xs mt-2">Use the 'preview' command to toggle preview mode</p>
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
        />
      </div>
    </div>
  );
};

export default ExplorerWindow;
