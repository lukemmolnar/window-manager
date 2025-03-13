import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { MoreVertical, Trash, Mic, MicOff, Phone, PhoneOff, Plus } from 'lucide-react'; // Import additional icons
import SimplePeer from 'simple-peer';

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
  
  // Voice chat state
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [newVoiceChannelName, setNewVoiceChannelName] = useState('');
  
  // Helper function to create audio elements for remote streams
  const createAudioElement = (userId, stream) => {
    console.log('Creating audio element for user:', userId);
    const existingAudio = document.getElementById(`remote-audio-${userId}`);
    if (existingAudio) {
      console.log('Audio element already exists, removing it first');
      existingAudio.remove();
    }
    
    const audio = document.createElement('audio');
    audio.id = `remote-audio-${userId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.controls = false; // Hide controls
    audio.volume = 1.0; // Full volume
    document.body.appendChild(audio);
    
    // Verify the audio element was created and is working
    console.log('Audio element created:', audio);
    console.log('Audio element autoplay:', audio.autoplay);
    console.log('Audio element srcObject:', audio.srcObject);
    
    return audio;
  };
  
  const MAX_CHARS = 500; // Maximum character limit

  // New state for tracking which message's menu is open
  const [activeMenu, setActiveMenu] = useState(null);

  // Connect to WebSocket server
  useEffect(() => {
    const socketInstance = io(API_CONFIG.BASE_URL.replace('/api', ''));
    setSocket(socketInstance);

    // Authenticate the socket connection
    const token = localStorage.getItem('auth_token');
    if (token) {
      socketInstance.emit('authenticate', token);
    }

    return () => {
      // Clean up voice chat if active
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up peer connections
      Object.values(peers).forEach(peer => {
        if (peer.destroy) peer.destroy();
      });
      
      socketInstance.disconnect();
    };
  }, []);
  
  // Add effects to listen for message_deleted and room_deleted events
  useEffect(() => {
    if (!socket) return;
    
    const handleMessageDeleted = (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.id));
    };
    
    const handleRoomDeleted = (data) => {
      // If the active room was deleted, set activeRoom to null
      if (activeRoom && activeRoom.id === data.id) {
        setActiveRoom(null);
      }
      
      // Remove the deleted room from the rooms list
      setRooms(prev => prev.filter(room => room.id !== data.id));
    };
    
    const handleVoiceChannelDeleted = (data) => {
      // If the active voice channel was deleted, leave it
      if (activeVoiceChannel && activeVoiceChannel.id === data.id) {
        leaveVoiceChannel();
      }
      
      // Remove the deleted voice channel from the list
      setVoiceChannels(prev => prev.filter(channel => channel.id !== data.id));
    };
    
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('voice_channel_deleted', handleVoiceChannelDeleted);
    
    return () => {
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('voice_channel_deleted', handleVoiceChannelDeleted);
    };
  }, [socket, activeRoom, activeVoiceChannel]);

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

    // Fetch voice channels for the room
    const fetchVoiceChannels = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/chat/rooms/${activeRoom.id}/voice-channels`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setVoiceChannels(response.data);
      } catch (error) {
        console.error('Failed to fetch voice channels:', error);
      }
    };

    fetchMessages();
    fetchVoiceChannels();

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('new_message', handleNewMessage);
//test
    return () => {
      // Leave the room when component unmounts or room changes
      socket.emit('leave_room', activeRoom.id);
      socket.off('new_message', handleNewMessage);
    };
  }, [activeRoom, socket]);

  // Voice chat socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    // Handle when a user joins a voice channel
    const handleUserJoinedVoice = (data) => {
      console.log('User joined voice:', data);
      
      // Add to participants list
      setVoiceParticipants(prev => {
        // Check if user is already in the list
        if (prev.some(p => p.user_id === data.userId)) {
          return prev;
        }
        return [...prev, {
          user_id: data.userId,
          username: data.username,
          is_muted: data.isMuted,
          channel_id: data.channelId
        }];
      });
      
      // If this is our active voice channel and we have a local stream,
      // initiate a peer connection to the new user
      if (activeVoiceChannel && 
          activeVoiceChannel.id === data.channelId && 
          localStream && 
          localStream.active && // Check that stream is active
          data.userId !== user.id) {
        
        console.log('Creating new peer connection to user:', data.userId);
        
        // Delay peer creation slightly to ensure browser WebRTC is ready
        setTimeout(() => {
          try {
            const peer = new SimplePeer({
              initiator: true,
              trickle: false,
              stream: localStream,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' } // Simplified to one STUN server
                ]
              }
            });
            
            peer.on('signal', signal => {
              console.log('Generated signal for user:', data.userId, signal);
              socket.emit('voice_signal', {
                channelId: activeVoiceChannel.id,
                targetUserId: data.userId,
                signal
              });
            });
            
            peer.on('stream', stream => {
              console.log('Received stream from user:', data.userId, stream);
              // Create audio element for the remote stream
              createAudioElement(data.userId, stream);
            });
            
            // Add error handling
            peer.on('error', err => {
              console.error('Peer connection error (initiator):', err);
            });
            
            // Monitor ICE connection state
            peer.on('iceStateChange', state => {
              console.log('ICE state change (initiator):', state);
            });
            
            // Monitor connection state
            peer.on('connect', () => {
              console.log('Peer connection established (initiator) with user:', data.userId);
            });
            
            // Add to peers state
            setPeers(prev => ({
              ...prev,
              [data.userId]: peer
            }));
          } catch (err) {
            console.error('Error creating peer connection (initiator):', err);
          }
        }, 500); // 500ms delay
      }
    };
    
    // Handle when a user leaves a voice channel
    const handleUserLeftVoice = (data) => {
      console.log('User left voice:', data);
      
      // Remove from participants list
      setVoiceParticipants(prev => 
        prev.filter(p => !(p.user_id === data.userId && p.channel_id === data.channelId))
      );
      
      // If we have a peer connection to this user, clean it up
      if (peers[data.userId]) {
        peers[data.userId].destroy();
        
        // Remove the audio element
        const audioElement = document.getElementById(`remote-audio-${data.userId}`);
        if (audioElement) {
          audioElement.remove();
        }
        
        // Remove from peers state
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[data.userId];
          return newPeers;
        });
      }
    };
    
    // Handle voice participants list
    const handleVoiceParticipants = (data) => {
      if (data.channelId === activeVoiceChannel?.id) {
        setVoiceParticipants(data.participants);
      }
    };
    
    // Handle WebRTC signaling
    const handleVoiceSignal = (data) => {
      console.log('Received voice signal:', data);
      
      // If the signal is for us and we're in the same channel
      if (data.channelId === activeVoiceChannel?.id && data.fromUserId !== user.id) {
        
        // If we already have a peer for this user
        if (peers[data.fromUserId]) {
          console.log('Signaling existing peer for user:', data.fromUserId);
          peers[data.fromUserId].signal(data.signal);
        } else {
          // Check if we have a valid stream
          if (!localStream || !localStream.active) {
            console.error('Cannot create peer connection: localStream is not available or not active');
            return;
          }
          
          // Create a new peer with delay to ensure browser WebRTC is ready
          console.log('Creating new non-initiator peer for user:', data.fromUserId);
          
          setTimeout(() => {
            try {
              const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: localStream,
                config: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' } // Simplified to one STUN server
                  ]
                }
              });
              
              peer.on('signal', signal => {
                console.log('Generated response signal for user:', data.fromUserId, signal);
                socket.emit('voice_signal', {
                  channelId: activeVoiceChannel.id,
                  targetUserId: data.fromUserId,
                  signal
                });
              });
              
              peer.on('stream', stream => {
                console.log('Received stream from user:', data.fromUserId, stream);
                // Create audio element for the remote stream
                createAudioElement(data.fromUserId, stream);
              });
              
              // Add error handling
              peer.on('error', err => {
                console.error('Peer connection error (non-initiator):', err);
              });
              
              // Monitor ICE connection state
              peer.on('iceStateChange', state => {
                console.log('ICE state change (non-initiator):', state);
              });
              
              // Monitor connection state
              peer.on('connect', () => {
                console.log('Peer connection established (non-initiator) with user:', data.fromUserId);
              });
              
              // Signal with the received data
              peer.signal(data.signal);
              
              // Add to peers state
              setPeers(prev => ({
                ...prev,
                [data.fromUserId]: peer
              }));
            } catch (err) {
              console.error('Error creating peer connection (non-initiator):', err);
            }
          }, 500); // 500ms delay
        }
      }
    };
    
    // Handle mute status changes
    const handleUserMuteChanged = (data) => {
      setVoiceParticipants(prev => 
        prev.map(p => 
          p.user_id === data.userId && p.channel_id === data.channelId
            ? { ...p, is_muted: data.isMuted }
            : p
        )
      );
    };
    
    socket.on('user_joined_voice', handleUserJoinedVoice);
    socket.on('user_left_voice', handleUserLeftVoice);
    socket.on('voice_participants', handleVoiceParticipants);
    socket.on('voice_signal', handleVoiceSignal);
    socket.on('user_mute_changed', handleUserMuteChanged);
    
    return () => {
      socket.off('user_joined_voice', handleUserJoinedVoice);
      socket.off('user_left_voice', handleUserLeftVoice);
      socket.off('voice_participants', handleVoiceParticipants);
      socket.off('voice_signal', handleVoiceSignal);
      socket.off('user_mute_changed', handleUserMuteChanged);
    };
  }, [socket, activeVoiceChannel, localStream, peers, user]);

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
  
  // Add new function to handle message deletion
  const handleDeleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const endpoint = API_CONFIG.ENDPOINTS.CHAT_DELETE_MESSAGE.replace(':id', messageId);
      await axios.delete(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // The message will be removed from the UI when the socket event is received
      setActiveMenu(null); // Close the menu
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Toggle menu function
  const toggleMenu = (messageId) => {
    setActiveMenu(activeMenu === messageId ? null : messageId);
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
  
  // Voice chat functions
  const createVoiceChannel = async (e) => {
    e.preventDefault();
    if (!newVoiceChannelName.trim() || !activeRoom) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/chat/rooms/${activeRoom.id}/voice-channels`,
        { name: newVoiceChannelName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setVoiceChannels(prev => [response.data, ...prev]);
      setNewVoiceChannelName('');
    } catch (error) {
      console.error('Failed to create voice channel:', error);
    }
  };
  
  const joinVoiceChannel = async (channel) => {
    // If already in a voice channel, leave it first
    if (activeVoiceChannel) {
      await leaveVoiceChannel();
    }
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Verify we have an active stream with audio tracks
      if (!stream || !stream.active || stream.getAudioTracks().length === 0) {
        console.error('Failed to get active audio stream');
        alert('Could not access microphone. Please check your permissions.');
        return;
      }
      
      // Set initial mute state
      stream.getAudioTracks()[0].enabled = !isMuted;
      
      // Store the stream
      setLocalStream(stream);
      
      // Set the active voice channel
      setActiveVoiceChannel(channel);
      
      // Join the channel via socket
      socket.emit('join_voice', { 
        channelId: channel.id,
        isMuted
      });
      
      console.log(`Joined voice channel: ${channel.name}`);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };
  
  const leaveVoiceChannel = async () => {
    if (!activeVoiceChannel || !socket) return;
    
    // Notify server
    socket.emit('leave_voice', activeVoiceChannel.id);
    
    // Clean up peer connections
    Object.values(peers).forEach(peer => {
      if (peer.destroy) peer.destroy();
    });
    setPeers({});
    
    // Remove remote audio elements
    document.querySelectorAll('[id^="remote-audio-"]').forEach(el => el.remove());
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clear active voice channel
    setActiveVoiceChannel(null);
    setVoiceParticipants([]);
    
    console.log('Left voice channel');
  };
  
  const toggleMute = () => {
    if (!localStream) return;
    
    // Toggle mute state
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // Update audio track
    localStream.getAudioTracks()[0].enabled = !newMuteState;
    
    // Notify others
    if (socket && activeVoiceChannel) {
      socket.emit('voice_mute_toggle', {
        channelId: activeVoiceChannel.id,
        isMuted: newMuteState
      });
    }
  };

  return (
    <div className="flex h-full">
      {/* Room sidebar */}
      <div className="w-1/9 max-w-[20%] min-w-[10%] bg-stone-900 border-r border-stone-700 flex flex-col">
        {/* Text channels */}
        <div className="p-2 border-b border-stone-700">
          <h3 className="text-teal-400 font-medium text-sm">Text Channels</h3>
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
        
        {/* Voice channels */}
        {activeRoom && (
          <>
            <div className="p-2 border-t border-b border-stone-700 flex justify-between items-center">
              <h3 className="text-teal-400 font-medium text-sm">Voice Channels</h3>
              <button 
                onClick={() => document.getElementById('voice-channel-form').classList.toggle('hidden')}
                className="text-teal-400 hover:text-teal-300"
                title="Create voice channel"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {/* Voice channel creation form */}
            <div id="voice-channel-form" className="p-2 border-b border-stone-700 hidden">
              <form onSubmit={createVoiceChannel} className="flex flex-col">
                <input
                  type="text"
                  value={newVoiceChannelName}
                  onChange={(e) => setNewVoiceChannelName(e.target.value)}
                  placeholder="Voice channel name"
                  className="bg-stone-800 text-teal-400 px-2 py-1 rounded text-sm mb-1"
                />
                <button
                  type="submit"
                  className="bg-teal-600 text-white px-2 py-1 rounded text-sm"
                >
                  Create
                </button>
              </form>
            </div>
            
            <div className="overflow-y-auto">
              {voiceChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`text-sm p-2 cursor-pointer hover:bg-stone-700 ${
                    activeVoiceChannel?.id === channel.id ? 'bg-stone-800' : ''
                  }`}
                >
                  <div 
                    className="text-white flex items-center justify-between"
                    onClick={() => activeVoiceChannel?.id === channel.id ? leaveVoiceChannel() : joinVoiceChannel(channel)}
                  >
                    <span>{channel.name}</span>
                    {activeVoiceChannel?.id === channel.id ? (
                      <PhoneOff size={16} className="text-red-500" />
                    ) : (
                      <Phone size={16} className="text-teal-400" />
                    )}
                  </div>
                  
                  {/* Voice participants */}
                  {voiceParticipants.length > 0 && channel.id === activeVoiceChannel?.id && (
                    <div className="mt-1 pl-2 border-l border-stone-700">
                      {voiceParticipants.map(participant => (
                        <div key={participant.user_id} className="flex items-center text-xs text-stone-400 py-1">
                          {participant.is_muted ? (
                            <MicOff size={12} className="mr-1 text-red-500" />
                          ) : (
                            <Mic size={12} className="mr-1 text-green-500" />
                          )}
                          <span>{participant.username}</span>
                          {participant.user_id === user.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMute();
                              }}
                              className="ml-2 text-stone-400 hover:text-teal-400"
                              title={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
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
                  className="mb-1"
                >
                  <div
                    className="hover:bg-stone-800 inline-block rounded-lg px-4 py-2 w-[100%] break-all overflow-wrap break-word hyphens-auto overflow-hidden whitespace-pre-wrap relative text-white"
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
                      
                      {/* Admin controls - only show if user is admin */}
                      {user?.is_admin && (
                        <div className="ml-auto">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg.id);
                            }}
                            className="text-white opacity-50 hover:opacity-100 focus:outline-none"
                            title="Delete message"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      )}
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
