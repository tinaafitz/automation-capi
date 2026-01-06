import React, { useState, useEffect, useCallback } from 'react';
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
        title: `🗑️ DELETE CLUSTER: ${clusterName}`,
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
    <div className="mb-6">
      <div
        className="bg-white rounded-xl shadow-lg border-2 border-cyan-200 overflow-hidden"
        data-section-id="capi-rosa-hcp-clusters"
      >
        <div
          onClick={toggleClusterSection}
          className={`flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r ${colors.headerGradient} ${colors.hoverGradient} transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">CAPI-Managed ROSA HCP Clusters</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchClusters();
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
              disabled={clustersLoading}
            >
              <ArrowPathIcon className={`h-4 w-4 ${clustersLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="p-0.5">
              {getClusterSectionCollapsedState() ? (
                <ChevronDownIcon className="h-5 w-5 text-white" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {!getClusterSectionCollapsedState() && (
          <div className="p-6">
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
              <div className="space-y-3">
                {clusters.map((cluster, idx) => (
                  <div
                    key={cluster.name || idx}
                    className={`flex items-center justify-between p-4 bg-gradient-to-r ${colors.lightBg} rounded-lg border ${colors.lightBorder} transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          cluster.status === 'ready'
                            ? 'bg-green-500'
                            : cluster.status === 'provisioning'
                              ? 'bg-yellow-500 animate-pulse'
                              : 'bg-red-500'
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-cyan-900 truncate">{cluster.name}</div>
                        <div className="text-sm text-cyan-700 mt-1">
                          State: {cluster.status || 'Unknown'}
                          {cluster.status === 'provisioning' && cluster.progress !== undefined && (
                            <span className="ml-2 font-medium">({cluster.progress}%)</span>
                          )}
                        </div>
                        {cluster.version && (
                          <div className="text-xs text-gray-600 mt-1">
                            Version: {cluster.version}
                          </div>
                        )}
                        {/* Display error message for failed clusters */}
                        {cluster.status === 'failed' && cluster.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="font-semibold text-red-800 mb-1">
                              ❌ {cluster.error_reason || 'Error'}
                            </div>
                            <div className="text-red-700">{cluster.error_message}</div>
                          </div>
                        )}
                        {/* Progress bar for provisioning clusters */}
                        {cluster.status === 'provisioning' && cluster.progress !== undefined && (
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${cluster.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <div className="text-xs text-cyan-600">{cluster.region || 'N/A'}</div>
                      <button
                        onClick={() => handleDeleteCluster(cluster.name, cluster.namespace)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title={`Delete cluster ${cluster.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RosaHcpClustersSection;
