import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component for resource cards
const ResourceNode = ({ data }) => {
  const { label, status, type, details, icon } = data;

  const getStatusColor = () => {
    if (status === 'Ready' || status === 'Active') return 'green';
    if (status === 'Provisioning' || status === 'Configuring' || status === 'Pending')
      return 'amber';
    if (status?.toLowerCase().includes('fail') || status?.toLowerCase().includes('error'))
      return 'red';
    return 'gray';
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    green: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
      icon: 'text-green-600',
    },
    amber: {
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
      icon: 'text-amber-600',
    },
    red: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-600',
    },
    gray: {
      border: 'border-gray-300',
      bg: 'bg-gray-50',
      text: 'text-gray-800',
      badge: 'bg-gray-100 text-gray-800',
      icon: 'text-gray-600',
    },
  };

  const colors = colorClasses[statusColor];

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${colors.border} ${colors.bg} shadow-lg min-w-[200px] hover:shadow-xl transition-shadow duration-200`}
    >
      {/* Header with icon and title */}
      <div className="flex items-center space-x-2 mb-2">
        <span className={`text-2xl ${colors.icon}`}>{icon}</span>
        <div className="flex-1">
          <div className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>
            {type}
          </div>
          <div className="text-sm font-bold text-gray-900 truncate">{label}</div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}
        >
          {status === 'Ready' || status === 'Active' ? (
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : status === 'Provisioning' || status === 'Configuring' || status === 'Pending' ? (
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-1.5 animate-pulse"></div>
          ) : (
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status || 'Unknown'}
        </span>
      </div>

      {/* Details */}
      {details && details.length > 0 && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {details.map((detail, idx) => (
            <div key={idx} className="truncate">
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  resourceNode: ResourceNode,
};

const ProvisioningFlowDiagram = ({ resources = [] }) => {
  // Build nodes and edges from resources
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    // Group resources by type
    const resourcesByType = {
      namespace: resources.filter((r) => r.type === 'Namespace'),
      network: resources.filter((r) => r.type === 'RosaNetwork'),
      roleConfig: resources.filter((r) => r.type === 'RosaRoleConfig'),
      cluster: resources.filter((r) => r.type === 'ROSACluster'),
      controlPlane: resources.filter((r) => r.type === 'RosaControlPlane'),
      secrets: resources.filter((r) => r.type?.includes('Secret')),
      identity: resources.filter((r) => r.type === 'AWSClusterControllerIdentity'),
    };

    let yOffset = 0;
    const verticalSpacing = 180;
    const horizontalSpacing = 300;

    // Layer 1: Namespace (top)
    if (resourcesByType.namespace.length > 0) {
      const ns = resourcesByType.namespace[0];
      nodes.push({
        id: 'namespace',
        type: 'resourceNode',
        position: { x: 200, y: yOffset },
        data: {
          label: ns.name,
          status: ns.status || 'Active',
          type: 'Namespace',
          icon: '📦',
          details: [`Age: ${ns.age || 'N/A'}`],
        },
      });
      yOffset += verticalSpacing;
    }

    // Layer 2: Infrastructure (Network + Identity + Secrets)
    let layer2X = 0;
    const infraIds = [];

    if (resourcesByType.network.length > 0) {
      const network = resourcesByType.network[0];
      const nodeId = `network-${network.name}`;
      infraIds.push(nodeId);
      nodes.push({
        id: nodeId,
        type: 'resourceNode',
        position: { x: layer2X, y: yOffset },
        data: {
          label: network.name,
          status: network.status || 'Configuring',
          type: 'Network',
          icon: '🌐',
          details: [
            network.version ? `Version: ${network.version}` : '',
            `Age: ${network.age || 'N/A'}`,
          ].filter(Boolean),
        },
      });
      if (nodes.find((n) => n.id === 'namespace')) {
        edges.push({
          id: `namespace-${nodeId}`,
          source: 'namespace',
          target: nodeId,
          animated: network.status === 'Configuring',
          style: { stroke: '#7C3AED', strokeWidth: 2 },
        });
      }
      layer2X += horizontalSpacing;
    }

    if (resourcesByType.roleConfig.length > 0) {
      const roleConfig = resourcesByType.roleConfig[0];
      const nodeId = `role-${roleConfig.name}`;
      infraIds.push(nodeId);
      nodes.push({
        id: nodeId,
        type: 'resourceNode',
        position: { x: layer2X, y: yOffset },
        data: {
          label: roleConfig.name,
          status: roleConfig.status || 'Configuring',
          type: 'IAM Roles',
          icon: '🔐',
          details: [
            roleConfig.version ? `Version: ${roleConfig.version}` : '',
            `Age: ${roleConfig.age || 'N/A'}`,
          ].filter(Boolean),
        },
      });
      if (nodes.find((n) => n.id === 'namespace')) {
        edges.push({
          id: `namespace-${nodeId}`,
          source: 'namespace',
          target: nodeId,
          animated: roleConfig.status === 'Configuring',
          style: { stroke: '#7C3AED', strokeWidth: 2 },
        });
      }
      layer2X += horizontalSpacing;
    }

    yOffset += verticalSpacing;

    // Layer 3: ROSA Cluster (center)
    if (resourcesByType.cluster.length > 0) {
      const cluster = resourcesByType.cluster[0];
      const nodeId = `cluster-${cluster.name}`;
      nodes.push({
        id: nodeId,
        type: 'resourceNode',
        position: { x: 150, y: yOffset },
        data: {
          label: cluster.name,
          status: cluster.status || 'Provisioning',
          type: 'ROSA Cluster',
          icon: '☁️',
          details: [
            cluster.version ? `Version: ${cluster.version}` : '',
            `Age: ${cluster.age || 'N/A'}`,
          ].filter(Boolean),
        },
      });

      // Connect infrastructure to cluster
      infraIds.forEach((infraId) => {
        edges.push({
          id: `${infraId}-${nodeId}`,
          source: infraId,
          target: nodeId,
          animated: cluster.status === 'Provisioning',
          style: { stroke: '#EC4899', strokeWidth: 2 },
        });
      });

      yOffset += verticalSpacing;

      // Layer 4: Control Plane (bottom)
      if (resourcesByType.controlPlane.length > 0) {
        const cp = resourcesByType.controlPlane[0];
        const cpId = `cp-${cp.name}`;
        nodes.push({
          id: cpId,
          type: 'resourceNode',
          position: { x: 150, y: yOffset },
          data: {
            label: cp.name,
            status: cp.status || 'Pending',
            type: 'Control Plane',
            icon: '⚙️',
            details: [cp.version ? `Version: ${cp.version}` : '', `Age: ${cp.age || 'N/A'}`].filter(
              Boolean
            ),
          },
        });

        edges.push({
          id: `${nodeId}-${cpId}`,
          source: nodeId,
          target: cpId,
          animated: cp.status === 'Provisioning',
          style: { stroke: '#3B82F6', strokeWidth: 2 },
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [resources]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-lg border-2 border-purple-200 shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#e9d5ff" gap={16} />
        <Controls className="bg-white shadow-lg rounded-lg" />
        <MiniMap
          className="bg-white shadow-lg rounded-lg"
          nodeColor={(node) => {
            const status = node.data?.status || '';
            if (status === 'Ready' || status === 'Active') return '#10B981';
            if (status === 'Provisioning' || status === 'Configuring' || status === 'Pending')
              return '#F59E0B';
            return '#EF4444';
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default ProvisioningFlowDiagram;
