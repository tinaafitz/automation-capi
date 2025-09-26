import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ServerIcon,
  KeyIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export function OCPConnectionStatus({ compact = false, showRefresh = true, statusData = null }) {
  const [status, setStatus] = useState(statusData);
  const [loading, setLoading] = useState(!statusData);
  const [lastChecked, setLastChecked] = useState(statusData ? new Date() : null);

  const checkOCPConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/ocp/connection-status');
      const data = await response.json();
      setStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check OCP connection:', error);
      setStatus({
        connected: false,
        status: 'error',
        message: 'Failed to check OpenShift Hub connection',
        suggestion: 'Check that the backend is running'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If statusData is provided, use it instead of fetching
    if (statusData) {
      setStatus(statusData);
      setLoading(false);
      setLastChecked(new Date());
      return;
    }

    // Only fetch if no statusData is provided
    checkOCPConnection();
    // Set up periodic checks every 5 minutes only if not in compact mode with data
    if (!compact) {
      const interval = setInterval(checkOCPConnection, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [statusData, compact]);

  const getStatusIcon = () => {
    if (loading) {
      return <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />;
    }

    if (!status) {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />;
    }

    switch (status.status) {
      case 'connected':
      case 'connected_limited':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'missing_api_url':
      case 'missing_credentials':
      case 'config_missing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'invalid_credentials':
      case 'connection_failed':
      case 'timeout':
      case 'tls_error':
      case 'oc_not_found':
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    if (loading || !status) return 'gray';

    switch (status.status) {
      case 'connected':
      case 'connected_limited':
        return 'green';
      case 'missing_api_url':
      case 'missing_credentials':
      case 'config_missing':
        return 'yellow';
      case 'invalid_credentials':
      case 'connection_failed':
      case 'timeout':
      case 'tls_error':
      case 'oc_not_found':
      case 'error':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (compact) {
    // Compact display for header/status bar
    const color = getStatusColor();
    const bgColor = color === 'green' ? 'bg-green-50' : color === 'red' ? 'bg-red-50' : 'bg-yellow-50';
    const textColor = color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : 'text-yellow-700';

    return (
      <div className={`flex items-center space-x-2 ${bgColor} ${textColor} px-3 py-1 rounded-full text-sm`}>
        {getStatusIcon()}
        <span className="font-medium">
          {loading ? 'Checking...' :
           status?.connected ? 'OCP Connected' :
           status?.status === 'missing_api_url' || status?.status === 'missing_credentials' ? 'OCP Config' :
           'OCP Required'}
        </span>
        {showRefresh && (
          <button
            onClick={checkOCPConnection}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh OCP connection status"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  // Full display for main page/detailed view
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">OpenShift Hub Connection</h3>
              <p className="text-sm text-gray-500">
                {loading ? 'Testing connection...' : status?.message}
              </p>
            </div>
          </div>
          {showRefresh && (
            <button
              onClick={checkOCPConnection}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
              title="Test OCP connection"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {status && status.connected && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <h4 className="text-sm font-semibold text-green-800">✅ Connected to OpenShift Hub!</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Successfully authenticated with the OpenShift Hub cluster. You can now use cluster automation features.
            </p>

            <div className="bg-white rounded p-3 border border-green-200">
              <h5 className="text-xs font-semibold text-green-800 mb-2">Connection Details</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700 flex items-center">
                    <GlobeAltIcon className="h-3 w-3 mr-1" />
                    API URL:
                  </span>
                  <span className="text-green-800 font-mono text-xs truncate max-w-xs" title={status.api_url}>
                    {status.api_url}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700 flex items-center">
                    <KeyIcon className="h-3 w-3 mr-1" />
                    Username:
                  </span>
                  <span className="text-green-800 font-mono">{status.username}</span>
                </div>

                {status.cluster_info && (
                  <div className="mt-3 space-y-1">
                    {Object.entries(status.cluster_info).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-green-700 capitalize">{key.replace('_', ' ')}:</span>
                        <span className="text-green-800 font-mono max-w-xs truncate" title={value}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {status && !status.connected && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800">OpenShift Hub Connection Failed</h4>
                <p className="text-sm text-red-700 mt-1">{status.suggestion}</p>

                {status.api_url && (
                  <div className="mt-3 bg-white rounded p-3 border border-red-200">
                    <h5 className="text-xs font-semibold text-red-800 mb-2">Connection Attempt</h5>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-700">API URL:</span>
                        <span className="text-red-800 font-mono text-xs truncate max-w-xs" title={status.api_url}>
                          {status.api_url}
                        </span>
                      </div>
                      {status.username && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-red-700">Username:</span>
                          <span className="text-red-800 font-mono">{status.username}</span>
                        </div>
                      )}
                      {status.error_details && (
                        <div className="mt-2">
                          <span className="text-xs text-red-700">Error:</span>
                          <div className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded mt-1">
                            {status.error_details}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {status.status === 'oc_not_found' && (
                  <div className="mt-3">
                    <p className="text-sm text-red-700 mb-2">Install the OpenShift CLI:</p>
                    <div className="bg-gray-900 rounded p-3">
                      <code className="text-green-400 text-sm font-mono">
                        # macOS: brew install openshift-cli<br/>
                        # Or download from: https://console.redhat.com/openshift/downloads
                      </code>
                    </div>
                  </div>
                )}

                {(status.status === 'connection_failed' || status.status === 'invalid_credentials' || status.status === 'timeout' || status.status === 'tls_error') && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h5 className="text-sm font-semibold text-blue-800 mb-2">💡 Alternative: Use Kind Cluster</h5>
                    <p className="text-sm text-blue-700 mb-3">
                      Having trouble with your OpenShift Hub connection? You can use a local Kind cluster for testing instead.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (window.confirm('This will help you set up a local Kind cluster for testing. Would you like to proceed?')) {
                            // Add logic here to guide user through Kind setup
                            alert('Kind cluster setup guide will be implemented here');
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm inline-flex items-center space-x-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Use Kind Cluster Instead</span>
                      </button>
                      <a
                        href="https://kind.sigs.k8s.io/docs/user/quick-start/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center space-x-1"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Kind Documentation</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {lastChecked && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}