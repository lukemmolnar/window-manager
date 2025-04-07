import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Trash } from 'lucide-react'; // Import Trash icon

const AdminWindow = ({ isActive }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    is_admin: false,
    has_file_access: false
  });
  const [createFormData, setCreateFormData] = useState({
    username: '',
    password: '',
    is_admin: false,
    has_file_access: false
  });
  
  // Chat channels state
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'channels'
  const [channels, setChannels] = useState([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [showCreateChannelForm, setShowCreateChannelForm] = useState(false);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []); // Empty dependency array means this runs once on mount
  
  // Load channels when tab changes to channels
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels();
    }
  }, [activeTab]);
  
  // Reset form visibility when switching tabs
  useEffect(() => {
    // Hide forms when switching tabs
    setShowCreateForm(false);
    setShowCreateChannelForm(false);
  }, [activeTab]);

  // Fetch all users from the API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start editing a user
  const handleEdit = (user) => {
    setEditingUser(user.id);
    setFormData({
      username: user.username,
      password: '', // Don't populate password for security
      is_admin: user.is_admin === 1 || user.is_admin === true,
      has_file_access: user.has_file_access === 1 || user.has_file_access === true,
      storage_quota: user.storage_quota || 52428800 // Default to 50MB (52428800 bytes)
    });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      is_admin: false,
      has_file_access: false
    });
  };

  // Handle form input changes for editing
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form input changes for creating
  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save user changes
  const handleSave = async (userId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Build user data object
      const userData = {
        username: formData.username,
        is_admin: formData.is_admin,
        has_file_access: formData.has_file_access,
        storage_quota: formData.storage_quota
      };
      
      // Only include password in the request if it was changed
      if (formData.password) {
        userData.password = formData.password;
      }
      
      await axios.put(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${userId}`,
        userData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the user list
      await fetchUsers();
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        is_admin: false,
        has_file_access: false
      });
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const handleCreateUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Validate form data - only username and password are required
      if (!createFormData.username || !createFormData.password) {
        setError('Username and password are required.');
        setLoading(false);
        return;
      }
      
      // Use the register endpoint instead of users endpoint
      await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`,
        {
          username: createFormData.username,
          password: createFormData.password
        }
      );
      
      // If admin status or file access permissions need to be set, we need to do that in a separate request
      if (createFormData.is_admin || createFormData.has_file_access) {
        try {
          // Get the newly created user
          const usersResponse = await axios.get(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const newUser = usersResponse.data.find(u => u.username === createFormData.username);
          
          if (newUser) {
            // Update the user with admin status and file access permissions
            await axios.put(
              `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${newUser.id}`,
              { 
                is_admin: createFormData.is_admin,
                has_file_access: createFormData.has_file_access,
                storage_quota: createFormData.storage_quota || 52428800 // Default to 50MB
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch (adminErr) {
          console.error('Failed to set admin status:', adminErr);
          // Don't fail the whole operation if just the admin part fails
        }
      }
      
      // Refresh the user list
      await fetchUsers();
      
      // Reset form and hide it
      setCreateFormData({
        username: '',
        password: '',
        is_admin: false,
        has_file_access: false
      });
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle create form visibility
  const toggleCreateForm = () => {
    setShowCreateForm(!showCreateForm);
    if (!showCreateForm) {
      // Reset form data when opening
      setCreateFormData({
        username: '',
        password: '',
        is_admin: false,
        has_file_access: false
      });
    }
  };
  
  // Toggle create channel form visibility
  const toggleCreateChannelForm = () => {
    setShowCreateChannelForm(!showCreateChannelForm);
    if (!showCreateChannelForm) {
      // Reset channel name when opening the form
      setNewChannelName('');
    }
  };

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <div className="bg-stone-900 text-white p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && users.length === 0) {
    return (
      <div className="bg-stone-900 text-white p-4 h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Fetch chat channels
  const fetchChannels = async () => {
    try {
      setChannelLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_ROOMS}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChannels(response.data);
      setChannelError(null);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      setChannelError('Failed to load chat channels. Please try again.');
    } finally {
      setChannelLoading(false);
    }
  };

  // Create a new chat channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      setChannelLoading(true);
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT_ROOMS}`,
        { name: newChannelName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the channel list
      await fetchChannels();
      
      // Reset form and hide it
      setNewChannelName('');
      setShowCreateChannelForm(false);
      setChannelError(null);
    } catch (err) {
      console.error('Failed to create channel:', err);
      setChannelError('Failed to create channel. Please try again.');
    } finally {
      setChannelLoading(false);
    }
  };

  // Delete a chat channel
  const handleDeleteChannel = async (channelId) => {
    try {
      setChannelLoading(true);
      const token = localStorage.getItem('auth_token');
      const endpoint = API_CONFIG.ENDPOINTS.CHAT_DELETE_ROOM.replace(':id', channelId);
      await axios.delete(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the channel list
      await fetchChannels();
      setChannelError(null);
    } catch (err) {
      console.error('Failed to delete channel:', err);
      setChannelError('Failed to delete channel. Please try again.');
    } finally {
      setChannelLoading(false);
    }
  };
  
  // Delete a user
  const handleDeleteUser = async (userId) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Use the DELETE endpoint
      await axios.delete(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the user list
      await fetchUsers();
      setError(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.message || 'Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-900 text-white h-full overflow-auto flex flex-col">
      {/* Header Bar */}
      <div className="p-2 border-b border-stone-700 font-mono text-sm flex items-center justify-between">
        <h2 className="text-teal-400 font-medium">ADMIN PANEL</h2>
        
        {/* Tab Navigation */}
        <div className="flex">
          <button
            className={`px-3 py-1 rounded-t text-xs flex items-center ${
              activeTab === 'users'
                ? 'bg-stone-800 text-teal-300'
                : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`px-3 py-1 rounded-t text-xs flex items-center ml-1 ${
              activeTab === 'channels'
                ? 'bg-stone-800 text-teal-300'
                : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('channels')}
          >
            Chat Channels
          </button>
        </div>
      </div>
      
      {/* Create User/Channel Button - Only shown when respective tab is active */}
      {activeTab === 'users' && (
        <div className="p-2 flex justify-end">
          <button
            onClick={toggleCreateForm}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-sm"
          >
            {showCreateForm ? 'Cancel' : 'Create User'}
          </button>
        </div>
      )}
      
      {activeTab === 'channels' && (
        <div className="p-2 border-b border-stone-700 flex justify-end">
          <button
            onClick={toggleCreateChannelForm}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-sm"
          >
            {showCreateChannelForm ? 'Cancel' : 'Create Channel'}
          </button>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="p-4 flex-1 overflow-auto">
        {activeTab === 'users' && error && <p className="text-red-500 mb-4">{error}</p>}
        {activeTab === 'channels' && channelError && <p className="text-red-500 mb-4">{channelError}</p>}
        
        {/* Show users tab content */}
        {activeTab === 'users' && (
          <>
            {/* Create User Form */}
            {showCreateForm && (
              <div className="mb-6 p-4 bg-stone-800 rounded">
                <h3 className="text-lg mb-3 text-teal-400">Create New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Username: <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="username"
                      value={createFormData.username}
                      onChange={handleCreateChange}
                      className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Password: <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={createFormData.password}
                      onChange={handleCreateChange}
                      className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="flex items-center text-sm text-gray-400">
                      <input
                        type="checkbox"
                        name="is_admin"
                        checked={createFormData.is_admin}
                        onChange={handleCreateChange}
                        className="form-checkbox h-5 w-5 text-teal-500 mr-2"
                      />
                      Admin User
                    </label>
                    <label className="flex items-center text-sm text-gray-400">
                      <input
                        type="checkbox"
                        name="has_file_access"
                        checked={createFormData.has_file_access}
                        onChange={handleCreateChange}
                        className="form-checkbox h-5 w-5 text-teal-500 mr-2"
                      />
                      Private File Access
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Storage Quota:</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        name="storage_quota"
                        value={Math.round((createFormData.storage_quota || 52428800) / 1048576)}
                        onChange={(e) => {
                          const mbValue = parseInt(e.target.value) || 0;
                          handleCreateChange({
                            target: {
                              name: 'storage_quota',
                              value: mbValue * 1048576, // Convert MB to bytes
                              type: 'number'
                            }
                          });
                        }}
                        className="bg-stone-700 text-white px-2 py-1 rounded w-20 mr-2"
                        min="0"
                        step="1"
                        disabled={createFormData.is_admin}
                      />
                      <span className="text-sm text-gray-400">MB {createFormData.is_admin && "(Unlimited for admins)"}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleCreateUser}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded text-sm"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Users Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Admin</th>
                  <th className="text-left p-2">File Access</th>
                  <th className="text-left p-2">Storage Quota</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(userItem => (
                  <tr key={userItem.id} className="border-b border-stone-800 hover:bg-stone-800">
                    <td className="p-2">
                      {editingUser === userItem.id ? (
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                        />
                      ) : (
                        userItem.username
                      )}
                    </td>
                    <td className="p-2">
                      {editingUser === userItem.id ? (
                        <input
                          type="checkbox"
                          name="is_admin"
                          checked={formData.is_admin}
                          onChange={handleChange}
                          className="form-checkbox h-5 w-5 text-teal-500"
                        />
                      ) : (
                        userItem.is_admin === 1 || userItem.is_admin === true ? 'Yes' : 'No'
                      )}
                    </td>
                    <td className="p-2">
                      {editingUser === userItem.id ? (
                        <input
                          type="checkbox"
                          name="has_file_access"
                          checked={formData.has_file_access}
                          onChange={handleChange}
                          className="form-checkbox h-5 w-5 text-teal-500"
                        />
                      ) : (
                        userItem.has_file_access === 1 || userItem.has_file_access === true ? 'Yes' : 'No'
                      )}
                    </td>
                    <td className="p-2">
                      {editingUser === userItem.id ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            name="storage_quota"
                            value={Math.round((formData.storage_quota || 52428800) / 1048576)}
                            onChange={(e) => {
                              const mbValue = parseInt(e.target.value) || 0;
                              handleChange({
                                target: {
                                  name: 'storage_quota',
                                  value: mbValue * 1048576, // Convert MB to bytes
                                  type: 'number'
                                }
                              });
                            }}
                            className="bg-stone-700 text-white px-2 py-1 rounded w-20 mr-2"
                            min="0"
                            step="1"
                            disabled={formData.is_admin}
                          />
                          <span className="text-sm text-gray-400">MB {formData.is_admin && "(Unlimited for admins)"}</span>
                        </div>
                      ) : (
                        userItem.is_admin ? 'Unlimited' : 
                        `${Math.round((userItem.storage_quota || 52428800) / 1048576)} MB`
                      )}
                    </td>
                    <td className="p-2">
                      {editingUser === userItem.id ? (
                        <div className="flex flex-col space-y-2">
                          <div className="mb-2">
                            <label className="block text-sm text-gray-400">New Password:</label>
                            <input
                              type="password"
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder="Leave blank to keep current"
                              className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSave(userItem.id)}
                              className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-3 py-1 bg-stone-600 hover:bg-stone-500 rounded text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleCancel();
                                handleDeleteUser(userItem.id);
                              }}
                              className="px-3 py-1 bg-stone-600 hover:bg-stone-500 rounded text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(userItem)}
                            className="px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="px-3 py-1 focus:outline-none text-sm"
                            disabled={loading}
                            title="Delete user"
                          >
                            <Trash size={16} className="text-stone-400 hover:text-stone-300" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {loading && users.length > 0 && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
              </div>
            )}
          </>
        )}
        
        {/* Show channels tab content */}
        {activeTab === 'channels' && (
          <>
            {/* Create Channel Form - Only shown when showCreateChannelForm is true */}
            {showCreateChannelForm && (
              <div className="mb-6 p-4 bg-stone-800 rounded">
                <h3 className="text-lg mb-3 text-teal-400">Create New Channel</h3>
                <form onSubmit={handleCreateChannel} className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Channel Name:</label>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                      placeholder="Enter channel name"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-teal-600 hover:bg-teal-500 rounded text-sm"
                    disabled={channelLoading}
                  >
                    {channelLoading ? 'Creating...' : 'Create Channel'}
                  </button>
                </form>
              </div>
            )}
            
            {/* Channels Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left p-2">Channel Name</th>
                  <th className="text-left p-2">Created By</th>
                  <th className="text-left p-2">Created At</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(channel => (
                  <tr key={channel.id} className="border-b border-stone-800 hover:bg-stone-800">
                    <td className="p-2">{channel.name}</td>
                    <td className="p-2">{channel.created_by || '-'}</td>
                    <td className="p-2">
                      {new Date(channel.created_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="focus:outline-none"
                        title="Delete channel"
                        disabled={channelLoading}
                      >
                        <Trash size={16} className="text-stone-400 hover:text-stone-300" />
                      </button>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && !channelLoading && (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-stone-500">
                      No channels found. Create one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {channelLoading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminWindow;
