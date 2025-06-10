import React, { useRef, useEffect } from 'react';
import { FileText, Edit, Eye, Download, Map } from 'lucide-react';
import { convertMarkdownToHtml } from '../utils/markdownUtils';
import MapEditor from './MapEditor';
import CanvasEditor from './CanvasEditor';
import ProseMirrorEditor from './ProseMirrorEditor';

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

  // Add an effect to log when file content changes
  useEffect(() => {
  }, [fileContent]);

  // Add an effect to log when selected file changes
  useEffect(() => {
  }, [selectedFile]);
  
  // Add debugging for save file content function
  const wrappedHandleSaveFileContent = (content) => {

    
    // Call the original function
    handleSaveFileContent(content);
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
              
              {/* Show save button for ProseMirror files to admins or users with file access (for private files) */}
              {selectedFile.name.endsWith('.prosemirror') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
                <button 
                  onClick={() => handleSaveFileContent()}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
                  title="Save file"
                >
                  Save
                </button>
              )}
            </div>
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="p-2 bg-red-900 text-red-200 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Content area - editor or preview based on file type */}
          {isContentLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-teal-300">Loading content...</span>
            </div>
          ) : selectedFile.name.endsWith('.canvas') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) ? (
            // Canvas Editor for .canvas files - only for admin users and users with file access
            <CanvasEditor
              fileContent={fileContent}
              selectedFile={selectedFile}
              onSave={wrappedHandleSaveFileContent}
            />
          ) : selectedFile.name.endsWith('.map') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) ? (
            // Map Editor for .map files - only for admin users and users with file access
            <MapEditor 
              fileContent={fileContent}
              selectedFile={selectedFile}
              onSave={wrappedHandleSaveFileContent}
            />
          ) : selectedFile.name.endsWith('.prosemirror') && (isAdmin || (user && user.has_file_access && activeTab === 'private')) ? (
            // ProseMirror WYSIWYG Editor for .prosemirror files - admins and users with file access
            <ProseMirrorEditor
              content={fileContent}
              onChange={setFileContent}
              onSave={wrappedHandleSaveFileContent}
              placeholder="Start typing your document here..."
              readOnly={false}
            />
          ) : (
            // Preview mode for all other files and read-only markdown
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
            {isAdmin && (
              <p className="text-xs mt-1">
                Admin users can edit ProseMirror (.prosemirror), map (.map), and canvas (.canvas) files
              </p>
            )}
            {!isAdmin && user && user.has_file_access && (
              <p className="text-xs mt-1">
                Users with file access can edit ProseMirror (.prosemirror), map (.map), and canvas (.canvas) files in the Private section
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileContent;
