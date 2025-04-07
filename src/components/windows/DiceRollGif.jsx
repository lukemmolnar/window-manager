import React, { useEffect, useRef, useState } from 'react';

/**
 * Component to display dice roll GIF with animation completion detection
 */
const DiceRollGif = ({ src, onAnimationComplete }) => {
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // When the image loads, start tracking animation completion
  const handleImageLoad = () => {
    setIsLoaded(true);
  };
  
  // Effect to handle animation completion
  useEffect(() => {
    if (!isLoaded || !imgRef.current) return;
    
    // Create a temporary canvas to analyze the GIF
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set a timeout that slightly exceeds typical GIF durations
    // This is a fallback in case we can't detect the exact animation end
    const timeoutId = setTimeout(() => {
      onAnimationComplete();
    }, 3000); // 3 seconds should be enough for most dice roll animations
    
    // For a more accurate approach (future improvement):
    // We could load the GIF via a GIF parsing library to get exact duration
    // Or track the animation via requestAnimationFrame and pixel comparison

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoaded, onAnimationComplete]);
  
  return (
    <img 
      ref={imgRef}
      src={src} 
      alt="Rolling dice" 
      className="inline-block max-w-full h-32"
      onLoad={handleImageLoad}
    />
  );
};

export default DiceRollGif;
