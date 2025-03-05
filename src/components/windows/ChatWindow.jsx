import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const ChatWindow = ({ isActive, nodeId }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [newRoomName, setNewRoomName] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  
  const MAX_CHARS = 500; // Maximum character limit

  // Connect to WebSocket server
  useEffect(() => {
    const socketInstance = io(API_CONFIG.BASE_URL.replace('/api', ''));
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`${API_CONFIG.BASE_URL}/chat/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRooms(response.data);
        
        // If there are rooms and no active room, set the first one as active
        if (response.data.length > 0 && !activeRoom) {
          setActiveRoom(response.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    fetchRooms();
  }, [activeRoom]);

  // Join room and fetch messages
  useEffect(() => {
    if (!activeRoom || !socket) return;

    // Join the room via WebSocket
    socket.emit('join_room', activeRoom.id);

    // Fetch messages for the room
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/chat/rooms/${activeRoom.id}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      // Leave the room when component unmounts or room changes
      socket.emit('leave_room', activeRoom.id);
      socket.off('new_message', handleNewMessage);
    };
  }, [activeRoom, socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessageChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setNewMessage(value);
      setCharCount(value.length);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${API_CONFIG.BASE_URL}/chat/rooms/${activeRoom.id}/messages`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      setCharCount(0);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/chat/rooms`,
        { name: newRoomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRooms((prev) => [response.data, ...prev]);
      setNewRoomName('');
      setActiveRoom(response.data);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const joinRoom = async (room) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${API_CONFIG.BASE_URL}/chat/rooms/${room.id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveRoom(room);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Room sidebar */}
      <div className="w-1/9 max-w-[20%] min-w-[10%] bg-stone-900 border-r border-stone-700 flex flex-col">
        <div className="p-2 border-b border-stone-700">
          <h3 className="text-teal-400 font-medium text-sm">Channels</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`text-sm p-2 cursor-pointer hover:bg-stone-700 ${
                activeRoom?.id === room.id ? 'bg-stone-800' : ''
              }`}
              onClick={() => joinRoom(room)}
            >
              <div className="text-white">{room.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            <div className="p-2 bg-stone-900 border-b border-stone-700 font-mono text-sm">
              <h3 className="text-teal-400 font-medium">{activeRoom.name}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-stone-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-1 ${
                    msg.user_id === user.id ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`hover:bg-stone-800 inline-block rounded-lg px-4 py-2 w-[100%] break-all overflow-wrap break-word hyphens-auto overflow-hidden whitespace-pre-wrap ${
                      msg.user_id === user.id
                        ? 'bg-teal-600 text-white'
                        : 'text-white'
                    }`}
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    <div className="text-teal-400 flex font-medium text-s mb-1">
                      {msg.username}
                      <div className="text-xs text-white opacity-75 mt-1 ml-3">
                        {(() => {
                          // Ensure UTC interpretation by appending 'Z' if not already present
                          const timestamp = msg.created_at.endsWith('Z') ? 
                            msg.created_at : 
                            msg.created_at + 'Z';
                          
                          const msgDate = new Date(timestamp);
                          
                          return msgDate.toLocaleTimeString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short',
                            hour12: false
                          });
                        })()}
                      </div>
                    </div>
                    <div>{msg.message}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-2 bg-stone-900 border-t border-stone-700 flex"
            >
              <div className="flex-1 flex flex-col">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleMessageChange}
                  className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                  maxLength={MAX_CHARS}
                />

              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-stone-900">
            <div className="text-stone-500">
              Select a channel to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
