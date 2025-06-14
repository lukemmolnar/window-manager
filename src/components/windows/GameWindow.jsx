import React, { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MapCanvas from './mapeditor/MapCanvas';
import MapToolbar from './mapeditor/MapToolbar';
import API_CONFIG from '../../config/api';

const GameWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [mapData, setMapData] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partyInfo, setPartyInfo] = useState(null);
  const [playerPositions, setPlayerPositions] = useState([]);
  const [currentPlayerPosition, setCurrentPlayerPosition] = useState({ x: 0, y: 0 });
  const resetViewRef = useRef();

  // Load player positions for the party
  const loadPlayerPositions = async (partyId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/parties/${partyId}/player-positions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const positions = await response.json();
        setPlayerPositions(positions);
        
        // Find current user's position
        const userPosition = positions.find(p => p.user_id === user.id);
        if (userPosition) {
          setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
        }

        console.log('Loaded player positions:', positions);
      }
    } catch (error) {
      console.error('Error loading player positions:', error);
    }
  };

  // Load current party and map data
  useEffect(() => {
    const loadGameData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get JWT token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }

        // First, get user's current party
        const partyResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/current-party`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!partyResponse.ok) {
          if (partyResponse.status === 404) {
            setError('You are not currently in a party. Join a party to view the game.');
            return;
          }
          throw new Error('Failed to fetch party information');
        }

        const party = await partyResponse.json();
        setPartyInfo(party);

        // Then get the party's current map
        const mapResponse = await fetch(`${API_CONFIG.BASE_URL}/parties/${party.id}/current-map`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!mapResponse.ok) {
          if (mapResponse.status === 404) {
            setError('No map is currently loaded for this party. The DM needs to load a map from the explorer.');
            return;
          }
          throw new Error('Failed to fetch current map');
        }

        const mapInfo = await mapResponse.json();
        
        if (mapInfo.mapData) {
          setMapData(mapInfo.mapData);
          
          // Load player positions after map is loaded
          loadPlayerPositions(party.id);
        } else {
          setError('No map is currently loaded for this party.');
        }

      } catch (err) {
        console.error('Error loading game data:', err);
        setError(err.message || 'Failed to load game data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadGameData();
    }
  }, [user]);

  // Socket event listeners for real-time player updates
  useEffect(() => {
    if (!socket || !partyInfo) return;

    // Request current player positions when joining
    socket.emit('request_player_positions', partyInfo.id);

    // Listen for player position updates
    const handlePlayerPositionUpdate = (data) => {
      const { userId, username, x, y } = data;
      
      setPlayerPositions(prev => {
        const updated = prev.filter(p => p.user_id !== userId);
        return [...updated, { user_id: userId, username, x, y }];
      });

      // Update current user position if it's our movement
      if (userId === user.id) {
        setCurrentPlayerPosition({ x, y });
      }

      console.log(`Player ${username} moved to (${x}, ${y})`);
    };

    // Listen for initial position sync
    const handlePlayerPositionsSync = (positions) => {
      setPlayerPositions(positions);
      
      // Find current user's position
      const userPosition = positions.find(p => p.user_id === user.id);
      if (userPosition) {
        setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
      }

      console.log('Synced player positions:', positions);
    };

    socket.on('player_position_update', handlePlayerPositionUpdate);
    socket.on('player_positions_sync', handlePlayerPositionsSync);

    return () => {
      socket.off('player_position_update', handlePlayerPositionUpdate);
      socket.off('player_positions_sync', handlePlayerPositionsSync);
    };
  }, [socket, partyInfo, user]);

  // Move player to new position
  const movePlayer = (newX, newY) => {
    if (!partyInfo || !mapData) return;

    // Validate movement within map boundaries
    if (newX < 0 || newX >= mapData.width || newY < 0 || newY >= mapData.height) {
      console.log('Movement blocked: outside map boundaries');
      return;
    }

    // Update local position immediately for responsiveness
    setCurrentPlayerPosition({ x: newX, y: newY });

    // Send movement to server via socket
    socket.emit('player_move', {
      partyId: partyInfo.id,
      x: newX,
      y: newY
    });

    console.log(`Moving to (${newX}, ${newY})`);
  };

  // WASD movement handler
  useEffect(() => {
    if (!isActive || !mapData || !partyInfo) return;

    const handleKeyDown = (e) => {
      // Only handle WASD if this window is active and focused
      if (!isActive) return;

      const { x, y } = currentPlayerPosition;
      let newX = x;
      let newY = y;

      switch (e.key) {
        case 'ArrowUp':
          newY = Math.max(0, y - 1);
          break;
        case 'ArrowLeft':
          newX = Math.max(0, x - 1);
          break;
        case 'ArrowDown':
          newY = Math.min(mapData.height - 1, y + 1);
          break;
        case 'ArrowRight':
          newX = Math.min(mapData.width - 1, x + 1);
          break;
        default:
          return; // Not a movement key
      }

      // Prevent browser default behavior for these keys
      e.preventDefault();
      
      // Only move if position actually changed
      if (newX !== x || newY !== y) {
        movePlayer(newX, newY);
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, mapData, partyInfo, currentPlayerPosition, socket]);

  // Handle grid toggle
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // Handle reset view to origin
  const resetView = () => {
    if (resetViewRef.current) {
      resetViewRef.current();
    }
  };

  // No-op function for map editing (game window is read-only)
  const handleMapEdit = () => {
    // Do nothing - game window is read-only
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto mb-4"></div>
            <p>Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users size={48} className="mx-auto mb-4 text-stone-600" />
            <p className="text-red-400 mb-2">Game Not Available</p>
            <p className="text-sm text-stone-400 max-w-md">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400">
      {/* Header with party info and window title */}
      <div className="flex-shrink-0 p-2 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span className="text-sm font-mono">
            {partyInfo ? `${partyInfo.name} - Game View` : 'Game View'}
          </span>
          {partyInfo && user && partyInfo.creator_id === user.id && (
            <span className="text-xs bg-amber-800 text-amber-200 px-2 py-1 rounded">DM</span>
          )}
        </div>
        <div className="text-xs text-stone-400">
          Use arrow keys to move
        </div>
      </div>

      {/* MapToolbar in Game Mode - simplified */}
      <MapToolbar
        mode="game"
        onToggleGrid={toggleGrid}
        onResetView={resetView}
        showGrid={showGrid}
      />

      {/* Map Canvas */}
      {mapData ? (
        <MapCanvas
          mapData={mapData}
          currentLayer={0} // Default to first layer
          currentTool="select" // Read-only mode
          selectedTileId={0}
          selectedTilesetId={null}
          selectedRotation={0}
          onEdit={handleMapEdit} // No-op for read-only
          showGrid={showGrid}
          resetViewRef={resetViewRef}
          brushSize={1}
          hideEditorUI={true} // Hide editor UI elements for streamlined game view
          playerPositions={playerPositions} // Pass player positions for rendering
          currentUserId={user?.id} // Pass current user ID to distinguish own token
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Users size={48} className="mx-auto mb-4 text-stone-600" />
            <p>No map loaded</p>
            <p className="text-xs mt-2 text-stone-400">
              The DM needs to load a map from the explorer
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameWindow;
