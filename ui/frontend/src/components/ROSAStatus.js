import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CommandLineIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

export function ROSAStatus({ compact = false, showRefresh = true, statusData = null }) {
  const [status, setStatus] = useState(statusData);
  const [loading, setLoading] = useState(!statusData);
  const [lastChecked, setLastChecked] = useState(statusData ? new Date() : null);

  const checkROSAStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/rosa/status');
      const data = await response.json();
      setStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check ROSA status:', error);
      setStatus({
        authenticated: false,
        status: 'error',
        message: 'Failed to check ROSA status',
        error: 'Network error or backend unavailable',
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
    checkROSAStatus();
    // Set up periodic checks every 5 minutes only if not in compact mode with data
    if (!compact) {
      const interval = setInterval(checkROSAStatus, 5 * 60 * 1000);
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
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'not_installed':
      case 'timeout':
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    if (loading || !status) return 'gray';

    switch (status.status) {
      case 'success':
        return 'green';
      case 'not_installed':
      case 'timeout':
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
          {loading ? 'Checking...' : status?.authenticated ? 'ROSA Ready' : 'ROSA Required'}
        </span>
        {showRefresh && (
          <button
            onClick={checkROSAStatus}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh ROSA status"
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
              <h3 className="text-lg font-semibold text-gray-900">ROSA Staging Authentication</h3>
              <p className="text-sm text-gray-500">
                {loading ? 'Checking authentication status...' : status?.message}
              </p>
            </div>
          </div>
          {showRefresh && (
            <button
              onClick={checkROSAStatus}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
              title="Refresh ROSA status"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {status && !status.authenticated && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800">ROSA Staging Authentication Required</h4>
                <p className="text-sm text-red-700 mt-1">{status.suggestion}</p>

                {status.fix_command && (
                  <div className="mt-3">
                    <p className="text-sm text-red-700 mb-2">Run this command:</p>
                    <div className="bg-gray-900 rounded p-3 flex items-center justify-between">
                      <code className="text-green-400 text-sm font-mono">{status.fix_command}</code>
                      <button
                        onClick={() => copyToClipboard(status.fix_command)}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                        title="Copy to clipboard"
                      >
                        <CommandLineIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {status.status === 'not_installed' && (
                  <div className="mt-3">
                    <a
                      href="https://console.redhat.com/openshift/downloads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>Download ROSA CLI</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {status && status.authenticated && status.user_info && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <h4 className="text-sm font-semibold text-green-800">✅ Successfully Connected to ROSA Staging!</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              You are now authenticated with the ROSA staging environment and can use all automation features.
            </p>
            <div className="bg-white rounded p-3 border border-green-200">
              <h5 className="text-xs font-semibold text-green-800 mb-2">Account Details</h5>
              <div className="space-y-1">
                {Object.entries(status.user_info).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-green-700 capitalize">{key.replace('_', ' ')}:</span>
                    <span className="text-green-800 font-mono">{value}</span>
                  </div>
                ))}
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