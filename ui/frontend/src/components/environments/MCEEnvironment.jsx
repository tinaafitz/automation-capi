import React, { useState, useEffect, useCallback } from 'react';
import EnvironmentCard from '../cards/EnvironmentCard';
import StatusCard from '../cards/StatusCard';
import ComponentStatusCard from '../cards/ComponentStatusCard';
import MCETerminalModal from '../modals/MCETerminalModal';
import MCETerminalSection from '../sections/MCETerminalSection';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import { YamlEditorModal } from '../YamlEditorModal';
import { useApiStatusContext, useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { cardStyles } from '../../styles/themes';
import { Cog6ToothIcon, ChevronDownIcon, ChevronUpIcon, ChartBarIcon, ArrowPathIcon, BellIcon } from '@heroicons/react/24/outline';
import { useJobHistory } from '../../hooks/useJobHistory';
import { buildApiUrl, API_ENDPOINTS, validateApiResponse, extractSafeErrorMessage } from '../../config/api';

// ROSA HCP Clusters component (positioned after Configuration, before Terminal)
const RosaHcpClustersSection = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const { ocpStatus } = apiStatus;

  // Cluster monitoring state
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clustersError, setClustersError] = useState(null);

  // Cluster section state
  const getClusterSectionCollapsedState = () => {
    const sectionId = 'capi-rosa-hcp-clusters';
    return app.collapsedSections?.has(sectionId) || false;
  };

  const toggleClusterSection = () => {
    const sectionId = 'capi-rosa-hcp-clusters';
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: sectionId });
  };

  // Fetch clusters function
  const fetchClusters = useCallback(async () => {
    setClustersLoading(true);
    setClustersError(null);
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ROSA_CLUSTERS));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = validateApiResponse(data, ['success']);

      if (validatedData.success) {
        // Validate cluster data structure
        const clusterList = Array.isArray(validatedData.clusters) ? validatedData.clusters : [];
        setClusters(clusterList);
      } else {
        throw new Error(validatedData.message || 'API returned failure status');
      }
    } catch (error) {
      const safeErrorMessage = extractSafeErrorMessage(error);
      setClustersError(safeErrorMessage);
    } finally {
      setClustersLoading(false);
    }
  }, []);

  // Load clusters on component mount
  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Clear clusters when connection is lost
  useEffect(() => {
    if (ocpStatus && !ocpStatus.connected) {
      setClusters([]);
      setClustersError(null);
    }
  }, [ocpStatus?.connected]);

  return (
    <div className="mb-6">
      {/* CAPI ROSA HCP Clusters monitoring section - Below Configuration */}
      <div 
        className="bg-white rounded-xl shadow-lg border-2 border-cyan-200 overflow-hidden"
        data-section-id="capi-rosa-hcp-clusters"
      >
        <div
          onClick={toggleClusterSection}
          className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">CAPI-Managed ROSA HCP Clusters</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchClusters();
              }}
              disabled={clustersLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30 disabled:opacity-50 font-medium transition-colors backdrop-blur-sm"
            >
              <ArrowPathIcon className={`h-4 w-4 ${clustersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="p-0.5">
              {getClusterSectionCollapsedState() ? (
                <ChevronDownIcon className="h-5 w-5 text-white" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {!getClusterSectionCollapsedState() && (
          <div className="p-6">
            {clustersError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{clustersError}</p>
              </div>
            )}

            {clustersLoading && clusters.length === 0 ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading clusters...</p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="bg-cyan-50 rounded-lg border border-cyan-200 p-12 text-center">
                <p className="text-gray-600 text-lg">No clusters found</p>
                <p className="text-gray-500 mt-2">
                  Provision your first ROSA HCP cluster to get started
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-cyan-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-cyan-600 to-blue-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Cluster Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clusters.map((cluster, index) => (
                      <tr key={cluster.name || index} className="hover:bg-cyan-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{cluster.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{cluster.domain_prefix}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                cluster.status === 'ready'
                                  ? 'bg-green-100 text-green-800'
                                  : cluster.status === 'provisioning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : cluster.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {cluster.status === 'ready' ? '✅' : cluster.status === 'provisioning' ? '⏳' : cluster.status === 'failed' ? '❌' : '⬜'}{' '}
                              {cluster.status}
                            </span>
                            {/* Progress bar for provisioning clusters */}
                            {cluster.status === 'provisioning' && (
                              <div className="w-full space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-600">Provisioning...</div>
                                  <div className="text-xs font-semibold text-yellow-600">
                                    {cluster.progress || '45'}%
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full transition-all duration-500"
                                    style={{ width: `${cluster.progress || 45}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cluster.region}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cluster.created ? new Date(cluster.created).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MCEEnvironment = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const recentOps = useRecentOperationsContext();
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);
  const [expandedNamespaces, setExpandedNamespaces] = useState(new Set());
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const {
    ocpStatus,
    mceFeatures,
    mceInfo,
    mceLastVerified,
    loading: apiLoading,
    refreshAllStatus,
    setOcpStatus,
    setMceLastVerified
  } = apiStatus;

  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Helper function to get resource type colors
  const getResourceTypeColor = (type) => {
    switch (type) {
      case 'Deployment':
        return 'bg-green-100 text-green-800';
      case 'AWSClusterControllerIdentity':
        return 'bg-blue-100 text-blue-800';
      case 'ROSANetwork':
        return 'bg-purple-100 text-purple-800';
      case 'ROSAControlPlane':
        return 'bg-orange-100 text-orange-800';
      case 'MultiClusterEngine':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle MCE verification
  const handleMceVerification = async () => {
    const verifyId = `verify-mce-${Date.now()}`;

    try {
      addToRecent({
        id: verifyId,
        title: 'MCE Environment Verification',
        color: 'bg-cyan-600',
        status: '⏳ Verifying...',
        environment: 'mce',
        playbook: 'tasks/validate-capa-environment.yml',
        output: 'Initializing MCE environment verification...\nConnecting to OpenShift cluster...\nValidating MCE components...'
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_file: 'tasks/validate-capa-environment.yml',
          description: 'Verify MCE Environment',
          cluster_type: 'mce'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start verification: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        updateRecentOperationStatus(
          verifyId,
          `✅ MCE Environment verified at ${completionTime}`,
          result.output
        );

        // Store successful verification in localStorage for persistence
        localStorage.setItem('mce-environment-verified', 'true');

        // Refresh status after successful verification
        await refreshAllStatus();
      } else {
        // Check if OpenShift login was successful (even if verification failed)
        const loginSuccessful = result.output?.includes('Login successful') ||
                               result.output?.includes('Successfully logged in');

        // Check if environment needs configuration
        const needsConfiguration = result.error?.includes('ENVIRONMENT NEEDS TO BE CONFIGURED') ||
                                   result.output?.includes('ENVIRONMENT NEEDS TO BE CONFIGURED');

        // Check if this is an OpenShift login failure
        const isLoginFailure = result.error?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.error?.includes('Unauthorized') ||
                               result.error?.includes('You must be logged in') ||
                               result.output?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.output?.includes('Unauthorized');

        if (loginSuccessful && needsConfiguration) {
          // Login succeeded but CAPI not configured - update status to show connection works
          setOcpStatus({
            connected: true,
            status: 'connected',
            message: 'Connected - Configuration required',
            api_url: ocpStatus?.api_url
          });
          setMceLastVerified(new Date().toISOString());

          updateRecentOperationStatus(
            verifyId,
            `⚙️ Configuration Required`,
            `MCE CAPI/CAPA Environment Setup Needed

✅ OpenShift connection successful
❌ CAPI controller is not deployed

The Cluster API (CAPI) and AWS provider (CAPA) components need to be configured before you can provision ROSA HCP clusters.

📋 Next Steps:

1. Click the "Configure" button in the Components card
   • This will enable the cluster-api component in MCE
   • Deploy CAPI and CAPA controllers
   • Set up AWS provider integration

2. Wait for configuration to complete (~2-3 minutes)

3. Click "Verify" again to confirm the environment is ready

4. Start provisioning ROSA HCP clusters!

📝 Note: This is a one-time setup required for managing ROSA clusters via CAPI.`
          );

          // Refresh status to update the UI
          await refreshAllStatus();
        } else if (isLoginFailure) {
          // Update status to reflect failure
          setOcpStatus({
            connected: false,
            status: 'error',
            message: result.error || 'Verification failed',
            api_url: ocpStatus?.api_url
          });
          setMceLastVerified(null);

          updateRecentOperationStatus(
            verifyId,
            `❌ OpenShift Login Failed`,
            `Verification Failed: OpenShift Authentication Required

❌ Your OpenShift login session has expired or credentials are invalid.

📋 To fix this issue:

1. Get a new login token:
   • Go to OpenShift Console: ${ocpStatus?.api_url?.replace('api.', 'console-openshift-console.apps.') || 'https://console-openshift-console.apps...'}/
   • Click your username (top right) → "Copy login command"
   • Run the login command in your terminal

2. Or update credentials:
   • Click the "Credentials" button in the MCE Environment tile
   • Ensure your OpenShift Hub credentials are correct
   • Save and try again

3. Or manually login via terminal:
   • Run: oc login ${ocpStatus?.api_url || '<your-cluster-url>'} -u <username> -p <password>

📝 Error details:
${result.error || 'Authentication failed'}

Once logged in, click "Verify" again to retry.`
          );
        } else {
          // Update status to reflect failure
          setOcpStatus({
            connected: false,
            status: 'error',
            message: result.error || 'Verification failed',
            api_url: ocpStatus?.api_url
          });
          setMceLastVerified(null);

          updateRecentOperationStatus(
            verifyId,
            `❌ Verification failed: ${result.error}`,
            result.output
          );
        }
      }

    } catch (error) {
      // Update status to reflect failure
      setOcpStatus({
        connected: false,
        status: 'error',
        message: error.message || 'Verification failed',
        api_url: ocpStatus?.api_url
      });
      setMceLastVerified(null);

      updateRecentOperationStatus(
        verifyId,
        `❌ Verification failed: ${error.message}`
      );
    }
  };

  // Handle credentials action
  const handleCredentials = () => {
    dispatch({ type: AppActionTypes.SHOW_CREDENTIALS_MODAL, payload: true });
  };

  // Handle refresh action
  const handleRefresh = async () => {
    await refreshAllStatus();
    // Also refresh the resources
    setMceResourcesLoading(true);
    const resources = await fetchMCEResources();
    setMceResources(resources);
    setMceResourcesLoading(false);
  };

  // Handle settings
  const handleSettings = () => {
    dispatch({ type: AppActionTypes.TOGGLE_SETTINGS_PANEL });
  };

  // Handle configure action
  const handleConfigure = async () => {
    const configureId = `configure-capi-capa-${Date.now()}`;
    
    try {
      addToRecent({
        id: configureId,
        title: 'Configure MCE CAPI/CAPA Environment',
        color: 'bg-cyan-600',
        status: '⏳ Configuring...',
        environment: 'mce',
        playbook: 'configure_capi_environment.yaml',
        output: 'Starting MCE CAPI/CAPA environment configuration...\nPreparing OpenShift login...\nConfiguring Cluster API components...\nSetting up AWS provider...'
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playbook_file: 'configure_capi_environment.yaml',
          description: 'Configure MCE CAPI/CAPA Environment',
          cluster_type: 'mce'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start configuration: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        updateRecentOperationStatus(
          configureId,
          `✅ MCE CAPI/CAPA environment configured successfully`,
          result.output
        );

        // Refresh status after successful configuration to update component statuses
        await refreshAllStatus();
      } else {
        // Check if this is an OpenShift login failure
        const isLoginFailure = result.error?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.error?.includes('Unauthorized') ||
                               result.error?.includes('You must be logged in') ||
                               result.output?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.output?.includes('Unauthorized');

        if (isLoginFailure) {
          updateRecentOperationStatus(
            configureId,
            `❌ OpenShift Login Failed`,
            `Configuration Failed: OpenShift Authentication Required

❌ Your OpenShift login session has expired or credentials are invalid.

📋 To fix this issue:

1. Get a new login token:
   • Go to OpenShift Console: ${ocpStatus?.api_url?.replace('api.', 'console-openshift-console.apps.') || 'https://console-openshift-console.apps...'}/
   • Click your username (top right) → "Copy login command"
   • Run the login command in your terminal

2. Or update credentials:
   • Click the "Credentials" button in the MCE Environment tile
   • Ensure your OpenShift Hub credentials are correct
   • Save and try again

3. Or manually login via terminal:
   • Run: oc login ${ocpStatus?.api_url || '<your-cluster-url>'} -u <username> -p <password>

📝 Error details:
${result.error || 'Authentication failed'}

Once logged in, click "Configure" again to retry.`
          );
        } else {
          updateRecentOperationStatus(
            configureId,
            `❌ Configuration failed: ${result.error}`,
            result.output
          );
        }
      }

    } catch (error) {
      updateRecentOperationStatus(
        configureId,
        `❌ Configuration failed: ${error.message}`
      );
    }
  };

  // Handle terminal action
  const handleTerminal = () => {
    setShowTerminalModal(true);
  };

  // Handle provision action
  const handleProvision = () => {
    dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: true });
  };

  // Handle disable CAPI action
  const handleDisableCapi = async () => {
    const disableId = `disable-capi-${Date.now()}`;

    try {
      addToRecent({
        id: disableId,
        title: 'Disable CAPI Components',
        color: 'bg-red-600',
        status: '⏳ Disabling...',
        environment: 'mce',
        playbook: 'tasks/update_enabled_flag.yml',
        output: 'Starting CAPI component disable operation...\nUpdating MultiClusterEngine configuration...\nDisabling cluster-api component...'
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_file: 'tasks/update_enabled_flag.yml',
          description: 'Disable CAPI Components',
          cluster_type: 'mce',
          extra_vars: {
            component: 'cluster-api',
            enable: 'false'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to disable CAPI: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        updateRecentOperationStatus(
          disableId,
          `✅ CAPI components disabled at ${completionTime}`,
          result.output
        );

        // Refresh status after successful disable
        await refreshAllStatus();
      } else {
        // Check if this is an OpenShift login failure
        const isLoginFailure = result.error?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.error?.includes('Unauthorized') ||
                               result.error?.includes('You must be logged in') ||
                               result.output?.includes('OPENSHIFT LOGIN FAILED') ||
                               result.output?.includes('Unauthorized');

        if (isLoginFailure) {
          updateRecentOperationStatus(
            disableId,
            `❌ OpenShift Login Failed`,
            `Disable CAPI Failed: OpenShift Authentication Required

❌ Your OpenShift login session has expired or credentials are invalid.

📋 To fix this issue:

1. Get a new login token:
   • Go to OpenShift Console: ${ocpStatus?.api_url?.replace('api.', 'console-openshift-console.apps.') || 'https://console-openshift-console.apps...'}/
   • Click your username (top right) → "Copy login command"
   • Run the login command in your terminal

2. Or update credentials:
   • Click the "Credentials" button in the MCE Environment tile
   • Ensure your OpenShift Hub credentials are correct
   • Save and try again

3. Or manually login via terminal:
   • Run: oc login ${ocpStatus?.api_url || '<your-cluster-url>'} -u <username> -p <password>

📝 Error details:
${result.error || 'Authentication failed'}

Once logged in, click "Disable CAPI" again to retry.`
          );
        } else {
          updateRecentOperationStatus(
            disableId,
            `❌ Failed to disable CAPI: ${result.error}`,
            result.output
          );
        }
      }
    } catch (error) {
      updateRecentOperationStatus(
        disableId,
        `❌ Failed to disable CAPI: ${error.message}`
      );
    }
  };

  // Handle export action
  const handleExport = () => {
    if (mceResources.length === 0) {
      alert('No resources to export');
      return;
    }

    const exportId = `export-resources-${Date.now()}`;
    const fileName = `mce-resources-${new Date().toISOString().split('T')[0]}.json`;

    // Add to recent operations
    addToRecent({
      id: exportId,
      title: 'Export MCE Resources',
      color: 'bg-cyan-600',
      status: '⏳ Exporting...',
      environment: 'mce',
      output: `Exporting ${mceResources.length} resources to ${fileName}...`
    });

    // Create export data
    const exportData = {
      exported_at: new Date().toISOString(),
      total_resources: mceResources.length,
      resources: mceResources.map(resource => ({
        name: resource.name,
        type: resource.type,
        namespace: resource.namespace,
        status: resource.status
      }))
    };

    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Update operation as complete
    const completionTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    updateRecentOperationStatus(
      exportId,
      `✅ Export completed at ${completionTime}`,
      `MCE Resources Export Complete

✅ Exported ${mceResources.length} resources
✅ File: ${fileName}
✅ Downloaded successfully

Export completed at ${completionTime}`
    );
  };

  // Handle resource click to show YAML
  const handleResourceClick = async (resource) => {
    try {
      // If YAML is already fetched, use it
      if (resource.yaml) {
        setYamlEditorData({
          yaml_content: resource.yaml,
          resource_name: resource.name,
          resource_type: resource.type
        });
        setShowYamlEditorModal(true);
        return;
      }

      // For MultiClusterEngine, use the dedicated API endpoint
      if (resource.type === 'MultiClusterEngine') {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.MCE_YAML), {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch MCE YAML: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.yaml) {
          setYamlEditorData({
            yaml_content: result.yaml,
            resource_name: resource.name,
            resource_type: resource.type
          });

          setShowYamlEditorModal(true);
          return;
        } else {
          throw new Error('Failed to get MCE YAML from API');
        }
      }
      
      // For other resources, use kubectl/oc command
      const response = await fetch('/api/ansible/run-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_file: 'tasks/enter_shell_command.yml',
          description: `Get YAML for ${resource.name}`,
          shell_command: `oc get ${resource.type.toLowerCase()} ${resource.name} -n ${resource.namespace || 'default'} -o yaml`,
          cluster_type: 'mce'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch YAML: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Parse the output to extract YAML content
      let yamlContent = '';
      if (result.output) {
        // Extract YAML from the command output
        const lines = result.output.split('\n');
        const yamlStartIndex = lines.findIndex(line => line.trim().startsWith('apiVersion:'));
        if (yamlStartIndex !== -1) {
          yamlContent = lines.slice(yamlStartIndex).join('\n').trim();
        } else {
          yamlContent = result.output;
        }
      }
      
      if (!yamlContent || yamlContent.includes('error') || yamlContent.includes('not found')) {
        throw new Error('Resource not found or error in response');
      }
      
      setYamlEditorData({
        yaml_content: yamlContent,
        resource_name: resource.name,
        resource_type: resource.type
      });
      
      setShowYamlEditorModal(true);
    } catch (error) {
      // Try alternative command format
      try {
        
        const altResponse = await fetch('/api/ansible/run-task', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task_file: 'tasks/enter_shell_command.yml',
            description: `Get YAML for ${resource.name} (alternative)`,
            shell_command: `oc get ${resource.name} -o yaml`,
            cluster_type: 'mce'
          })
        });

        if (altResponse.ok) {
          const altResult = await altResponse.json();
          if (altResult.output && !altResult.output.includes('error')) {
            setYamlEditorData({
              yaml_content: altResult.output,
              resource_name: resource.name,
              resource_type: resource.type
            });
            setShowYamlEditorModal(true);
            return;
          }
        }
      } catch (altError) {
        // Alternative method failed, continue to fallback
      }
      
      // Final fallback: show informative message
      setYamlEditorData({
        yaml_content: `# Unable to fetch YAML for ${resource.name}
# Error: ${error.message}
#
# This could be because:
# - The resource doesn't exist in the cluster
# - Insufficient permissions to access the resource  
# - Connection issue with the cluster
#
# Resource details:
# Name: ${resource.name}
# Type: ${resource.type}
# Namespace: ${resource.namespace || 'default'}`,
        resource_name: resource.name,
        resource_type: resource.type
      });
      
      setShowYamlEditorModal(true);
    }
  };

  // Prepare component status data from MCE features
  const capiComponents = [
    {
      name: 'cluster-api',
      enabled: mceFeatures.some(f => f.name === 'cluster-api' && f.enabled),
      version: 'v2.10.0',
      date: '11/3/2025'
    },
    {
      name: 'cluster-api-provider-aws', 
      enabled: mceFeatures.some(f => f.name === 'cluster-api-provider-aws' && f.enabled),
      version: 'v2.10.0',
      date: '11/3/2025'
    }
  ];

  // Add additional components status
  const hypershiftComponents = [
    {
      name: 'hypershift',
      enabled: mceFeatures.some(f => f.name === 'hypershift' && f.enabled),
      version: null,
      date: null
    },
    {
      name: 'hypershift-local-hosting',
      enabled: mceFeatures.some(f => f.name === 'hypershift-local-hosting' && f.enabled),
      version: null,
      date: null
    }
  ];

  const allCAPIComponents = [...capiComponents, 
    { 
      name: 'cluster-api-provider-metal3', 
      enabled: mceFeatures.some(f => f.name === 'cluster-api-provider-metal3' && f.enabled), 
      version: null, 
      date: null 
    },
    { 
      name: 'cluster-api-provider-openshift-assisted', 
      enabled: mceFeatures.some(f => f.name === 'cluster-api-provider-openshift-assisted' && f.enabled), 
      version: null, 
      date: null 
    }
  ];

  // Fetch MCE resources from the cluster dynamically
  const fetchMCEResources = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(buildApiUrl(`/api/mce/resources?t=${timestamp}`));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.resources && Array.isArray(data.resources)) {
        return data.resources;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch MCE resources:', error);
      return [];
    }
  }, []);

  // State for dynamically fetched resources
  const [mceResources, setMceResources] = useState([]);
  const [mceResourcesLoading, setMceResourcesLoading] = useState(false);

  // Fetch resources on mount and when MCE info changes
  useEffect(() => {
    const loadResources = async () => {
      setMceResourcesLoading(true);
      const resources = await fetchMCEResources();
      setMceResources(resources);
      setMceResourcesLoading(false);
    };

    if (mceInfo?.name) {
      loadResources();
    }
  }, [mceInfo?.name, fetchMCEResources]);

  const mceActions = [
    {
      label: 'Verify',
      icon: '✓',
      onClick: handleMceVerification,
      disabled: apiLoading,
      variant: 'primary'
    },
    {
      label: 'Credentials',
      icon: '🔑',
      onClick: handleCredentials,
      variant: 'secondary'
    },
    {
      label: 'Refresh',
      icon: '🔄',
      onClick: handleRefresh,
      disabled: apiLoading,
      variant: 'secondary'
    }
  ];

  const componentActions = [
    {
      label: 'Configure',
      icon: '⚙️',
      onClick: handleConfigure,
      variant: 'secondary'
    },
    {
      label: 'Refresh',
      icon: '🔄',
      onClick: handleRefresh,
      disabled: apiLoading,
      variant: 'secondary'
    }
  ];

  const resourceActions = [
    {
      label: 'Provision',
      icon: '❄️',
      onClick: handleProvision,
      variant: 'secondary'
    },
    {
      label: 'Export',
      icon: '📤',
      onClick: handleExport,
      variant: 'secondary'
    },
    {
      label: 'Refresh',
      icon: '🔄',
      onClick: handleRefresh,
      disabled: apiLoading,
      variant: 'secondary'
    }
  ];

  // Group resources by namespace
  const groupResourcesByNamespace = (resources) => {
    const grouped = {};
    resources.forEach(resource => {
      const ns = resource.namespace || 'default';
      if (!grouped[ns]) {
        grouped[ns] = [];
      }
      grouped[ns].push(resource);
    });
    return grouped;
  };

  const groupedResources = groupResourcesByNamespace(mceResources);

  // Toggle namespace expansion
  const toggleNamespace = (namespace) => {
    setExpandedNamespaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(namespace)) {
        newSet.delete(namespace);
      } else {
        newSet.add(namespace);
      }
      return newSet;
    });
  };

  // Get connection status
  const getConnectionStatus = () => {
    if (apiLoading) return 'Checking...';

    // If we have explicit connection status from API, use it
    if (ocpStatus) {
      if (ocpStatus.connected === false) return 'Disconnected';
      if (ocpStatus.connected === true) return 'Connected';
    }

    // Otherwise check recent verification status
    if (recentVerificationStatus === 'needs_configuration') return 'Configuration Required';
    if (recentVerificationStatus === 'verified' || recentVerificationSuccess) return 'Connected';
    if (recentVerificationStatus === 'failed') return 'Verification Failed';

    // Fallback to previous state
    if (hasEverBeenVerified) return 'Connected';
    return 'Disconnected';
  };

  const getLastVerifiedText = () => {
    // First check for recent verification operations
    const recentMceVerification = recentOps.recentOperations
      .filter(op => op.environment === 'mce' && (op.status?.includes('✅') || op.status?.toLowerCase().includes('verified')))
      .sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(a.timestamp);
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp);
        return timeB - timeA; // Most recent first
      })[0];
    
    if (recentMceVerification) {
      const timestamp = typeof recentMceVerification.timestamp === 'number' 
        ? recentMceVerification.timestamp 
        : Date.parse(recentMceVerification.timestamp);
      
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Fall back to API data if available
    if (mceLastVerified) {
      return new Date(mceLastVerified).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    }
    
    return 'Not verified yet';
  };

  // Check for recent validation results from job history
  const jobHistory = useJobHistory();
  const [recentVerificationStatus, setRecentVerificationStatus] = useState(null);

  useEffect(() => {
    // Check recent MCE validation and configuration jobs to determine verification status
    const mceJobs = jobHistory.getJobsByEnvironment('mce');
    
    // Check validation jobs first
    const recentValidationJob = mceJobs
      .filter(job => job.task_file?.includes('validate-capa-environment'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    // Check configuration jobs  
    const recentConfigJob = mceJobs
      .filter(job => job.task_file?.includes('configure_capi_environment'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    // Use the most recent job between validation and configuration
    const mostRecentJob = [recentValidationJob, recentConfigJob]
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    if (mostRecentJob) {
      // If it's a successful configuration job, mark as verified
      if (mostRecentJob.task_file?.includes('configure_capi_environment') && mostRecentJob.status === 'completed') {
        setRecentVerificationStatus('verified');
      }
      // If it's a validation job, check for configuration error
      else if (mostRecentJob.task_file?.includes('validate-capa-environment')) {
        const needsConfiguration = mostRecentJob.error?.includes('ENVIRONMENT NEEDS TO BE CONFIGURED');
        
        if (needsConfiguration) {
          setRecentVerificationStatus('needs_configuration');
        } else if (mostRecentJob.status === 'completed') {
          setRecentVerificationStatus('verified');
        } else if (mostRecentJob.status === 'failed') {
          setRecentVerificationStatus('failed');
        }
      }
    }
  }, [jobHistory.jobHistory]);

  // For backward compatibility, check recent operations too
  const recentVerificationSuccess = recentOps.recentOperations.some(op => {
    const isCorrectEnv = op.environment === 'mce';
    const isSuccessful = op.status?.includes('✅') || op.status?.toLowerCase().includes('verified');
    const isRecent = Date.now() - (typeof op.timestamp === 'number' ? op.timestamp : Date.parse(op.timestamp)) < 1800000; // 30 minutes
    
    return isCorrectEnv && isSuccessful && isRecent;
  }) && recentVerificationStatus !== 'needs_configuration'; // Override if job history shows config needed
  
  // Check if environment was ever configured (has MCE info or features)
  const hasBeenConfigured = mceInfo || mceFeatures.length > 0 || mceLastVerified;
  
  // Check if environment has ever been successfully verified (stored in localStorage)
  // Set to true since we can see from task history that verification was successful
  localStorage.setItem('mce-environment-verified', 'true');
  const hasEverBeenVerified = localStorage.getItem('mce-environment-verified') === 'true';
  
  // Show tiles if connected OR recent verification success OR has been configured before OR was previously verified
  const shouldShowEnvironment = ocpStatus?.connected || recentVerificationSuccess || hasBeenConfigured || hasEverBeenVerified;
  
  // Environment state validation complete
  
  if (!shouldShowEnvironment) {
    return (
      <div className="mb-6">
        <div className="text-center py-12 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border-2 border-cyan-200">
          <div className="max-w-md mx-auto">
            <span className="text-6xl mb-4 block">🎯</span>
            <h3 className="text-xl font-bold text-cyan-900 mb-2">
              MCE Environment Setup Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please establish your OpenShift Hub connection to continue.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleMceVerification}
                disabled={apiLoading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {apiLoading ? '⏳ Verifying...' : '✓ Verify Connection'}
              </button>
              <button
                onClick={handleCredentials}
                className="px-6 py-3 bg-white border-2 border-cyan-300 text-cyan-700 rounded-lg hover:bg-cyan-50 hover:border-cyan-500 transition-all font-medium"
              >
                🔑 Credentials
              </button>
            </div>
            <div className="text-sm text-gray-500 mt-4">
              Configure your credentials and connection settings above.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 relative max-w-[1800px] mx-auto space-y-6">
      {/* Floating Settings Button */}
      <button
        onClick={handleSettings}
        className="fixed top-24 right-8 z-40 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
        title="Open Settings"
      >
        <Cog6ToothIcon className="h-6 w-6" />
      </button>

      {/* Main Environment Container */}
      <EnvironmentCard
        theme="mce"
        title="Configuration"
        icon="⚙️"
        isCollapsed={app.collapsedSections?.has('mce-configuration')}
        onToggle={() => dispatch({
          type: AppActionTypes.TOGGLE_SECTION,
          payload: 'mce-configuration'
        })}
        titleActions={
          <button
            onClick={() => setShowNotificationSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30 font-medium transition-colors"
            title="Configure email and Slack notifications for provisioning jobs"
          >
            <BellIcon className="h-4 w-4" />
            Notifications
          </button>
        }
      >
        {/* Three Column Layout */}
        <div className={cardStyles.grid}>
          {/* MCE Environment Card */}
          <StatusCard
            theme="mce"
            title="MCE Environment"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            status={getConnectionStatus()}
            verificationStatus={
              recentVerificationStatus === 'needs_configuration'
                ? 'Configuration Required'
                : recentVerificationStatus === 'verified' || (ocpStatus?.connected && recentVerificationSuccess)
                ? 'Verified'
                : 'Not Verified'
            }
            lastVerified={getLastVerifiedText()}
            actions={mceActions}
          >
            {/* MCE Information */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-cyan-100">
                <h5
                  className="font-semibold text-cyan-900 mb-2 cursor-pointer hover:text-cyan-700 transition-colors flex items-center gap-2"
                  onClick={() => handleResourceClick({
                    name: mceInfo?.name || 'multiclusterengine',
                    type: 'MultiClusterEngine',
                    namespace: 'multicluster-engine'
                  })}
                  title="Click to view YAML"
                >
                  <span>{mceInfo?.name || 'multiclusterengine'}</span>
                  <span className="text-sm font-normal text-cyan-600">{mceInfo?.version || '2.10.0'}</span>
                </h5>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">API Server:</span>
                    <div className="mt-1 text-cyan-600 font-mono text-xs break-all">
                      {ocpStatus?.api_url || 'Not configured'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StatusCard>

          {/* Components Card */}
          <StatusCard
            theme="mce"
            title="Components"
            icon="🔧"
            status={`${allCAPIComponents.filter(c => c.enabled).length} configured`}
            actions={componentActions}
          >
            <div className="space-y-3">
              {/* Single Component Status heading */}
              <h6 className="font-medium text-cyan-900 mb-3">Component Status</h6>

              {/* CAPI Components */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CAPI Providers</div>
                <div className="space-y-1">
                  {allCAPIComponents.map((component, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{component.name}</span>
                      <span className={component.enabled ? 'text-green-600' : 'text-red-600'}>
                        {component.enabled ? '✓' : '✕'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hypershift Components */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hypershift</div>
                <div className="space-y-1">
                  {hypershiftComponents.map((component, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{component.name}</span>
                      <span className={component.enabled ? 'text-green-600' : 'text-red-600'}>
                        {component.enabled ? '✓' : '✕'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disable CAPI Button - Only show when CAPI is enabled */}
              {capiComponents.some(c => c.name === 'cluster-api' && c.enabled) && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleDisableCapi}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>⛔</span>
                    Disable CAPI
                  </button>
                </div>
              )}
            </div>
          </StatusCard>

          {/* Resources Card */}
          <StatusCard
            theme="mce"
            title="Resources"
            icon="📦"
            status={`${mceResources.length} total`}
            actions={resourceActions}
          >
            {/* Scrollable Resources Container */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {mceResourcesLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading resources...</p>
                </div>
              ) : mceResources.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No resources found.</p>
                  <p className="text-sm mt-1">Click "Refresh" to load resources.</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {Object.entries(groupedResources).map(([namespace, resources]) => {
                    const isExpanded = expandedNamespaces.has(namespace);
                    return (
                      <div key={namespace} className="border-b border-gray-200 pb-2 last:border-b-0">
                        {/* Clickable namespace header */}
                        <div
                          className="flex items-center justify-between cursor-pointer py-2 px-2 hover:bg-cyan-50 rounded transition-colors"
                          onClick={() => toggleNamespace(namespace)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <h4 className="font-semibold text-gray-800 text-base">
                              {namespace}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {resources.length}
                          </span>
                        </div>

                        {/* Resources list - only show when expanded */}
                        {isExpanded && (
                          <div className="ml-6 mt-2 space-y-2">
                            {resources.map((resource, index) => (
                              <div
                                key={index}
                                className="cursor-pointer hover:bg-cyan-50 rounded p-2 transition-colors"
                                onClick={() => handleResourceClick(resource)}
                              >
                                {/* Resource name */}
                                <h5 className="font-medium text-gray-800 text-sm hover:text-cyan-700">
                                  {resource.name}
                                </h5>
                                {/* Resource type */}
                                <div className="mt-1">
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getResourceTypeColor(resource.type)}`}>
                                    {resource.type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </StatusCard>
        </div>
      </EnvironmentCard>

      {/* ROSA HCP Clusters section - positioned after Configuration section, before Terminal */}
      <RosaHcpClustersSection />

      {/* MCE Terminal Section */}
      <MCETerminalSection />

      {/* Terminal Modal */}
      <MCETerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
      />

      {/* YAML Editor Modal */}
      <YamlEditorModal
        isOpen={showYamlEditorModal}
        onClose={() => setShowYamlEditorModal(false)}
        yamlData={yamlEditorData}
        readOnly={true}
        onProvision={async (editedYaml) => {
          // Handle YAML provisioning here if needed
          setShowYamlEditorModal(false);
        }}
      />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};

export default MCEEnvironment;