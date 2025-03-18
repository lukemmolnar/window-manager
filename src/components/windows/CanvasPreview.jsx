import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import nodeTypes from '../../utils/canvasNodeTypes';

const CanvasPreview = ({ fileContent, nodeTypes: propNodeTypes }) => {
  // Parse the canvas data
  let canvasData;
  try {
    canvasData = JSON.parse(fileContent);
  } catch (error) {
    return (
      <div className="text-red-400 p-4">
        <p>Error parsing canvas file: {error.message}</p>
        <p className="mt-2">Raw content:</p>
        <pre className="font-mono text-sm whitespace-pre-wrap mt-2 bg-stone-800 p-2 rounded">
          {fileContent}
        </pre>
      </div>
    );
  }

  // Memoize the nodeTypes to prevent recreation on each render
  const memoizedNodeTypes = useMemo(() => propNodeTypes || nodeTypes, [propNodeTypes]);
  
  // Use React Flow hooks at the top level of the component
  const [nodes, setNodes] = useNodesState(canvasData.nodes || []);
  const [edges, setEdges] = useEdgesState(canvasData.edges || []);
  
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={memoizedNodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
      <Background color="#44403c" gap={16} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          switch (node.type) {
            case 'group':
              return node.data.color ? `rgba(${node.data.color}, 0.6)` : 'rgba(20, 184, 166, 0.6)';
            default:
              return '#14b8a6';
          }
        }}
        maskColor="rgba(0, 0, 0, 0.5)"
        style={{ backgroundColor: '#292524' }}
      />
      </ReactFlow>
    </div>
  );
};

export default CanvasPreview;
