import React from 'react';

const ActiveOperationsPanel = ({ resources = [], operations = [] }) => {
  // Find resources that are currently in provisioning/pending states
  const activeResources = resources.filter((r) =>
    r.status === 'Provisioning' ||
    r.status === 'Configuring' ||
    r.status === 'Pending' ||
    r.status === 'Creating' ||
    r.status === 'Updating'
  );

  // Find recent operations that might still be running (last 5 minutes)
  const now = new Date();
  const recentRunningOps = operations.filter((op) => {
    if (!op.timestamp) return false;
    const opTime = new Date(op.timestamp);
    const diffMs = now - opTime;
    const diffMins = diffMs / 60000;
    // Consider operations from last 5 minutes without explicit completion
    return diffMins < 5 && !op.result?.completed;
  });

  const allActiveOps = [...activeResources, ...recentRunningOps];

  const getProgressPercentage = (resource) => {
    // Estimate progress based on status and time
    if (resource.status === 'Pending') return 10;
    if (resource.status === 'Creating') return 30;
    if (resource.status === 'Provisioning') return 50;
    if (resource.status === 'Configuring') return 70;
    if (resource.status === 'Updating') return 60;
    // For operations, estimate based on elapsed time
    if (resource.timestamp) {
      const elapsed = (now - new Date(resource.timestamp)) / 1000; // seconds
      // Most operations complete in 2-5 minutes, estimate based on time
      const percentage = Math.min(Math.floor((elapsed / 180) * 100), 90);
      return percentage;
    }
    return 50; // default
  };

  const getOperationDetails = (item) => {
    if (item.type === 'ROSACluster') {
      return {
        name: item.name,
        environment: 'Unknown',
        status: `${item.status}...`,
      };
    }
    if (item.type === 'RosaControlPlane') {
      return {
        name: item.name,
        environment: 'Unknown',
        status: 'RosaControlPlane starting...',
      };
    }
    // For operations
    const type = item.result?.type || item.type || 'Operation';
    const clusterFile = item.result?.clusterFile || item.clusterFile || '';
    const clusterName = clusterFile ? clusterFile.replace('.yml', '').replace('.yaml', '') : 'cluster';

    let environment = 'Unknown';
    if (type.includes('MCE') || type.includes('OCP')) environment = 'MCE';
    if (type.includes('Minikube')) environment = 'Minikube';

    let status = 'Processing...';
    if (type.includes('Provisioning')) status = 'Provisioning cluster...';
    if (type.includes('Delete') || type.includes('Cleanup')) status = 'Cleaning up resources...';
    if (type.includes('Validate')) status = 'Validating environment...';

    return {
      name: clusterName,
      environment,
      status,
    };
  };

  if (allActiveOps.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-6 shadow-lg">
        <div className="flex items-center mb-4">
          <svg
            className="h-5 w-5 text-blue-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h4 className="text-base font-semibold text-blue-900">🔥 Active Test Operations</h4>
        </div>
        <div className="text-sm text-gray-500 italic text-center py-4">
          No active operations. All systems idle.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-blue-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h4 className="text-base font-semibold text-blue-900">🔥 Active Test Operations</h4>
        </div>
        <span className="flex items-center text-xs font-semibold text-blue-700">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
          {allActiveOps.length} running
        </span>
      </div>

      <div className="space-y-3">
        {allActiveOps.map((item, idx) => {
          const details = getOperationDetails(item);
          const progress = getProgressPercentage(item);

          return (
            <div
              key={idx}
              className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {details.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 flex-shrink-0">
                    {details.environment}
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-700 flex-shrink-0">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 animate-pulse"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Status Text */}
              <div className="text-xs text-gray-600">{details.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveOperationsPanel;
