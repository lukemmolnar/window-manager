import React, { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MapCanvas from './mapeditor/MapCanvas';
import MapToolbar from './mapeditor/MapToolbar';
import PlayerManagementDialog from './gamewindow/PlayerManagementDialog';
import API_CONFIG from '../../config/api';

const GameWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [mapData, setMapData] = useState(null);
  const [showGrid, setShowGrid] = useState(windowState?.showGrid ?? false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partyInfo, setPartyInfo] = useState(null);
  const [playerPositions, setPlayerPositions] = useState([]);
  const [currentPlayerPosition, setCurrentPlayerPosition] = useState({ x: 0, y: 0 });
  const [mapLoadNotification, setMapLoadNotification] = useState(null);
  const [currentMapPath, setCurrentMapPath] = useState(null);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [fogOfWarData, setFogOfWarData] = useState(null);
  const resetViewRef = useRef();

  // Load player positions for the party (legacy - all maps)
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

  // Load player positions for a specific map
  const loadPlayerPositionsOnMap = async (partyId, mapPath) => {
    try {
      const token = localStorage.getItem('auth_token');
      const encodedMapPath = encodeURIComponent(mapPath);
      const response = await fetch(`${API_CONFIG.BASE_URL}/parties/${partyId}/maps/${encodedMapPath}/players`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const positions = await response.json();
        setPlayerPositions(positions);
        
        // Find current user's position on this map
        const userPosition = positions.find(p => p.user_id === user.id);
        if (userPosition) {
          setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
          
          // Load fog of war data for current user
          loadFogOfWarData(partyId, mapPath, user.id);
        } else {
          // User is not positioned on this map - clear fog of war data
          // This ensures that no old fog of war data persists when switching maps
          setFogOfWarData(null);
          console.log(`User not positioned on map ${mapPath} - fog of war cleared`);
        }
        // Note: Don't reset position when user is not currently placed - preserve last known position
        // This is important for position memory when players are toggled off/on

        console.log(`Loaded player positions for map ${mapPath}:`, positions);
      }
    } catch (error) {
      console.error('Error loading player positions on map:', error);
    }
  };

  // Load fog of war data for the current user
  const loadFogOfWarData = async (partyId, mapPath, userId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const encodedMapPath = encodeURIComponent(mapPath);
      const response = await fetch(`${API_CONFIG.BASE_URL}/fog-of-war/${partyId}/${encodedMapPath}/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const fogData = await response.json();
        setFogOfWarData(fogData.fogOfWar);
        console.log(`Loaded fog of war data for user ${userId}:`, fogData.fogOfWar);
      } else {
        console.warn('Failed to load fog of war data:', response.status);
        setFogOfWarData(null);
      }
    } catch (error) {
      console.error('Error loading fog of war data:', error);
      setFogOfWarData(null);
    }
  };

  // Load current party and map data - extracted as reusable function
  const loadGameData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear fog of war data when loading a new map to prevent old data from persisting
      setFogOfWarData(null);

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
        setCurrentMapPath(mapInfo.mapFilePath);
        
        // Load player positions for this specific map
        loadPlayerPositionsOnMap(party.id, mapInfo.mapFilePath);
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

  // Load initial game data
  useEffect(() => {
    if (user) {
      loadGameData();
    }
  }, [user]);

  // Socket event listeners for map loading and real-time updates
  useEffect(() => {
    if (!socket || !partyInfo) return;

    // Listen for new map being loaded by DM
    const handleMapLoaded = (data) => {
      const { mapFilePath, loadedBy } = data;
      
      // Extract filename from path for display
      const filename = mapFilePath.split('/').pop() || mapFilePath;
      
      // Show notification
      setMapLoadNotification(`${loadedBy} loaded new map: ${filename}`);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setMapLoadNotification(null);
      }, 5000);
      
      // Reload the game data to get the new map
      console.log(`New map loaded by ${loadedBy}: ${filename} - reloading game data`);
      loadGameData();
    };

    socket.on('party_map_loaded', handleMapLoaded);

    return () => {
      socket.off('party_map_loaded', handleMapLoaded);
    };
  }, [socket, partyInfo]);

  // Socket event listeners for real-time player updates
  useEffect(() => {
    if (!socket || !partyInfo || !currentMapPath) return;

    // Request current player positions for this specific map
    socket.emit('request_player_positions', {
      partyId: partyInfo.id,
      mapPath: currentMapPath
    });

    // Listen for player position updates
    const handlePlayerPositionUpdate = (data) => {
      const { userId, username, mapPath, x, y } = data;
      
      // Only process updates for the current map
      if (mapPath !== currentMapPath) return;
      
      setPlayerPositions(prev => {
        const updated = prev.filter(p => p.user_id !== userId);
        return [...updated, { user_id: userId, username, x, y }];
      });

      // Update current user position if it's our movement
      if (userId === user.id) {
        setCurrentPlayerPosition({ x, y });
      }

      console.log(`Player ${username} moved to (${x}, ${y}) on map ${mapPath}`);
    };

    // Listen for initial position sync
    const handlePlayerPositionsSync = (data) => {
      const { mapPath, players } = data;
      
      // Only process sync for the current map
      if (mapPath !== currentMapPath) return;
      
      setPlayerPositions(players);
      
      // Find current user's position
      const userPosition = players.find(p => p.user_id === user.id);
      if (userPosition) {
        setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
      }
      // Note: Don't reset position when user is not currently placed - preserve last known position

      console.log(`Synced player positions for map ${mapPath}:`, players);
    };

    // Listen for player placement updates from DM
    const handlePlayersPlacedOnMap = (data) => {
      const { partyId, mapPath, players, updatedBy } = data;
      
      console.log(`[CLIENT] Received players_placed_on_map event:`, {
        partyId,
        mapPath,
        players,
        updatedBy,
        currentMapPath,
        currentPartyId: partyInfo?.id
      });
      
      // Only process placement updates for the current map and party
      // Convert IDs to strings to handle type mismatches (DB returns numbers, socket sends strings)
      if (mapPath !== currentMapPath || String(partyId) !== String(partyInfo.id)) {
        console.log(`[CLIENT] Ignoring player placement update - map/party mismatch`);
        console.log(`[CLIENT] mapPath: "${mapPath}" vs currentMapPath: "${currentMapPath}"`);
        console.log(`[CLIENT] partyId: "${partyId}" (${typeof partyId}) vs partyInfo.id: "${partyInfo.id}" (${typeof partyInfo.id})`);
        return;
      }
      
      console.log(`[CLIENT] Processing player placement update - updating ${players.length} players`);
      setPlayerPositions(players);
      
      // Update current user position if they're in the updated list
      const userPosition = players.find(p => p.user_id === user.id);
      if (userPosition) {
        console.log(`[CLIENT] Updating current user position to (${userPosition.x}, ${userPosition.y})`);
        setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
        
        // Load fog of war data immediately when player is placed
        // This ensures the view radius is visible right away
        loadFogOfWarData(partyId, mapPath, user.id);
        console.log(`[CLIENT] Loading fog of war data for newly placed player`);
      } else {
        console.log(`[CLIENT] Current user not found in updated player list - clearing fog of war`);
        // User was removed from the map - clear fog of war data
        setFogOfWarData(null);
      }
      // Note: Don't reset position to (0,0) when removed - preserve last known position
      // The server will send the correct position when the player is re-added

      console.log(`Player placement updated on map ${mapPath}:`, players);
    };

    socket.on('player_position_update', handlePlayerPositionUpdate);
    socket.on('player_positions_sync', handlePlayerPositionsSync);
    socket.on('players_placed_on_map', handlePlayersPlacedOnMap);

    return () => {
      socket.off('player_position_update', handlePlayerPositionUpdate);
      socket.off('player_positions_sync', handlePlayerPositionsSync);
      socket.off('players_placed_on_map', handlePlayersPlacedOnMap);
    };
  }, [socket, partyInfo, user, currentMapPath]);

  // Move player to new position
  const movePlayer = (newX, newY) => {
    if (!partyInfo || !mapData || !currentMapPath) return;

    // Check if user is placed on this map (has a position in playerPositions)
    const userPosition = playerPositions.find(p => p.user_id === user.id);
    if (!userPosition) {
      console.log('Movement blocked: You are not placed on this map by the DM');
      return;
    }

    // Validate movement within map boundaries
    if (newX < 0 || newX >= mapData.width || newY < 0 || newY >= mapData.height) {
      console.log('Movement blocked: outside map boundaries');
      return;
    }

    // Update local position immediately for responsiveness
    setCurrentPlayerPosition({ x: newX, y: newY });

    // Send movement to server via socket with mapPath
    socket.emit('player_move', {
      partyId: partyInfo.id,
      mapPath: currentMapPath,
      x: newX,
      y: newY
    });

    // Reload fog of war data for new position
    loadFogOfWarData(partyInfo.id, currentMapPath, user.id);

    console.log(`Moving to (${newX}, ${newY}) on map ${currentMapPath}`);
  };

  // Arrow key movement handler
  useEffect(() => {
    if (!isActive || !mapData || !partyInfo) return;

    const handleKeyDown = (e) => {
      // Only handle arrow keys if this window is active and focused
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
    const newShowGrid = !showGrid;
    setShowGrid(newShowGrid);
    updateWindowState({ ...windowState, showGrid: newShowGrid });
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

  // Handle toggling player management dialog (DM only)
  const handleManagePlayers = () => {
    setShowPlayerManagement(!showPlayerManagement);
  };

  // Handle closing player management dialog
  const handleClosePlayerManagement = () => {
    setShowPlayerManagement(false);
  };

  // Handle when players are updated via the management dialog
  const handlePlayersUpdated = (updatedPlayers) => {
    setPlayerPositions(updatedPlayers);
    
    // Update current user position if they're in the updated list
    const userPosition = updatedPlayers.find(p => p.user_id === user.id);
    if (userPosition) {
      setCurrentPlayerPosition({ x: userPosition.x, y: userPosition.y });
      
      // Load fog of war data for the newly positioned player
      if (partyInfo && currentMapPath) {
        loadFogOfWarData(partyInfo.id, currentMapPath, user.id);
        console.log(`Loading fog of war data after player management update`);
      }
    } else {
      // User was removed from the map - clear fog of war data
      setFogOfWarData(null);
      console.log(`Clearing fog of war data after player was removed from map`);
    }
    // Note: Don't reset position to (0,0) when removed - preserve last known position
    // The server will send the correct position when the player is re-added
  };

  // Check if current user is DM
  const isDM = partyInfo && user && partyInfo.creator_id === user.id;

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
      {/* Map Load Notification */}
      {mapLoadNotification && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white px-4 py-2 rounded shadow-lg z-50">
          <div className="text-sm font-medium">{mapLoadNotification}</div>
        </div>
      )}

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
        isDM={isDM}
        onManagePlayers={handleManagePlayers}
        isPlayerManagementOpen={showPlayerManagement}
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
          fogOfWarData={fogOfWarData} // Pass fog of war data for rendering
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

      {/* Player Management Dialog - DM Only */}
      {isDM && (
        <PlayerManagementDialog
          isOpen={showPlayerManagement}
          onClose={handleClosePlayerManagement}
          partyInfo={partyInfo}
          currentMapPath={currentMapPath}
          onPlayersUpdated={handlePlayersUpdated}
        />
      )}
    </div>
  );
};

export default GameWindow;
