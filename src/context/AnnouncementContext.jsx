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
    
    // Extract the origin from the BASE_URL or use window.location.origin
    const getSocketUrl = () => {
      // If BASE_URL is a full URL (starts with http)
      if (API_CONFIG.BASE_URL.startsWith('http')) {
        try {
          const url = new URL(API_CONFIG.BASE_URL);
          console.log('Using Socket.IO URL from BASE_URL origin:', url.origin);
          return url.origin; // Just the protocol, hostname, and port
        } catch (e) {
          console.error('Invalid BASE_URL format:', e);
        }
      }
      // Otherwise use the current origin
      console.log('Using Socket.IO URL from window.location.origin:', window.location.origin);
      return window.location.origin;
    };
    
    // Improved Socket.IO connection with correct URL
    const socketUrl = getSocketUrl();
    console.log('Connecting Socket.IO to:', socketUrl);
    
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      path: '/socket.io' // Default Socket.IO path
    });
    
    socket.on('connect', () => {
      console.log('Socket.IO connected, ID:', socket.id);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      console.error('Connection details:', {
        url: socketUrl,
        transport: socket.io.engine.transport.name
      });
    });
    
    socket.on('announcement_update', (data) => {
      console.log('Received announcement update:', data);
      setAnnouncement(data.announcement);
      
      // Send acknowledgment back to server
      socket.emit('announcement_received', { 
        received: true, 
        announcement: data.announcement,
        timestamp: new Date().toISOString()
      });
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
