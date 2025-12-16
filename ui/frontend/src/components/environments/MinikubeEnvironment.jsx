import React, { useState, useEffect } from 'react';
import EnvironmentCard from '../cards/EnvironmentCard';
import StatusCard from '../cards/StatusCard';
import ComponentStatusCard from '../cards/ComponentStatusCard';
import MinikubeTerminalModal from '../modals/MinikubeTerminalModal';
import MinikubeClusterConfigModal from '../modals/MinikubeClusterConfigModal';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import CapiInstallMethodModal from '../modals/CapiInstallMethodModal';
import { BellIcon } from '@heroicons/react/24/outline';
import { useMinikubeContext, useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { cardStyles } from '../../styles/themes';

const STORAGE_KEY_METHOD = 'capiInstallMethod';
const STORAGE_KEY_REMEMBER = 'capiInstallMethodRemember';

const MinikubeEnvironment = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [installMethod, setInstallMethod] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_METHOD) || 'clusterctl';
  });
  const [componentVersions, setComponentVersions] = useState([]);

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

  const { addToRecent, updateRecentOperationStatus, recentOperations } = recentOps;

  // Check if a CAPI configuration is currently in progress
  const isConfiguring = recentOperations?.some(op =>
    op.id?.startsWith('configure-capi-') &&
    op.status?.includes('⏳')
  ) || false;

  // Handle installation method selection
  const handleMethodSelected = (method, remember) => {
    setInstallMethod(method);
    localStorage.setItem(STORAGE_KEY_METHOD, method);
    if (remember) {
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }
  };

  // Get method display info
  const getMethodInfo = (method) => {
    return method === 'clusterctl'
      ? { icon: '⚡', name: 'Cluster API' }
      : { icon: '📦', name: 'Helm Charts' };
  };

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
    // Set the target context to the verified Minikube cluster name
    const targetClusterName = verifiedMinikubeClusterInfo?.name ||
                              verifiedMinikubeClusterInfo?.cluster_name ||
                              selectedMinikubeCluster ||
                              minikubeClusterInput;

    dispatch({ type: AppActionTypes.SET_PROVISION_TARGET_CONTEXT, payload: targetClusterName });
    dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: true });
  };

  // Handle terminal action
  const handleTerminal = () => {
    setShowTerminalModal(true);
  };

  // Handle CAPI/CAPA configuration
  const handleComponentConfigure = async (customImage = null, method = null) => {
    // Prevent multiple simultaneous configurations
    if (isConfiguring) {
      alert('A CAPI configuration is already in progress. Please wait for it to complete.');
      return;
    }

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

    // Use the provided method or fall back to state
    const activeMethod = method || installMethod;
    const methodInfo = getMethodInfo(activeMethod);

    try {
      // Build output message
      let outputMessage = `Configuring CAPI/CAPA components on cluster "${targetClusterName}" using ${methodInfo.name}...\n\nSubmitting request to backend...\n\nThis will:\n- Install Cluster API controllers\n- Install AWS provider (CAPA)\n- Configure ROSA CRDs\n- Set up credentials`;

      if (customImage) {
        outputMessage += `\n\n🎨 Using Custom CAPA Image:\n- Repository: ${customImage.repository}\n- Tag: ${customImage.tag}`;
        if (customImage.sourcePath) {
          outputMessage += `\n- Source: ${customImage.sourcePath}\n- Will apply updated CRDs from config/default/`;
        }
      }

      // IMMEDIATELY show "Starting..." in Task Summary for instant feedback (before any async calls!)
      addToRecent({
        id: configureId,
        title: `🚀 CONFIGURE CAPI/CAPA ON MINIKUBE (${methodInfo.name})`,
        color: 'bg-purple-600',
        status: '⏳ Configuring...',
        environment: 'minikube',
        output: outputMessage
      });

      // Build request body
      const requestBody = {
        cluster_name: targetClusterName,
        install_method: activeMethod
      };

      if (customImage) {
        requestBody.custom_capa_image = {
          repository: customImage.repository,
          tag: customImage.tag
        };
      }

      const response = await fetch('http://localhost:8000/api/minikube/initialize-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success && data.job_id) {
        console.log(`✅ CAPI configuration started! Job ID: ${data.job_id}`);

        // Store the installation method for this cluster
        localStorage.setItem(`minikube-cluster-method-${targetClusterName}`, activeMethod);

        // Remove the frontend entry - backend job will show instead
        recentOps.removeRecentOperation(configureId);

        // The job history system will track completion automatically
      } else if (response.ok && data.success) {
        // Old path without job_id - remove the entry and show simple success
        recentOps.removeRecentOperation(configureId);

        // Store the installation method for this cluster
        localStorage.setItem(`minikube-cluster-method-${targetClusterName}`, activeMethod);

        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        addToRecent({
          id: `configure-capi-complete-${Date.now()}`,
          title: 'Configure CAPI/CAPA on Minikube',
          color: 'bg-purple-600',
          status: `✅ CAPI/CAPI configured at ${completionTime}`,
          environment: 'minikube',
          output: `CAPI/CAPA Configuration Complete\n\n✅ Cluster API controllers installed\n✅ AWS provider configured\n✅ ROSA CRDs deployed\n✅ Ready for cluster provisioning\n\nCompleted at ${completionTime}`
        });

        // Refresh resources
        await fetchMinikubeActiveResources(
          verifiedMinikubeClusterInfo?.name,
          verifiedMinikubeClusterInfo?.namespace
        );
      } else {
        throw new Error(data.message || 'CAPI configuration failed');
      }
    } catch (error) {
      updateRecentOperationStatus(
        configureId,
        `❌ Configuration failed: ${error.message}`,
        `Failed to configure CAPI/CAPA\n\nError: ${error.message}\n\nPlease check:\n- Minikube cluster is running\n- Cluster has sufficient resources\n- Network connectivity is available`
      );
    }
  };

  // Fetch component versions from backend
  useEffect(() => {
    const fetchComponentVersions = async () => {
      try {
        // Get cluster name for the API call
        const targetClusterName = verifiedMinikubeClusterInfo?.name ||
                                   verifiedMinikubeClusterInfo?.cluster_name ||
                                   selectedMinikubeCluster ||
                                   minikubeClusterInput;

        // Build URL with query parameters
        let url = 'http://localhost:8000/api/capi/component-versions?environment=minikube';
        if (targetClusterName) {
          url += `&cluster_name=${encodeURIComponent(targetClusterName)}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setComponentVersions(data.components);
        }
      } catch (error) {
        console.error('Failed to fetch component versions:', error);
      }
    };
    fetchComponentVersions();
  }, [verifiedMinikubeClusterInfo, selectedMinikubeCluster, minikubeClusterInput]);

  // Use fetched versions or fallback to defaults
  const capiComponents = componentVersions.length > 0 ? componentVersions : [
    {
      name: 'Cert Manager',
      enabled: true,
      version: 'loading...'
    },
    {
      name: 'CAPI Controller',
      enabled: true,
      version: 'loading...'
    },
    {
      name: 'CAPA Controller',
      enabled: true,
      version: 'loading...'
    },
    {
      name: 'ROSA CRD',
      enabled: true,
      version: 'loading...'
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

  // Custom Configure button with method selector
  const methodInfo = getMethodInfo(installMethod);

  // Check if user wants to remember their method choice
  const rememberMethodChoice = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';

  // Handle configure click - show modal if user hasn't set "remember choice"
  const handleConfigureClick = () => {
    // Get cluster name to check if it already has a known method
    const targetClusterName = verifiedMinikubeClusterInfo?.name ||
                              verifiedMinikubeClusterInfo?.cluster_name ||
                              selectedMinikubeCluster ||
                              minikubeClusterInput;

    // Check if this cluster already has a stored installation method
    const clusterMethod = targetClusterName ? localStorage.getItem(`minikube-cluster-method-${targetClusterName}`) : null;

    if (clusterMethod) {
      // Cluster already has CAPI installed with a known method - use it directly
      console.log(`Using existing installation method for ${targetClusterName}: ${clusterMethod}`);
      handleComponentConfigure(null, clusterMethod);
    } else if (rememberMethodChoice) {
      // User chose to remember their method preference, use it directly
      handleComponentConfigure();
    } else {
      // Show modal to choose method each time
      setShowMethodModal(true);
    }
  };

  // Store custom image config
  const [customImageConfig, setCustomImageConfig] = useState(null);

  // After method is selected from modal, proceed with configuration
  const handleMethodSelectedAndConfigure = (method, remember, customImage) => {
    handleMethodSelected(method, remember);
    setCustomImageConfig(customImage);
    setShowMethodModal(false);
    // Give a brief moment for modal to close, then configure
    setTimeout(() => {
      handleComponentConfigure(customImage, method);
    }, 100);
  };

  const componentActions = [
    {
      label: isConfiguring ? 'Configuring...' : 'Configure',
      icon: '⚙️',
      onClick: handleConfigureClick,
      disabled: isConfiguring,
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

  // Get stored installation method for this cluster
  const clusterMethod = clusterName ? localStorage.getItem(`minikube-cluster-method-${clusterName}`) : null;
  const methodDisplay = clusterMethod === 'helm' ? '📦 Helm' : clusterMethod === 'clusterctl' ? '⚡ clusterctl' : '';

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
          titleActions={
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotificationSettings(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
              title="Notification Settings"
            >
              <BellIcon className="h-4 w-4" />
              <span>Notifications</span>
            </button>
          }
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
              status={clusterName ? `🔷 ${clusterName}${methodDisplay ? ` (${methodDisplay})` : ''}` : 'No cluster selected'}
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
                    <h5 className="font-semibold text-purple-900 mb-3">
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
        onClusterCreated={(method) => {
          // After cluster is created with method selected, handle based on method
          if (method === 'clusterctl') {
            // For clusterctl, show custom image modal
            setInstallMethod(method);
            setShowMethodModal(true);
          } else {
            // For Helm, configure directly without custom image options
            setInstallMethod(method);
            handleComponentConfigure(null, method);
          }
        }}
      />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        theme="minikube"
      />

      {/* CAPI Installation Method Modal */}
      <CapiInstallMethodModal
        isOpen={showMethodModal}
        onClose={() => setShowMethodModal(false)}
        onMethodSelected={handleMethodSelectedAndConfigure}
        currentMethod={installMethod}
      />
    </>
  );
};

export default MinikubeEnvironment;