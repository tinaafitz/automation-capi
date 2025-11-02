import React from 'react';

const ResourceConnectionsCard = ({
  resources = [],
  environmentType = 'mce', // 'mce' or 'minikube'
  clusterInfo = null,
}) => {
  // Filter for ROSA-specific resources
  const rosaResources = resources.filter(
    (r) =>
      r.type === 'ROSACluster' ||
      r.type === 'RosaControlPlane' ||
      r.type === 'RosaNetwork' ||
      r.type === 'RosaRoleConfig' ||
      (r.type?.includes('Secret') && r.name?.includes('rosa'))
  );

  // Don't show if no ROSA resources
  if (rosaResources.length === 0) {
    return null;
  }

  // Find the ROSA namespace
  const rosaNamespace = resources.find((r) => r.type === 'Namespace' && r.name === 'ns-rosa-hcp');

  // Determine colors based on environment
  const isMCE = environmentType === 'mce';
  const bgGradient = isMCE
    ? 'bg-gradient-to-br from-cyan-50 to-blue-50'
    : 'bg-gradient-to-br from-purple-50 to-pink-50';
  const borderColor = isMCE ? 'border-cyan-200' : 'border-purple-200';
  const iconColor = isMCE ? 'text-cyan-600' : 'text-purple-600';
  const titleColor = isMCE ? 'text-cyan-900' : 'text-purple-900';
  const panelBorderColor = isMCE ? 'border-purple-200' : 'border-purple-200';
  const countColor = isMCE ? 'text-purple-700' : 'text-purple-700';
  const typeColor = isMCE ? 'text-cyan-600' : 'text-purple-600';

  const getStatusBadgeColor = (status) => {
    if (status === 'Ready') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Active') return 'bg-pink-100 text-pink-800 border-pink-200';
    if (status === 'Provisioning' || status === 'Configuring' || status === 'Pending')
      return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status?.toLowerCase().includes('fail') || status?.toLowerCase().includes('error'))
      return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getResourceIcon = (type) => {
    if (type === 'ROSACluster') return '☁️';
    if (type === 'RosaControlPlane') return '⚙️';
    if (type === 'RosaNetwork') return '🌐';
    if (type === 'RosaRoleConfig') return '🔐';
    if (type?.includes('Secret')) return '🔑';
    return '📦';
  };

  return (
    <div className={`${bgGradient} rounded-lg border-2 ${borderColor} p-4 shadow-lg`}>
      <div className="flex items-center mb-4">
        <div className="flex items-center space-x-2">
          <svg
            className={`h-5 w-5 ${iconColor}`}
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
          <h4 className={`text-base font-semibold ${titleColor}`}>Test Environment Connections</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Left side: Environment Info */}
        <div className={`bg-white rounded-lg border ${panelBorderColor} p-4 shadow-sm`}>
          <div className="flex items-start space-x-3 mb-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-purple-900 mb-1">
                {isMCE ? 'MCE Hub Environment' : 'Minikube Environment'}
              </div>
              <div className="text-xs text-gray-600 break-all">
                {isMCE
                  ? 'api.qe6-vmware-lbm.install.dev09.red-chesterfield.com'
                  : clusterInfo?.name || 'Local Minikube Cluster'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Status:</span>
              <span className="flex items-center text-green-700 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                {clusterInfo?.status === 'Running' ? 'Running' : 'Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">CAPI/CAPA:</span>
              <span className="flex items-center text-green-700 font-medium">
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Enabled
              </span>
            </div>
            {rosaNamespace && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Clusters:</span>
                <span className={`${countColor} font-medium`}>
                  {resources.filter((r) => r.type === 'ROSACluster').length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Resource cards */}
        <div className="grid grid-cols-1 gap-3">
          {rosaResources.map((resource, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-xl">{getResourceIcon(resource.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {resource.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isMCE ? 'Created from MCE Hub' : 'Created from Minikube'}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                    resource.status
                  )}`}
                >
                  {resource.status || 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`${typeColor} font-medium`}>{resource.type}</span>
                <span className="text-gray-500">{resource.age || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceConnectionsCard;
