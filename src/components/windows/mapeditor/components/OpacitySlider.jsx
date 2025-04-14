import React, { useState, useRef, useEffect } from 'react';
import '../styles/RangeSlider.css';

/**
 * Custom OpacitySlider component that provides better interaction handling
 * than the standard HTML range input in complex UI scenarios.
 */
const OpacitySlider = ({ value, onChange, className = '' }) => {
  // Refs for DOM elements
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const containerRef = useRef(null);
  
  // State to track dragging status
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || 1.0);
  
  // Update display value when prop changes
  useEffect(() => {
    setDisplayValue(value || 1.0);
  }, [value]);
  
  // Calculate position based on value (0-1)
  const getThumbPosition = (val) => {
    return `${val * 100}%`;
  };
  
  // Calculate value from mouse/touch position
  const calculateValueFromPosition = (clientX) => {
    if (!trackRef.current) return 0;
    
    const rect = trackRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    const offset = clientX - rect.left;
    
    // Calculate value (0-1) based on position
    let newValue = offset / trackWidth;
    
    // Clamp value between 0 and 1
    newValue = Math.max(0, Math.min(1, newValue));
    
    // Round to nearest 0.05
    return Math.round(newValue * 20) / 20;
  };
  
  // Handle mouse/touch down
  const handleStart = (clientX) => {
    setIsDragging(true);
    const newValue = calculateValueFromPosition(clientX);
    setDisplayValue(newValue);
    if (onChange) onChange(newValue);
    
    // Add document-level event listeners
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);
  };
  
  // Handle mouse/touch move
  const handleMove = (e) => {
    if (!isDragging) return;
    const newValue = calculateValueFromPosition(e.clientX);
    setDisplayValue(newValue);
    if (onChange) onChange(newValue);
  };
  
  // Handle touch move with proper event handling
  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches[0]) return;
    const newValue = calculateValueFromPosition(e.touches[0].clientX);
    setDisplayValue(newValue);
    if (onChange) onChange(newValue);
  };
  
  // Handle mouse/touch up - end dragging
  const handleEnd = () => {
    setIsDragging(false);
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleEnd);
  };
  
  // Handle mouse down on track/thumb
  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleStart(e.clientX);
  };
  
  // Handle touch start on track/thumb
  const handleTouchStart = (e) => {
    e.stopPropagation();
    if (e.touches[0]) {
      handleStart(e.touches[0].clientX);
    }
  };

  return (
    <div 
      className={`custom-slider-container ${className}`}
      ref={containerRef}
      onClick={e => e.stopPropagation()}
    >
      {/* Display percentage value */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-400" title="Adjust layer transparency">
          Opacity:
        </span>
        <span className="text-xs font-medium text-teal-300">
          {Math.round(displayValue * 100)}%
        </span>
      </div>
      
      {/* Slider track and thumb */}
      <div 
        className="custom-slider-track"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${displayValue * 100}%, #44403c ${displayValue * 100}%, #44403c 100%)`
        }}
      >
        {/* Draggable thumb */}
        <div
          className="custom-slider-thumb"
          ref={thumbRef}
          style={{ left: getThumbPosition(displayValue) }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      </div>
    </div>
  );
};

export default OpacitySlider;
