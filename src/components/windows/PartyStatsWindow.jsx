import React, { useState, useEffect } from 'react';
import { Users, Eye, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_CONFIG from '../../config/api';
import axios from 'axios';

const PartyStatsWindow = () => {
  const { user } = useAuth();
  const [party, setParty] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [viewDistance, setViewDistance] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch party stats data
  const fetchPartyStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get current party
      const token = localStorage.getItem('auth_token');
      const partyResponse = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARTIES}/current`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!partyResponse.data || partyResponse.data.message === 'Not in a party') {
        setError('You are not currently in a party');
        return;
      }

      const currentParty = partyResponse.data;
      setParty(currentParty);

      // Check if user is the DM (party creator)
      if (currentParty.creator_id !== user.id) {
        setError('Access denied: Only the party DM can view stats');
        return;
      }

      // Fetch player stats for this party
      const statsResponse = await axios.get(
        `${API_CONFIG.BASE_URL}/player-stats/${currentParty.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (statsResponse.data.success) {
        setPlayerStats(statsResponse.data.playerStats);
        
        // Auto-select first player if any exist
        if (statsResponse.data.playerStats.length > 0) {
          const firstPlayer = statsResponse.data.playerStats[0];
          setSelectedPlayerId(firstPlayer.user_id);
          setSelectedPlayerStats(firstPlayer);
          setViewDistance(firstPlayer.view_distance);
        }
      } else {
        setError('Failed to fetch player stats');
      }
    } catch (err) {
      console.error('Error fetching party stats:', err);
      if (err.response?.status === 403) {
        setError('Access denied: Only the party DM can view stats');
      } else if (err.response?.status === 404) {
        setError('Party not found');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch party stats');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle player selection change
  const handlePlayerChange = (playerId) => {
    const playerStat = playerStats.find(p => p.user_id === parseInt(playerId));
    if (playerStat) {
      setSelectedPlayerId(parseInt(playerId));
      setSelectedPlayerStats(playerStat);
      setViewDistance(playerStat.view_distance);
    }
  };

  // Save view distance for selected player
  const saveViewDistance = async () => {
    if (!selectedPlayerId || !party) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/player-stats/${party.id}/${selectedPlayerId}`,
        { view_distance: viewDistance },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update local state
        setPlayerStats(prevStats => 
          prevStats.map(p => 
            p.user_id === selectedPlayerId 
              ? { ...p, view_distance: viewDistance }
              : p
          )
        );
        setSelectedPlayerStats(prev => ({ ...prev, view_distance: viewDistance }));
        
        // Show success briefly
        const savedElement = document.querySelector('.save-success');
        if (savedElement) {
          savedElement.style.opacity = '1';
          setTimeout(() => {
            savedElement.style.opacity = '0';
          }, 2000);
        }
      } else {
        setError('Failed to save view distance');
      }
    } catch (err) {
      console.error('Error saving view distance:', err);
      setError(err.response?.data?.message || 'Failed to save view distance');
    } finally {
      setSaving(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPartyStats();
  }, []);

  return (
    <div className="h-full flex flex-col bg-stone-900 text-teal-400">
      {/* Header */}
      <div className="flex-shrink-0 p-2 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span className="text-sm font-mono">Party Stats</span>
          {party && (
            <span className="text-xs bg-amber-800 text-amber-200 px-2 py-1 rounded">
              {party.name}
            </span>
          )}
        </div>
        <button
          onClick={fetchPartyStats}
          disabled={loading}
          className="p-1 rounded hover:bg-stone-700 text-teal-400 hover:text-teal-300 transition-colors"
          title="Refresh party stats"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-2 text-stone-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading party stats...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Player Selection */}
            <div>
              <label htmlFor="player-select" className="block text-sm font-medium text-teal-300 mb-2">
                Select Player
              </label>
              <select
                id="player-select"
                value={selectedPlayerId || ''}
                onChange={(e) => handlePlayerChange(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-teal-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="" disabled>
                  {playerStats.length === 0 ? 'No players found' : 'Choose a player...'}
                </option>
                {playerStats.map((player) => (
                  <option key={player.user_id} value={player.user_id}>
                    {player.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats Display */}
            {selectedPlayerStats && (
              <div className="border border-stone-600 rounded-lg p-4 bg-stone-800">
                <h3 className="text-lg font-medium text-teal-200 mb-4">
                  Stats for {selectedPlayerStats.username}
                </h3>
                
                {/* View Distance Setting */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-4 h-4 text-teal-300" />
                      <label htmlFor="view-distance" className="text-sm font-medium text-teal-300">
                        View Distance
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        id="view-distance"
                        min="1"
                        max="20"
                        value={viewDistance}
                        onChange={(e) => setViewDistance(parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 bg-stone-700 border border-stone-600 text-teal-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={viewDistance}
                        onChange={(e) => setViewDistance(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-stone-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="text-sm text-stone-400 w-16">
                        {viewDistance} tile{viewDistance !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      How far the player can see on the map (1-20 tiles)
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={saveViewDistance}
                      disabled={saving || viewDistance === selectedPlayerStats.view_distance}
                      className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-stone-800 disabled:bg-stone-600 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    {viewDistance !== selectedPlayerStats.view_distance && (
                      <span className="text-sm text-amber-400 font-medium">
                        Unsaved changes
                      </span>
                    )}
                    <span className="save-success text-sm text-green-400 font-medium opacity-0 transition-opacity duration-200">
                      Saved successfully!
                    </span>
                  </div>
                </div>

                {/* Player Info */}
                <div className="mt-6 pt-4 border-t border-stone-600">
                  <h4 className="text-sm font-medium text-teal-300 mb-2">Player Information</h4>
                  <div className="text-sm text-stone-300 space-y-1">
                    <div>Username: <span className="font-medium text-teal-200">{selectedPlayerStats.username}</span></div>
                    <div>User ID: <span className="font-medium text-teal-200">{selectedPlayerStats.user_id}</span></div>
                    <div>
                      Last Updated: <span className="font-medium text-teal-200">
                        {selectedPlayerStats.updated_at 
                          ? new Date(selectedPlayerStats.updated_at).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {playerStats.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-teal-200 mb-2">No Players Found</h3>
                <p className="text-stone-400">
                  This party doesn't have any members yet. Add players to the party to manage their stats.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyStatsWindow;
