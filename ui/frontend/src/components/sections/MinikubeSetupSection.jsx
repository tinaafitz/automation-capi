import React, { useState } from 'react';
import { useMinikubeContext, useRecentOperationsContext } from '../../store/AppContext';

const MinikubeSetupSection = () => {
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');

  const {
    minikubeClusters,
    selectedMinikubeCluster,
    minikubeClusterInput,
    minikubeVerificationResult,
    minikubeLoading,
    verifyMinikubeCluster,
    fetchMinikubeClusters,
    setSelectedMinikubeCluster,
    setMinikubeClusterInput
  } = minikube;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

  const handleVerifyCluster = async () => {
    const clusterName = selectedMinikubeCluster || minikubeClusterInput;
    if (!clusterName) {
      alert('Please select or enter a cluster name');
      return;
    }

    const verifyId = `verify-minikube-${Date.now()}`;
    
    try {
      addToRecent({
        id: verifyId,
        title: 'Verify Minikube Cluster',
        color: 'bg-purple-600',
        status: '⏳ Verifying...',
        environment: 'minikube'
      });

      await verifyMinikubeCluster(clusterName);
      
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      
      updateRecentOperationStatus(
        verifyId,
        `✅ Cluster ${clusterName} verified at ${completionTime}`
      );
    } catch (error) {
      updateRecentOperationStatus(
        verifyId,
        `❌ Verification failed: ${error.message}`
      );
    }
  };

  const handleCreateCluster = async () => {
    if (!newClusterName.trim()) {
      alert('Please enter a cluster name');
      return;
    }

    const createId = `create-minikube-${Date.now()}`;
    
    try {
      addToRecent({
        id: createId,
        title: `Create Minikube Cluster: ${newClusterName}`,
        color: 'bg-purple-600',
        status: '⏳ Creating...',
        environment: 'minikube'
      });

      const response = await fetch('http://localhost:8000/api/minikube/create-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_name: newClusterName.trim() }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        
        updateRecentOperationStatus(
          createId,
          `✅ Cluster ${newClusterName} created at ${completionTime}`
        );
        
        // Refresh cluster list and set as selected
        await fetchMinikubeClusters();
        setSelectedMinikubeCluster(newClusterName.trim());
        setNewClusterName('');
        setShowCreateForm(false);
      } else {
        throw new Error(data.message || 'Cluster creation failed');
      }
    } catch (error) {
      updateRecentOperationStatus(
        createId,
        `❌ Creation failed: ${error.message}`
      );
    }
  };

  const handleRefreshClusters = async () => {
    await fetchMinikubeClusters();
  };

  return (
    <div className="mb-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border-2 border-purple-200 p-6">
      <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
        <span className="text-xl mr-2">⚡</span>
        Minikube Cluster Setup
      </h3>

      {/* Existing Clusters */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-purple-700 mb-2">
          Available Minikube Clusters:
        </label>
        <div className="flex items-center gap-2 mb-2">
          <select
            value={selectedMinikubeCluster}
            onChange={(e) => setSelectedMinikubeCluster(e.target.value)}
            className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={minikubeLoading}
          >
            <option value="">Select a cluster...</option>
            {minikubeClusters.map((cluster) => (
              <option key={cluster} value={cluster}>
                {cluster}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefreshClusters}
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
            disabled={minikubeLoading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Manual Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-purple-700 mb-2">
          Or enter cluster name manually:
        </label>
        <input
          type="text"
          value={minikubeClusterInput}
          onChange={(e) => setMinikubeClusterInput(e.target.value)}
          placeholder="Enter Minikube cluster name..."
          className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          disabled={minikubeLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleVerifyCluster}
          disabled={minikubeLoading || (!selectedMinikubeCluster && !minikubeClusterInput)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {minikubeLoading ? '⏳ Verifying...' : '✓ Verify Cluster'}
        </button>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors"
        >
          + Create New Cluster
        </button>
      </div>

      {/* Create New Cluster Form */}
      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
          <h4 className="font-medium text-purple-900 mb-2">Create New Minikube Cluster</h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newClusterName}
              onChange={(e) => setNewClusterName(e.target.value)}
              placeholder="Enter new cluster name..."
              className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={handleCreateCluster}
              disabled={!newClusterName.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Verification Result */}
      {minikubeVerificationResult && (
        <div className={`p-4 rounded-lg border ${
          minikubeVerificationResult.success
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="font-medium">
            {minikubeVerificationResult.success ? '✅ Success!' : '❌ Error'}
          </div>
          <div className="text-sm mt-1">
            {minikubeVerificationResult.message}
          </div>
          {minikubeVerificationResult.cluster_info && (
            <div className="mt-2 text-xs">
              <div>Cluster: {minikubeVerificationResult.cluster_info.name}</div>
              <div>Status: {minikubeVerificationResult.cluster_info.status}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MinikubeSetupSection;