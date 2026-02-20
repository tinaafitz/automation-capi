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

  // Deletion state
  const [deletionResults, setDeletionResults] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

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

  // Copy handler for playbook output
  const handleCopyOutput = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  // Delete cluster function - runs Ansible playbook with real-time output
  const handleDeleteCluster = async (clusterName, namespace) => {
    const deleteId = `delete-cluster-${Date.now()}`;

    // Confirm deletion
    if (
      !window.confirm(
        `Are you sure you want to delete cluster "${clusterName}"?\n\nThis will delete:\n- ROSAControlPlane\n- ROSANetwork (if exists)\n- ROSARoleConfig (if exists)\n- AWS resources\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    // Clear previous results and set loading state
    setDeletionResults(null);
    setIsDeleting(true);

    try {
      console.log(`🗑️ Deleting cluster: ${clusterName} in namespace: ${namespace}`);

      // Immediately show "Starting..." state
      setDeletionResults({
        success: true,
        timestamp: new Date().toISOString(),
        clusterName,
        output: `🚀 Starting deletion for ${clusterName}...\n\nInitializing ROSA HCP cluster deletion...\nCluster: ${clusterName}\nNamespace: ${namespace}\n\nConnecting to backend...`,
      });

      // Add to recent operations
      addToRecent({
        id: deleteId,
        title: `🗑️ Delete ROSA HCP Cluster: ${clusterName}`,
        color: 'bg-red-600',
        status: '🚀 Starting deletion...',
        environment: 'mce',
        playbook: 'playbooks/delete_rosa_hcp_cluster.yml',
        output: `Initializing ROSA HCP cluster deletion...\nCluster: ${clusterName}\nNamespace: ${namespace}\n\nConnecting to backend...`,
      });

      // Call Ansible playbook endpoint
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_PLAYBOOK), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook: 'playbooks/delete_rosa_hcp_cluster.yml',
          description: `Delete ROSA HCP Cluster: ${clusterName}`,
          extra_vars: {
            cluster_name: clusterName,
            capi_namespace: namespace || 'ns-rosa-hcp',
          },
        }),
      });

      const result = await response.json();
      console.log('📊 Delete API response:', result);

      if (!result.success || !result.job_id) {
        throw new Error(result.message || 'Failed to start deletion');
      }

      const jobId = result.job_id;
      console.log(`🔍 Polling job status for job_id: ${jobId}`);

      // Poll for job completion
      const pollJobStatus = async () => {
        const maxAttempts = 1800; // 30 minutes max (deletion can take a while)
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

          const jobResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}`));
          const jobData = await jobResponse.json();
          console.log(`📋 Job status:`, jobData);

          // Fetch logs regardless of status to show real-time output
          const logsResponse = await fetch(buildApiUrl(`/api/jobs/${jobId}/logs`));
          const logsData = await logsResponse.json();
          const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

          if (jobData.status === 'completed') {
            // Success - update with final logs
            const output = currentOutput || 'Deletion completed successfully';

            updateRecentOperationStatus(deleteId, '✅ Cluster deleted successfully!', output);
            const successResults = {
              success: true,
              timestamp: new Date().toISOString(),
              clusterName,
              output,
            };
            console.log('✅ Setting deletion results (success):', successResults);
            setDeletionResults(successResults);
            setIsDeleting(false);

            // Refresh cluster list
            await fetchClusters();
            return;
          } else if (jobData.status === 'failed') {
            // Failure - update with error logs
            const output = currentOutput || (jobData.error || jobData.message || 'Deletion failed');

            updateRecentOperationStatus(deleteId, '❌ Deletion failed', output);
            const failureResults = {
              success: false,
              timestamp: new Date().toISOString(),
              clusterName,
              output,
            };
            console.log('❌ Setting deletion results (failure):', failureResults);
            setDeletionResults(failureResults);
            setIsDeleting(false);
            return;
          }

          // Still running - update with current logs every 5 seconds
          if (attempts % 5 === 0 && currentOutput) {
            updateRecentOperationStatus(deleteId, '🗑️ Deleting...', currentOutput);
            // Also update the inline display
            setDeletionResults({
              success: true,
              timestamp: new Date().toISOString(),
              clusterName,
              output: currentOutput,
            });
          }

          // Wait and poll again
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Timeout
        throw new Error('Deletion timed out after 30 minutes');
      };

      await pollJobStatus();

    } catch (error) {
      console.error('Deletion error:', error);
      const errorMsg = extractSafeErrorMessage(error);
      updateRecentOperationStatus(deleteId, '❌ Deletion error', errorMsg);
      setDeletionResults({
        success: false,
        timestamp: new Date().toISOString(),
        clusterName,
        output: errorMsg,
      });
      setIsDeleting(false);
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
          className="px-4 py-2 text-white rounded transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
          style={!clustersLoading ? { backgroundColor: '#2684FF' } : {}}
          onMouseEnter={(e) => !clustersLoading && (e.currentTarget.style.backgroundColor = '#0065FF')}
          onMouseLeave={(e) => !clustersLoading && (e.currentTarget.style.backgroundColor = '#2684FF')}
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

      {/* Deletion Results Display - Inline Playbook Output */}
      {deletionResults && (
        <div className={`mt-6 rounded-lg border-2 p-6 ${deletionResults.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center gap-3 mb-4">
            {deletionResults.success ? (
              <span className="text-2xl">✅</span>
            ) : (
              <span className="text-xl">❌</span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {isDeleting ? `Deleting ${deletionResults.clusterName}...` : deletionResults.success ? 'Deletion Completed' : 'Deletion Failed'}
            </h3>
          </div>

          {/* Output Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Playbook Output:</h4>
              <button
                onClick={() => handleCopyOutput(deletionResults.output || 'No output available')}
                className="px-3 py-1 text-white rounded text-xs font-medium transition-colors"
                style={{ backgroundColor: '#2684FF' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
              >
                {copySuccess || '📋 Copy'}
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
              <pre className="whitespace-pre-wrap">
                {deletionResults.output || 'No output available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

RosaHcpClustersSection.propTypes = {
  theme: PropTypes.string,
};

export default RosaHcpClustersSection;
