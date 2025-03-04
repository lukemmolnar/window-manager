import React, { useState, useEffect, useRef } from 'react';
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
  const [newRoomName, setNewRoomName] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

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
      <div className="w-1/4 bg-stone-800 border-r border-stone-700 flex flex-col">
        <div className="p-3 border-b border-stone-700">
          <h3 className="text-white font-medium mb-2">Chat Rooms</h3>
          <form onSubmit={handleCreateRoom} className="flex">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room name"
              className="flex-1 bg-stone-700 text-white px-2 py-1 rounded-l text-sm"
            />
            <button
              type="submit"
              className="bg-teal-600 text-white px-2 py-1 rounded-r text-sm"
            >
              Create
            </button>
          </form>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`p-3 cursor-pointer hover:bg-stone-700 ${
                activeRoom?.id === room.id ? 'bg-stone-700' : ''
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
            <div className="p-3 bg-stone-800 border-b border-stone-700">
              <h3 className="text-white font-medium">{activeRoom.name}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-stone-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 ${
                    msg.user_id === user.id ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg px-4 py-2 max-w-3/4 ${
                      msg.user_id === user.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-stone-700 text-white'
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">
                      {msg.username}
                    </div>
                    <div>{msg.message}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-stone-800 border-t border-stone-700 flex"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-stone-700 text-white px-4 py-2 rounded-l"
              />
              <button
                type="submit"
                className="bg-teal-600 text-white px-4 py-2 rounded-r"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-stone-900">
            <div className="text-stone-500">
              Select a room to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
