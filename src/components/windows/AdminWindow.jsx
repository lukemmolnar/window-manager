import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const AdminWindow = ({ isActive }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false
  });
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false
  });

  // Fetch users when component mounts or becomes active
  useEffect(() => {
    if (isActive) {
      fetchUsers();
    }
  }, [isActive]);

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
      email: user.email || '', // Include email for editing
      password: '', // Don't populate password for security
      is_admin: user.is_admin === 1 || user.is_admin === true
    });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      is_admin: false
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
      
      // Include all editable fields
      const userData = {
        username: formData.username,
        email: formData.email,
        is_admin: formData.is_admin
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
        email: '',
        password: '',
        is_admin: false
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
      
      // Validate form data - email is now optional
      if (!createFormData.username || !createFormData.password) {
        setError('Username and password are required.');
        setLoading(false);
        return;
      }
      
      await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}`,
        createFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the user list
      await fetchUsers();
      
      // Reset form and hide it
      setCreateFormData({
        username: '',
        email: '',
        password: '',
        is_admin: false
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
        email: '',
        password: '',
        is_admin: false
      });
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

  return (
    <div className="bg-stone-900 text-white p-4 h-full overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-teal-400">Admin Panel</h2>
        <button
          onClick={toggleCreateForm}
          className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-sm"
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </button>
      </div>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
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
              <label className="block text-sm text-gray-400 mb-1">Email:</label>
              <input
                type="email"
                name="email"
                value={createFormData.email}
                onChange={handleCreateChange}
                className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                placeholder="Enter email (optional)"
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
            <div className="flex items-center">
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
            <th className="text-left p-2">Email</th>
            <th className="text-left p-2">Admin</th>
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
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-stone-700 text-white px-2 py-1 rounded w-full"
                    placeholder="Email (optional)"
                  />
                ) : (
                  userItem.email || '-'
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
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(userItem)}
                    className="px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                    disabled={loading}
                  >
                    Edit
                  </button>
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
    </div>
  );
};

export default AdminWindow;
