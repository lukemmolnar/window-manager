import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, ChevronRight, ChevronDown, File, Coffee, Code, BookOpen } from 'lucide-react';
import showdown from 'showdown';
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
      
      // In a real implementation, we would call an API endpoint
      // Since we can't do that directly in this example, I'll simulate a response
      
      // For development with Vite, we could use:
      // const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      // const data = await response.json();
      
      // Simulate server response with a directory structure
      setTimeout(() => {
        // This simulates the files in your project root
        // In a real implementation, this would come from your server
        const projectFiles = [
          {
            name: 'docs',
            type: 'directory',
            path: '/docs',
            children: [
              { name: 'introduction.md', type: 'file', path: '/docs/introduction.md' },
              { name: 'getting-started.md', type: 'file', path: '/docs/getting-started.md' },
              { name: 'api-reference.md', type: 'file', path: '/docs/api-reference.md' }
            ]
          },
          {
            name: 'src',
            type: 'directory',
            path: '/src',
            children: [
              { name: 'App.jsx', type: 'file', path: '/src/App.jsx' },
              { name: 'main.jsx', type: 'file', path: '/src/main.jsx' },
              { name: 'styles.css', type: 'file', path: '/src/styles.css' },
              { 
                name: 'components', 
                type: 'directory', 
                path: '/src/components',
                children: [
                  { name: 'WindowManager.jsx', type: 'file', path: '/src/components/WindowManager.jsx' },
                  { name: 'CommandBar.jsx', type: 'file', path: '/src/components/CommandBar.jsx' }
                ]
              }
            ]
          },
          { name: 'README.md', type: 'file', path: '/README.md' },
          { name: 'package.json', type: 'file', path: '/package.json' }
        ];
        
        setFiles(projectFiles);
        setCurrentPath(path);
        setIsLoading(false);
      }, 300);
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
      
      // In a real implementation, we would call an API endpoint
      // Since we can't do that directly in this example, I'll simulate content for markdown files
      
      setTimeout(() => {
        // Sample content for markdown files
        let content = '';
        
        if (filePath === '/README.md') {
          content = `# SLUMTERM
          
## Overview
i can render markdown now nerd

its over`;
        } 
        else if (filePath === '/docs/introduction.md') {
          content = `# Introduction to Window Manager
          
The Window Manager is a React-based system for creating flexible, multi-pane layouts.

## Core Concepts
- **Windows**: Individual content panes
- **Splits**: Divisions between windows
- **Workspaces**: Collections of window arrangements

## Architecture
The system uses a binary tree structure to represent the layout hierarchy.`;
        }
        else if (filePath === '/docs/getting-started.md') {
          content = `# Getting Started
          
## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Basic Usage
- **Ctrl+Enter**: Create new window or split vertically
- **Ctrl+Shift+Enter**: Split horizontally
- **Ctrl+Backspace**: Close window
- **Ctrl+Q**: Toggle resize mode`;
        }
        else if (filePath === '/docs/api-reference.md') {
          content = `# API Reference
          
## Components

### WindowManager
The main component that manages the window hierarchy.

\`\`\`jsx
<WindowManager defaultLayout={layout} />
\`\`\`

### CommandBar
Provides a command interface for controlling the window manager.

\`\`\`jsx
<CommandBar onCommand={handleCommand} />
\`\`\``;
        }
        else {
          // For non-markdown files, show a placeholder message
          content = `Content for ${filePath} would be displayed here.`;
        }
        
        setFileContent(content);
        setIsLoading(false);
      }, 300);
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
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </div>
  );
};

export default ExplorerWindow;
