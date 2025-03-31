import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import API_CONFIG from '../config/api';

const PartyContext = createContext();

export const useParty = () => useContext(PartyContext);

export const PartyProvider = ({ children }) => {
  const { user, socket } = useAuth();
  const [currentParty, setCurrentParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current party on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchCurrentParty();
      fetchParties();
    } else {
      setCurrentParty(null);
      setPartyMembers([]);
    }
  }, [user]);

  // Listen for socket events
  useEffect(() => {
    if (socket) {
      // Listen for party member joins
      socket.on('party_member_joined', (data) => {
        if (currentParty && data.partyId === currentParty.id) {
          fetchPartyMembers(currentParty.id);
        }
      });

      // Listen for party member leaves
      socket.on('party_member_left', (data) => {
        if (currentParty && data.partyId === currentParty.id) {
          fetchPartyMembers(currentParty.id);
        }
      });

      // Listen for new parties being created
      socket.on('party_created', (party) => {
        setParties(prev => [party, ...prev]);
      });

      return () => {
        socket.off('party_member_joined');
        socket.off('party_member_left');
        socket.off('party_created');
      };
    }
  }, [socket, currentParty]);

  const fetchCurrentParty = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTIES_CURRENT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && !response.data.message) {
        setCurrentParty(response.data);
        setPartyMembers(response.data.members || []);
        
        // Join the party's socket room
        if (socket) {
          socket.emit('join_party', response.data.id);
        }
      } else {
        setCurrentParty(null);
        setPartyMembers([]);
      }
    } catch (err) {
      console.error('Error fetching current party:', err);
      setError('Failed to fetch current party');
      setCurrentParty(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTIES}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParties(response.data);
    } catch (err) {
      console.error('Error fetching parties:', err);
      setError('Failed to fetch parties');
    }
  };

  const fetchPartyMembers = async (partyId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTIES}/${partyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (currentParty && currentParty.id === partyId) {
        setPartyMembers(response.data.members || []);
      }
    } catch (err) {
      console.error('Error fetching party members:', err);
    }
  };

  const joinParty = async (partyId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTY_JOIN.replace(':id', partyId)}`;
      const response = await axios.post(url, {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCurrentParty();
      return response.data;
    } catch (err) {
      console.error('Error joining party:', err);
      setError('Failed to join party');
      throw err;
    }
  };

  const leaveParty = async () => {
    if (!currentParty) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTY_LEAVE.replace(':id', currentParty.id)}`;
      await axios.post(url, {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Leave the party's socket room
      if (socket) {
        socket.emit('leave_party', currentParty.id);
      }
      
      setCurrentParty(null);
      setPartyMembers([]);
    } catch (err) {
      console.error('Error leaving party:', err);
      setError('Failed to leave party');
      throw err;
    }
  };

  const createParty = async (name) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTIES}`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchParties();
      return response.data;
    } catch (err) {
      console.error('Error creating party:', err);
      setError('Failed to create party');
      throw err;
    }
  };

  const value = {
    currentParty,
    partyMembers,
    parties,
    loading,
    error,
    joinParty,
    leaveParty,
    createParty,
    refreshParty: fetchCurrentParty,
    refreshParties: fetchParties
  };

  return (
    <PartyContext.Provider value={value}>
      {children}
    </PartyContext.Provider>
  );
};

export default PartyProvider;
