import React, { useState, useEffect, useCallback } from 'react';
import { useApp, useAppDispatch, useApiStatusContext } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { ChartBarIcon, ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { buildApiUrl, API_ENDPOINTS, validateApiResponse, extractSafeErrorMessage } from '../../config/api';

const RosaHcpClustersSection = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const { ocpStatus } = apiStatus;

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
          className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-colors"
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
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 transition-all duration-200 hover:shadow-md"
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
                        <div className="font-semibold text-cyan-900 truncate">
                          {cluster.name}
                        </div>
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
                    <div className="text-xs text-cyan-600 ml-4 flex-shrink-0">
                      {cluster.region || 'N/A'}
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
