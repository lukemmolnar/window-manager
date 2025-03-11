import React, { useState, useEffect, useRef } from 'react';
import showdown from 'showdown';
import API_CONFIG from '../../config/api';

const MarkdownEditorWindow = ({ nodeId, onCommand, windowState, updateWindowState }) => {
  // Use state from windowState or default values
  const [markdown, setMarkdown] = useState(windowState?.markdown || '# New Markdown Document\n\nStart typing here...');
  const [filePath, setFilePath] = useState(windowState?.filePath || '');
  const [showPreview, setShowPreview] = useState(windowState?.showPreview || false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [command, setCommand] = useState('');
  
  // For auto-save functionality
  const saveTimeoutRef = useRef(null);
  
  // Initialize Showdown converter for Markdown
  const converter = new showdown.Converter({
    tables: true,
    tasklists: true,
    strikethrough: true,
    emoji: true
  });

  // Sync with external state when it changes
  useEffect(() => {
    if (windowState) {
      if (windowState.markdown !== undefined) {
        setMarkdown(windowState.markdown);
      }
      if (windowState.filePath !== undefined) {
        setFilePath(windowState.filePath);
      }
      if (windowState.showPreview !== undefined) {
        setShowPreview(windowState.showPreview);
      }
    }
  }, [windowState]);
  
  // Update window state when relevant state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        markdown,
        filePath,
        showPreview
      });
    }
  }, [markdown, filePath, showPreview, updateWindowState]);

  // Load file content when filePath changes
  useEffect(() => {
    if (filePath) {
      loadFileContent();
    }
  }, [filePath]);

  // Auto-save functionality with debounce
  useEffect(() => {
    if (filePath && filePath.trim() !== '' && markdown) {
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
    } else if (!filePath || filePath.trim() === '') {
      // If no file path, set status to error
      setSaveStatus('error');
      setErrorMessage('No file path specified. Use "load <path>" command to set a file path.');
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [markdown, filePath]);

  const loadFileContent = async () => {
    try {
      setSaveStatus('loading');
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setErrorMessage('Authentication required. Please log in.');
        setSaveStatus('error');
        return;
      }
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CONTENT}?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMarkdown(data.content);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error loading file:', error);
      setErrorMessage(`Error loading file: ${error.message}`);
      setSaveStatus('error');
    }
  };

  const saveFileContent = async () => {
    try {
      // Check if filePath is valid
      if (!filePath || filePath.trim() === '') {
        setErrorMessage('No file path specified. Use "load <path>" command to set a file path.');
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
          path: filePath,
          content: markdown
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

  const handleMarkdownChange = (e) => {
    setMarkdown(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && command.trim()) {
      handleCommand(command.trim());
      setCommand('');
    }
  };

  const handleCommand = (cmd) => {
    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    
    switch (action) {
      case 'preview':
        setShowPreview(!showPreview);
        break;
      case 'save':
        saveFileContent();
        break;
      case 'load':
        if (parts.length > 1) {
          const newPath = parts.slice(1).join(' ');
          setFilePath(newPath);
        } else {
          setErrorMessage('Please specify a file path. Example: load /path/to/file.md');
        }
        break;
      default:
        // Pass other commands to the parent
        onCommand(cmd);
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      {/* Header with file path and status */}
      <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">{filePath || 'Untitled.md'}</span>
          {saveStatus === 'saving' && <span className="text-yellow-400 text-xs ml-2">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-green-400 text-xs ml-2">Saved</span>}
          {saveStatus === 'error' && <span className="text-red-400 text-xs ml-2">Error!</span>}
        </div>
        <button 
          onClick={() => setShowPreview(!showPreview)}
          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="p-2 bg-red-900 text-red-200 text-sm">
          {errorMessage}
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {!showPreview && (
          <div className="flex-1 p-2">
            <textarea
              className="w-full h-full bg-stone-800 text-teal-50 p-4 resize-none focus:outline-none font-mono"
              value={markdown}
              onChange={handleMarkdownChange}
              placeholder="# Start typing your markdown here..."
            />
          </div>
        )}
        
        {/* Preview */}
        {showPreview && (
          <div className="flex-1 p-4 overflow-auto bg-stone-800">
            <div 
              className="markdown-preview text-teal-50"
              dangerouslySetInnerHTML={{ 
                __html: converter.makeHtml(markdown) 
              }}
            />
          </div>
        )}
      </div>
      
      {/* Command input */}
      <div className="p-2 flex items-center gap-2 border-t border-stone-700">
        <span className="text-teal-400">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          placeholder="Commands: preview, save, load <path>"
        />
      </div>
    </div>
  );
};

export default MarkdownEditorWindow;
