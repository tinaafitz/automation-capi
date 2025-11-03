import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export function MinikubeClusterModal({
  isOpen,
  onClose,
  onClusterSelected,
  currentCluster = null,
}) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(currentCluster);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [minikubeInstalled, setMinikubeInstalled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchClusters();
    }
  }, [isOpen]);

  const fetchClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔵 [MinikubeClusterModal] Fetching clusters from backend...');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('http://localhost:8000/api/minikube/list-clusters', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('🔵 [MinikubeClusterModal] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔵 [MinikubeClusterModal] Received cluster data:', data);

      setClusters(data.clusters || []);
      setMinikubeInstalled(data.minikube_installed);

      if (!data.minikube_installed) {
        setError(data.message + '. ' + data.suggestion);
      }
    } catch (err) {
      console.error('🔴 [MinikubeClusterModal] Failed to fetch Minikube clusters:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check if the backend is running on port 8000.');
      } else {
        setError(
          `Failed to connect to backend: ${err.message}. Please ensure the server is running on port 8000.`
        );
      }
    } finally {
      console.log('🔵 [MinikubeClusterModal] Setting loading to false');
      setLoading(false);
    }
  };

  const handleCreateCluster = async () => {
    if (!newClusterName.trim()) {
      setError('Please enter a cluster name');
      return;
    }

    // Validate cluster name (Kubernetes naming conventions)
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!nameRegex.test(newClusterName)) {
      setError('Cluster name must be lowercase alphanumeric with hyphens (no spaces)');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Add timeout for cluster creation (match backend timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 360000); // 6 minute timeout (backend has 5 min)

      const response = await fetch('http://localhost:8000/api/minikube/create-cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: newClusterName,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setCreating(false);
        // Refresh cluster list
        await fetchClusters();
        setShowCreateNew(false);
        setNewClusterName('');
        setSelectedCluster(newClusterName);
        // Auto-configure the new cluster with CAPI/CAPA
        // Note: handleSelectAndConfigure manages its own loading state
        await handleSelectAndConfigure(newClusterName);
      } else {
        setError(data.message || 'Failed to create cluster');
        setCreating(false);
      }
    } catch (err) {
      console.error('Failed to create Minikube cluster:', err);
      setError('Failed to create cluster. Please check the backend logs.');
      setCreating(false);
    }
  };

  const handleSelectAndConfigure = async (clusterName) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Verify cluster exists and is accessible (with 2 minute timeout)
      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 120000); // 2 minute timeout

      const verifyResponse = await fetch('http://localhost:8000/api/minikube/verify-cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster_name: clusterName }),
        signal: controller1.signal,
      });
      clearTimeout(timeoutId1);
      const verifyData = await verifyResponse.json();

      if (!verifyData.exists || !verifyData.accessible) {
        setError(verifyData.message || 'Cluster verification failed');
        setLoading(false);
        return;
      }

      // Step 2: Initialize CAPI/CAPA on the cluster (with 10 minute timeout)
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 600000); // 10 minute timeout

      const initResponse = await fetch('http://localhost:8000/api/minikube/initialize-capi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster_name: clusterName }),
        signal: controller2.signal,
      });
      clearTimeout(timeoutId2);
      const initData = await initResponse.json();

      if (!initData.success) {
        setError(initData.message || 'Failed to initialize CAPI/CAPA');
        setLoading(false);
        return;
      }

      // Step 3: Re-verify cluster after initialization (with 2 minute timeout)
      const controller3 = new AbortController();
      const timeoutId3 = setTimeout(() => controller3.abort(), 120000); // 2 minute timeout

      const finalVerifyResponse = await fetch('http://localhost:8000/api/minikube/verify-cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster_name: clusterName }),
        signal: controller3.signal,
      });
      clearTimeout(timeoutId3);
      const finalVerifyData = await finalVerifyResponse.json();

      if (finalVerifyData.exists && finalVerifyData.accessible) {
        onClusterSelected({
          cluster_name: clusterName,
          verificationData: finalVerifyData,
        });
        onClose();
      } else {
        setError('Cluster configuration completed but verification failed');
      }
    } catch (err) {
      console.error('Failed to configure Minikube cluster:', err);
      if (err.name === 'AbortError') {
        setError(
          'Configuration timed out. The cluster verification is taking longer than expected.'
        );
      } else {
        setError('Failed to configure cluster. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configure Minikube Cluster</h2>
            <p className="text-purple-100 text-sm mt-1">
              Select an existing cluster or create a new one
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!minikubeInstalled && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">Minikube Not Installed</p>
              <p className="text-sm text-yellow-700 mb-3">
                Install Minikube to create and manage local Kubernetes clusters:
              </p>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-400 text-sm font-mono">
                  # macOS
                  <br />
                  brew install minikube
                  <br />
                  <br />
                  # Linux
                  <br />
                  curl -LO
                  https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
                  <br />
                  sudo install minikube-linux-amd64 /usr/local/bin/minikube
                </code>
              </div>
              <a
                href="https://minikube.sigs.k8s.io/docs/start/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View Installation Guide →
              </a>
            </div>
          )}

          {loading && !creating ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading clusters...</span>
            </div>
          ) : (
            <>
              {/* Existing Clusters */}
              {clusters.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-purple-600 mr-2" />
                    Existing Clusters ({clusters.length})
                  </h3>
                  <div className="space-y-2">
                    {clusters.map((cluster) => (
                      <button
                        key={cluster}
                        onClick={() => setSelectedCluster(cluster)}
                        disabled={loading}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedCluster === cluster
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                selectedCluster === cluster
                                  ? 'border-purple-600 bg-purple-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedCluster === cluster && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <p className="font-mono text-sm font-semibold text-gray-900">
                                {cluster}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">Click to select</p>
                            </div>
                          </div>
                          {currentCluster === cluster && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                              Current
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clusters.length === 0 && minikubeInstalled && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No Minikube clusters found</p>
                  <p className="text-xs mt-1">Create a new cluster to get started</p>
                </div>
              )}

              {/* Create New Cluster Section */}
              {minikubeInstalled && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={() => setShowCreateNew(!showCreateNew)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-all"
                  >
                    <div className="flex items-center">
                      <div className="bg-purple-600 rounded-lg p-2 mr-3">
                        <PlusIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-purple-900">Create New Cluster</p>
                        <p className="text-xs text-purple-700">
                          Set up a fresh Minikube cluster for testing
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-purple-600 transition-transform ${showCreateNew ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showCreateNew && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Cluster Name
                      </label>
                      <input
                        type="text"
                        value={newClusterName}
                        onChange={(e) => setNewClusterName(e.target.value)}
                        placeholder="e.g., rosa-test-cluster"
                        disabled={creating}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use lowercase letters, numbers, and hyphens only
                      </p>

                      <button
                        onClick={handleCreateCluster}
                        disabled={creating || !newClusterName.trim()}
                        className="mt-4 w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {creating ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                            Creating cluster...
                          </>
                        ) : (
                          <>
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Cluster
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={fetchClusters}
            disabled={loading}
            className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            {selectedCluster && !showCreateNew && (
              <button
                onClick={() => handleSelectAndConfigure(selectedCluster)}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Configuring {selectedCluster}...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Configure Cluster
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
