import React, { useState, useEffect } from 'react';
import {
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export function Diagnostics() {
  const [availableChecks, setAvailableChecks] = useState([]);
  const [selectedChecks, setSelectedChecks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available diagnostic checks
    fetch('http://localhost:8000/api/diagnostics/checks')
      .then(res => res.json())
      .then(data => {
        setAvailableChecks(data.checks);
        setSelectedChecks(data.checks.map(check => check.id)); // Select all by default
      })
      .catch(console.error);
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch('http://localhost:8000/api/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checks: selectedChecks })
      });
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'fail': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Red Hat Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 text-white px-3 py-2 rounded font-bold text-lg">
                Red Hat
              </div>
              <span className="text-xl font-semibold text-gray-900">ROSA CAPI/CAPA Test Automation</span>
              <span className="text-sm text-gray-500">/ Diagnostics</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">OpenShift 4.20</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Connected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <WrenchScrewdriverIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            System Diagnostics
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Run comprehensive checks to identify and resolve issues with your ROSA CAPI/CAPA test environment
          </p>
        </div>

      {/* Check Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
          What should we check?
        </h2>
        <div className="space-y-3">
          {availableChecks.map((check) => (
            <label key={check.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedChecks.includes(check.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedChecks([...selectedChecks, check.id]);
                  } else {
                    setSelectedChecks(selectedChecks.filter(id => id !== check.id));
                  }
                }}
                className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">{check.name}</div>
                <div className="text-sm text-gray-600">{check.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={runDiagnostics}
            disabled={loading || selectedChecks.length === 0}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <ClockIcon className="h-4 w-4 mr-2 inline animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{result.name}</h3>
                    <p className="text-sm text-gray-700 mt-1">{result.message}</p>

                    {result.details && (
                      <p className="text-xs text-gray-600 mt-2">{result.details}</p>
                    )}

                    {result.fix && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-900">How to fix:</p>
                        <p className="text-sm text-blue-800 mt-1">{result.fix}</p>
                        {result.command && (
                          <code className="block mt-2 text-sm bg-gray-800 text-green-400 p-2 rounded font-mono">
                            {result.command}
                          </code>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-sm text-gray-600">Passing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-sm text-gray-600">Failing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {results.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Need More Help?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Don't see your issue here? Try <strong>"Tell me about my environment"</strong> for a broader overview,
                or check our <strong>troubleshooting documentation</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>© 2024 Red Hat, Inc. ROSA CAPI/CAPA Test Automation Platform</div>
            <div className="flex space-x-6">
              <span>Documentation</span>
              <span>Support</span>
              <span>Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}