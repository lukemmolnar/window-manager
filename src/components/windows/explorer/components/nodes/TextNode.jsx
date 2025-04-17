import React, { useState } from 'react';
import { Edit } from 'lucide-react';
import { Handle, Position } from 'reactflow';

/**
 * TextNode component for displaying and editing text nodes in the canvas
 * This component is used in the Canvas Editor
 */
const TextNode = ({ id, data, isConnectable, setEditingNode, editingNode }) => {
  const isEditing = editingNode === id;
  const [isHovered, setIsHovered] = useState(false);
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingNode(id);
  };
  
  const handleEdit = (e) => {
    const updatedText = e.target.value;
    
    // Update the node data is handled by the parent component
    // through the setNodes function passed via data
    if (data.onChange) {
      data.onChange(id, updatedText);
    }
  };
  
  const handleBlur = () => {
    setEditingNode(null);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditingNode(null);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      setEditingNode(null);
    }
  };
  
  return (
    <div 
      className="p-2 bg-stone-800 border border-stone-700 rounded shadow-md relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle 
        type="source" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        style={{ 
          background: '#14b8a6', // teal-500 color
          width: '0.45rem',
          height: '0.45rem',
          borderRadius: '9999px',
          border: 'none'
        }}
      />

      {/* Bottom handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        style={{ 
          background: '#14b8a6', // teal-500 color
          width: '0.45rem',
          height: '0.45rem',
          borderRadius: '9999px',
          border: 'none'
        }}
      />

      {/* Right handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        isConnectable={isConnectable} 
        style={{ 
          background: '#14b8a6', // teal-500 color
          width: '0.45rem',
          height: '0.45rem',
          borderRadius: '9999px',
          border: 'none'
        }}
      />

      {/* Left handle */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left"
        isConnectable={isConnectable} 
        style={{ 
          background: '#14b8a6', // teal-500 color
          width: '0.45rem',
          height: '0.45rem',
          borderRadius: '9999px',
          border: 'none'
        }}
      />
      {isEditing ? (
        <textarea
          className="w-full h-full bg-stone-700 text-teal-400 p-2 rounded font-mono text-sm focus:outline-none resize-none min-h-[80px]"
          value={data.text}
          onChange={handleEdit}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <>
          <div className="text-teal-400 text-sm whitespace-pre-wrap pr-6">{data.text}</div>
          {isHovered && (
            <button
              className="absolute top-1 right-1 bg-stone-700 p-1 rounded-sm hover:bg-stone-600 transition-colors"
              onClick={handleEditClick}
              title="Edit node"
            >
              <Edit size={14} className="text-teal-400" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TextNode;
