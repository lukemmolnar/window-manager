import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserCheck, UserX, Loader, Move } from 'lucide-react';
import API_CONFIG from '../../../config/api';

const PlayerManagementDialog = ({ 
  isOpen, 
  onClose, 
  partyInfo, 
  currentMapPath, 
  onPlayersUpdated 
}) => {
  const [allMembers, setAllMembers] = useState([]);
  const [playersOnMap, setPlayersOnMap] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Floating window state
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep window within viewport bounds
      const maxX = window.innerWidth - 400; // Assuming window width of ~400px
      const maxY = window.innerHeight - 200; // Minimum space from bottom
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Attach global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Load party members and current players on map
  useEffect(() => {
    if (!isOpen || !partyInfo) return;

    loadData();
  }, [isOpen, partyInfo, currentMapPath]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      
      // Load all party members
      const membersResponse = await fetch(`${API_CONFIG.BASE_URL}/parties/${partyInfo.id}/members`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!membersResponse.ok) {
        throw new Error('Failed to load party members');
      }

      const members = await membersResponse.json();
      setAllMembers(members);

      // Load players currently on this map (only if currentMapPath is defined)
      if (currentMapPath) {
        const encodedMapPath = encodeURIComponent(currentMapPath);
        const playersResponse = await fetch(`${API_CONFIG.BASE_URL}/parties/${partyInfo.id}/maps/${encodedMapPath}/players`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (playersResponse.ok) {
          const currentPlayers = await playersResponse.json();
          setPlayersOnMap(currentPlayers);

          // Set initial selection to current players on map
          const currentPlayerIds = currentPlayers.map(p => p.user_id);
          setSelectedPlayerIds(currentPlayerIds);
        } else {
          // If map players request fails, just clear the selection
          setPlayersOnMap([]);
          setSelectedPlayerIds([]);
        }
      } else {
        // No map loaded, so no players can be on the map
        setPlayersOnMap([]);
        setSelectedPlayerIds([]);
      }

    } catch (err) {
      console.error('Error loading player management data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerToggle = (userId) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSave = async () => {
    if (!currentMapPath) {
      setError('No map is currently loaded. Please load a map first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const encodedMapPath = encodeURIComponent(currentMapPath);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/parties/${partyInfo.id}/maps/${encodedMapPath}/players`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerIds: selectedPlayerIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update player placement');
      }

      const result = await response.json();
      
      // Update local state
      setPlayersOnMap(result.playersOnMap || []);
      
      // Notify parent component
      if (onPlayersUpdated) {
        onPlayersUpdated(result.playersOnMap || []);
      }

      // Close dialog
      onClose();

    } catch (err) {
      console.error('Error saving player placement:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original state
    const currentPlayerIds = playersOnMap.map(p => p.user_id);
    setSelectedPlayerIds(currentPlayerIds);
    onClose();
  };

  if (!isOpen) return null;

  // Extract filename from map path for display
  const mapFileName = currentMapPath ? currentMapPath.split('/').pop() || currentMapPath : 'Current Map';

  return (
    <div
      ref={windowRef}
      className="fixed bg-stone-800 border border-stone-700 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header - Draggable */}
      <div 
        className="flex items-center justify-between p-4 border-b border-stone-700 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move size={16} className="text-stone-500" />
          <Users size={20} className="text-teal-400" />
          <div>
            <h3 className="text-lg font-medium text-teal-400">Manage Players</h3>
            <p className="text-xs text-stone-400">{mapFileName}</p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="text-stone-400 hover:text-stone-200 transition-colors"
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking close
        >
          <X size={20} />
        </button>
      </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="animate-spin text-teal-400" />
              <span className="ml-2 text-stone-400">Loading party members...</span>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <p className="text-sm text-stone-400 mb-2">
                  Select which party members should be placed on this map:
                </p>
                <div className="text-xs text-stone-500">
                  {selectedPlayerIds.length} of {allMembers.length} members selected
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allMembers.map(member => {
                  const isSelected = selectedPlayerIds.includes(member.user_id);
                  const isCurrentlyOnMap = playersOnMap.some(p => p.user_id === member.user_id);
                  
                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-teal-900 border-teal-600 text-teal-100' 
                          : 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600'
                      }`}
                      onClick={() => handlePlayerToggle(member.user_id)}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <UserCheck size={16} className="text-teal-400" />
                        ) : (
                          <UserX size={16} className="text-stone-500" />
                        )}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="font-medium">{member.username}</div>
                        {isCurrentlyOnMap && (
                          <div className="text-xs text-stone-400">Currently on map</div>
                        )}
                      </div>

                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePlayerToggle(member.user_id)}
                        className="w-4 h-4 text-teal-600 bg-stone-700 border-stone-500 rounded focus:ring-teal-500"
                      />
                    </div>
                  );
                })}
              </div>

              {allMembers.length === 0 && !isLoading && (
                <div className="text-center py-8 text-stone-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No party members found</p>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-stone-700 bg-stone-750">
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-4 py-2 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <Loader size={16} className="animate-spin" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default PlayerManagementDialog;
