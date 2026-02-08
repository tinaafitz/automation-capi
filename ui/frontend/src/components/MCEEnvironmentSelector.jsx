/* eslint-disable no-unused-vars, no-console */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  KeyIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  pass: {
    emoji: '✅',
    label: 'Pass',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircleIcon,
  },
  fail: {
    emoji: '❌',
    label: 'Fail',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircleIcon,
  },
  blocked: {
    emoji: '🚫',
    label: 'Blocked',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: ExclamationCircleIcon,
  },
  in_progress: {
    emoji: '⏳',
    label: 'In Progress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: ClockIcon,
  },
  unknown: {
    emoji: '❓',
    label: 'Unknown',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: QuestionMarkCircleIcon,
  },
};

const MCEEnvironmentSelector = ({ onUseCredentials }) => {
  const [environments, setEnvironments] = useState([]);
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnv, setNewEnv] = useState({
    clusterName: '',
    platform: '',
    ocpVersion: '',
    consoleUrl: '',
    username: '',
    password: '',
    jira: '',
    polarion: '',
    notes: '',
  });

  // Fetch environments on mount
  useEffect(() => {
    fetchEnvironments();
    fetchStats();
  }, []);

  // Filter environments when filters change
  useEffect(() => {
    filterEnvironments();
  }, [environments, searchQuery, platformFilter, statusFilter]);

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/mce-environments');
      const data = await response.json();

      if (data.success) {
        setEnvironments(data.environments || []);
      }
    } catch (error) {
      console.error('Error fetching MCE environments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mce-environments/stats/summary');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterEnvironments = () => {
    let filtered = [...environments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (env) =>
          env.clusterName?.toLowerCase().includes(query) ||
          env.platform?.toLowerCase().includes(query) ||
          env.jira?.toLowerCase().includes(query) ||
          env.polarion?.toLowerCase().includes(query) ||
          env.notes?.toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter((env) =>
        env.platform?.toLowerCase().includes(platformFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((env) => env.status === statusFilter);
    }

    setFilteredEnvironments(filtered);
  };

  const selectEnvironment = async (clusterName) => {
    try {
      const response = await fetch(`http://localhost:8000/api/mce-environments/${clusterName}`);
      const data = await response.json();

      if (data.success) {
        setSelectedEnv(data.environment);
      }
    } catch (error) {
      console.error('Error fetching environment details:', error);
    }
  };

  const updateStatus = async (clusterName, status, notes) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/mce-environments/${clusterName}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh environments
        await fetchEnvironments();
        await fetchStats();

        // Update selected environment if it's the one we updated
        if (selectedEnv?.clusterName === clusterName) {
          await selectEnvironment(clusterName);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const copyLoginCommand = (command) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleUseCredentials = () => {
    if (selectedEnv && onUseCredentials) {
      // Extract API URL from console URL
      const apiUrl = `https://api.${selectedEnv.consoleUrl.split('apps.')[1].replace(/\/$/, '')}:6443`;

      onUseCredentials({
        OCP_HUB_API_URL: apiUrl,
        OCP_HUB_CLUSTER_USER: 'kubeadmin',
        OCP_HUB_CLUSTER_PASSWORD: selectedEnv.password,
        clusterName: selectedEnv.clusterName,
      });
    }
  };

  const handleAddEnvironment = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mce-environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEnv),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setNewEnv({
          clusterName: '',
          platform: '',
          ocpVersion: '',
          consoleUrl: '',
          username: '',
          password: '',
          jira: '',
          polarion: '',
          notes: '',
        });
        setShowAddModal(false);
        // Refresh environments
        await fetchEnvironments();
        await fetchStats();
      } else {
        alert(`Failed to add environment: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding environment:', error);
      alert(`Failed to add environment: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return 'N/A';
    }
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.bgColor} border ${config.borderColor}`}
      >
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <h2 className="text-2xl font-bold text-blue-900">MCE Test Environments</h2>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by cluster, platform, Jira, Polarion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FunnelIcon className="w-5 h-5" />
            Filters
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchEnvironments();
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Refresh
          </button>

          {/* Add Environment */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Platforms</option>
                <option value="IBM Power">IBM Power</option>
                <option value="AWS-ARM">AWS ARM</option>
                <option value="AWS">AWS x86</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="pass">✅ Pass</option>
                <option value="fail">❌ Fail</option>
                <option value="blocked">🚫 Blocked</option>
                <option value="in_progress">⏳ In Progress</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>
          </div>
        )}

        {/* Add Environment Form - Inline */}
        {showAddModal && (
          <div className="pt-4 border-t mt-4">
            <h3 className="text-lg font-semibold text-green-700 mb-4">Add New Environment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cluster Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cluster Name
                </label>
                <input
                  type="text"
                  value={newEnv.clusterName}
                  onChange={(e) => setNewEnv({ ...newEnv, clusterName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., cqu-2135-zup"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={newEnv.platform}
                  onChange={(e) => setNewEnv({ ...newEnv, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select platform...</option>
                  <option value="AWS">AWS x86</option>
                  <option value="AWS-ARM">AWS ARM</option>
                  <option value="IBM Power">IBM Power</option>
                  <option value="IBM Z">IBM Z</option>
                  <option value="Azure">Azure</option>
                  <option value="GCP">GCP</option>
                </select>
              </div>

              {/* OCP Version */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OCP Version
                </label>
                <input
                  type="text"
                  value={newEnv.ocpVersion}
                  onChange={(e) => setNewEnv({ ...newEnv, ocpVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 4.19.21"
                />
              </div>

              {/* Console URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Console URL *
                </label>
                <input
                  type="text"
                  value={newEnv.consoleUrl}
                  onChange={(e) => setNewEnv({ ...newEnv, consoleUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="https://console-openshift-console.apps..."
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newEnv.username}
                  onChange={(e) => setNewEnv({ ...newEnv, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="kubeadmin"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newEnv.password}
                  onChange={(e) => setNewEnv({ ...newEnv, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="kubeadmin password"
                />
              </div>

              {/* Jira */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jira Ticket
                </label>
                <input
                  type="text"
                  value={newEnv.jira}
                  onChange={(e) => setNewEnv({ ...newEnv, jira: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., ACM-24815"
                />
              </div>

              {/* Polarion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polarion Test Plan
                </label>
                <input
                  type="text"
                  value={newEnv.polarion}
                  onChange={(e) => setNewEnv({ ...newEnv, polarion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., RHACM4K-12345"
                />
              </div>

              {/* Notes - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newEnv.notes}
                  onChange={(e) => setNewEnv({ ...newEnv, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Any additional notes about this environment..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEnvironment}
                disabled={!newEnv.consoleUrl || !newEnv.username || !newEnv.password}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Environment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Environments List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Loading environments...
          </div>
        ) : filteredEnvironments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <QuestionMarkCircleIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No environments found</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEnvironments.map((env) => (
              <div
                key={env.clusterName}
                onClick={() => selectEnvironment(env.clusterName)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{env.clusterName}</h3>
                      <StatusBadge status={env.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Platform:</span> {env.platform}
                      </div>
                      <div>
                        <span className="font-medium">OCP:</span> {env.ocpVersion || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Jira:</span> {env.jira || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Last Used:</span>{' '}
                        {formatDate(env.lastAccessed)}
                      </div>
                    </div>

                    {env.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Notes:</span> {env.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Environment Details Modal */}
      {selectedEnv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedEnv.clusterName}</h2>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedEnv.status} />
                    <span className="text-cyan-100">{selectedEnv.platform}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEnv(null)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Connection Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Connection Details</h3>
                  {onUseCredentials && (
                    <button
                      onClick={handleUseCredentials}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-md transition-all transform hover:scale-105"
                    >
                      <KeyIcon className="w-4 h-4" />
                      Use These Credentials
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{selectedEnv.clusterStatus}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">OCP Version:</span>
                      <span className="ml-2 font-medium">{selectedEnv.ocpVersion}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 font-medium">Login Command:</span>
                      <button
                        onClick={() => copyLoginCommand(selectedEnv.loginCommand)}
                        className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded transition-colors"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        {copiedCommand ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <code className="block bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                      {selectedEnv.loginCommand}
                    </code>
                  </div>
                </div>
              </div>

              {/* Test Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Test Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Jira:</span>
                    <span className="ml-2 font-medium">{selectedEnv.jira || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Polarion:</span>
                    <span className="ml-2 font-medium">{selectedEnv.polarion || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Failures:</span>
                    <span className="ml-2 font-medium">{selectedEnv.totalFailures}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Added:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedEnv.addedDate)}</span>
                  </div>
                </div>

                {selectedEnv.notes && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <span className="font-medium text-gray-900">Notes:</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedEnv.notes}</p>
                  </div>
                )}
              </div>

              {/* Update Status */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Update Test Status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => {
                        const notes = prompt(
                          `Update status to "${config.label}". Add notes (optional):`
                        );
                        if (notes !== null) {
                          updateStatus(selectedEnv.clusterName, status, notes);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${config.borderColor} ${config.bgColor} ${config.color} hover:shadow-md`}
                    >
                      {config.emoji} {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Component Failures */}
              {selectedEnv.components && Object.keys(selectedEnv.components).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Component Failures</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedEnv.components).map(([component, data]) => (
                      <div
                        key={component}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <span className="font-medium">{component}</span>
                        <div className="text-right">
                          <div className="text-red-600 font-bold">{data.failures} failures</div>
                          <div className="text-sm text-gray-600">{data.owner}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MCEEnvironmentSelector.propTypes = {
  onUseCredentials: PropTypes.func,
};

export default MCEEnvironmentSelector;
