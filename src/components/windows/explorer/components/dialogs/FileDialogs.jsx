import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

// Dialog for creating a new file or folder
export const CreateFileDialog = ({
  showCreateDialog,
  createType,
  newItemName,
  setNewItemName,
  isCreating,
  errorMessage,
  closeCreateDialog,
  createNewItem
}) => {
  const createInputRef = useRef(null);
  
  // Focus the input field when the dialog is shown
  useEffect(() => {
    if (showCreateDialog && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreateDialog]);
  
  // Handle key press in the create dialog
  const handleCreateKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewItem();
    } else if (e.key === 'Escape') {
      closeCreateDialog();
    }
  };
  
  if (!showCreateDialog) return null;
  
  return (
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
  );
};

// Dialog for renaming a file or folder
export const RenameDialog = ({
  showRenameDialog,
  itemToRename,
  newName,
  setNewName,
  isRenaming,
  errorMessage,
  closeRenameDialog,
  renameItem
}) => {
  const renameInputRef = useRef(null);
  
  // Focus the input field when the dialog is shown
  useEffect(() => {
    if (showRenameDialog && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [showRenameDialog]);
  
  // Handle key press in the rename dialog
  const handleRenameKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      renameItem();
    } else if (e.key === 'Escape') {
      closeRenameDialog();
    }
  };
  
  if (!showRenameDialog || !itemToRename) return null;
  
  return (
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
  );
};

// Dialog for deleting a file or folder
export const DeleteDialog = ({
  showDeleteDialog,
  itemToDelete,
  isDeleting,
  errorMessage,
  closeDeleteDialog,
  handleDeleteItem
}) => {
  if (!showDeleteDialog || !itemToDelete) return null;
  
  return (
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
          onClick={handleDeleteItem}
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
  );
};
