import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useMinikubeContext, useRecentOperationsContext } from '../../store/AppContext';

const MinikubeClusterConfigModal = ({ isOpen, onClose }) => {
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const [activeTab, setActiveTab] = useState('select'); // 'select' or 'create'
  const [newClusterName, setNewClusterName] = useState('');

  const {
    minikubeClusters,
    selectedMinikubeCluster,
    minikubeClusterInput,
    minikubeLoading,
    verifyMinikubeCluster,
    fetchMinikubeClusters,
    setSelectedMinikubeCluster,
    setMinikubeClusterInput
  } = minikube;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Fetch clusters when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMinikubeClusters();
    }
  }, [isOpen, fetchMinikubeClusters]);

  const handleSelectAndVerify = async (clusterName) => {
    const verifyId = `verify-minikube-${Date.now()}`;

    try {
      addToRecent({
        id: verifyId,
        title: `Verify Minikube Cluster: ${clusterName}`,
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

      onClose();
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
        environment: 'minikube',
        output: `Creating new Minikube cluster "${newClusterName}"...

This may take several minutes:
- Starting Minikube VM
- Downloading Kubernetes components
- Configuring cluster networking
- Starting cluster services`
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
          `✅ Cluster ${newClusterName} created at ${completionTime}`,
          `Minikube Cluster Created Successfully

✅ Cluster: ${newClusterName}
✅ Status: Running
✅ Ready for CAPI configuration

Completed at ${completionTime}`
        );

        // Refresh cluster list and verify the new cluster
        await fetchMinikubeClusters();
        await handleSelectAndVerify(newClusterName.trim());
      } else {
        throw new Error(data.message || 'Cluster creation failed');
      }
    } catch (error) {
      updateRecentOperationStatus(
        createId,
        `❌ Creation failed: ${error.message}`,
        `Failed to create Minikube cluster

❌ Error: ${error.message}

Please check:
- Minikube is installed
- Docker/Podman is running
- Sufficient system resources available`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Minikube Cluster Configuration</h2>
              <p className="text-sm text-purple-100">Select or create a Minikube cluster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('select')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'select'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Select Existing Cluster
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Create New Cluster
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'select' ? (
            /* Select Existing Cluster Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Select a Minikube cluster to configure for CAPI operations
                </p>
                <button
                  onClick={fetchMinikubeClusters}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                  disabled={minikubeLoading}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${minikubeLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {minikubeLoading ? (
                <div className="text-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-600" />
                  <p className="text-gray-500">Loading clusters...</p>
                </div>
              ) : minikubeClusters.length === 0 ? (
                <div className="text-center py-12 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                  <svg className="h-12 w-12 mx-auto mb-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No Minikube clusters found</p>
                  <p className="text-sm text-gray-500 mt-2">Create a new cluster to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {minikubeClusters.map((cluster) => (
                    <div
                      key={cluster}
                      className="border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer group"
                      onClick={() => handleSelectAndVerify(cluster)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 rounded-lg p-2 group-hover:bg-purple-200 transition-colors">
                            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{cluster}</h4>
                            <p className="text-sm text-gray-500">Click to select and verify</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Create New Cluster Tab */
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Create a new Minikube cluster for CAPI/CAPA testing
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">ℹ️ Before Creating:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure Minikube is installed</li>
                    <li>• Docker or Podman must be running</li>
                    <li>• Minimum 4GB RAM and 2 CPUs recommended</li>
                    <li>• Creation typically takes 3-5 minutes</li>
                  </ul>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cluster Name
                </label>
                <input
                  type="text"
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  placeholder="e.g., capi-test-cluster"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  disabled={minikubeLoading}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Choose a unique name for your cluster
                </p>
              </div>

              <button
                onClick={handleCreateCluster}
                disabled={minikubeLoading || !newClusterName.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-5 w-5" />
                {minikubeLoading ? 'Creating Cluster...' : 'Create and Configure Cluster'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Configuration will verify the cluster and set up CAPI components
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

MinikubeClusterConfigModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MinikubeClusterConfigModal;
