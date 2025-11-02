import React from 'react';

const TestActivityFeed = ({ operations = [] }) => {
  // Sort operations by timestamp (newest first) and take last 10
  const recentOps = [...operations]
    .filter((op) => op.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  const getOperationIcon = (operation) => {
    if (operation.result?.error || operation.result?.return_code !== 0) {
      return (
        <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getOperationLabel = (operation) => {
    const type = operation.result?.type || operation.type || 'Operation';
    const clusterFile = operation.result?.clusterFile || operation.clusterFile || '';
    const clusterName = clusterFile ? clusterFile.replace('.yml', '').replace('.yaml', '') : '';

    if (type.includes('Provisioning')) {
      return `${clusterName || 'cluster'} provisioned`;
    }
    if (type.includes('Delete') || type.includes('Cleanup')) {
      return `${clusterName || 'resources'} cleanup completed`;
    }
    if (type.includes('Validate')) {
      return 'environment validated';
    }
    return type.toLowerCase();
  };

  const getEnvironmentBadge = (operation) => {
    const type = operation.result?.type || operation.type || '';
    if (type.includes('MCE') || type.includes('OCP')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
          MCE
        </span>
      );
    }
    if (type.includes('Minikube')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          Minikube
        </span>
      );
    }
    return null;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  if (recentOps.length === 0) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6 shadow-lg">
        <div className="flex items-center mb-4">
          <svg
            className="h-5 w-5 text-purple-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h4 className="text-base font-semibold text-purple-900">📊 Test Activity Feed</h4>
        </div>
        <div className="text-sm text-gray-500 italic text-center py-4">
          No recent test operations. Run a provisioning or cleanup task to see activity here.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-purple-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h4 className="text-base font-semibold text-purple-900">📊 Test Activity Feed</h4>
        </div>
        <span className="text-xs text-gray-600">Recent Operations</span>
      </div>

      <div className="space-y-2">
        {recentOps.map((op, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-purple-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Status Icon */}
                <div className="flex-shrink-0">{getOperationIcon(op)}</div>

                {/* Environment Badge */}
                <div className="flex-shrink-0">{getEnvironmentBadge(op)}</div>

                {/* Operation Label */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 truncate block">
                    {getOperationLabel(op)}
                  </span>
                </div>

                {/* Time Ago */}
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-500">{getTimeAgo(op.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestActivityFeed;
