import React, { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MapCanvas from './mapeditor/MapCanvas';
import MapToolbar from './mapeditor/MapToolbar';
import API_CONFIG from '../../config/api';

const GameWindow = ({ isActive, nodeId, onCommand, transformWindow, windowState, updateWindowState, focusRef }) => {
  const { user } = useAuth();
  const [mapData, setMapData] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partyInfo, setPartyInfo] = useState(null);
  const resetViewRef = useRef();

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
      {/* Original Header with party info and window title */}
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
