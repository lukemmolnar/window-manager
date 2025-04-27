import API_CONFIG from '../../../../config/api';

// Function to fetch public directory contents
export const fetchPublicDirectoryContents = async (publicPath = '/', refreshAll = false) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // If refreshAll is true, start from the root
    const pathToFetch = refreshAll ? '/' : publicPath;
    
    // Fetch public directory contents from the server
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUBLIC_FILES_LIST}?path=${encodeURIComponent(pathToFetch)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to load public files: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform the data to match our expected format
    const transformedFiles = data.items.map(item => ({
      name: item.name,
      type: item.type,
      path: item.path,
      children: item.children || [],
      isPublic: true
    }));
    
    return {
      files: transformedFiles,
      error: null
    };
  } catch (error) {
    console.error('Error fetching public directory contents:', error);
    return {
      files: [],
      error: error.message || 'Failed to load public files. Please try again.'
    };
  }
};

// Function to fetch public file content
export const fetchPublicFileContent = async (filePath) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Fetch public file content from the server
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUBLIC_FILE_CONTENT}?path=${encodeURIComponent(filePath)}`;
    
    const response = await fetch(
      url,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    console.log(`[DEBUG] Public file fetch - Content received length: ${data.content?.length || 0} characters`);
    
    return {
      content: data.content,
      error: null
    };
  } catch (error) {
    console.error('[DEBUG] Error fetching public file content:', error);
    return {
      content: '',
      error: error.message || 'Error loading file'
    };
  }
};

// Function to fetch private directory contents from the server (admin only)
export const fetchDirectoryContents = async (path = '/', refreshAll = false) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // If refreshAll is true, start from the root
    const pathToFetch = refreshAll ? '/' : path;
    
    // Fetch directory contents from the server
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILES_LIST}?path=${encodeURIComponent(pathToFetch)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      // If response is 403, it means the user doesn't have admin access
      if (response.status === 403) {
        throw new Error('Admin access required to view files.');
      } else {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    // Transform the data to match our expected format
    const transformedFiles = data.items.map(item => ({
      name: item.name,
      type: item.type,
      path: item.path,
      children: item.children || []
    }));
    
    return {
      files: transformedFiles,
      error: null
    };
  } catch (error) {
    return {
      files: [],
      error: error.message || 'Failed to load files. Please try again.'
    };
  }
};

// Function to fetch file content
export const fetchFileContent = async (filePath) => {
  console.log(`[DEBUG] fetchFileContent called with path: ${filePath}`);
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Fetch file content from the server
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CONTENT}?path=${encodeURIComponent(filePath)}`;
    
    const response = await fetch(
      url,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    
    if (!response.ok) {
      // If response is 403, it means the user doesn't have admin access
      if (response.status === 403) {
        throw new Error('Admin access required to view file content.');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to load file content: ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    return {
      content: data.content,
      error: null
    };
  } catch (error) {
    return {
      content: '',
      error: error.message || 'Error loading file'
    };
  }
};

// Function to save file content
export const saveFileContent = async (filePath, content) => {

  
  try {
    // Check if filePath is valid
    if (!filePath || filePath.trim() === '') {
      throw new Error('No file selected. Please select a file first.');
    }
    
    // Special handling for .map files to ensure rotation is included
    let contentToSave = content;
    if (filePath?.endsWith('.map') && typeof content === 'string') {
      // For map files, parse the JSON, process it, and re-stringify it
      try {
        const mapData = JSON.parse(content);
        
        // Ensure all cells have rotation property
        if (mapData.layers && Array.isArray(mapData.layers)) {
          mapData.layers.forEach(layer => {
            if (layer.cells && Array.isArray(layer.cells)) {
              layer.cells = layer.cells.map(cell => {
                // If rotation doesn't exist, add it with default value of 0
                if (cell.rotation === undefined) {
                  return { ...cell, rotation: 0 };
                }
                // Ensure rotation is a number
                if (typeof cell.rotation !== 'number') {
                  return { ...cell, rotation: Number(cell.rotation) };
                }
                return cell;
              });
            }
          });
        }
        
        // Use a custom replacer to guarantee rotation values are included
        contentToSave = JSON.stringify(mapData, (key, value) => {
          if (key === 'rotation') {
            return value === undefined ? 0 : Number(value);
          }
          return value;
        }, 2);
        
      } catch (parseError) {
        // If we can't parse, just use the original content
        contentToSave = content;
      }
    }
    
    // Create request body
    const requestBody = JSON.stringify({
      path: filePath,
      content: contentToSave
    });
    
    
    // Make the API request
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_SAVE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: requestBody
    });
    
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to save file: ${response.statusText}`);
    }
    
    console.log(`[DEBUG] saveFileContent - Success!`);
    return { 
      error: null,
      size: responseData.size,
      modified: responseData.modified
    };
  } catch (error) {
    console.error('[DEBUG] Error saving file:', error);
    return { error: error.message || 'Error saving file' };
  }
};

// Simple path join function for browser environment
const joinPaths = (...parts) => {
  // Filter out empty parts and normalize
  const normalized = parts.map(part => {
    if (part === undefined || part === null) return '';
    // Remove leading/trailing slashes
    return part.toString().replace(/^\/+|\/+$/g, '');
  }).filter(Boolean);
  
  // Join with slashes and add leading slash
  return '/' + normalized.join('/');
};

// Function to create a new file or folder
export const createNewItem = async (activeTab, activeFolderPath, newItemName, createType) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Determine if we're creating in the public folder or private folder
    const isPublicFolder = activeTab === 'public';
    
    // Construct the full path for the new item
    let newItemPath;
    if (isPublicFolder) {
      // For public folder, prefix with /public if not already included
      const publicPrefix = activeFolderPath.startsWith('/public') ? '' : '/public';
      // Remove any leading slash from activeFolderPath if it exists and if using publicPrefix
      const folderPath = publicPrefix && activeFolderPath.startsWith('/') 
        ? activeFolderPath.substring(1) 
        : activeFolderPath;
      newItemPath = joinPaths(publicPrefix, folderPath, newItemName.trim());
    } else {
      // For private folder (admin only)
      newItemPath = joinPaths(activeFolderPath, newItemName.trim());
    }
    
    // Create the new file or folder
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_CREATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        path: newItemPath,
        type: createType,
        content: createType === 'file' ? '' : undefined
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to create ${createType}: ${response.statusText}`);
    }
    
    return { 
      success: true, 
      path: newItemPath,
      error: null
    };
  } catch (error) {
    console.error(`Error creating ${createType}:`, error);
    return { 
      success: false, 
      path: null,
      error: error.message || `Failed to create ${createType}` 
    };
  }
};

