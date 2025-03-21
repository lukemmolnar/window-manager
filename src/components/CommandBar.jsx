import React, { useEffect, useRef } from 'react';
import { useAnnouncement } from '../context/AnnouncementContext';

export const CommandBar = ({ 
  currentWorkspaceIndex = 0,
  switchWorkspace,
  user,
  onLogout
}) => {
  console.log('CommandBar render, currentWorkspaceIndex:', currentWorkspaceIndex);
  const { announcement } = useAnnouncement();
  const announcementRef = useRef(null);
  const containerRef = useRef(null);

  // Carousel effect for long announcements with consistent speed
  useEffect(() => {
    if (!announcement || !announcementRef.current || !containerRef.current) return;
    
    const textElement = announcementRef.current;
    const containerElement = containerRef.current;
    const isOverflowing = textElement.scrollWidth > containerElement.clientWidth;
    
    if (isOverflowing) {
      // Fixed animation duration of 15 seconds
      textElement.style.animation = 'scroll-text 40s linear infinite';
    } else {
      textElement.style.animation = 'none';
    }
  }, [announcement]);

  return (
    <div className="w-full bg-stone-800 p-2 flex items-center gap-2">
      <div className="flex gap-2 items-center pr-2 border-r border-stone-600">
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 0 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(0)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 1 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(1)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 2 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(2)} />
        <div className={`rounded-full cursor-pointer ${currentWorkspaceIndex === 3 ? 'w-3 h-3 bg-teal-400' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'}`} onClick={() => typeof switchWorkspace === 'function' && switchWorkspace(3)} />
      </div>
      
      {/* Announcement section with improved container */}
      <div ref={containerRef} className="flex-1 announcement-container">
        {announcement ? (
          <div 
            ref={announcementRef}
            className="announcement-text text-teal-300 text-sm font-mono"
          >
            {announcement}
          </div>
        ) : (
          <div className="text-gray-500 text-sm font-mono italic">No announcements</div>
        )}
      </div>
      
      {/* User info and logout */}
      {user && (
        <div className="flex items-center border-l border-stone-600 ml-2 pl-2">
          <span className="text-white text-sm font-mono mr-2">
            {user?.username || 'User'}
          </span>
          <button 
            onClick={onLogout}
            className="bg-stone-700 hover:bg-stone-600 text-white text-sm px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default CommandBar;
