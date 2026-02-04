import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

export function ConfigStatus({ compact = false, showRefresh = true, statusData = null }) {
  const [config, setConfig] = useState(statusData);
  const [loading, setLoading] = useState(!statusData);
  const [lastChecked, setLastChecked] = useState(statusData ? new Date() : null);

  const checkConfigStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/config/status');
      const data = await response.json();
      setConfig(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check config status:', error);
      setConfig({
        configured: false,
        status: 'error',
        message: 'Failed to check configuration status',
        total_required: 8,
        total_configured: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If statusData is provided, use it instead of fetching
    if (statusData) {
      setConfig(statusData);
      setLoading(false);
      setLastChecked(new Date());
      return;
    }

    // Only fetch if no statusData is provided
    checkConfigStatus();
    // Set up periodic checks every 5 minutes only if not in compact mode with data
    if (!compact) {
      const interval = setInterval(checkConfigStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [statusData, compact]);

  const getStatusIcon = () => {
    if (loading) {
      return <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />;
    }

    if (!config) {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />;
    }

    switch (config.status) {
      case 'fully_configured':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'partially_configured':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'not_configured':
      case 'missing':
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    if (loading || !config) return 'gray';

    switch (config.status) {
      case 'fully_configured':
        return 'green';
      case 'partially_configured':
        return 'yellow';
      case 'not_configured':
      case 'missing':
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
    const bgColor =
      color === 'green' ? 'bg-green-50' : color === 'red' ? 'bg-red-50' : 'bg-yellow-50';
    const textColor =
      color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : 'text-yellow-700';

    return (
      <div
        className={`flex items-center space-x-2 ${bgColor} ${textColor} px-3 py-1 rounded-full text-sm`}
      >
        {getStatusIcon()}
        <span className="font-medium">
          {loading
            ? 'Checking...'
            : config?.configured
              ? 'Config Ready'
              : config?.status === 'partially_configured'
                ? `Config ${config.total_configured}/${config.total_required}`
                : 'Config Required'}
        </span>
        {showRefresh && (
          <button
            onClick={checkConfigStatus}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh config status"
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
              <h3 className="text-lg font-semibold text-gray-900">Configuration Status</h3>
              <p className="text-sm text-gray-500">
                {loading ? 'Checking configuration...' : config?.message}
              </p>
            </div>
          </div>
          {showRefresh && (
            <button
              onClick={checkConfigStatus}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
              title="Refresh config status"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {config && config.configured && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <h4 className="text-sm font-semibold text-green-800">✅ Configuration Complete!</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              All required credentials are configured in vars/user_vars.yml. You can now run
              automation tasks.
            </p>
            <div className="text-xs text-green-600">
              Configured: {config.total_configured}/{config.total_required} required fields
            </div>
          </div>
        )}

        {config && !config.configured && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800">Configuration Required</h4>
                <p className="text-sm text-red-700 mt-1">
                  You need to configure credentials in vars/user_vars.yml before using the
                  automation platform.
                </p>

                {config.total_configured > 0 && (
                  <div className="mt-2 text-sm text-red-700">
                    Progress: {config.total_configured}/{config.total_required} fields configured
                  </div>
                )}

                <div className="mt-3">
                  <h5 className="text-sm font-semibold text-red-800 mb-2">
                    Missing Configuration:
                  </h5>
                  <div className="bg-white rounded p-3 border border-red-200">
                    <code className="text-red-700 text-sm font-mono block whitespace-pre-wrap">
                      File: {config.config_file_path}
                    </code>
                    <div className="mt-2 space-y-1">
                      {[...(config.empty_fields || []), ...(config.missing_fields || [])].map(
                        (field, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-red-700">{field.field}:</span>
                            <span className="text-red-600">{field.description}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => copyToClipboard('vars/user_vars.yml')}
                    className="inline-flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    <span>Copy file path</span>
                  </button>

                  <a
                    href="https://console.redhat.com/iam/service-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    title="Create OCM Service Account for ClientID and Client Secret"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span>Create OCM Service Account</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {config && config.configured_fields && config.configured_fields.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">✅ Configured Fields</h4>
            <div className="space-y-1">
              {config.configured_fields.map((field, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-sm">
                  <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">{field.description}</span>
                </div>
              ))}
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
