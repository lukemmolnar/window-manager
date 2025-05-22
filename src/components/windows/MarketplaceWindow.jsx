import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Check, Upload, Info, AlertTriangle, RotateCw } from 'lucide-react';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Marketplace window component for browsing and selecting tilesets
 */
const MarketplaceWindow = ({ windowId }) => {
  const [tilesets, setTilesets] = useState([]);
  const [selectedTilesets, setSelectedTilesets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch all tilesets and user-selected tilesets with enhanced debugging
  const fetchTilesets = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    // Debug: Log API configuration
    const authToken = localStorage.getItem('auth_token');
    const debugData = {
      baseUrl: API_CONFIG.BASE_URL,
      tilesetsEndpoint: `${API_CONFIG.BASE_URL}/tilesets`,
      auth: authToken ? 'Token exists' : 'No token',
      tokenLength: authToken ? authToken.length : 0,
      userInfo: user ? `User: ${user.username}, Admin: ${user.is_admin}` : 'No user'
    };
    
    console.log('Marketplace API Config:', debugData);
    setDebugInfo(debugData);
    
    try {
      console.log('Attempting to fetch tilesets from:', `${API_CONFIG.BASE_URL}/tilesets`);
      
      // First try the main endpoint, then fall back to the simple endpoint if it fails
      try {
        console.log('Trying main tilesets endpoint');
        // Fetch all available tilesets
        const [tilesetsResponse, selectedResponse] = await Promise.all([
          axios.get(`${API_CONFIG.BASE_URL}/tilesets`),
          axios.get(`${API_CONFIG.BASE_URL}/tilesets/user/selected`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          })
        ]);

        console.log('Tilesets response:', tilesetsResponse);
        console.log('Selected tilesets response:', selectedResponse);

        setTilesets(tilesetsResponse.data || []);
        setSelectedTilesets(selectedResponse.data || []);
      } catch (mainError) {
        console.error('Main endpoint failed, trying fallback:', mainError);
        
        // Try the debug/simple endpoint as fallback
        console.log('Trying simple fallback endpoint');
        const fallbackResponse = await axios.get(`${API_CONFIG.BASE_URL}/tilesets/simple`);
        console.log('Fallback response:', fallbackResponse);
        
        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          setTilesets(fallbackResponse.data);
          // We don't have selected tilesets in fallback mode
          setSelectedTilesets([]);
          
          // Still set a warning about using fallback mode
          setDebugInfo(prevDebug => ({ 
            ...prevDebug, 
            warning: 'Using fallback tileset data. Some features may be limited.',
            fallbackMode: true
          }));
        } else {
          // If even the fallback fails, re-throw the original error
          throw mainError;
        }
      }
    } catch (err) {
      console.error('Error fetching tilesets (all attempts failed):', err);
      
      // Enhanced error reporting
      const errorDetails = {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers ? 'Headers present' : 'No headers'
        }
      };
      
      console.error('Error details:', errorDetails);
      setDebugInfo(prevDebug => ({ ...prevDebug, error: errorDetails }));
      
      // Set a more informative error message
      setError(`Failed to load tilesets: ${err.message}. ${err.response ? `Server responded with ${err.response.status} ${err.response.statusText}` : 'Server unreachable'}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load tilesets on component mount
  useEffect(() => {
    fetchTilesets();
  }, [fetchTilesets]);

  // Toggle tileset selection
  const toggleTilesetSelection = async (tilesetId) => {
    try {
      const isSelected = selectedTilesets.some(t => t.id === tilesetId);
      
      if (isSelected) {
        // Deselect the tileset
        await axios.delete(`${API_CONFIG.BASE_URL}/tilesets/user/select/${tilesetId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        setSelectedTilesets(prev => prev.filter(t => t.id !== tilesetId));
      } else {
        // Select the tileset
        await axios.post(`${API_CONFIG.BASE_URL}/tilesets/user/select/${tilesetId}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const tilesetToAdd = tilesets.find(t => t.id === tilesetId);
        if (tilesetToAdd) {
          setSelectedTilesets(prev => [...prev, tilesetToAdd]);
        }
      }
    } catch (err) {
      console.error('Error toggling tileset selection:', err);
      setError('Failed to update tileset selection. Please try again.');
    }
  };

  // Check if a tileset is selected
  const isTilesetSelected = (tilesetId) => {
    return selectedTilesets.some(t => t.id === tilesetId);
  };

  // Render the tileset preview image
  const renderTilesetPreview = (tileset) => {
    return (
      <div className="w-full h-32 bg-stone-900 overflow-hidden relative">
        <img 
          src={`${API_CONFIG.BASE_URL}${tileset.image_path}`} 
          alt={`Preview of ${tileset.name}`}
          className="object-cover w-full h-full"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/tileset-placeholder.png';
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-stone-800 text-stone-200">
      {/* Header */}
      <div className="p-2 border-b bg-stone-900 border-stone-700 flex justify-between items-center">
        <div>
          <h2 className="mr-2 text-teal-400">Tileset Marketplace</h2>
        </div>
        
          <button 
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-teal-300 rounded text-xs flex items-center gap-1"
              onClick={fetchTilesets}
              disabled={loading}
              title="Refresh tilesets"
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
          </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-stone-400">Loading tilesets...</div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-300 p-4 rounded">
            <div className="flex items-center mb-2">
              <AlertTriangle size={20} className="mr-2" />
              <span className="font-semibold">API Connection Error</span>
            </div>
            <p className="mb-2">{error}</p>
            {debugInfo && (
              <div className="text-xs bg-red-900/50 p-2 rounded mt-2">
                <p className="font-semibold mb-1">Debugging Information:</p>
                <p>API URL: {debugInfo.tilesetsEndpoint}</p>
                <p>Auth Status: {debugInfo.auth}</p>
                <p>Token Length: {debugInfo.tokenLength} characters</p>
                <p>Admin Status: {user?.is_admin ? 'Admin' : 'Not admin'}</p>
                {debugInfo.error && (
                  <>
                    <p className="mt-1 font-semibold">Error Details:</p>
                    <p>Status: {debugInfo.error.status || 'None'}</p>
                    <p>Status Text: {debugInfo.error.statusText || 'None'}</p>
                    <p>URL: {debugInfo.error.config?.url || 'Unknown'}</p>
                  </>
                )}
                <div className="mt-3 flex space-x-2">
                  <button 
                    className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs"
                    onClick={fetchTilesets}
                  >
                    Retry Connection
                  </button>
                  
                  <a 
                    href={`${API_CONFIG.BASE_URL}/tilesets/debug/check-paths`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-blue-800 hover:bg-blue-700 rounded text-xs"
                  >
                    Check Server Paths
                  </a>
                </div>
                
                <div className="mt-2 text-amber-300 bg-amber-900/30 p-2 rounded">
                  <p className="font-semibold">Administrator Tip:</p>
                  <p>This error often occurs when the tilesets directory doesn't exist on the server.</p>
                  <p>Make sure to create the directory at: <code>windowmanager-files/tilesets</code></p>
                </div>
              </div>
            )}
          </div>
      ) : debugInfo?.warning ? (
        <div className="bg-amber-900/30 text-amber-300 p-4 rounded mb-4">
          <div className="flex items-center mb-2">
            <Info size={20} className="mr-2" />
            <span className="font-semibold">Using Fallback Data</span>
          </div>
          <p>{debugInfo.warning}</p>
          <button 
            className="mt-2 px-2 py-1 bg-amber-800 hover:bg-amber-700 rounded text-xs"
            onClick={fetchTilesets}
          >
            Try Normal Mode Again
          </button>
        </div>
      ) : tilesets.length === 0 ? (
          <div className="text-center py-10">
            <Info size={48} className="mx-auto text-stone-500 mb-4" />
            <p className="text-stone-400">No tilesets available yet.</p>
            {user?.is_admin && (
              <button
                className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded text-sm"
                onClick={() => setShowUploadForm(true)}
              >
                Upload a New Tileset
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tilesets.map(tileset => (
              <div 
                key={tileset.id} 
                className={`rounded-lg overflow-hidden border ${
                  isTilesetSelected(tileset.id)
                    ? 'border-teal-500'
                    : 'border-stone-700'
                }`}
              >
                {renderTilesetPreview(tileset)}
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-teal-400">{tileset.name}</h3>
                      <p className="text-xs text-stone-400">By {tileset.author}</p>
                    </div>
                    {isTilesetSelected(tileset.id) && (
                      <span className="bg-teal-800 text-teal-200 text-xs px-2 py-1 rounded-full flex items-center">
                        <Check size={12} className="mr-1" />
                        Selected
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mt-2 text-stone-300">
                    {tileset.description || 'No description provided.'}
                  </p>
                  
                  {/* Display section summary */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tileset.sections && tileset.sections.map(section => (
                      <span 
                        key={`${tileset.id}-${section.id}`}
                        className="text-xs px-2 py-1 rounded bg-stone-700 text-stone-300"
                      >
                        {section.section_name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <button
                      className={`px-3 py-1 rounded text-sm ${
                        isTilesetSelected(tileset.id)
                          ? 'bg-red-900 hover:bg-red-800 text-stone-200'
                          : 'bg-teal-700 hover:bg-teal-600 text-stone-200'
                      }`}
                      onClick={() => toggleTilesetSelection(tileset.id)}
                    >
                      {isTilesetSelected(tileset.id) ? 'Remove from Editor' : 'Add to Editor'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin upload section, conditionally shown */}
      {user?.is_admin && (
        <div className="border-t border-stone-700 p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg text-teal-400 font-bold">Admin: Tileset Manager</h3>
            <button
              className="px-3 py-1 bg-teal-700 hover:bg-teal-600 rounded text-sm flex items-center"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              <Upload size={16} className="mr-1" />
              {showUploadForm ? 'Hide Form' : 'Upload New Tileset'}
            </button>
          </div>

          {showUploadForm && <TilesetUploadForm onUploadComplete={fetchTilesets} />}
        </div>
      )}
    </div>
  );
};

/**
 * Component for uploading a new tileset (admin only)
 */
const TilesetUploadForm = ({ onUploadComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    author: '',
    columns: '16'
  });
  
  const [tilesetImage, setTilesetImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sections, setSections] = useState([
    { category: 'floor', section_name: 'Floor Tiles', start_index: 0, count: 16 }
  ]);
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadDebugInfo, setUploadDebugInfo] = useState(null);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Selected file:', file.name, file.type, `${file.size} bytes`);
    setTilesetImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle section changes
  const handleSectionChange = (index, field, value) => {
    const newSections = [...sections];
    
    // Convert numerical fields to integers
    if (field === 'start_index' || field === 'count') {
      value = parseInt(value, 10) || 0;
    }
    
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };
  
  // Add a new section
  const addSection = () => {
    setSections([...sections, { 
      category: 'floor', 
      section_name: 'New Section', 
      start_index: 0, 
      count: 8 
    }]);
  };
  
  // Remove a section
  const removeSection = (index) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
  };
  
  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadDebugInfo(null);
    
    if (!tilesetImage) {
      setUploadError('Please select a tileset image.');
      setUploading(false);
      return;
    }
    
    if (!formData.name) {
      setUploadError('Please provide a name for the tileset.');
      setUploading(false);
      return;
    }
    
    if (sections.length === 0) {
      setUploadError('Please define at least one section.');
      setUploading(false);
      return;
    }
    
    try {
      const formPayload = new FormData();
      formPayload.append('tilesetImage', tilesetImage);
      formPayload.append('name', formData.name);
      formPayload.append('description', formData.description);
      formPayload.append('author', formData.author);
      formPayload.append('columns', formData.columns);
      formPayload.append('sections', JSON.stringify(sections));
      
      // Log what we're uploading
      console.log('Uploading tileset:', {
        name: formData.name,
        description: formData.description,
        author: formData.author,
        columns: formData.columns,
        sections: sections,
        imageInfo: {
          name: tilesetImage.name,
          type: tilesetImage.type,
          size: tilesetImage.size
        }
      });
      
      const authToken = localStorage.getItem('auth_token');
      console.log('Using auth token:', authToken ? `${authToken.substring(0, 10)}...` : 'None');
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/tilesets`,
        formPayload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      console.log('Upload response:', response);
      
      setUploadSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        author: '',
        columns: '16'
      });
      setTilesetImage(null);
      setImagePreview('');
      setSections([{ category: 'floor', section_name: 'Floor Tiles', start_index: 0, count: 16 }]);
      
      // Notify parent to refresh
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      console.error('Error uploading tileset:', err);
      
      const errorDetails = {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers ? 'Headers present' : 'No headers'
        }
      };
      
      console.error('Upload error details:', errorDetails);
      setUploadDebugInfo(errorDetails);
      
      setUploadError(err.response?.data?.message || 'Failed to upload tileset. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="mt-4 bg-stone-900 rounded-lg p-4">
      {uploadSuccess && (
        <div className="mb-4 bg-green-900/30 text-green-300 p-3 rounded flex items-center">
          <Check size={20} className="mr-2" />
          <span>Tileset uploaded successfully!</span>
        </div>
      )}
      
      {uploadError && (
        <div className="mb-4 bg-red-900/30 text-red-300 p-3 rounded">
          <div className="flex items-center mb-1">
            <AlertTriangle size={20} className="mr-2" />
            <span>{uploadError}</span>
          </div>
          
          {uploadDebugInfo && (
            <div className="mt-2 text-xs bg-red-900/50 p-2 rounded">
              <p>Error: {uploadDebugInfo.message}</p>
              <p>Status: {uploadDebugInfo.status || 'None'}</p>
              <p>Response: {uploadDebugInfo.responseData?.message || 'No message'}</p>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tileset metadata */}
          <div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Tileset Name*
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-stone-200"
                required
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Author
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-stone-200"
                placeholder="(Optional) Override author name"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-stone-200 min-h-[80px]"
                placeholder="Describe this tileset..."
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Columns in Sprite Sheet
              </label>
              <input
                type="number"
                name="columns"
                value={formData.columns}
                onChange={handleInputChange}
                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-stone-200"
                min="1"
                max="32"
              />
              <p className="text-xs text-stone-500 mt-1">
                Number of columns in the sprite sheet (default: 16)
              </p>
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Tileset Image*
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageChange}
                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-stone-200"
                required
              />
              <p className="text-xs text-stone-500 mt-1">
                Upload a PNG or JPG image (max 10MB)
              </p>
            </div>
          </div>
          
          {/* Image preview and sections */}
          <div>
            {imagePreview ? (
              <div className="mb-3">
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Preview
                </label>
                <div className="border border-stone-700 rounded overflow-hidden h-48">
                  <img
                    src={imagePreview}
                    alt="Tileset Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-3 border border-stone-700 rounded h-48 flex items-center justify-center bg-stone-800 text-stone-500">
                No image selected
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Tileset Sections*
              </label>
              <p className="text-xs text-stone-500 mb-2">
                Define sections for different types of tiles (floors, walls, etc.)
              </p>
              
              {sections.map((section, index) => (
                <div key={index} className="mb-2 p-3 bg-stone-800 rounded border border-stone-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-stone-300">Section {index + 1}</span>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Category
                      </label>
                      <select
                        value={section.category}
                        onChange={(e) => handleSectionChange(index, 'category', e.target.value)}
                        className="w-full bg-stone-700 border border-stone-600 rounded p-1 text-stone-200 text-sm"
                      >
                        <option value="floor">Floor</option>
                        <option value="wall">Wall</option>
                        <option value="shadow">Shadow</option>
                        <option value="door">Door</option>
                        <option value="object">Object</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Section Name
                      </label>
                      <input
                        type="text"
                        value={section.section_name}
                        onChange={(e) => handleSectionChange(index, 'section_name', e.target.value)}
                        className="w-full bg-stone-700 border border-stone-600 rounded p-1 text-stone-200 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Start Index
                      </label>
                      <input
                        type="number"
                        value={section.start_index}
                        onChange={(e) => handleSectionChange(index, 'start_index', e.target.value)}
                        className="w-full bg-stone-700 border border-stone-600 rounded p-1 text-stone-200 text-sm"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Tile Count
                      </label>
                      <input
                        type="number"
                        value={section.count}
                        onChange={(e) => handleSectionChange(index, 'count', e.target.value)}
                        className="w-full bg-stone-700 border border-stone-600 rounded p-1 text-stone-200 text-sm"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addSection}
                className="mt-2 px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-sm"
              >
                + Add Section
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className={`px-4 py-2 rounded text-sm flex items-center ${
              uploading
                ? 'bg-stone-600 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-600'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Tileset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MarketplaceWindow;
