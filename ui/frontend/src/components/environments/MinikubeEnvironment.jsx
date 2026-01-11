import React, { useState, useEffect, useCallback } from 'react';
import EnvironmentCard from '../cards/EnvironmentCard';
import StatusCard from '../cards/StatusCard';
import ComponentStatusCard from '../cards/ComponentStatusCard';
import MinikubeTerminalModal from '../modals/MinikubeTerminalModal';
import MinikubeClusterConfigModal from '../modals/MinikubeClusterConfigModal';
import NotificationSettingsModal from '../modals/NotificationSettingsModal';
import CapiInstallMethodModal from '../modals/CapiInstallMethodModal';
import { YamlEditorModal } from '../YamlEditorModal';
import { BellIcon } from '@heroicons/react/24/outline';
import {
  useMinikubeContext,
  useRecentOperationsContext,
  useApp,
  useAppDispatch,
} from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { cardStyles } from '../../styles/themes';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

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
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);
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
    setMinikubeConfigurationCollapsed,
  } = minikube;

  const { addToRecent, updateRecentOperationStatus, recentOperations } = recentOps;

  // Check if a CAPI configuration is currently in progress
  const isConfiguring =
    recentOperations?.some(
      (op) => op.id?.startsWith('configure-capi-') && op.status?.includes('⏳')
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
        environment: 'minikube',
        playbook: 'Built-in verification (minikube status + kubectl)',
        output:
          'Verifying Minikube cluster accessibility...\nChecking cluster status...\nValidating kubectl connectivity...',
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
      updateRecentOperationStatus(verifyId, `❌ Verification failed: ${error.message}`);
    }
  };

  // Handle provision action
  const handleProvision = () => {
    // Set the target context to the verified Minikube cluster name
    const targetClusterName =
      verifiedMinikubeClusterInfo?.name ||
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

  // Handle resource click to show YAML
  const handleResourceClick = (resource) => {
    if (resource.yaml) {
      setYamlEditorData({
        yaml_content: resource.yaml,
        resource_name: resource.name,
        resource_type: resource.type,
      });
      setShowYamlEditorModal(true);
    }
  };

  // Handle CAPI/CAPA configuration
  const handleComponentConfigure = async (
    customImage = null,
    method = null,
    clusterName = null
  ) => {
    // Prevent multiple simultaneous configurations
    if (isConfiguring) {
      alert('A CAPI configuration is already in progress. Please wait for it to complete.');
      return;
    }

    const configureId = `configure-capi-${Date.now()}`;

    // Get cluster name from parameter first, then fall back to state sources
    const targetClusterName =
      clusterName ||
      verifiedMinikubeClusterInfo?.name ||
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
        playbook: 'initialize-minikube-capi.yml',
        output: outputMessage,
      });

      // Build request body
      const requestBody = {
        cluster_name: targetClusterName,
        install_method: activeMethod,
        is_reconfiguration: isReconfiguring,
      };

      if (customImage) {
        requestBody.custom_capa_image = {
          repository: customImage.repository,
          tag: customImage.tag,
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

        // Poll for component versions after a delay to allow installation to complete
        setTimeout(async () => {
          await fetchComponentVersions();
          await fetchMinikubeActiveResources(
            verifiedMinikubeClusterInfo?.name,
            verifiedMinikubeClusterInfo?.namespace
          );
        }, 5000); // Wait 5 seconds for components to be ready
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
          playbook: 'initialize-minikube-capi.yml',
          output: `CAPI/CAPA Configuration Complete\n\n✅ Cluster API controllers installed\n✅ AWS provider configured\n✅ ROSA CRDs deployed\n✅ Ready for cluster provisioning\n\nCompleted at ${completionTime}`,
        });

        // Refresh both component versions and resources
        await fetchComponentVersions();
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

  // Fetch component versions function (can be called manually or by useEffect)
  const fetchComponentVersions = useCallback(async () => {
    try {
      // Get cluster name for the API call
      const targetClusterName =
        verifiedMinikubeClusterInfo?.name ||
        verifiedMinikubeClusterInfo?.cluster_name ||
        selectedMinikubeCluster ||
        minikubeClusterInput;

      // Build URL with query parameters
      const params = new URLSearchParams({ environment: 'minikube' });
      if (targetClusterName) {
        params.append('cluster_name', targetClusterName);
      }
      const url = `${buildApiUrl(API_ENDPOINTS.CAPI_COMPONENT_VERSIONS)}?${params.toString()}`;

      console.log('Fetching component versions from:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Component versions received:', data.components);
        setComponentVersions(data.components);
      } else {
        console.error('Failed to fetch component versions, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch component versions:', error);
    }
  }, [verifiedMinikubeClusterInfo, selectedMinikubeCluster, minikubeClusterInput]);

  // Fetch component versions from backend on mount or when cluster changes
  useEffect(() => {
    fetchComponentVersions();
  }, [fetchComponentVersions]);

  // Use fetched versions or fallback to defaults
  // Show "loading..." only if we have a verified cluster, otherwise show "not installed"
  const hasVerifiedCluster = !!verifiedMinikubeClusterInfo;
  const capiComponents =
    componentVersions.length > 0
      ? componentVersions
      : [
          {
            name: 'Cert Manager',
            enabled: hasVerifiedCluster,
            version: hasVerifiedCluster ? 'loading...' : 'not installed',
          },
          {
            name: 'CAPI Controller',
            enabled: hasVerifiedCluster,
            version: hasVerifiedCluster ? 'loading...' : 'not installed',
          },
          {
            name: 'CAPA Controller',
            enabled: hasVerifiedCluster,
            version: hasVerifiedCluster ? 'loading...' : 'not installed',
          },
          {
            name: 'ROSA CRD',
            enabled: hasVerifiedCluster,
            version: hasVerifiedCluster ? 'loading...' : 'not installed',
          },
        ];

  const minikubeActions = [
    {
      label: 'Verify',
      icon: '✓',
      onClick: handleMinikubeVerification,
      disabled: minikubeLoading,
      variant: 'primary',
    },
    {
      label: 'Configure',
      icon: '⚙️',
      onClick: () => setShowConfigModal(true),
      variant: 'primary',
    },
  ];

  // Custom Configure button with method selector
  const methodInfo = getMethodInfo(installMethod);

  // Check if user wants to remember their method choice
  const rememberMethodChoice = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';

  // State to track if we're reconfiguring
  const [isReconfiguring, setIsReconfiguring] = useState(false);

  // Handle configure click - always show modal to allow custom image configuration
  const handleConfigureClick = () => {
    // Get cluster name to check if it already has a known method
    const targetClusterName =
      verifiedMinikubeClusterInfo?.name ||
      verifiedMinikubeClusterInfo?.cluster_name ||
      selectedMinikubeCluster ||
      minikubeClusterInput;

    // Check if this cluster already has a stored installation method
    const clusterMethod = targetClusterName
      ? localStorage.getItem(`minikube-cluster-method-${targetClusterName}`)
      : null;

    if (clusterMethod) {
      // Cluster already has CAPI installed - show modal in reconfiguration mode
      console.log(`Reconfiguring ${targetClusterName} with existing method: ${clusterMethod}`);
      setInstallMethod(clusterMethod);
      setIsReconfiguring(true);
      setShowMethodModal(true);
    } else {
      // Always show modal to allow custom image configuration
      // even if user has a remembered method preference
      setIsReconfiguring(false);
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

  // Handle Create Status Report
  const handleCreateStatusReport = async () => {
    const reportId = `create-status-report-${Date.now()}`;
    const fileName = `minikube-status-report-${new Date().toISOString().split('T')[0]}.html`;

    try {
      console.log('📊 MinikubeEnvironment: Create status report clicked');

      // Add to recent operations
      addToRecent({
        id: reportId,
        title: 'Create Status Report',
        color: 'bg-purple-600',
        status: '⏳ Generating report...',
        environment: 'minikube',
        output: `Generating HTML status report...\nGathering component data...\nFormatting resources...`,
      });

      // Fetch recent tasks/jobs
      console.log('📊 Fetching recent tasks...');
      const jobsResponse = await fetch(buildApiUrl('/api/jobs'));
      const jobsData = await jobsResponse.json();
      const allJobs = jobsData.success ? jobsData.jobs : [];
      const recentJobs = allJobs.filter((job) => job.environment === 'minikube').slice(0, 10);
      console.log(`📊 Fetched ${recentJobs.length} recent Minikube tasks`);

      // Fetch the HTML template
      const templateResponse = await fetch('/templates/test-status-report-template.html');
      if (!templateResponse.ok) {
        throw new Error('Failed to load report template');
      }
      let htmlTemplate = await templateResponse.text();

      // Prepare data for the report
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateTimeStr = `${dateStr} at ${timeStr}`;

      // Cluster configuration details (code-block format)
      const clusterConfigDetails = `Cluster:      ${verifiedMinikubeClusterInfo?.name || 'Not verified'}
Status:       ${verifiedMinikubeClusterInfo?.status || 'Unknown'}
Driver:       ${verifiedMinikubeClusterInfo?.driver || 'N/A'}
Kubernetes:   ${verifiedMinikubeClusterInfo?.kubernetesVersion || 'N/A'}
Last Verified: ${dateTimeStr}`;

      // Component configuration details (code-block format)
      const capiComponents =
        componentVersions.filter((c) => c.name?.startsWith('cluster-api')) || [];
      const componentConfigDetails = `Configured Components:
${
  capiComponents
    .filter((c) => c.enabled)
    .map((c) => `  • ${c.name}${c.version ? ` (${c.version})` : ''}`)
    .join('\n') || '  None configured'
}`;

      // Helper function to extract API version and status from resource YAML
      const extractResourceInfo = (yamlContent, resourceType) => {
        if (!yamlContent) return { version: null, status: null };

        // Extract apiVersion from YAML
        const apiVersionMatch = yamlContent.match(/apiVersion:\s*([^\n]+)/);
        const version = apiVersionMatch ? apiVersionMatch[1].trim() : null;

        // Extract status based on resource type
        let status = null;

        if (resourceType === 'Deployment') {
          // Extract replica status for deployments
          const availableMatch = yamlContent.match(/availableReplicas:\s*(\d+)/);
          const replicasMatch = yamlContent.match(/replicas:\s*(\d+)/);

          if (availableMatch && replicasMatch) {
            const available = availableMatch[1];
            const total = replicasMatch[1];
            status =
              available === total
                ? `✅ ${available}/${total} Ready`
                : `⚠️ ${available}/${total} Ready`;
          }
        } else if (resourceType === 'Cluster') {
          // Extract ready status for Cluster resources
          const readyMatch = yamlContent.match(/ready:\s*(true|false)/i);
          if (readyMatch) {
            status = readyMatch[1].toLowerCase() === 'true' ? '✅ Ready' : '⏳ Not Ready';
          }

          // Check for deletion timestamp
          if (yamlContent.includes('deletionTimestamp:')) {
            status = '🗑️ Deleting';
          }
        }

        return { version, status };
      };

      // Group resources by type (since Minikube doesn't have namespaces like MCE)
      const groupedResources = minikubeActiveResources.reduce((acc, resource) => {
        const resourceType = resource.kind || resource.type || 'Unknown';
        if (!acc[resourceType]) {
          acc[resourceType] = [];
        }
        acc[resourceType].push(resource);
        return acc;
      }, {});

      // Format resources by type with status
      const resourceDetails =
        minikubeActiveResources.length > 0
          ? Object.entries(groupedResources)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([resourceType, resources]) => {
                const resourceList = resources
                  .map((resource) => {
                    const { version, status } = extractResourceInfo(resource.yaml, resourceType);
                    const versionStr = version ? ` [${version}]` : '';
                    const statusStr = status ? ` - ${status}` : '';
                    return `  • ${resource.name || resource.metadata?.name || 'Unknown'}${versionStr}${statusStr}`;
                  })
                  .join('\n');

                // Count ready/total resources
                const statusCounts = resources.reduce(
                  (acc, resource) => {
                    const { status } = extractResourceInfo(resource.yaml, resourceType);
                    if (status?.includes('✅')) {
                      acc.ready++;
                    } else if (status?.includes('⚠️') || status?.includes('⏳')) {
                      acc.notReady++;
                    } else if (status?.includes('🗑️')) {
                      acc.deleting++;
                    }
                    acc.total++;
                    return acc;
                  },
                  { ready: 0, notReady: 0, deleting: 0, total: 0 }
                );

                const statusSummary =
                  statusCounts.ready > 0 || statusCounts.notReady > 0 || statusCounts.deleting > 0
                    ? ` [✅ ${statusCounts.ready} Ready${statusCounts.notReady > 0 ? `, ⚠️ ${statusCounts.notReady} Not Ready` : ''}${statusCounts.deleting > 0 ? `, 🗑️ ${statusCounts.deleting} Deleting` : ''}]`
                    : '';

                return `                <h3>${resourceType} (${resources.length} resource${resources.length !== 1 ? 's' : ''})${statusSummary}</h3>
                <div class="code-block">${resourceList}</div>`;
              })
              .join('\n')
          : '<p class="italic-note">No resources found</p>';

      // Minikube clusters (managed clusters via CAPI)
      const minikubeClustersSection =
        minikubeClusters && minikubeClusters.length > 0
          ? `            <!-- CAPI-MANAGED CLUSTERS -->
            <div class="section">
                <h2>CAPI-Managed Clusters</h2>

                <div class="code-block">${minikubeClusters
                  .map((cluster) => {
                    return `✅ ${cluster.name || cluster} - Minikube`;
                  })
                  .join('\n')}</div>
            </div>`
          : '';

      // Format Recent Tasks - simple status and name only
      const recentTasksDetails =
        recentJobs.length > 0
          ? `<div class="code-block">${recentJobs
              .map((job) => {
                const statusIcon =
                  job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⏳';
                const taskName = job.title || job.description || 'Task';
                return `${statusIcon} ${taskName}`;
              })
              .join('\n')}</div>`
          : '<p class="italic-note">No recent tasks found</p>';

      // Replace placeholders in template
      htmlTemplate = htmlTemplate
        .replace(/\{\{TEST_TITLE\}\}/g, 'Minikube Environment Status Report')
        .replace(/\{\{TEST_DATE\}\}/g, dateTimeStr)
        .replace(/\{\{TEST_ENVIRONMENT\}\}/g, 'Minikube')
        .replace(/\{\{FEATURE_NAME\}\}/g, 'CAPI')
        .replace(/\{\{CLUSTER_TYPE\}\}/g, 'Minikube')
        .replace(/\{\{CLUSTER_CONFIG_DETAILS\}\}/g, clusterConfigDetails)
        .replace(/\{\{COMPONENT_CONFIG_DETAILS\}\}/g, componentConfigDetails)
        .replace(/\{\{RESOURCE_COUNT\}\}/g, minikubeActiveResources.length)
        .replace(/\{\{RESOURCE_DETAILS\}\}/g, resourceDetails)
        .replace(/\{\{ROSA_CLUSTER_SECTION\}\}/g, minikubeClustersSection)
        .replace(/\{\{RECENT_TASKS_DETAILS\}\}/g, recentTasksDetails);

      // Create blob and download
      const blob = new Blob([htmlTemplate], { type: 'text/html' });
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
        reportId,
        `✅ Report created at ${completionTime}`,
        `Minikube Status Report Generated\n\n✅ File: ${fileName}\n✅ Downloaded successfully\n✅ Includes ${capiComponents.filter((c) => c.enabled).length} configured components\n✅ Includes ${minikubeActiveResources.length} resources with versions\n✅ Includes ${recentJobs.length} recent tasks\n\nReport created at ${completionTime}`
      );
    } catch (error) {
      console.error('❌ MinikubeEnvironment: Create status report failed:', error);

      updateRecentOperationStatus(
        reportId,
        `❌ Failed to create report`,
        `Error: ${error.message}`
      );
    }
  };

  // Get cluster name to check if already configured
  const configTargetClusterName =
    verifiedMinikubeClusterInfo?.name ||
    verifiedMinikubeClusterInfo?.cluster_name ||
    selectedMinikubeCluster ||
    minikubeClusterInput;
  const configClusterMethod = configTargetClusterName
    ? localStorage.getItem(`minikube-cluster-method-${configTargetClusterName}`)
    : null;
  const isAlreadyConfigured = !!configClusterMethod;

  const componentActions = [
    {
      label: isConfiguring ? 'Configuring...' : isAlreadyConfigured ? 'Reconfigure' : 'Configure',
      icon: '⚙️',
      onClick: handleConfigureClick,
      disabled: isConfiguring,
      variant: 'primary',
    },
    {
      label: 'Refresh',
      icon: '🔄',
      onClick: () => {
        console.log('🔄 Refreshing component versions and resources...');

        // Add to recent operations
        const refreshId = `refresh-components-${Date.now()}`;
        const completionTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        addToRecent({
          id: refreshId,
          title: 'Refresh Component Versions',
          description: `✅ Component versions refreshed at ${completionTime}`,
          status: 'completed',
          timestamp: new Date().toISOString(),
          environment: 'minikube',
        });

        // Refresh data
        fetchComponentVersions();
        fetchMinikubeActiveResources(
          verifiedMinikubeClusterInfo?.name,
          verifiedMinikubeClusterInfo?.namespace
        );
      },
      variant: 'primary',
    },
  ];

  // Show configuration even if no cluster is verified yet
  const showFullConfig = !!verifiedMinikubeClusterInfo;

  // Check if there's a cluster creation in progress
  const creatingClusterOp = recentOperations?.find(
    (op) =>
      op.title?.startsWith('Create Minikube Cluster:') &&
      (op.status?.includes('⏳') || op.status?.includes('Creating'))
  );

  // Extract cluster name and method from creation operation if in progress
  let creatingClusterName = null;
  let creatingMethod = null;
  if (creatingClusterOp) {
    // Extract from title format: "Create Minikube Cluster: cluster-name (Method)"
    const match = creatingClusterOp.title.match(/Create Minikube Cluster: (.+?) \((.+?)\)/);
    if (match) {
      creatingClusterName = match[1];
      creatingMethod = match[2]; // Will be "Helm" or "clusterctl"
    }
  }

  // Get cluster name from multiple sources - prioritize creating cluster
  const clusterName =
    creatingClusterName ||
    verifiedMinikubeClusterInfo?.name ||
    verifiedMinikubeClusterInfo?.cluster_name ||
    selectedMinikubeCluster ||
    minikubeClusterInput;

  // Get stored installation method for this cluster - prioritize creating method
  const displayClusterMethod =
    creatingMethod ||
    (clusterName ? localStorage.getItem(`minikube-cluster-method-${clusterName}`) : null);
  const methodDisplay =
    displayClusterMethod === 'Helm'
      ? '📦 Helm'
      : displayClusterMethod === 'helm'
        ? '📦 Helm'
        : displayClusterMethod === 'clusterctl'
          ? '⚡ clusterctl'
          : '';

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
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
              status={
                clusterName
                  ? `🔷 ${clusterName}${methodDisplay ? ` (${methodDisplay})` : ''}`
                  : 'No cluster selected'
              }
              verificationStatus={
                creatingClusterOp ? 'Creating...' : showFullConfig ? 'Running' : 'Not configured'
              }
              lastVerified={
                showFullConfig && minikubeVerificationResult?.verified_at
                  ? new Date(minikubeVerificationResult.verified_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : null
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
                            {new Date(minikubeVerificationResult.verified_at).toLocaleString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                  <svg
                    className="h-12 w-12 mx-auto mb-3 text-purple-400"
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
                  <p className="text-gray-700 font-medium mb-2">No Minikube Cluster Configured</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Click "Configure" to select or create a Minikube cluster
                  </p>
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
              status={`${capiComponents.filter((c) => c.enabled).length} configured`}
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
                  variant: 'primary',
                },
                {
                  label: 'Create Report',
                  icon: '📊',
                  onClick: handleCreateStatusReport,
                  disabled: !verifiedMinikubeClusterInfo,
                  variant: 'primary',
                },
                {
                  label: 'Refresh',
                  icon: '🔄',
                  onClick: () => {
                    console.log('🔄 Refreshing active resources...');

                    // Add to recent operations
                    const refreshId = `refresh-resources-${Date.now()}`;
                    const completionTime = new Date().toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    });

                    addToRecent({
                      id: refreshId,
                      title: 'Refresh Active Resources',
                      description: `✅ Active resources refreshed at ${completionTime}`,
                      status: 'completed',
                      timestamp: new Date().toISOString(),
                      environment: 'minikube',
                    });

                    // Refresh resources
                    fetchMinikubeActiveResources(
                      verifiedMinikubeClusterInfo?.name,
                      verifiedMinikubeClusterInfo?.namespace
                    );
                  },
                  variant: 'primary',
                },
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
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {minikubeActiveResources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-purple-50 rounded px-2 transition-colors"
                      onClick={() => handleResourceClick(resource)}
                    >
                      <div>
                        <span className="font-medium text-purple-700 hover:text-purple-900">
                          {resource.name || 'Unknown'}
                        </span>
                        <div className="text-sm text-gray-600">
                          {resource.type || 'Unknown Type'}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            resource.status === 'Ready'
                              ? 'bg-green-100 text-green-800'
                              : resource.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {resource.status || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))}
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
        onClusterCreated={(method, clusterName) => {
          // After cluster is created, configure CAPI with standard images first
          // User can reconfigure with custom image after verifying base setup
          setInstallMethod(method);
          handleComponentConfigure(null, method, clusterName);
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
        onClose={() => {
          setShowMethodModal(false);
          setIsReconfiguring(false);
        }}
        onMethodSelected={handleMethodSelectedAndConfigure}
        currentMethod={installMethod}
        isReconfiguration={isReconfiguring}
      />

      {/* YAML Editor Modal */}
      <YamlEditorModal
        isOpen={showYamlEditorModal}
        onClose={() => setShowYamlEditorModal(false)}
        yamlData={yamlEditorData}
        readOnly={true}
        onProvision={() => setShowYamlEditorModal(false)}
      />
    </>
  );
};

export default MinikubeEnvironment;
