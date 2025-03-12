import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import API_CONFIG from '../config/api';

const AnnouncementContext = createContext();

export function AnnouncementProvider({ children }) {
  const [announcement, setAnnouncement] = useState('');
  
  // Fetch initial announcement when component mounts
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ANNOUNCEMENT}`
        );
        setAnnouncement(response.data.announcement);
      } catch (error) {
        console.error('Failed to fetch announcement:', error);
      }
    };
    
    fetchAnnouncement();
    
    // Improved Socket.IO connection
    const socket = io(API_CONFIG.BASE_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
      console.log('Socket.IO connected, ID:', socket.id);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
    });
    
    socket.on('announcement_update', (data) => {
      console.log('Received announcement update:', data);
      setAnnouncement(data.announcement);
    });
    
    return () => {
      console.log('Disconnecting Socket.IO');
      socket.off('announcement_update');
      socket.disconnect();
    };
  }, []);
  
  // Function to set a new announcement (admin only)
  const updateAnnouncement = async (text) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ANNOUNCEMENT}`,
        { announcement: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      console.error('Failed to update announcement:', error);
      return false;
    }
  };

  return (
    <AnnouncementContext.Provider value={{ announcement, updateAnnouncement }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  return useContext(AnnouncementContext);
}
