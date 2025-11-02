import React from 'react';

const TestEnvironmentCard = ({
  name,
  icon,
  resources = [],
  isActive = false,
  onClick,
  recentOperations = [],
}) => {
  // Calculate stats
  const clusters = resources.filter((r) => r.type === 'ROSACluster');
  const activeClusters = clusters.length;

  // Count operations from last 24h
  const now = new Date();
  const last24h = recentOperations.filter((op) => {
    if (!op.timestamp) return false;
    const opTime = new Date(op.timestamp);
    return now - opTime < 24 * 60 * 60 * 1000;
  });

  const passedTests = last24h.filter(
    (op) =>
      op.result?.success ||
      op.result?.status === 'success' ||
      (!op.result?.error && op.result?.output)
  ).length;

  const failedTests = last24h.filter(
    (op) =>
      op.result?.error ||
      op.result?.status === 'error' ||
      (op.result?.return_code !== undefined && op.result?.return_code !== 0)
  ).length;

  const runningTests = resources.filter(
    (r) => r.status === 'Provisioning' || r.status === 'Configuring' || r.status === 'Pending'
  ).length;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg border-2 p-6 shadow-lg cursor-pointer
        transition-all duration-200
        ${
          isActive
            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl'
            : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-xl'
        }
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center text-xs font-semibold text-purple-700">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-1.5 animate-pulse"></span>
            ACTIVE
          </span>
        </div>
      )}

      {/* Icon and Title */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">Test Environment</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Active Clusters */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Active</span>
            <span className="text-2xl font-bold text-purple-700">{activeClusters}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">clusters</div>
        </div>

        {/* Running Tests */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Testing</span>
            <span className="text-2xl font-bold text-amber-600">
              {runningTests > 0 ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-1.5 animate-pulse"></span>
                  {runningTests}
                </span>
              ) : (
                runningTests
              )}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">operations</div>
        </div>

        {/* Passed Tests */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Passed</span>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-2xl font-bold text-green-700">{passedTests}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">24h</div>
        </div>

        {/* Failed Tests */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Failed</span>
            <div className="flex items-center">
              {failedTests > 0 && (
                <svg className="h-4 w-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span
                className={`text-2xl font-bold ${failedTests > 0 ? 'text-red-700' : 'text-gray-400'}`}
              >
                {failedTests}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">24h</div>
        </div>
      </div>

      {/* View Details Button */}
      <button
        className="mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors duration-200"
        onClick={(e) => {
          e.stopPropagation();
          onClick && onClick();
        }}
      >
        View Details
      </button>
    </div>
  );
};

export default TestEnvironmentCard;
