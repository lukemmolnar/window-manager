import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API_CONFIG from '../config/api';

const SocketContext = createContext();

// Utility function to get the correct socket URL
const getSocketUrl = () => {
  if (API_CONFIG.BASE_URL.includes('localhost')) {
    return API_CONFIG.BASE_URL.replace('/api', '');
  }
  return API_CONFIG.BASE_URL.replace('/api', '');
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect socket if user is not authenticated
      if (socketRef.current) {
        console.log('User not authenticated, disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection for authenticated users
    const socketUrl = getSocketUrl();
    console.log('SocketContext connecting to:', socketUrl);

    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false,
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    socketRef.current = socket;

    // Handle connection events
    socket.on('connect', () => {
      console.log('SocketContext connected, ID:', socket.id);
      setIsConnected(true);

      // Authenticate the socket connection
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Authenticating socket connection');
        socket.emit('authenticate', token);
        
        // Also emit auth_user for backward compatibility
        socket.emit('auth_user', user);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('SocketContext disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('SocketContext connection error:', err);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('SocketContext reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socket.on('reconnect_error', (err) => {
      console.error('SocketContext reconnection error:', err);
    });

    socket.on('reconnect_failed', () => {
      console.error('SocketContext failed to reconnect');
      setIsConnected(false);
    });

    // Handle forced logout
    socket.on('logout', () => {
      console.log('Received logout event from server');
      // This can be handled by individual components if needed
    });

    // Cleanup on unmount or auth change
    return () => {
      console.log('SocketContext cleanup: disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const value = {
    socket: socketRef.current,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
