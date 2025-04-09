import React, { useRef, useEffect } from 'react';
import { FileText, Edit, Eye, Bold, Italic, Code as CodeIcon, Link, Heading, List, ListOrdered, CheckSquare, Download } from 'lucide-react';
import { handleEditorKeyDown, convertMarkdownToHtml } from '../utils/markdownUtils';

const FileContent = ({
  selectedFile,
  isContentLoading,
  fileContent,
  errorMessage,
  showPreview,
  editMode,
  saveStatus,
  converter,
  isAdmin,
  user,
  activeTab,
  setFileContent,
  toggleEditMode,
  handleMarkdownChange,
  handleSaveFileContent,
  handleExportFile
}) => {
  // Debug logging
  console.log('[DEBUG] FileContent rendered with props:', {
    selectedFile,
    isContentLoading,
    fileContentLength: fileContent?.length || 0,
    hasContent: !!fileContent,
    showPreview,
    editMode,
    saveStatus
  });

  // Add an effect to log when file content changes
  useEffect(() => {
    console.log('[DEBUG] FileContent - fileContent changed:', {
      length: fileContent?.length || 0,
      preview: fileContent?.substring(0, 50),
      hasContent: !!fileContent
    });
  }, [fileContent]);

  // Add an effect to log when selected file changes
  useEffect(() => {
    console.log('[DEBUG] FileContent - selectedFile changed:', selectedFile);
  }, [selectedFile]);

  const textareaRef = useRef(null);

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

  // Handle editor keyboard events
  const onEditorKeyDown = (e) => {
    handleEditorKeyDown(e, textareaRef, fileContent, setFileContent);
  };

  return (
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
            
            <div className="flex gap-2">
              {/* Export button - available for all file types */}
              <button 
                onClick={handleExportFile}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
                title="Export file"
              >
                <Download size={14} />
                Export
              </button>
              
              {/* Show edit/preview toggle for markdown files to admins or users with file access (for private files) */}
              {selectedFile.name.endsWith('.md') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
                <>
                  {editMode && (
                    <button 
                      onClick={handleSaveFileContent}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
                      title="Save file"
                    >
                      Save
                    </button>
                  )}
                  <button 
                    onClick={toggleEditMode}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${editMode ? 'bg-teal-700 text-teal-100' : 'bg-stone-800 hover:bg-stone-700'}`}
                    title={editMode ? "Switch to preview mode" : "Switch to edit mode"}
                  >
                    {editMode ? <Eye size={14} /> : <Edit size={14} />}
                    {editMode ? 'Preview' : 'Edit'}
                  </button>
                </>
              )}
            </div>
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
          ) : editMode && selectedFile.name.endsWith('.md') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) ? (
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
                  onKeyDown={onEditorKeyDown}
                  placeholder="# Start typing your markdown here..."
                />
              </div>
            </div>
          ) : (
            // Preview mode
            <div className="flex-1 overflow-auto p-4">
              <div className="markdown-preview text-teal-50">
                {selectedFile.name.endsWith('.md') ? (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: convertMarkdownToHtml(converter, fileContent) 
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
          )}
        </>
      ) : (
        // No file selected
        <div className="flex items-center justify-center h-full text-stone-600">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4" />
            <p>Select a file to view</p>
            <p className="text-xs mt-2">All file types are supported for viewing</p>
            {isAdmin && <p className="text-xs mt-1">Admin users can edit markdown (.md) files</p>}
            {!isAdmin && user && user.has_file_access && <p className="text-xs mt-1">Users with file access can edit markdown (.md) files in the Private section</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileContent;
