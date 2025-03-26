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
    
    // Set up Socket.IO connection
    const socket = io(window.location.origin);
    
    // Listen for active user count updates
    socket.on('active_users_update', (data) => {
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
