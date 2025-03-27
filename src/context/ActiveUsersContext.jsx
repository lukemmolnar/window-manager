import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

// Create the active users context
const ActiveUsersContext = createContext();

// Events that count as user activity
const ACTIVITY_EVENTS = [
  'click', 'keydown', 'mousemove', 'wheel', 'touchstart', 'touchmove'
];

export function ActiveUsersProvider({ children }) {
  const [activeUserCount, setActiveUserCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch of active user count
    const fetchActiveUsers = async () => {
      try {
        const response = await axios.get(`${API_CONFIG.BASE_URL}/active-users`);
        setActiveUserCount(response.data.count);
      } catch (error) {
        console.error('Failed to fetch active users:', error);
      }
    };
    
    fetchActiveUsers();
    
    // Extract the origin from the BASE_URL or use window.location.origin
    const getSocketUrl = () => {
      // If BASE_URL is a full URL (starts with http)
      if (API_CONFIG.BASE_URL.startsWith('http')) {
        try {
          const url = new URL(API_CONFIG.BASE_URL);
          console.log('ActiveUsers using Socket.IO URL from BASE_URL origin:', url.origin);
          return url.origin; // Just the protocol, hostname, and port
        } catch (e) {
          console.error('ActiveUsers invalid BASE_URL format:', e);
        }
      }
      // Otherwise use the current origin
      console.log('ActiveUsers using Socket.IO URL from window.location.origin:', window.location.origin);
      return window.location.origin;
    };
    
    // Improved Socket.IO connection with correct URL
    const socketUrl = getSocketUrl();
    console.log('ActiveUsers connecting Socket.IO to:', socketUrl);
    
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      path: '/socket.io' // Default Socket.IO path
    });
    
    socket.on('connect', () => {
      console.log('ActiveUsers Socket.IO connected, ID:', socket.id);
    });
    
    socket.on('connect_error', (err) => {
      console.error('ActiveUsers Socket.IO connection error:', err);
      console.error('Connection details:', {
        url: socketUrl,
        transport: socket.io.engine?.transport?.name
      });
    });
    
    // Listen for active user count updates
    socket.on('active_users_update', (data) => {
      console.log('Received active users update:', data);
      setActiveUserCount(data.count);
    });
    
    // Track user activity
    let activityTimeout;
    
    const reportActivity = () => {
      // Clear any pending timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      // Set a new timeout to report activity
      activityTimeout = setTimeout(() => {
        // Make API call to report activity
        const token = localStorage.getItem('auth_token');
        if (token) {
          axios.post(`${API_CONFIG.BASE_URL}/activity`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(error => {
            console.error('Failed to report activity:', error);
          });
        }
      }, 30000); // Wait 30 seconds before reporting activity to avoid flooding
    };
    
    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach(eventType => {
      window.addEventListener(eventType, reportActivity, { passive: true });
    });
    
    // Initial activity report
    reportActivity();
    
    // Cleanup
    return () => {
      socket.disconnect();
      ACTIVITY_EVENTS.forEach(eventType => {
        window.removeEventListener(eventType, reportActivity);
      });
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [isAuthenticated, user]);
  
  return (
    <ActiveUsersContext.Provider value={{ activeUserCount }}>
      {children}
    </ActiveUsersContext.Provider>
  );
}

export function useActiveUsers() {
  return useContext(ActiveUsersContext);
}
