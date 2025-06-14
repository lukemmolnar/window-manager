import React from 'react';
import useExplorerState from './state/useExplorerState';
import { useAuth } from '../../../context/AuthContext';
import FileTree from './components/FileTree';
import FileContent from './components/FileContent';
import StorageStats from './components/StorageStats';
import { PanelLeftOpen } from 'lucide-react';
import '../ExplorerWindow.css';

const ExplorerWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Get auth context to check user permissions
  const { user } = useAuth();
  // Use the custom hook to manage state and operations
  const explorerState = useExplorerState(nodeId, windowState, updateWindowState);
  
  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* File tree panel - conditionally rendered */}
        {!explorerState.isFileTreeCollapsed && (
          <FileTree 
            files={explorerState.files}
            publicFiles={explorerState.publicFiles}
            activeTab={explorerState.activeTab}
            expandedFolders={explorerState.expandedFolders}
            currentPath={explorerState.currentPath}
            selectedFile={explorerState.selectedFile}
            isTreeLoading={explorerState.isTreeLoading}
            errorMessage={explorerState.errorMessage}
            isAdmin={explorerState.isAdmin}
            user={user}
            toggleFolder={explorerState.toggleFolder}
            handleFileSelect={explorerState.handleFileSelect}
            openRenameDialog={explorerState.openRenameDialog}
            openDeleteDialog={explorerState.openDeleteDialog}
            openCreateDialog={explorerState.openCreateDialog}
            handleDragStart={explorerState.handleDragStart}
            handleDragOver={explorerState.handleDragOver}
            handleDragLeave={explorerState.handleDragLeave}
            handleDrop={explorerState.handleDrop}
            handleContainerDragOver={explorerState.handleContainerDragOver}
            handleContainerDragLeave={explorerState.handleContainerDragLeave}
            handleContainerDrop={explorerState.handleContainerDrop}
            dropTarget={explorerState.dropTarget}
            storageStats={explorerState.storageStats}
            // Dialog-related props
            showCreateDialog={explorerState.showCreateDialog}
            createType={explorerState.createType}
            newItemName={explorerState.newItemName}
            setNewItemName={explorerState.setNewItemName}
            isCreating={explorerState.isCreating}
            closeCreateDialog={explorerState.closeCreateDialog}
            createNewItem={explorerState.createNewItem}
            showRenameDialog={explorerState.showRenameDialog}
            itemToRename={explorerState.itemToRename}
            newName={explorerState.newName}
            setNewName={explorerState.setNewName}
            isRenaming={explorerState.isRenaming}
            closeRenameDialog={explorerState.closeRenameDialog}
            renameItem={explorerState.renameItem}
            showDeleteDialog={explorerState.showDeleteDialog}
            itemToDelete={explorerState.itemToDelete}
            isDeleting={explorerState.isDeleting}
            closeDeleteDialog={explorerState.closeDeleteDialog}
            handleDeleteItem={explorerState.handleDeleteItem}
          />
        )}
        
        
        {/* File content panel - takes full width when tree is collapsed */}
        <FileContent
          selectedFile={explorerState.selectedFile}
          isContentLoading={explorerState.isContentLoading}
          fileContent={explorerState.fileContent}
          errorMessage={explorerState.errorMessage}
          showPreview={explorerState.showPreview}
          editMode={explorerState.editMode}
          saveStatus={explorerState.saveStatus}
          converter={explorerState.converter}
          isAdmin={explorerState.isAdmin}
          user={user}
          activeTab={explorerState.activeTab}
          isFileTreeCollapsed={explorerState.isFileTreeCollapsed}
          toggleFileTreeCollapse={explorerState.toggleFileTreeCollapse}
          setFileContent={explorerState.setFileContent}
          toggleEditMode={explorerState.toggleEditMode}
          handleMarkdownChange={explorerState.handleMarkdownChange}
          handleSaveFileContent={explorerState.handleSaveFileContent}
          handleExportFile={explorerState.handleExportFile}
        />
      </div>
      
      {/* Command input */}
    </div>
  );
};

export default ExplorerWindow;
