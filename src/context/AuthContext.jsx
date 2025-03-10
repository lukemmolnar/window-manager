import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { useWindowState } from './WindowStateContext';
import { useWorkspace } from './WorkspaceContext';

// Create the authentication context
const AuthContext = createContext();

// Internal context for window state access
const InternalAuthContext = createContext();

// Main Auth Provider that doesn't depend on WindowStateContext
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user profile using the token
  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // If is_admin is not present in the response, default to false
      const userData = {
        ...response.data,
        is_admin: response.data.is_admin || false
      };
      
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('auth_token');
      setError('Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        username,
        password
      });
      
      const { token } = response.data;
      localStorage.setItem('auth_token', token);
      
      await fetchUserProfile(token);
      return { success: true };
    } catch (err) {
      setLoading(false);
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, message };
    }
  };

  // Logout function (without window state clearing)
  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setError(null);
  };

  // Clear any authentication errors
  const clearError = () => {
    setError(null);
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <InternalAuthContext.Provider value={value}>
      {children}
    </InternalAuthContext.Provider>
  );
}

// Wrapper component that connects AuthContext with WindowStateContext
export function AuthProviderWithWindowState({ children }) {
  // Get the window state context
  const { clearWindowStates, reloadWindowStates } = useWindowState();
  
  // Get the workspace context
  const { setWorkspaces, loadWorkspaces } = useWorkspace();
  
  // Initial workspaces state
  const initialWorkspaces = [
    { id: 1, name: 'Main', root: null, activeNodeId: null, terminalStates: {} },
    { id: 2, name: 'Code', root: null, activeNodeId: null, terminalStates: {} },
    { id: 3, name: 'Terminal', root: null, activeNodeId: null, terminalStates: {} },
    { id: 4, name: 'Preview', root: null, activeNodeId: null, terminalStates: {} }
  ];
  
  // Get the internal auth context
  const auth = useContext(InternalAuthContext);
  
  // Create a new logout function that also clears window states and workspaces
  const logoutWithClear = () => {
    auth.logout();
    clearWindowStates();
    
    // Reset workspaces to initial state
    setWorkspaces(initialWorkspaces);
  };
  
  // Create a new login function that also reloads window states and workspaces
  const loginWithReload = async (username, password) => {
    const result = await auth.login(username, password);
    
    if (result.success) {
      // Reload window states and workspaces after successful login
      console.log('Login successful, reloading window states and workspaces');
      await Promise.all([
        reloadWindowStates(),
        loadWorkspaces()
      ]);
    }
    
    return result;
  };
  
  // Create a new context value with the enhanced functions
  const enhancedValue = {
    ...auth,
    logout: logoutWithClear,
    login: loginWithReload
  };
  
  return (
    <AuthContext.Provider value={enhancedValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProviderWithWindowState');
  }
  return context;
}
