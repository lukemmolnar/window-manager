import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useWindowState } from '../../context/WindowStateContext';
import { WINDOW_TYPES } from '../../utils/windowTypes';
import { saveChatState, getChatState } from '../../services/indexedDBService';
import { MoreVertical, Trash, Mic, MicOff, Phone, PhoneOff, Plus } from 'lucide-react'; // Import additional icons
import SimplePeer from 'simple-peer';

// Helper function to safely destroy a peer connection
const safelyDestroyPeer = (peer, userId, destroyedPeersRef) => {
  if (!peer) return;
  
  try {
    // Stop any tracks in the peer's stream
    if (peer._localStream) {
      try {
        peer._localStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Error stopping local stream tracks:', err);
      }
    }
    
    // Destroy the peer
    if (peer.destroy) {
      peer.destroy();
      
      // Mark this peer as destroyed if we have a userId and ref
      if (userId && destroyedPeersRef?.current) {
        console.log(`Marking peer ${userId} as destroyed`);
        destroyedPeersRef.current.add(userId);
      }
    }
  } catch (err) {
    console.error('Error safely destroying peer:', err);
  }
};

const ChatWindow = ({ isActive, nodeId }) => {
  const { user } = useAuth();
  const { setActiveWindow } = useWindowState();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [newRoomName, setNewRoomName] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  // Refs to track loading state
  const stateLoadedRef = useRef(false);
  const roomsLoadedRef = useRef(false);
  
  // Voice chat state
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [newVoiceChannelName, setNewVoiceChannelName] = useState('');
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const joinSoundRef = useRef(null);
  const leaveSoundRef = useRef(null);
  
  // Track destroyed peers to prevent signaling to them
  const destroyedPeersRef = useRef(new Set());
  
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

  // Initialize sound effects
  useEffect(() => {
    // Create the audio element for the join sound
    const joinSound = new Audio('/audio/vine-boom.mp3');
    joinSound.volume = 0.5; // Set volume to 50%
    joinSoundRef.current = joinSound;
    
    // Create the audio element for the leave sound
    const leaveSound = new Audio('/audio/vine-boom-leave.mp3');
    leaveSound.volume = 0.5; // Set volume to 50%
    leaveSoundRef.current = leaveSound;
    
    return () => {
      // Clean up
      if (joinSoundRef.current) {
        joinSoundRef.current.pause();
        joinSoundRef.current.src = '';
      }
      if (leaveSoundRef.current) {
        leaveSoundRef.current.pause();
        leaveSoundRef.current.src = '';
      }
    };
  }, []);
  
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
        try {
          localStream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Error stopping local stream tracks on unmount:', err);
        }
      }
      
      // Clean up peer connections safely using our helper function
      try {
        Object.values(peers).forEach(peer => {
          safelyDestroyPeer(peer);
        });
      } catch (err) {
        console.error('Error cleaning up peer connections on unmount:', err);
      }
      
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

  // Load chat state from IndexedDB on mount
  useEffect(() => {
    const loadChatState = async () => {
      try {
        // Try to load chat state from IndexedDB
        const savedState = await getChatState(nodeId);
        
        if (savedState && savedState.content && !stateLoadedRef.current) {
          console.log(`Loaded chat state for window ${nodeId} from IndexedDB:`, savedState.content);
          
          // If we have a saved active room ID, we'll use it after fetching rooms
          stateLoadedRef.current = true;
          
          // Store the active room ID to use after fetching rooms
          if (savedState.content.activeRoomId) {
            // We'll set this after fetching rooms
            window.setTimeout(() => {
              if (rooms.length > 0) {
                const savedRoom = rooms.find(room => room.id === savedState.content.activeRoomId);
                if (savedRoom) {
                  setActiveRoom(savedRoom);
                  console.log(`Restored active room: ${savedRoom.name}`);
                }
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error(`Failed to load chat state for window ${nodeId} from IndexedDB:`, error);
      }
    };
    
    loadChatState();
  }, [nodeId]);
  
  // Handle window activation
  useEffect(() => {
    if (isActive) {
      // Save this as the active chat window
      setActiveWindow(nodeId, WINDOW_TYPES.CHAT);
    }
  }, [isActive, nodeId, setActiveWindow]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`${API_CONFIG.BASE_URL}/chat/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRooms(response.data);
        roomsLoadedRef.current = true;
        
        // Get saved active room ID from sessionStorage
        const savedRoomId = sessionStorage.getItem(`chat_active_room_${nodeId}`);
        
        if (savedRoomId && response.data.length > 0) {
          // Try to find the saved room
          const savedRoom = response.data.find(room => 
            room.id === parseInt(savedRoomId, 10) || room.id === savedRoomId
          );
          
          if (savedRoom) {
            console.log(`Restoring saved room: ${savedRoom.name}`);
            setActiveRoom(savedRoom);
            
            // Load any saved draft message for this room
            const savedDraft = localStorage.getItem(`chat_draft_${nodeId}_${savedRoom.id}`);
            if (savedDraft) {
              setNewMessage(savedDraft);
              setCharCount(savedDraft.length);
            }
            
            return;
          }
        }
        
        // If no saved room was found or restored, and there are rooms but no active room,
        // set the first one as active
        if (response.data.length > 0 && !activeRoom) {
          setActiveRoom(response.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    fetchRooms();
  }, []); // Only run once on mount

  // Save active room to IndexedDB and sessionStorage when it changes
  useEffect(() => {
    if (!activeRoom) return;
    
    // Save to sessionStorage for immediate persistence across refreshes
    sessionStorage.setItem(`chat_active_room_${nodeId}`, activeRoom.id);
    
    // Also save to IndexedDB for longer term storage if state is loaded
    if (stateLoadedRef.current) {
      saveChatState({
        id: nodeId,
        content: {
          activeRoomId: activeRoom.id
        }
      }).catch(error => {
        console.error(`Failed to save chat state for window ${nodeId} to IndexedDB:`, error);
      });
      
      console.log(`Saved active room ID ${activeRoom.id} to IndexedDB for window ${nodeId}`);
    }
    
    // Check for any saved draft message
    const savedDraft = localStorage.getItem(`chat_draft_${nodeId}_${activeRoom.id}`);
    if (savedDraft && newMessage !== savedDraft) {
      setNewMessage(savedDraft);
      setCharCount(savedDraft.length);
    }
  }, [activeRoom, nodeId, newMessage]);

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

  // Set up voice activity detection
  useEffect(() => {
    if (!localStream || !socket || !activeVoiceChannel) return;
    
    // Create audio context and analyzer
    try {
      // Clean up any existing audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create analyzer node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Connect the stream to the analyzer
      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);
      
      // Set up the buffer for the analyzer
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Function to check if user is speaking
      const checkSpeaking = () => {
        if (!analyser || !socket || !activeVoiceChannel || isMuted) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Threshold for speaking detection
        const threshold = 20; // Adjust as needed
        
        // Check if speaking
        const isSpeaking = average > threshold;
        
        // If speaking state changed, emit event
        if (isSpeaking && !speakingUsers.has(user.id)) {
          // User started speaking
          socket.emit('voice_speaking_start', {
            channelId: activeVoiceChannel.id
          });
          
          // Update local state
          setSpeakingUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(user.id);
            return newSet;
          });
          
          // Clear any existing timeout
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
          }
        } else if (!isSpeaking && speakingUsers.has(user.id)) {
          // Set a timeout to stop speaking status after a short delay
          // This prevents the speaking status from flickering
          if (!speakingTimeoutRef.current) {
            speakingTimeoutRef.current = setTimeout(() => {
              socket.emit('voice_speaking_stop', {
                channelId: activeVoiceChannel.id
              });
              
              // Update local state
              setSpeakingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(user.id);
                return newSet;
              });
              
              speakingTimeoutRef.current = null;
            }, 300); // 300ms delay
          }
        }
      };
      
      // Set up interval to check speaking
      const intervalId = setInterval(checkSpeaking, 100); // Check every 100ms
      
      return () => {
        clearInterval(intervalId);
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
      };
    } catch (error) {
      console.error('Error setting up voice activity detection:', error);
    }
  }, [localStream, socket, activeVoiceChannel, isMuted, user.id, speakingUsers]);
  
  // Voice chat socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    // Handle speaking events
    const handleUserSpeakingStart = (data) => {
      if (data.channelId === activeVoiceChannel?.id && data.userId !== user.id) {
        setSpeakingUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(data.userId);
          return newSet;
        });
      }
    };
    
    const handleUserSpeakingStop = (data) => {
      if (data.channelId === activeVoiceChannel?.id && data.userId !== user.id) {
        setSpeakingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };
    
    socket.on('user_speaking_start', handleUserSpeakingStart);
    socket.on('user_speaking_stop', handleUserSpeakingStop);
    
    // Handle when a user joins a voice channel
    const handleUserJoinedVoice = (data) => {
      console.log('User joined voice:', data);
      
      // Add to participants list
      setVoiceParticipants(prev => {
        // Check if user is already in the list
        if (prev.some(p => p.user_id === data.userId)) {
          return prev;
        }
        
        // Play join sound if this is our active channel and we're not the one joining
        if (activeVoiceChannel && 
            activeVoiceChannel.id === data.channelId && 
            data.userId !== user.id &&
            joinSoundRef.current) {
          // Reset the audio to the beginning and play it
          joinSoundRef.current.currentTime = 0;
          joinSoundRef.current.play().catch(err => {
            console.error('Error playing join sound:', err);
          });
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
        
        // Create peer connection with optimized settings
        try {
          // Track connection start time for performance monitoring
          const connectionStartTime = performance.now();
          
          const peer = new SimplePeer({
            initiator: true,
            trickle: true, // Enable trickle ICE for faster connections
            stream: localStream,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
              ],
              iceCandidatePoolSize: 10 // Pre-gather some ICE candidates
            }
          });
            
            peer.on('signal', signal => {
              console.log('Generated signal for user:', data.userId, signal);
              console.time('signaling-' + data.userId);
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
            
            // Monitor connection state with timing
            peer.on('connect', () => {
              console.timeEnd('signaling-' + data.userId);
              const connectionTime = performance.now() - connectionStartTime;
              console.log('Peer connection established (initiator) with user:', data.userId, 'in', connectionTime.toFixed(0), 'ms');
            });
            
            // Add to peers state
            setPeers(prev => ({
              ...prev,
              [data.userId]: peer
            }));
          } catch (err) {
            console.error('Error creating peer connection (initiator):', err);
          }
      }
    };
    
    // Handle when a user leaves a voice channel
    const handleUserLeftVoice = (data) => {
      console.log('User left voice:', data);
      
      // Play leave sound if this is our active channel and we're not the one leaving
      if (activeVoiceChannel && 
          activeVoiceChannel.id === data.channelId && 
          data.userId !== user.id &&
          leaveSoundRef.current) {
        // Reset the audio to the beginning and play it
        leaveSoundRef.current.currentTime = 0;
        leaveSoundRef.current.play().catch(err => {
          console.error('Error playing leave sound:', err);
        });
      }
      
      // Remove from participants list
      setVoiceParticipants(prev => 
        prev.filter(p => !(p.user_id === data.userId && p.channel_id === data.channelId))
      );
      
      // If we have a peer connection to this user, clean it up
      if (peers[data.userId]) {
        // Use our helper function to safely destroy the peer
        safelyDestroyPeer(peers[data.userId], data.userId, destroyedPeersRef);
        
        // Remove the audio element
        const audioElement = document.getElementById(`remote-audio-${data.userId}`);
        if (audioElement) {
          try {
            audioElement.remove();
          } catch (err) {
            console.error('Error removing audio element:', err);
          }
        }
        
        // Remove from peers state with a small delay to allow cleanup
        setTimeout(() => {
          setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[data.userId];
            return newPeers;
          });
        }, 200);
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
        
        // If we already have a peer for this user and it's not in the destroyed list
        if (peers[data.fromUserId] && !destroyedPeersRef.current.has(data.fromUserId)) {
          console.log('Signaling existing peer for user:', data.fromUserId);
          try {
            peers[data.fromUserId].signal(data.signal);
          } catch (err) {
            console.error('Error signaling peer, it may have been destroyed:', err);
            // Mark this peer as destroyed to prevent future signaling attempts
            destroyedPeersRef.current.add(data.fromUserId);
          }
        } else {
          // Check if we have a valid stream
          if (!localStream || !localStream.active) {
            console.error('Cannot create peer connection: localStream is not available or not active');
            return;
          }
          
          // Create a new peer with optimized settings
          console.log('Creating new non-initiator peer for user:', data.fromUserId);
          
          try {
            // Track connection start time for performance monitoring
            const connectionStartTime = performance.now();
            
            const peer = new SimplePeer({
              initiator: false,
              trickle: true, // Enable trickle ICE for faster connections
              stream: localStream,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun2.l.google.com:19302' },
                  { urls: 'stun:stun3.l.google.com:19302' },
                  { urls: 'stun:stun4.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10 // Pre-gather some ICE candidates
              }
            });
              
              peer.on('signal', signal => {
                console.log('Generated response signal for user:', data.fromUserId, signal);
                console.time('signaling-' + data.fromUserId);
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
              
              // Monitor connection state with timing
              peer.on('connect', () => {
                console.timeEnd('signaling-' + data.fromUserId);
                const connectionTime = performance.now() - connectionStartTime;
                console.log('Peer connection established (non-initiator) with user:', data.fromUserId, 'in', connectionTime.toFixed(0), 'ms');
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
      
      // Save draft message to localStorage
      if (activeRoom) {
        localStorage.setItem(`chat_draft_${nodeId}_${activeRoom.id}`, value);
      }
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
      // Clear the draft message from localStorage
      localStorage.removeItem(`chat_draft_${nodeId}_${activeRoom.id}`);
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
    
    // Clean up peer connections safely using our helper function
    try {
      // Get keys (user IDs) from the peers object to use with safelyDestroyPeer
      Object.entries(peers).forEach(([userId, peer]) => {
        safelyDestroyPeer(peer, userId, destroyedPeersRef);
      });
    } catch (err) {
      console.error('Error cleaning up peer connections:', err);
    }
    
    // Clear the destroyed peers set when leaving a channel
    destroyedPeersRef.current = new Set();
    
    // Delay setting peers to empty to allow cleanup to complete
    setTimeout(() => {
      setPeers({});
    }, 300);
    
    // Remove remote audio elements
    document.querySelectorAll('[id^="remote-audio-"]').forEach(el => {
      try {
        el.remove();
      } catch (err) {
        console.error('Error removing audio element:', err);
      }
    });
    
    // Stop local stream
    if (localStream) {
      try {
        localStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Error stopping local stream tracks:', err);
      }
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
                            <Mic size={12} className={`mr-1 ${speakingUsers.has(participant.user_id) ? 'text-teal-400 animate-pulse' : 'text-green-500'}`} />
                          )}
                          <span 
                            className={`${speakingUsers.has(participant.user_id) && !participant.is_muted ? 'text-teal-400 font-medium animate-pulse' : ''}`}
                            style={{
                              textShadow: speakingUsers.has(participant.user_id) && !participant.is_muted ? '0 0 10px rgba(20, 184, 166, 0.5)' : 'none'
                            }}
                          >
                            {participant.username}
                          </span>
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
                            className="text-stone-400 hover:text-stone-300 focus:outline-none"
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
