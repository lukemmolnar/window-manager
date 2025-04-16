import { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';

function TextUpdaterNode({ data, isConnectable }) {
  const onChange = useCallback((evt) => {
    console.log('node text changed to:', evt.target.value);
    
    // Call the onChange handler provided in the node data
    if (data.onChange) {
      data.onChange(data.id, evt.target.value);
    }
  }, [data]);

  return (
    <div className="p-2 bg-stone-800 border border-stone-700 rounded shadow-md text-updater-node">
      {/* Input node has a handle on top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
      />
      
      <div className="p-1">
        <label htmlFor="text" className="block text-xs text-teal-400 mb-1">Node Text:</label>
        <input
          id="text"
          name="text"
          className="w-full bg-stone-700 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none nodrag"
          value={data.text || ''}
          onChange={onChange}
        />
      </div>
      
      {/* Output node has a handle on the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ left: 10 }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ right: 10 }}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export default TextUpdaterNode;