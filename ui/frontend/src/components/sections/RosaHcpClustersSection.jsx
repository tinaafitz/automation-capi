import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  useApp,
  useAppDispatch,
  useApiStatusContext,
  useRecentOperationsContext,
} from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import {
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  buildApiUrl,
  API_ENDPOINTS,
  validateApiResponse,
  extractSafeErrorMessage,
} from '../../config/api';

const RosaHcpClustersSection = ({ theme = 'mce' }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const recentOps = useRecentOperationsContext();
  const { ocpStatus } = apiStatus;
  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          lightBg: 'from-purple-50 to-violet-50',
          lightBorder: 'border-purple-200',
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          lightBg: 'from-cyan-50 to-blue-50',
          lightBorder: 'border-cyan-200',
        };
    }
  };

  const colors = getThemeColors();

  // Cluster monitoring state
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clustersError, setClustersError] = useState(null);

  // Cluster section state
  const getClusterSectionCollapsedState = () => {
    const sectionId = 'capi-rosa-hcp-clusters';
    return app.collapsedSections?.has(sectionId) || false;
  };

  const toggleClusterSection = () => {
    const sectionId = 'capi-rosa-hcp-clusters';
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: sectionId });
  };

  // Fetch clusters function
  const fetchClusters = useCallback(async () => {
    setClustersLoading(true);
    setClustersError(null);
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ROSA_CLUSTERS));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = validateApiResponse(data, ['success']);

      if (validatedData.success) {
        const clusterList = Array.isArray(validatedData.clusters) ? validatedData.clusters : [];
        setClusters(clusterList);
      } else {
        throw new Error(validatedData.message || 'API returned failure status');
      }
    } catch (error) {
      const safeErrorMessage = extractSafeErrorMessage(error);
      setClustersError(safeErrorMessage);
    } finally {
      setClustersLoading(false);
    }
  }, []);

  // Delete cluster function
  const handleDeleteCluster = async (clusterName, namespace) => {
    const deleteId = `delete-cluster-${Date.now()}`;

    // Confirm deletion
    if (
      !window.confirm(
        `Are you sure you want to delete cluster "${clusterName}"?\n\nThis will delete:\n- ROSAControlPlane\n- ROSANetwork (if exists)\n- ROSARoleConfig (if exists)\n- Namespace resources\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      console.log(`🗑️ Deleting cluster: ${clusterName} in namespace: ${namespace}`);

      // IMMEDIATELY show "Deleting..." in Task Summary for instant feedback (BEFORE the API call!)
      addToRecent({
        id: deleteId,
        title: `🗑️ Delete Cluster: ${clusterName}`,
        color: 'bg-red-600',
        status: '🚀 Starting deletion...',
        environment: 'mce',
        output: `Initiating deletion of ROSA HCP cluster "${clusterName}" from namespace "${namespace}"...\n\nSubmitting delete request to backend...\n\nThis will remove:\n- ROSAControlPlane\n- ROSANetwork\n- ROSARoleConfig\n- AWS resources`,
      });

      const apiUrl = buildApiUrl(`/api/rosa/clusters/${clusterName}`);
      console.log(`🌐 DELETE URL: ${apiUrl}`);
      console.log(`📦 Request body:`, { namespace });
      console.log(`⏳ About to send DELETE request...`);

      // Call DELETE API
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ namespace }),
      });

      console.log(`✅ Fetch completed, status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        updateRecentOperationStatus(
          deleteId,
          `✅ Cluster Delete Initiated at ${completionTime}`,
          `ROSA HCP Cluster Deletion Initiated\n\n✅ Delete request submitted for cluster "${clusterName}"\n⏳ Cluster resources are being removed\n⏳ AWS resources cleanup in progress\n\nDeletion initiated at ${completionTime}\n\nNote: The cluster deletion process will continue in the background. Refresh the cluster list to see updated status.`
        );

        // Refresh cluster list
        await fetchClusters();
      } else {
        throw new Error(result.message || 'Failed to delete cluster');
      }
    } catch (error) {
      console.error(`❌ Failed to delete cluster ${clusterName}:`, error);
      console.error(`❌ Error type: ${error.constructor.name}`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Full error:`, error);

      updateRecentOperationStatus(
        deleteId,
        `❌ Cluster deletion failed: ${error.message}`,
        `Failed to delete ROSA HCP cluster "${clusterName}"\n\nError: ${error.message}\n\nPlease check cluster resources and try again.`
      );
    }
  };

  // Load clusters on component mount
  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Clear clusters when connection is lost
  useEffect(() => {
    if (ocpStatus && !ocpStatus.connected) {
      setClusters([]);
      setClustersError(null);
    }
  }, [ocpStatus?.connected]);

  return (
    <div className="space-y-6">
      {/* Title and Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-900">ROSA HCP Clusters</h2>
        <button
          onClick={fetchClusters}
          disabled={clustersLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${clustersLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Cluster List */}
        {clustersError ? (
          <div className="text-center py-8 text-red-600">
            <p className="text-sm">Failed to load clusters</p>
            <p className="text-xs mt-2">{clustersError}</p>
          </div>
        ) : clustersLoading ? (
          <div className="text-center py-8 text-gray-500">
            <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading clusters...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No ROSA HCP clusters found</p>
            <p className="text-xs mt-2">Clusters will appear here when provisioned</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {clusters.map((cluster, idx) => (
              <div
                key={cluster.name || idx}
                className="py-2 px-6 hover:bg-blue-50 transition-colors"
              >
                {/* Cluster Name and Status - Jenkins style */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600 font-medium text-base">
                      {cluster.name}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        cluster.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : cluster.status === 'provisioning'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          cluster.status === 'ready'
                            ? 'bg-green-500'
                            : cluster.status === 'provisioning'
                              ? 'bg-yellow-500 animate-pulse'
                              : 'bg-red-500'
                        }`}
                      ></div>
                      {cluster.status || 'Unknown'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCluster(cluster.name, cluster.namespace)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-500 text-gray-700 hover:text-red-700 text-xs rounded-md transition-all"
                    title={`Delete cluster ${cluster.name}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                {/* Metadata as simple bullet list - Jenkins style */}
                <div className="ml-1">
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>
                      <span className="text-gray-600">Region:</span>{' '}
                      <span className="text-gray-900">{cluster.region || 'N/A'}</span>
                      {cluster.version && (
                        <>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">Version:</span>{' '}
                          <span className="text-gray-900">{cluster.version}</span>
                        </>
                      )}
                      {cluster.namespace && (
                        <>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">Namespace:</span>{' '}
                          <span className="text-gray-900">{cluster.namespace}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

RosaHcpClustersSection.propTypes = {
  theme: PropTypes.string,
};

export default RosaHcpClustersSection;
