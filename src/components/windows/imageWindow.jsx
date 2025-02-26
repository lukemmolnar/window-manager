import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import dhakmir from '../../assets/dhakmir-01.png';  // Default image
import martell from '../../assets/Martell2.png';    // Alternative image

const ImageWindow = ({ nodeId, onCommand, windowState, updateWindowState }) => {
  // Use state from windowState or initialize with defaults
  const [imageSrc, setImageSrc] = useState(windowState?.imageSrc || dhakmir);
  const [imageAlt, setImageAlt] = useState(windowState?.imageAlt || 'dhakmir');

  // Update window state when image changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        imageSrc,
        imageAlt
      });
    }
  }, [imageSrc, imageAlt, updateWindowState]);

  // Handle image switching command
  const handleImageCommand = (command) => {
    if (command === 'switch') {
      if (imageSrc === dhakmir) {
        setImageSrc(martell);
        setImageAlt('martell');
      } else {
        setImageSrc(dhakmir);
        setImageAlt('dhakmir');
      }
      return true;
    }
    return false;
  };

  return (
    <div className="h-full w-full flex flex-col bg-stone-900">
      {/* Container div with relative positioning */}
      <div className="flex-1 relative">
        {/* Image absolutely positioned to fill space while staying centered */}
        <img 
          src={imageSrc} 
          alt={imageAlt} 
          className="absolute inset-0 w-full h-full object-contain m-auto"
        />
      </div>

      {/* Command input */}
      <div className="p-4 flex items-center gap-2">
        <span className="text-teal-400">$</span>
        <input
          type="text"
          className="flex-1 bg-transparent outline-none text-teal-400 font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              const command = e.target.value.trim();
              // First try our custom image commands
              const handled = handleImageCommand(command);
              // If not handled, pass to the general command handler
              if (!handled) {
                onCommand(command);
              }
              e.target.value = '';
            }
          }}
        />
      </div>
      <div className="p-2 text-xs text-teal-600 text-center">
        Type "switch" to toggle between images
      </div>
    </div>
  );
};

export default ImageWindow;
