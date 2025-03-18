import React, { memo } from 'react';

// Text Node component
const TextNode = memo(({ data }) => {
  return (
    <div className="p-3 bg-stone-800 rounded-md border border-teal-600 text-stone-200 shadow-lg">
      <div className="text-sm whitespace-pre-wrap break-words">{data.text}</div>
    </div>
  );
});

// Group Node component
const GroupNode = memo(({ data }) => {
  return (
    <div 
      className="p-3 rounded-md border border-dashed shadow-inner"
      style={{ 
        borderColor: `rgba(${data.color || '20, 184, 166'}, 0.7)`,
        backgroundColor: `rgba(${data.color || '20, 184, 166'}, 0.1)`
      }}
    >
      <div 
        className="font-medium text-sm mb-1"
        style={{ color: `rgba(${data.color || '20, 184, 166'}, 1)` }}
      >
        {data.label || 'Group'}
      </div>
    </div>
  );
});

// Export a memoized object of node types to avoid recreation on each render
const nodeTypes = {
  text: TextNode,
  group: GroupNode
};

export default nodeTypes;
