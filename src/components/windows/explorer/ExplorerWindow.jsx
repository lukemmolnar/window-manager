import React from 'react';
import useExplorerState from './state/useExplorerState';
import FileTree from './components/FileTree';
import FileContent from './components/FileContent';
import CommandInput from './components/CommandInput';
import StorageStats from './components/StorageStats';
import { CreateFileDialog, RenameDialog, DeleteDialog } from './components/dialogs/FileDialogs';
import '../ExplorerWindow.css';

const ExplorerWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  // Use the custom hook to manage state and operations
  const explorerState = useExplorerState(nodeId, windowState, updateWindowState);
  
  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* File tree panel */}
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
        />
        
        
        {/* File content panel */}
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
          setFileContent={explorerState.setFileContent}
          toggleEditMode={explorerState.toggleEditMode}
          handleMarkdownChange={explorerState.handleMarkdownChange}
          handleSaveFileContent={explorerState.handleSaveFileContent}
        />
      </div>
      
      {/* File operation dialogs */}
      <CreateFileDialog
        showCreateDialog={explorerState.showCreateDialog}
        createType={explorerState.createType}
        newItemName={explorerState.newItemName}
        setNewItemName={explorerState.setNewItemName}
        isCreating={explorerState.isCreating}
        errorMessage={explorerState.errorMessage}
        closeCreateDialog={explorerState.closeCreateDialog}
        createNewItem={explorerState.createNewItem}
      />
        
      <RenameDialog
        showRenameDialog={explorerState.showRenameDialog}
        itemToRename={explorerState.itemToRename}
        newName={explorerState.newName}
        setNewName={explorerState.setNewName}
        isRenaming={explorerState.isRenaming}
        errorMessage={explorerState.errorMessage}
        closeRenameDialog={explorerState.closeRenameDialog}
        renameItem={explorerState.renameItem}
      />
        
      <DeleteDialog
        showDeleteDialog={explorerState.showDeleteDialog}
        itemToDelete={explorerState.itemToDelete}
        isDeleting={explorerState.isDeleting}
        errorMessage={explorerState.errorMessage}
        closeDeleteDialog={explorerState.closeDeleteDialog}
        handleDeleteItem={explorerState.handleDeleteItem}
      />
      
      {/* Storage statistics display */}
      {(explorerState.isAdmin || (explorerState.storageStats && !explorerState.storageStats.isLoading)) && (
        <StorageStats stats={explorerState.storageStats} />
      )}
      
      {/* Command input */}
      <CommandInput
        focusRef={focusRef}
        isAdmin={explorerState.isAdmin}
        handleCommand={explorerState.handleCommand}
      />
    </div>
  );
};

export default ExplorerWindow;
