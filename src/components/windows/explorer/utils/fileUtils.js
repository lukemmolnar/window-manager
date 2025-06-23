// List of available file types for autocomplete
export const AVAILABLE_FILE_TYPES = [
  'txt',    // User-facing extension, actually .prosemirror on server
  'canvas',
  'map'
];

// File extension aliasing - maps user-facing extensions to server extensions
export const FILE_EXTENSION_ALIASES = {
  'txt': 'prosemirror',    // Users see .txt, server stores .prosemirror
};

// Convert user-facing extension to server extension
export const getServerExtension = (userExtension) => {
  return FILE_EXTENSION_ALIASES[userExtension] || userExtension;
};

// Convert server extension to user-facing extension
export const getUserExtension = (serverExtension) => {
  const alias = Object.entries(FILE_EXTENSION_ALIASES).find(([user, server]) => server === serverExtension);
  return alias ? alias[0] : serverExtension;
};

// Get the actual extension from a filename (either user or server)
export const getFileExtension = (fileName) => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.substring(lastDot + 1) : '';
};

// Check if a file should use the ProseMirror editor
export const shouldUseProseMirrorEditor = (fileName) => {
  const ext = getFileExtension(fileName);
  return ext === 'prosemirror' || ext === 'txt';
};

// Convert a user-input filename to server filename
export const convertUserFileNameToServer = (userFileName) => {
  const lastDot = userFileName.lastIndexOf('.');
  if (lastDot === -1) return userFileName;
  
  const baseName = userFileName.substring(0, lastDot);
  const userExt = userFileName.substring(lastDot + 1);
  const serverExt = getServerExtension(userExt);
  
  return `${baseName}.${serverExt}`;
};

// Convert a server filename to user-facing filename
export const convertServerFileNameToUser = (serverFileName) => {
  const lastDot = serverFileName.lastIndexOf('.');
  if (lastDot === -1) return serverFileName;
  
  const baseName = serverFileName.substring(0, lastDot);
  const serverExt = serverFileName.substring(lastDot + 1);
  const userExt = getUserExtension(serverExt);
  
  return `${baseName}.${userExt}`;
};

// Convert a server file path to user-facing path
export const convertServerPathToUser = (serverPath) => {
  if (!serverPath || serverPath === '/' || serverPath.endsWith('/')) {
    // Directory paths don't need conversion
    return serverPath;
  }
  
  const lastSlashIndex = serverPath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // No directory separator, just convert the filename
    return convertServerFileNameToUser(serverPath);
  }
  
  // Split path into directory and filename parts
  const directoryPath = serverPath.substring(0, lastSlashIndex + 1);
  const fileName = serverPath.substring(lastSlashIndex + 1);
  
  // Convert only the filename part
  const userFileName = convertServerFileNameToUser(fileName);
  
  return directoryPath + userFileName;
};

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
  if (fileName.endsWith('.txt') || fileName.endsWith('.prosemirror')) return 'FileText';
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
