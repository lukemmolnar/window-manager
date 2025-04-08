import React from 'react';

const StorageStats = ({ stats, isAdmin }) => {
  // If stats aren't available yet or the user doesn't have file access, don't show anything
  if (!stats || stats.isLoading) {
    return null;
  }

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    if (bytes === null || bytes === undefined) return 'Unlimited';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Calculate percentage used
  const percentUsed = stats.unlimited ? 0 : Math.min(100, Math.round((stats.used / stats.quota) * 100)) || 0;
  
  return (
    <div className="px-2 py-1 bg-stone-800 text-xs border-t border-stone-700">
      <div className="flex justify-between items-center ${isAdmin ? 'mb-0' : 'mb-1'}">
        <span className="text-gray-400">Storage:</span>
        <span className="text-teal-400">
          {stats.unlimited 
            ? 'Unlimited (Admin)'
            : `${formatBytes(stats.used)} of ${formatBytes(stats.quota)}`
          }
        </span>
      </div>
      
      {!stats.unlimited && (
        <div className="w-full bg-stone-700 rounded-full h-1.5 mb-1">
          <div 
            className="bg-teal-600 h-1.5 rounded-full" 
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default StorageStats;
