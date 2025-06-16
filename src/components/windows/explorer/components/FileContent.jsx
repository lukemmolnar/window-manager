import React, { useRef, useEffect, useState } from 'react';
import { FileText, Edit, Eye, Download, Map, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import { convertMarkdownToHtml } from '../utils/markdownUtils';
import { shouldUseProseMirrorEditor, convertServerFileNameToUser } from '../utils/fileUtils';
import MapEditor from './MapEditor';
import CanvasEditor from './CanvasEditor';
import ProseMirrorEditor from './ProseMirrorEditor';
import API_CONFIG from '../../../../config/api';

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
  isFileTreeCollapsed,
  toggleFileTreeCollapse,
  setFileContent,
  toggleEditMode,
  handleMarkdownChange,
  handleSaveFileContent,
  handleExportFile
}) => {
  const [currentParty, setCurrentParty] = useState(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  // Check if user has a party and is the creator
  useEffect(() => {
    const fetchCurrentParty = async () => {
      if (!user) return;

      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/current-party`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const party = await response.json();
          setCurrentParty(party);
        } else {
          setCurrentParty(null);
        }
      } catch (error) {
        console.error('Error fetching current party:', error);
        setCurrentParty(null);
      }
    };

    fetchCurrentParty();
  }, [user]);

  // Handle loading map for party
  const handleLoadMapForParty = async () => {
    if (!selectedFile || !currentParty || !fileContent) {
      return;
    }

    try {
      setIsLoadingMap(true);

      // Parse the map data
      let mapData;
      try {
        mapData = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing map file:', parseError);
        alert('Error: Invalid map file format');
        return;
      }

      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required. Please log in.');
        return;
      }

      // Send to the party load-map endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/parties/${currentParty.id}/load-map`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapFilePath: selectedFile.path || selectedFile.name,
          mapData: mapData
        })
      });

      if (response.ok) {
        console.log("map loaded");
      } else {
        const errorData = await response.json();
        alert(`Error loading map: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error loading map for party:', error);
      alert('Error loading map for party');
    } finally {
      setIsLoadingMap(false);
    }
  };

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

  // Check if user can load maps (is party creator)
  const canLoadMap = currentParty && user && currentParty.creator_id === user.id;


  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {selectedFile ? (
        <>
          {/* Header with file name, status, and controls */}
          <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
            <div className="flex items-center">
              {/* File tree toggle button */}
              <button
                onClick={toggleFileTreeCollapse}
                className="p-1 rounded hover:bg-stone-700 text-teal-400 hover:text-teal-300 mr-3"
                title={isFileTreeCollapsed ? "Show File Tree" : "Hide File Tree"}
              >
                {isFileTreeCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
              
              <span className="mr-2">{convertServerFileNameToUser(selectedFile.name)}</span>
              {saveStatus === 'saving' && <span className="text-yellow-400 text-xs ml-2">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-green-400 text-xs ml-2">Saved</span>}
              {saveStatus === 'error' && <span className="text-red-400 text-xs ml-2">Error!</span>}
            </div>
            
            <div className="flex gap-2">
              {/* Export button - available for all file types */}
              <button 
                onClick={handleExportFile}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs flex items-center gap-1"
                title={`Export ${convertServerFileNameToUser(selectedFile.name)}`}
              >
                <Download size={14} />
                Export
              </button>

              {/* Load button - available for .map files when user is party creator */}
              {selectedFile.name.endsWith('.map') && canLoadMap && (
                <button 
                  onClick={handleLoadMapForParty}
                  disabled={isLoadingMap}
                  className="px-2 py-1 bg-amber-800 hover:bg-amber-700 disabled:bg-stone-600 disabled:cursor-not-allowed rounded text-xs flex items-center gap-1"
                  title={`Load map for party "${currentParty.name}"`}
                >
                  <Users size={14} />
                  {isLoadingMap ? 'Loading...' : 'Load'}
                </button>
              )}
              
              {/* Show save button for ProseMirror files (.txt/.prosemirror) to admins or users with file access (for private files) */}
              {/* {shouldUseProseMirrorEditor(selectedFile.name) && (isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
                <button 
                  onClick={() => handleSaveFileContent()}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
                  title="Save file"
                >
                  Save
                </button>
              )} */}
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
          ) : shouldUseProseMirrorEditor(selectedFile.name) && (isAdmin || (user && user.has_file_access && activeTab === 'private')) ? (
            // ProseMirror WYSIWYG Editor for .txt/.prosemirror files - admins and users with file access
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
                Admin users can edit text (.txt), map (.map), and canvas (.canvas) files
              </p>
            )}
            {!isAdmin && user && user.has_file_access && (
              <p className="text-xs mt-1">
                Users with file access can edit text (.txt), map (.map), and canvas (.canvas) files in the Private section
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileContent;
