// List of available file types for autocomplete
export const AVAILABLE_FILE_TYPES = [
  'md',
  'canvas',
  'map'
];

// Helper function to get parent directory path from a file path
export const getParentDirectoryPath = (filePath) => {
  // Remove trailing slash if present
  const normalizedPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
  // Find the last slash in the path
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  
  if (lastSlashIndex === -1) {
    // No slash found, return root
    return '/';
  }
  
  // Return everything up to the last slash
  return normalizedPath.substring(0, lastSlashIndex) || '/';
};

// Helper function to expand all parent folders of a path
export const expandParentFolders = (filePath, currentExpandedFolders) => {
  const parts = filePath.split('/').filter(Boolean);
  let currentPath = '';
  
  // Create a new expanded folders object
  const newExpandedFolders = { ...currentExpandedFolders };
  
  // Expand each parent folder
  for (let i = 0; i < parts.length; i++) {
    currentPath += '/' + parts[i];
    newExpandedFolders[currentPath] = true;
  }
  
  return newExpandedFolders;
};

// Get file icon based on file extension
export const getFileIconName = (fileName) => {
  if (fileName.endsWith('.md')) return 'FileText';
  if (fileName.endsWith('.jsx') || fileName.endsWith('.js')) return 'Code';
  if (fileName.endsWith('.json')) return 'Coffee';
  if (fileName.endsWith('.css')) return 'BookOpen';
  if (fileName.endsWith('.html')) return 'Globe';
  if (fileName.endsWith('.svg') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif')) return 'Image';
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg')) return 'Music';
  if (fileName.endsWith('.canvas')) return 'Figma';
  if (fileName.endsWith('.map')) return 'Map';
  return 'File';
};

// Helper function to get the active folder path based on selected item and current path
export const getActiveFolderPath = (selectedFile, currentPath) => {
  if (selectedFile) {
    // If selected item is a directory, use its path
    if (selectedFile.type === 'directory') {
      return selectedFile.path;
    }
    // If selected item is a file, use its parent directory
    return getParentDirectoryPath(selectedFile.path);
  }
  // Fall back to current path if no file is selected
  return currentPath;
};
