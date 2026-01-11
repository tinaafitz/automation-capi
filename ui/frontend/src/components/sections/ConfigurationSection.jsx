/* eslint-disable no-unused-vars, no-console */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import StatusCard from '../cards/StatusCard';
import { YamlEditorModal } from '../YamlEditorModal';
import {
  useApiStatusContext,
  useApp,
  useAppDispatch,
  useMCEContext,
  useRecentOperationsContext,
} from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import {
  Cog6ToothIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '../../styles/themes';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { useJobHistory } from '../../hooks/useJobHistory';

const ConfigurationSection = ({
  onVerifyEnvironment,
  onOpenNotifications,
  onConfigure,
  onRefresh,
  onProvision,
  onExport,
  onDisableCapi,
}) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const recentOps = useRecentOperationsContext();
  const jobHistory = useJobHistory();
  const { ocpStatus, mceFeatures, mceInfo } = apiStatus;
  const { addToRecent, updateRecentOperationStatus } = recentOps;

  const [expandedNamespaces, setExpandedNamespaces] = useState(new Set());
  const [mceResources, setMceResources] = useState([]);
  const [mceResourcesLoading, setMceResourcesLoading] = useState(false);
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);

  // Component version mapping
  const componentVersions = {
    'cluster-api': 'v2.10.0',
    'cluster-api-provider-aws': 'v2.10.0',
    'cluster-api-provider-metal3': 'v1.7.1',
    'cluster-api-provider-openshift-assisted': 'v1.0.9',
    hypershift: 'v4.17.0',
    'hypershift-local-hosting': 'v4.17.0',
  };

  // Filter mceFeatures to get CAPI and Hypershift components (using 'name' field not 'component')
  const capiComponentsArray = (mceFeatures?.filter((f) => f.name?.startsWith('cluster-api')) || [])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((component) => ({
      ...component,
      version: componentVersions[component.name] || null,
    }));
  const hypershiftComponentsArray = (
    mceFeatures?.filter((f) => f.name?.startsWith('hypershift')) || []
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((component) => ({
      ...component,
      version: componentVersions[component.name] || null,
    }));
  const allCAPIComponents = [...capiComponentsArray, ...hypershiftComponentsArray];

  // Debug logging
  console.log('📊 ConfigurationSection: mceFeatures:', mceFeatures);
  console.log('📊 ConfigurationSection: capiComponentsArray:', capiComponentsArray);
  console.log('📊 ConfigurationSection: hypershiftComponentsArray:', hypershiftComponentsArray);

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

  // Configuration section state
  const getConfigSectionCollapsedState = () => {
    const sectionId = 'mce-configuration';
    return app.collapsedSections?.has(sectionId) || false;
  };

  const toggleConfigSection = () => {
    const sectionId = 'mce-configuration';
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: sectionId });
  };

  const handleOpenCredentialsModal = () => {
    dispatch({ type: AppActionTypes.SHOW_CREDENTIALS_MODAL, payload: true });
  };

  // Get last verified timestamp from job history
  const getLastVerifiedText = () => {
    // Check job history for MCE verification jobs
    const mceJobs = jobHistory.getJobsByEnvironment('mce');

    // Find the most recent completed verification job
    const recentValidationJob = mceJobs
      ?.filter(
        (job) => job.task_file?.includes('validate-capa-environment') && job.status === 'completed'
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (recentValidationJob) {
      return new Date(recentValidationJob.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return null;
  };

  const handleComponentRefresh = async () => {
    const refreshId = `refresh-components-${Date.now()}`;

    try {
      console.log('🔄 ConfigurationSection: Component refresh clicked');

      // Add to recent operations
      addToRecent({
        id: refreshId,
        title: 'Refresh MCE Components',
        color: 'bg-cyan-600',
        status: '⏳ Refreshing...',
        environment: 'mce',
        output: 'Refreshing MCE component status...',
      });

      // Refresh all status (parent component's refresh function)
      if (onRefresh) {
        await onRefresh();
      }

      // Update operation as complete
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      updateRecentOperationStatus(
        refreshId,
        `✅ Component refresh completed at ${completionTime}`,
        `MCE Component Status Refresh Complete\n\n✅ Updated component enabled/disabled status\n\nRefresh completed at ${completionTime}`
      );
    } catch (error) {
      console.error('❌ ConfigurationSection: Component refresh failed:', error);

      // Update operation as failed
      updateRecentOperationStatus(
        refreshId,
        `❌ Component refresh failed: ${error.message}`,
        `Failed to refresh MCE component status\n\nError: ${error.message}`
      );
    }
  };

  const handleResourceRefresh = async () => {
    const refreshId = `refresh-resources-${Date.now()}`;

    try {
      console.log('🔄 ConfigurationSection: Resource refresh clicked');

      // Add to recent operations
      addToRecent({
        id: refreshId,
        title: 'Refresh MCE Resources',
        color: 'bg-cyan-600',
        status: '⏳ Refreshing...',
        environment: 'mce',
        output: 'Refreshing MCE resources...',
      });

      // Set loading state immediately for visual feedback
      setMceResourcesLoading(true);

      // Refresh the resources
      const resources = await fetchMCEResources();
      console.log('📦 ConfigurationSection: Fetched resources:', resources.length, 'resources');
      setMceResources(resources);

      // Update operation as complete
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      updateRecentOperationStatus(
        refreshId,
        `✅ Resource refresh completed at ${completionTime}`,
        `MCE Resources Refresh Complete\n\n✅ Refreshed ${resources.length} resources\n\nRefresh completed at ${completionTime}`
      );
    } catch (error) {
      console.error('❌ ConfigurationSection: Resource refresh failed:', error);

      // Update operation as failed
      updateRecentOperationStatus(
        refreshId,
        `❌ Resource refresh failed: ${error.message}`,
        `Failed to refresh MCE resources\n\nError: ${error.message}`
      );
    } finally {
      // Always clear loading state
      setMceResourcesLoading(false);
    }
  };

  const handleCreateStatusReport = async () => {
    const reportId = `create-status-report-${Date.now()}`;
    const fileName = `mce-status-report-${new Date().toISOString().split('T')[0]}.html`;

    try {
      console.log('📊 ConfigurationSection: Create status report clicked');

      // Add to recent operations
      addToRecent({
        id: reportId,
        title: 'Create Status Report',
        color: 'bg-cyan-600',
        status: '⏳ Generating report...',
        environment: 'mce',
        output: `Generating HTML status report...\nGathering component data...\nFormatting resources...`,
      });

      // Fetch fresh resources data first
      console.log('📊 Fetching fresh MCE resources...');
      const freshResources = await fetchMCEResources();
      console.log(`📊 Fetched ${freshResources.length} resources`);

      // Use existing MCE features from context (already loaded in UI)
      console.log('📊 Using MCE features from context:', mceFeatures.length, 'features');

      // ROSA HCP clusters
      console.log('📊 Fetching ROSA HCP clusters...');
      const rosaClustersResponse = await fetch(buildApiUrl('/api/rosa/clusters'));
      const rosaClustersData = await rosaClustersResponse.json();
      const rosaClusters = rosaClustersData.success ? rosaClustersData.clusters : [];
      console.log(`📊 Fetched ${rosaClusters.length} ROSA clusters`);

      // Fetch recent tasks/jobs
      console.log('📊 Fetching recent tasks...');
      const jobsResponse = await fetch(buildApiUrl('/api/jobs'));
      const jobsData = await jobsResponse.json();
      const allJobs = jobsData.success ? jobsData.jobs : [];
      const recentJobs = allJobs.slice(0, 10); // Get 10 most recent
      console.log(`📊 Fetched ${recentJobs.length} recent tasks`);

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

      // Get the actual last verified date from job history
      const lastVerifiedDate = getLastVerifiedText() || 'Not verified yet';

      // AI Assessment - analyze environment state (using UI context values)
      const generateAssessment = () => {
        // Step 1: Check if CAPI/CAPA are enabled (from UI context)
        const capiEnabled = mceFeatures.some((f) => f.name === 'cluster-api' && f.enabled);
        const capaEnabled = mceFeatures.some(
          (f) => f.name === 'cluster-api-provider-aws' && f.enabled
        );

        console.log('🤖 CAPI enabled:', capiEnabled);
        console.log('🤖 CAPA enabled:', capaEnabled);

        // If CAPI/CAPA not enabled, it's a fresh environment
        if (!capiEnabled && !capaEnabled) {
          return 'This MCE environment is not configured for CAPI/CAPA.';
        }

        // Step 2: Check for ROSA HCP clusters (exclude uninstalling/deleting)
        const activeClusters = rosaClusters.filter(
          (c) => c.status !== 'uninstalling' && c.status !== 'deleting'
        );
        const totalClusters = activeClusters.length;

        console.log('🤖 Total active ROSA HCP clusters:', totalClusters);

        // If there are ROSA HCP clusters
        if (totalClusters > 0) {
          return `This CAPI/CAPA environment has ${totalClusters} active ROSA HCP Cluster${totalClusters > 1 ? 's' : ''}.`;
        }

        // Step 3: Check if ROSA HCP namespace exists (from fetched resources)
        const rosaNamespaceExists = freshResources.some((r) => r.namespace === 'ns-rosa-hcp');

        console.log('🤖 ROSA namespace exists:', rosaNamespaceExists);

        // If no clusters but namespace exists (has been provisioned before)
        if (rosaNamespaceExists) {
          return 'This CAPI/CAPA environment has provisioning resources but no active ROSA HCP clusters.';
        }

        // If no clusters and no namespace (partially configured)
        return 'This MCE environment has a partial CAPI/CAPA configuration.';
      };

      const environmentAssessment = generateAssessment();

      // Cluster configuration details (code-block format)
      const clusterConfigDetails = `Cluster:      ${mceInfo?.name || 'multiclusterengine'}
Version:      ${mceInfo?.version || '2.10.0'}
API Server:   ${ocpStatus?.api_url || 'Not configured'}
Status:       ${ocpStatus?.connected ? 'Connected' : 'Not Connected'}
Last Verified: ${lastVerifiedDate}`;

      // Component configuration details (code-block format) - use context features
      const freshCAPIComponents = mceFeatures
        .filter((f) => f.name?.startsWith('cluster-api') || f.name?.startsWith('hypershift'))
        .sort((a, b) => a.name.localeCompare(b.name));

      const componentConfigDetails = `Configured Components:
${freshCAPIComponents
  .filter((c) => c.enabled)
  .map((c) => `  • ${c.name}${c.version ? ` (${c.version})` : ''}`)
  .join('\n')}`;

      // Group resources by namespace (exclude capa-system and multicluster-engine)
      const namespacesToExclude = ['capa-system', 'multicluster-engine'];
      const filteredResources = freshResources.filter(
        (resource) => !namespacesToExclude.includes(resource.namespace)
      );
      const groupedResources = filteredResources.reduce((acc, resource) => {
        const namespace = resource.namespace || 'default';
        if (!acc[namespace]) {
          acc[namespace] = [];
        }
        acc[namespace].push(resource);
        return acc;
      }, {});

      // Helper function to extract API version and status from resource YAML
      const extractResourceInfo = (yamlContent, resourceType) => {
        if (!yamlContent) return { version: null, status: null };

        // Extract apiVersion from YAML (just the version part, e.g., v1beta2)
        const apiVersionMatch = yamlContent.match(/apiVersion:\s*([^\n]+)/);
        const fullVersion = apiVersionMatch ? apiVersionMatch[1].trim() : null;
        const version = fullVersion ? fullVersion.split('/').pop() : null;

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
        } else if (resourceType.includes('ROSA') || resourceType === 'Cluster') {
          // Extract ready status for ROSA resources
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

      // Format resources by namespace with status
      const resourceDetails =
        freshResources.length > 0
          ? Object.entries(groupedResources)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([namespace, resources]) => {
                const resourceList = resources
                  .map((resource) => {
                    const { version, status } = extractResourceInfo(resource.yaml, resource.type);
                    const versionStr = version ? ` [${version}]` : '';
                    const statusStr = status ? ` - ${status}` : '';
                    return `  • ${resource.name} (${resource.type})${versionStr}${statusStr}`;
                  })
                  .join('\n');

                // Count ready/total resources
                const statusCounts = resources.reduce(
                  (acc, resource) => {
                    const { status } = extractResourceInfo(resource.yaml, resource.type);
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

                return `                <h3>${namespace} (${resources.length} resource${resources.length !== 1 ? 's' : ''})${statusSummary}</h3>
                <div class="code-block">${resourceList}</div>`;
              })
              .join('\n')
          : '<p class="italic-note">No resources found</p>';

      // ROSA HCP Clusters formatting - exclude uninstalling/deleting clusters
      const activeClusters = rosaClusters.filter(
        (c) => c.status !== 'uninstalling' && c.status !== 'deleting'
      );

      const rosaClusterSection =
        activeClusters.length > 0
          ? `            <!-- ROSA HCP CLUSTERS -->
            <div class="section">
                <h2>CAPI-Managed ROSA HCP Clusters</h2>

                <div class="code-block">${activeClusters
                  .map((cluster) => {
                    const statusIcon =
                      cluster.status === 'ready'
                        ? '✅'
                        : cluster.status === 'provisioning'
                          ? '⏳'
                          : cluster.status === 'failed'
                            ? '❌'
                            : '⚠️';
                    const statusText =
                      cluster.status === 'ready'
                        ? 'Ready'
                        : cluster.status === 'provisioning'
                          ? 'Provisioning'
                          : cluster.status === 'failed'
                            ? 'Failed'
                            : cluster.status || 'Unknown';
                    const progressStr =
                      cluster.progress !== undefined && cluster.status === 'provisioning'
                        ? ` (${cluster.progress}%)`
                        : '';
                    const errorStr = cluster.error_message
                      ? ` - Error: ${cluster.error_reason || 'Failed'}`
                      : '';

                    return `${statusIcon} ${cluster.name} - ${cluster.version || 'N/A'} - ${cluster.region || 'N/A'} - ${statusText}${progressStr}${errorStr}`;
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
        .replace(/\{\{TEST_TITLE\}\}/g, 'MCE Environment Status Report')
        .replace(/\{\{TEST_DATE\}\}/g, dateTimeStr)
        .replace(/\{\{TEST_ENVIRONMENT\}\}/g, 'MCE (OpenShift Hub)')
        .replace(/\{\{FEATURE_NAME\}\}/g, 'CAPI/CAPA')
        .replace(/\{\{CLUSTER_TYPE\}\}/g, 'MCE')
        .replace(/\{\{ENVIRONMENT_ASSESSMENT\}\}/g, environmentAssessment)
        .replace(/\{\{CLUSTER_CONFIG_DETAILS\}\}/g, clusterConfigDetails)
        .replace(/\{\{COMPONENT_CONFIG_DETAILS\}\}/g, componentConfigDetails)
        .replace(/\{\{RESOURCE_COUNT\}\}/g, filteredResources.length)
        .replace(/\{\{RESOURCE_DETAILS\}\}/g, resourceDetails)
        .replace(/\{\{ROSA_CLUSTER_SECTION\}\}/g, rosaClusterSection)
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
        `MCE Status Report Generated\n\n✅ File: ${fileName}\n✅ Downloaded successfully\n✅ Includes ${freshCAPIComponents.filter((c) => c.enabled).length} configured components\n✅ Includes ${activeClusters.length} active ROSA HCP cluster(s)\n✅ Includes ${filteredResources.length} resources with versions\n✅ Includes ${recentJobs.length} recent tasks\n\nReport created at ${completionTime}`
      );
    } catch (error) {
      console.error('❌ ConfigurationSection: Create status report failed:', error);

      updateRecentOperationStatus(
        reportId,
        `❌ Failed to create report`,
        `Error: ${error.message}`
      );
    }
  };

  const toggleNamespace = (namespace) => {
    setExpandedNamespaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(namespace)) {
        newSet.delete(namespace);
      } else {
        newSet.add(namespace);
      }
      return newSet;
    });
  };

  // Group resources by namespace
  const groupedResources = mceResources.reduce((acc, resource) => {
    if (!acc[resource.namespace]) {
      acc[resource.namespace] = [];
    }
    acc[resource.namespace].push(resource);
    return acc;
  }, {});

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

  // Handle resource click to show YAML
  const handleResourceClick = async (resource) => {
    try {
      console.log('🖱️ [RESOURCE-CLICK] Clicked on resource:', resource);

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
            resource_type: resource.type,
          });

          setShowYamlEditorModal(true);
          return;
        } else {
          throw new Error('Failed to get MCE YAML from API');
        }
      }

      // For other resources, use kubectl/oc command via the OCP execute command endpoint
      // Build oc command - handle cluster-scoped resources (no namespace)
      const namespaceFlag = resource.namespace ? `-n ${resource.namespace}` : '';
      const ocCommand =
        `oc get ${resource.type.toLowerCase()} ${resource.name} ${namespaceFlag} -o yaml`.trim();
      console.log('🔧 [OC-COMMAND]', ocCommand);

      const response = await fetch(buildApiUrl('/api/ocp/execute-command'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: ocCommand,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch YAML: ${response.statusText}`);
      }

      const result = await response.json();

      // The OCP execute command endpoint returns the output directly
      let yamlContent = result.output || '';

      if (!yamlContent || yamlContent.includes('error') || yamlContent.includes('not found')) {
        throw new Error('Resource not found or error in response');
      }

      setYamlEditorData({
        yaml_content: yamlContent,
        resource_name: resource.name,
        resource_type: resource.type,
      });

      setShowYamlEditorModal(true);
    } catch (error) {
      console.error('❌ [RESOURCE-CLICK] Error fetching YAML:', error);

      // Try alternative command format (without namespace)
      try {
        const altResponse = await fetch(buildApiUrl('/api/ocp/execute-command'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: `oc get ${resource.name} -o yaml`,
          }),
        });

        if (altResponse.ok) {
          const altResult = await altResponse.json();
          if (altResult.success && altResult.output && !altResult.output.includes('error')) {
            setYamlEditorData({
              yaml_content: altResult.output,
              resource_name: resource.name,
              resource_type: resource.type,
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
# Namespace: ${resource.namespace || 'cluster-scoped'}`,
        resource_name: resource.name,
        resource_type: resource.type,
      });

      setShowYamlEditorModal(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-cyan-200 overflow-hidden mb-6">
      {/* Header */}
      <div
        onClick={toggleConfigSection}
        className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <Cog6ToothIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Configuration</h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenNotifications();
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
            title="Notification Settings"
          >
            <BellIcon className="h-4 w-4" />
            <span>Notifications</span>
          </button>
          <div className="p-0.5">
            {getConfigSectionCollapsedState() ? (
              <ChevronDownIcon className="h-5 w-5 text-white" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {!getConfigSectionCollapsedState() && (
        <div className="p-6">
          {/* Three Column Grid Layout */}
          <div className={cardStyles.grid}>
            {/* MCE Environment Card */}
            <StatusCard
              theme="mce"
              title={
                <div className="flex items-center gap-2">
                  <span>MCE Environment</span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      ocpStatus?.connected
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : 'text-red-600 bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
                    {ocpStatus?.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              }
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
              lastVerified={getLastVerifiedText()}
              actions={[
                {
                  label: 'Configure Credentials',
                  onClick: handleOpenCredentialsModal,
                  variant: 'primary',
                },
                {
                  label: 'Verify Environment',
                  onClick: onVerifyEnvironment,
                  variant: 'primary',
                },
              ]}
            >
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-cyan-100">
                  <h5 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                    <span>{mceInfo?.name || 'multiclusterengine'}</span>
                    <span className="text-sm font-normal text-cyan-600">
                      {mceInfo?.version || '2.10.0'}
                    </span>
                  </h5>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">API Server:</span>
                      <div className="mt-1 text-cyan-600 font-mono text-xs break-all">
                        {ocpStatus?.api_url || 'Not configured'}
                      </div>
                    </div>
                    {getLastVerifiedText() && (
                      <div>
                        <span className="font-medium text-gray-600">Last Verified:</span>
                        <div className="mt-1 text-gray-700 text-xs">{getLastVerifiedText()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </StatusCard>

            {/* Components Card */}
            <StatusCard
              theme="mce"
              title={
                <div className="flex items-center gap-2">
                  <span>Components</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
                    {allCAPIComponents.filter((c) => c.enabled).length} configured
                  </span>
                </div>
              }
              icon="🔧"
              actions={[
                {
                  label: 'Configure',
                  onClick: onConfigure,
                  variant: 'primary',
                },
                {
                  label: 'Refresh',
                  onClick: handleComponentRefresh,
                  variant: 'primary',
                },
              ]}
            >
              <div className="space-y-3">
                <h6 className="font-medium text-cyan-900 mb-3">Component Status</h6>

                {/* CAPI Components - Already filtered for cluster-api* */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    CAPI Providers
                  </div>
                  <div className="space-y-1">
                    {capiComponentsArray.map((feature, index) => {
                      // Map component names to their actual deployment names
                      const getDeploymentInfo = (componentName) => {
                        switch (componentName) {
                          case 'cluster-api':
                            return { name: 'capi-controller-manager', namespace: 'capi-system' };
                          case 'cluster-api-provider-aws':
                            return { name: 'capa-controller-manager', namespace: 'capa-system' };
                          case 'cluster-api-provider-metal3':
                            return { name: 'capm3-controller-manager', namespace: 'capm3-system' };
                          case 'cluster-api-provider-openshift-assisted':
                            return {
                              name: 'capi-provider-controller-manager',
                              namespace: 'capi-provider-system',
                            };
                          default:
                            return { name: componentName, namespace: 'default' };
                        }
                      };

                      const deploymentInfo = getDeploymentInfo(feature.name);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm cursor-pointer hover:bg-cyan-50 rounded p-2 transition-colors"
                          onClick={() =>
                            feature.enabled &&
                            handleResourceClick({
                              name: deploymentInfo.name,
                              type: 'Deployment',
                              namespace: deploymentInfo.namespace,
                            })
                          }
                          title={feature.enabled ? 'Click to view YAML' : 'Component not enabled'}
                        >
                          <div className="flex items-baseline gap-2">
                            <span className={feature.enabled ? 'hover:text-cyan-700' : ''}>
                              {feature.name}
                            </span>
                            {feature.version && (
                              <span className="text-xs text-gray-500 font-mono">
                                {feature.version}
                              </span>
                            )}
                          </div>
                          <span className={feature.enabled ? 'text-green-600' : 'text-red-600'}>
                            {feature.enabled ? '✓' : '✕'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hypershift Components - Already filtered for hypershift* */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Hypershift
                  </div>
                  <div className="space-y-1">
                    {hypershiftComponentsArray.map((feature, index) => {
                      // Map component names to their actual deployment names
                      const getHypershiftDeploymentInfo = (componentName) => {
                        switch (componentName) {
                          case 'hypershift':
                            return { name: 'operator', namespace: 'hypershift' };
                          case 'hypershift-local-hosting':
                            return { name: 'operator', namespace: 'hypershift' };
                          default:
                            return { name: componentName, namespace: 'hypershift' };
                        }
                      };

                      const deploymentInfo = getHypershiftDeploymentInfo(feature.name);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm cursor-pointer hover:bg-cyan-50 rounded p-2 transition-colors"
                          onClick={() =>
                            feature.enabled &&
                            handleResourceClick({
                              name: deploymentInfo.name,
                              type: 'Deployment',
                              namespace: deploymentInfo.namespace,
                            })
                          }
                          title={feature.enabled ? 'Click to view YAML' : 'Component not enabled'}
                        >
                          <div className="flex items-baseline gap-2">
                            <span className={feature.enabled ? 'hover:text-cyan-700' : ''}>
                              {feature.name}
                            </span>
                            {feature.version && (
                              <span className="text-xs text-gray-500 font-mono">
                                {feature.version}
                              </span>
                            )}
                          </div>
                          <span className={feature.enabled ? 'text-green-600' : 'text-red-600'}>
                            {feature.enabled ? '✓' : '✕'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Disable CAPI Button - Only show when CAPI is enabled */}
                {capiComponentsArray.some((c) => c.name === 'cluster-api' && c.enabled) && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={onDisableCapi}
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
              title={
                <div className="flex items-center gap-2">
                  <span>Resources</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></div>
                    {mceResources.length} total
                  </span>
                </div>
              }
              icon="📦"
              actions={[
                {
                  label: 'Provision',
                  onClick: onProvision,
                  variant: 'primary',
                },
                {
                  label: 'Refresh',
                  onClick: handleResourceRefresh,
                  variant: 'primary',
                },
              ]}
            >
              {/* Export and Create Report Buttons */}
              <div className="flex items-center space-x-2 mb-3 -mt-2">
                <button
                  onClick={onExport}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <span>📤</span>
                  <span>Export</span>
                </button>
                <button
                  onClick={handleCreateStatusReport}
                  disabled={!ocpStatus?.connected}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    ocpStatus?.connected
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    ocpStatus?.connected
                      ? 'Create HTML status report'
                      : 'Verify environment first to create report'
                  }
                >
                  <span>📊</span>
                  <span>Create Report</span>
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {mceResourcesLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading resources...</p>
                  </div>
                ) : mceResources.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No resources found.</p>
                    <p className="text-sm mt-1">
                      Resources will appear here when environment is configured.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {Object.entries(groupedResources).map(([namespace, resources]) => {
                      const isExpanded = expandedNamespaces.has(namespace);
                      return (
                        <div
                          key={namespace}
                          className="border-b border-gray-200 pb-2 last:border-b-0"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer py-2 px-2 hover:bg-cyan-50 rounded transition-colors"
                            onClick={() => toggleNamespace(namespace)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                              <h4 className="font-semibold text-gray-800 text-base">{namespace}</h4>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {resources.length}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="ml-6 mt-2 space-y-2">
                              {resources.map((resource, index) => (
                                <div
                                  key={index}
                                  className="cursor-pointer hover:bg-cyan-50 rounded p-2 transition-colors"
                                  onClick={() => handleResourceClick(resource)}
                                >
                                  <h5 className="font-medium text-gray-800 text-sm hover:text-cyan-700">
                                    {resource.name}
                                  </h5>
                                  <div className="mt-1">
                                    <span
                                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getResourceTypeColor(resource.type)}`}
                                    >
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
        </div>
      )}

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
    </div>
  );
};

ConfigurationSection.propTypes = {
  onVerifyEnvironment: PropTypes.func.isRequired,
  onOpenNotifications: PropTypes.func.isRequired,
  onConfigure: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onProvision: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onDisableCapi: PropTypes.func.isRequired,
};

export default ConfigurationSection;