// Function to rename a file or folder
export const renameItem = async (itemPath, newName) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Rename the file or folder
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_RENAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPath: itemPath,
        newName: newName.trim()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to rename: ${response.statusText}`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error renaming:', error);
    return { success: false, error: error.message || 'Failed to rename' };
  }
};

// Function to delete a file or folder
export const deleteItem = async (itemPath) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Delete the file or folder
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_DELETE}?path=${encodeURIComponent(itemPath)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to delete: ${response.statusText}`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting:', error);
    return { success: false, error: error.message || 'Failed to delete' };
  }
};

// Function to move a file or folder
// Function to get storage usage statistics
export const getStorageStats = async () => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Fetch storage stats from the server
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STORAGE_STATS}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load storage stats: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      quota: data.quota,
      used: data.used,
      available: data.available,
      unlimited: data.unlimited,
      error: null
    };
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return {
      quota: 0,
      used: 0,
      available: 0,
      unlimited: false,
      error: error.message || 'Failed to load storage stats'
    };
  }
};

export const moveItem = async (sourcePath, destinationPath) => {
  try {
    // Get the authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Call the API to move the file
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILE_MOVE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourcePath,
        destinationPath
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to move: ${response.statusText}`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error moving item:', error);
    return { success: false, error: error.message || 'Failed to move item' };
  }
};
