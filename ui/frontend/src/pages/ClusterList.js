import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowPathIcon, EyeIcon, TrashIcon, ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline';

export function ClusterList() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchClusters = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/clusters');
      const data = await response.json();

      if (data.success) {
        setClusters(data.clusters);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch clusters');
      }
    } catch (err) {
      setError(`Error fetching clusters: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();

    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchClusters, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'provisioning':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return '✅';
      case 'provisioning':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '⬜';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDeleteCluster = async (clusterName) => {
    if (!window.confirm(`Are you sure you want to delete cluster "${clusterName}"?`)) {
      return;
    }

    try {
      // This would call kubectl delete in the background
      alert(`Deleting cluster ${clusterName}... (Not yet implemented)`);
    } catch (err) {
      alert(`Error deleting cluster: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            title="Go back"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="font-medium">Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            title="Go to home"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="font-medium">Home</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                ROSA HCP Clusters
              </h1>
              <p className="text-purple-100 text-lg">
                Real-time cluster monitoring and management dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-white bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={fetchClusters}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 font-semibold shadow-lg transition-all"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <p className="text-sm text-red-600 mt-2">
              Make sure kubectl is configured and you have access to the cluster.
            </p>
          </div>
        )}

        {/* Clusters Table */}
        {loading && clusters.length === 0 ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading clusters...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No clusters found</p>
            <p className="text-gray-500 mt-2">
              Provision your first ROSA HCP cluster to get started
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Cluster Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clusters.map((cluster) => (
                  <tr key={cluster.name} className="hover:bg-purple-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{cluster.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{cluster.domain_prefix}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          cluster.status
                        )}`}
                      >
                        {getStatusIcon(cluster.status)} {cluster.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                          <div
                            className={`h-2 rounded-full ${
                              cluster.status === 'ready'
                                ? 'bg-green-600'
                                : cluster.status === 'failed'
                                  ? 'bg-red-600'
                                  : 'bg-yellow-600'
                            }`}
                            style={{ width: `${cluster.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{cluster.progress}%</span>
                      </div>
                      {cluster.error_message && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                          {cluster.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cluster.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cluster.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(cluster.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            alert(`View details for ${cluster.name} (Not yet implemented)`)
                          }
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCluster(cluster.name)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Cluster"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
