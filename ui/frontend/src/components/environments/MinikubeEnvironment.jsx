import React, { useState } from 'react';
import EnvironmentCard from '../cards/EnvironmentCard';
import StatusCard from '../cards/StatusCard';
import ComponentStatusCard from '../cards/ComponentStatusCard';
import MinikubeTerminalModal from '../modals/MinikubeTerminalModal';
import MinikubeClusterConfigModal from '../modals/MinikubeClusterConfigModal';
import { useMinikubeContext, useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { cardStyles } from '../../styles/themes';

const MinikubeEnvironment = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

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

  // Handle CAPI/CAPA configuration
  const handleComponentConfigure = async () => {
    const configureId = `configure-capi-${Date.now()}`;

    // Get cluster name from the same sources as display
    const targetClusterName = verifiedMinikubeClusterInfo?.name ||
                              verifiedMinikubeClusterInfo?.cluster_name ||
                              selectedMinikubeCluster ||
                              minikubeClusterInput;

    if (!targetClusterName) {
      alert('Please verify a Minikube cluster first');
      return;
    }

    try {
      // IMMEDIATELY show "Starting..." in Task Summary for instant feedback (before any async calls!)
      addToRecent({
        id: configureId,
        title: '🚀 INITIALIZE CAPI/CAPA ON MINIKUBE',
        color: 'bg-purple-600',
        status: '🚀 Starting initialization...',
        environment: 'minikube',
        output: `Initializing CAPI/CAPA components on cluster "${targetClusterName}"...\n\nSubmitting request to backend...\n\nThis will:\n- Install Cluster API controllers\n- Install AWS provider (CAPA)\n- Configure ROSA CRDs\n- Set up credentials`
      });

      const response = await fetch('http://localhost:8000/api/minikube/initialize-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_name: targetClusterName }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.job_id) {
        console.log(`✅ CAPI initialization started! Job ID: ${data.job_id}`);

        // Remove the frontend entry - backend job will show instead
        recentOps.removeRecentOperation(configureId);

        // The job history system will track completion automatically
      } else if (response.ok && data.success) {
        // Old path without job_id - remove the entry and show simple success
        recentOps.removeRecentOperation(configureId);

        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        addToRecent({
          id: `configure-capi-complete-${Date.now()}`,
          title: 'Initialize CAPI/CAPA on Minikube',
          color: 'bg-purple-600',
          status: `✅ CAPI/CAPA initialized at ${completionTime}`,
          environment: 'minikube',
          output: `CAPI/CAPA Initialization Complete\n\n✅ Cluster API controllers installed\n✅ AWS provider configured\n✅ ROSA CRDs deployed\n✅ Ready for cluster provisioning\n\nCompleted at ${completionTime}`
        });

        // Refresh resources
        await fetchMinikubeActiveResources(
          verifiedMinikubeClusterInfo?.name,
          verifiedMinikubeClusterInfo?.namespace
        );
      } else {
        throw new Error(data.message || 'CAPI initialization failed');
      }
    } catch (error) {
      updateRecentOperationStatus(
        configureId,
        `❌ Initialization failed: ${error.message}`,
        `Failed to initialize CAPI/CAPA\n\nError: ${error.message}\n\nPlease check:\n- Minikube cluster is running\n- Cluster has sufficient resources\n- Network connectivity is available`
      );
    }
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
      onClick: () => setShowConfigModal(true),
      variant: 'secondary'
    }
  ];

  const componentActions = [
    {
      label: 'Configure',
      icon: '⚙️',
      onClick: handleComponentConfigure,
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
  ];

  // Show configuration even if no cluster is verified yet
  const showFullConfig = !!verifiedMinikubeClusterInfo;

  // Get cluster name from multiple sources
  const clusterName = verifiedMinikubeClusterInfo?.name ||
                      verifiedMinikubeClusterInfo?.cluster_name ||
                      selectedMinikubeCluster ||
                      minikubeClusterInput;

  return (
    <>
      <div className="mb-6 relative space-y-6">
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
              status={clusterName ? `🔷 ${clusterName}` : 'No cluster selected'}
              verificationStatus={showFullConfig ? 'Running' : 'Not configured'}
              lastVerified={showFullConfig && minikubeVerificationResult?.verified_at ?
                new Date(minikubeVerificationResult.verified_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) :
                null
              }
              actions={minikubeActions}
            >
              {/* Cluster Information */}
              {showFullConfig ? (
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

                    {minikubeVerificationResult?.verified_at && (
                      <div>
                        <span className="font-medium text-gray-600">Last Verified:</span>
                        <div className="mt-1 text-gray-700">
                          {new Date(minikubeVerificationResult.verified_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
              ) : (
                <div className="text-center py-8 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                  <svg className="h-12 w-12 mx-auto mb-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-gray-700 font-medium mb-2">No Minikube Cluster Configured</p>
                  <p className="text-sm text-gray-500 mb-4">Click "Configure" to select or create a Minikube cluster</p>
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all font-medium text-sm shadow-md"
                  >
                    Configure Cluster
                  </button>
                </div>
              )}
            </StatusCard>

            {/* Components Card */}
            <ComponentStatusCard
              theme="minikube"
              title="Components"
              status={`${capiComponents.filter(c => c.enabled).length} configured`}
              components={capiComponents}
              actions={componentActions}
            />

            {/* Resources Card */}
            <StatusCard
              theme="minikube"
              title="Resources"
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

      {/* Terminal Modal */}
      <MinikubeTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        clusterName={verifiedMinikubeClusterInfo?.name}
      />

      {/* Cluster Config Modal */}
      <MinikubeClusterConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
};

export default MinikubeEnvironment;