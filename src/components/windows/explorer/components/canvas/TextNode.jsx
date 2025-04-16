import React, { useState, useRef, useEffect } from 'react';
import { getCanvasColor } from '../../utils/canvasUtils';

/**
 * TextNode component renders an individual text node in the canvas
 */
const TextNode = ({
  node,
  selected,
  onSelect,
  onChange,
  onResize,
  onMove,
  scale,
  isEditing,
  onStartEditing,
  onStopEditing
}) => {
  const [localText, setLocalText] = useState(node.text || '');
  const textareaRef = useRef(null);
  const nodeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Update local text when node text changes
  useEffect(() => {
    setLocalText(node.text || '');
  }, [node.text]);

  // Focus the textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Handle mouse down for node selection and drag start
  const handleMouseDown = (e) => {
    e.stopPropagation();
    
    // Select this node
    onSelect(node.id);
    
    // If not already editing, prepare for dragging
    if (!isEditing) {
      setIsDragging(true);
      setInitialPosition({ x: node.x, y: node.y });
      setDragOffset({
        x: e.clientX / scale - node.x,
        y: e.clientY / scale - node.y
      });
    }
  };

  // Handle mouse down on resize handle
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    
    // Start resizing
    setIsResizing(true);
    setInitialSize({ width: node.width, height: node.height });
    setInitialPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setLocalText(newText);
    onChange(node.id, newText);
  };

  // Handle double click to start editing
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    
    // Start editing
    if (!isEditing) {
      onStartEditing(node.id);
    }
  };

  // Handle blur to stop editing
  const handleBlur = () => {
    if (isEditing) {
      onStopEditing();
    }
  };

  // Get the background color
  const bgColor = getCanvasColor(node.color) || '#1e293b';
  const borderColor = selected ? '#14b8a6' : '#334155';

  return (
    <div
      ref={nodeRef}
      className="absolute select-none"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        zIndex: selected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="w-full h-full rounded-md overflow-hidden flex flex-col"
        style={{
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}`,
          boxShadow: selected ? '0 0 0 2px rgba(20, 184, 166, 0.5)' : 'none'
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="w-full h-full p-2 bg-transparent text-white resize-none focus:outline-none"
            value={localText}
            onChange={handleTextChange}
            onBlur={handleBlur}
          />
        ) : (
          <div className="w-full h-full p-2 text-white overflow-auto whitespace-pre-wrap">
            {localText}
          </div>
        )}
        
        {/* Resize handle - only show when selected */}
        {selected && (
          <div
            ref={resizeHandleRef}
            className="absolute bottom-0 right-0 w-4 h-4 bg-teal-500 rounded-tl-md cursor-nwse-resize"
            onMouseDown={handleResizeMouseDown}
          />
        )}
      </div>
    </div>
  );
};

export default TextNode;
