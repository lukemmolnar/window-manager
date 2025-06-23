import React from 'react';
import { 
  FolderOpen, ChevronRight, ChevronDown, File, Coffee, Code, 
  BookOpen, FileText, Globe, Lock, FileEdit, Trash2, Music, Image, Figma,
  FolderPlus, Plus, Map
} from 'lucide-react';
import { getFileIconName, convertServerFileNameToUser, convertServerPathToUser } from '../utils/fileUtils';
import StorageStats from './StorageStats';
import { CreateFileDialog, RenameDialog, DeleteDialog } from './dialogs/FileDialogs';

const FileTree = ({ 
  files, 
  publicFiles, 
  activeTab,
  expandedFolders,
  currentPath,
  selectedFile,
  isTreeLoading,
  errorMessage,
  isAdmin,
  user,
  toggleFolder,
  handleFileSelect,
  openRenameDialog,
  openDeleteDialog,
  openCreateDialog,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleContainerDragOver,
  handleContainerDragLeave,
  handleContainerDrop,
  dropTarget,
  storageStats,
  // Dialog-related props
  showCreateDialog,
  createType,
  newItemName,
  setNewItemName,
  isCreating,
  closeCreateDialog,
  createNewItem,
  showRenameDialog,
  itemToRename,
  newName,
  setNewName,
  isRenaming,
  closeRenameDialog,
  renameItem,
  showDeleteDialog,
  itemToDelete,
  isDeleting,
  closeDeleteDialog,
  handleDeleteItem
}) => {
  
  // Get file icon based on file extension
  const getFileIcon = (fileName) => {
    const iconName = getFileIconName(fileName);
    const iconProps = { size: 16, className: "mr-2" };
    
    switch (iconName) {
      case 'FileText': return <FileText {...iconProps} />;
      case 'Code': return <Code {...iconProps} />;
      case 'Coffee': return <Coffee {...iconProps} />;
      case 'BookOpen': return <BookOpen {...iconProps} />;
      case 'Globe': return <Globe {...iconProps} />;
      case 'Music': return <Music {...iconProps} />;
      case 'Image': return <Image {...iconProps} />;
      case 'Figma': return <Figma {...iconProps} />;
      case 'Map': return <Map {...iconProps} />;
      default: return <File {...iconProps} />;
    }
  };
  
  // Render the file tree recursively
  const renderFileTree = (items) => {
    // Keep track of the path to the currently selected file to highlight its parent folder
    const selectedFilePath = selectedFile?.path || '';
    const selectedFileParentPath = selectedFile && selectedFile.type !== 'directory' ? 
      selectedFilePath.substring(0, selectedFilePath.lastIndexOf('/')) || '/' : '';
    
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
              draggable={isAdmin || (user?.has_file_access && activeTab === 'private')}
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
              
              {/* File operation buttons */}
            {(isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
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
            draggable={isAdmin || (user?.has_file_access && activeTab === 'private')}
            onDragStart={(e) => handleDragStart(e, item)}
          >
            <div className="flex items-center">
              {getFileIcon(item.name)}
              <span className="text-sm">{convertServerFileNameToUser(item.name)}</span>
            </div>
            
            {/* File operation buttons */}
            {(isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
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

  return (
    <div className="w-1/4 border-r border-stone-700 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
        <div className="flex items-center">
          <span>FILES</span>
          
          {/* Tabs for switching between public and private files */}
          <div className="flex ml-4">
            <button
              onClick={() => {
                if (activeTab !== 'public') {
                  // First set the active tab, then select the root folder
                  handleFileSelect({ 
                    path: '/', 
                    type: 'directory', 
                    name: 'Root', 
                    isPublic: true,
                    setTab: 'public' // Add flag to explicitly set the tab
                  });
                }
              }}
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
            
            {(isAdmin || (user && user.has_file_access)) && (
              <button
                onClick={() => {
                  if (activeTab !== 'private') {
                    // First set the active tab, then select the root folder
                    handleFileSelect({ 
                      path: '/', 
                      type: 'directory', 
                      name: 'Root',
                      setTab: 'private' // Add flag to explicitly set the tab
                    });
                  }
                }}
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
        
        <div className="flex gap-2">
          {/* File creation buttons (admins for both tabs, users with file access only for private tab) */}
          {(isAdmin || (user && user.has_file_access && activeTab === 'private')) && (
            <>
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
            </>
          )}
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-auto"
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
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
                  <span className="text-sm font-bold">Private Files</span>
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
      
      <div className="p-2 border-t border-stone-700 text-xs">
        {selectedFile ? convertServerPathToUser(selectedFile.path) : convertServerPathToUser(currentPath)}
      </div>
      
      {/* Storage statistics display */}
      {(isAdmin || (user && user.has_file_access)) && (
        <StorageStats stats={storageStats} />
      )}
      
      {/* File operation dialogs */}
      <CreateFileDialog
        showCreateDialog={showCreateDialog}
        createType={createType}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        isCreating={isCreating}
        errorMessage={errorMessage}
        closeCreateDialog={closeCreateDialog}
        createNewItem={createNewItem}
      />
        
      <RenameDialog
        showRenameDialog={showRenameDialog}
        itemToRename={itemToRename}
        newName={newName}
        setNewName={setNewName}
        isRenaming={isRenaming}
        errorMessage={errorMessage}
        closeRenameDialog={closeRenameDialog}
        renameItem={renameItem}
      />
        
      <DeleteDialog
        showDeleteDialog={showDeleteDialog}
        itemToDelete={itemToDelete}
        isDeleting={isDeleting}
        errorMessage={errorMessage}
        closeDeleteDialog={closeDeleteDialog}
        handleDeleteItem={handleDeleteItem}
      />
    </div>
  );
};

export default FileTree;
