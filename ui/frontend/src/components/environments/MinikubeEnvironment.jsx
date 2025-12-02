import React, { useState } from 'react';
import EnvironmentCard from '../cards/EnvironmentCard';
import StatusCard from '../cards/StatusCard';
import ComponentStatusCard from '../cards/ComponentStatusCard';
import MinikubeTerminalModal from '../modals/MinikubeTerminalModal';
import MinikubeTerminalSection from '../sections/MinikubeTerminalSection';
import { useMinikubeContext, useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { cardStyles } from '../../styles/themes';

const MinikubeEnvironment = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const [showTerminalModal, setShowTerminalModal] = useState(false);

  const {
    verifiedMinikubeClusterInfo,
    minikubeActiveResources,
    minikubeClusters,
    selectedMinikubeCluster,
    minikubeClusterInput,
    minikubeVerificationResult,
    minikubeLoading,
    minikubeResourcesLoading,
    minikubeConfigurationCollapsed,
    verifyMinikubeCluster,
    fetchMinikubeActiveResources,
    setSelectedMinikubeCluster,
    setMinikubeClusterInput,
    setMinikubeConfigurationCollapsed
  } = minikube;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Handle Minikube verification
  const handleMinikubeVerification = async () => {
    const verifyId = `verify-minikube-${Date.now()}`;
    
    try {
      addToRecent({
        id: verifyId,
        title: 'Minikube Environment Verification',
        color: 'bg-purple-600',
        status: '⏳ Verifying...',
        environment: 'minikube'
      });

      const result = await verifyMinikubeCluster(selectedMinikubeCluster || minikubeClusterInput);
      
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      
      updateRecentOperationStatus(
        verifyId,
        `✅ Minikube Environment verified at ${completionTime}`
      );
    } catch (error) {
      updateRecentOperationStatus(
        verifyId,
        `❌ Verification failed: ${error.message}`
      );
    }
  };

  // Handle provision action
  const handleProvision = () => {
    dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: true });
  };

  // Handle terminal action
  const handleTerminal = () => {
    setShowTerminalModal(true);
  };

  // Prepare component status data
  const capiComponents = [
    {
      name: 'Cert Manager',
      enabled: true,
      version: 'v2.10.0',
      date: '11/3/2025'
    },
    {
      name: 'CAPI Controller',
      enabled: true,
      version: 'v2.10.0',
      date: '11/3/2025'
    },
    {
      name: 'CAPA Controller',
      enabled: true,
      version: 'v2.10.0',
      date: '11/3/2025'
    },
    {
      name: 'ROSA CRD',
      enabled: true,
      version: 'v2.10.0',
      date: '11/3/2025'
    }
  ];

  const minikubeActions = [
    {
      label: 'Verify',
      icon: '✓',
      onClick: handleMinikubeVerification,
      disabled: minikubeLoading,
      variant: 'primary'
    },
    {
      label: 'Configure',
      icon: '⚙️',
      onClick: () => console.log('Configure clicked'),
      variant: 'secondary'
    }
  ];

  const componentActions = [
    {
      label: 'Terminal',
      icon: '💻',
      onClick: handleTerminal,
      variant: 'secondary'
    },
    {
      label: 'Provision',
      icon: '+',
      onClick: handleProvision,
      variant: 'primary'
    }
  ];

  if (!verifiedMinikubeClusterInfo) {
    return (
      <div className="mb-6">
        <div className="text-center py-8 text-gray-500">
          <p>No verified Minikube cluster found.</p>
          <p className="mt-2">Please verify a cluster to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 relative max-w-[1800px] mx-auto space-y-6">
        {/* Main Environment Container */}
        <EnvironmentCard
          theme="minikube"
          title="Configuration"
          icon="⚙️"
          isCollapsed={minikubeConfigurationCollapsed}
          onToggle={() => setMinikubeConfigurationCollapsed(!minikubeConfigurationCollapsed)}
        >
          {/* Three Column Layout */}
          <div className={cardStyles.grid}>
            {/* Minikube Configuration Card */}
            <StatusCard
              theme="minikube"
              title="Minikube Configuration"
              icon={
                <svg
                  className="h-5 w-5"
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
              }
              status={`${verifiedMinikubeClusterInfo?.status || 'Running'}`}
              lastVerified={minikubeVerificationResult?.verified_at ? 
                new Date(minikubeVerificationResult.verified_at).toLocaleDateString() : 
                'Not verified yet'
              }
              actions={minikubeActions}
            >
              {/* Cluster Information */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-purple-100">
                  <h5 className="font-semibold text-purple-900 mb-2">
                    {verifiedMinikubeClusterInfo.name}
                  </h5>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <div className="flex items-center mt-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-600">Running</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-600">CAPI/CAPA:</span>
                      <div className="flex items-center mt-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Clusters:</span>
                      <div className="mt-1 text-purple-600">0</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    <span className="font-medium">Last Verified:</span>
                    <br />
                    {minikubeVerificationResult?.verified_at ? 
                      new Date(minikubeVerificationResult.verified_at).toLocaleString() : 
                      'Not verified yet'
                    }
                  </div>
                </div>

                {/* No ROSA clusters message */}
                <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                  No ROSA clusters found. Create one from the Minikube section below.
                </div>
              </div>
            </StatusCard>

            {/* CAPI/CAPA Components Card */}
            <ComponentStatusCard
              theme="minikube"
              title={`CAPI/CAPA Components (${capiComponents.filter(c => c.enabled).length} configured)`}
              components={capiComponents}
              actions={componentActions}
            />

            {/* Active Resources Card */}
            <StatusCard
              theme="minikube"
              title="Provisioned Resources"
              icon="📦"
              status={`${minikubeActiveResources.length} total`}
              actions={[
                {
                  label: 'Provision',
                  icon: '❄️',
                  onClick: handleProvision,
                  variant: 'secondary'
                },
                {
                  label: 'Export',
                  icon: '📤',
                  onClick: () => console.log('Export clicked'),
                  variant: 'secondary'
                },
                {
                  label: 'Refresh',
                  icon: '🔄',
                  onClick: () => fetchMinikubeActiveResources(
                    verifiedMinikubeClusterInfo?.name,
                    verifiedMinikubeClusterInfo?.namespace
                  ),
                  variant: 'secondary'
                }
              ]}
            >
              {minikubeResourcesLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading resources...</p>
                </div>
              ) : minikubeActiveResources.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No active resources found.</p>
                  <p className="text-sm mt-1">Click "Verify" or "Configure" to load resources.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {minikubeActiveResources.slice(0, 5).map((resource, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium">{resource.name || 'Unknown'}</span>
                        <div className="text-sm text-gray-600">{resource.type || 'Unknown Type'}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                          resource.status === 'Running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {resource.status || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {minikubeActiveResources.length > 5 && (
                    <div className="text-center py-2 text-sm text-purple-600">
                      +{minikubeActiveResources.length - 5} more resources
                    </div>
                  )}
                </div>
              )}
            </StatusCard>
          </div>
        </EnvironmentCard>
      </div>

      {/* Minikube Terminal Section */}
      <MinikubeTerminalSection clusterName={verifiedMinikubeClusterInfo?.name} />

      {/* Terminal Modal */}
      <MinikubeTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        clusterName={verifiedMinikubeClusterInfo?.name}
      />
    </>
  );
};

export default MinikubeEnvironment;