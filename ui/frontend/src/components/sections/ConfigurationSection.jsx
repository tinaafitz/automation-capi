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
  ArrowPathIcon,
  KeyIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  ArrowUpTrayIcon,
  DocumentChartBarIcon,
  NoSymbolIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '../../styles/themes';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { useJobHistory } from '../../hooks/useJobHistory';
import { getDeploymentInfo } from '../../utils/componentMapping';

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
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Filter mceFeatures to get CAPI and Hypershift components - versions come from API
  const capiComponentsArray = (
    mceFeatures?.filter((f) => f.name?.startsWith('cluster-api')) || []
  ).sort((a, b) => {
    // Sort enabled components first
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    return a.name.localeCompare(b.name);
  });

  const hypershiftComponentsArray = (
    mceFeatures?.filter((f) => f.name?.startsWith('hypershift')) || []
  ).sort((a, b) => {
    // Sort enabled components first
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    return a.name.localeCompare(b.name);
  });

  // Check if using preview components (legacy/old MCE build)
  const hasPreviewComponents = capiComponentsArray.some(
    (c) => c.name?.includes('-preview') && c.enabled
  );

  // For preview builds, exclude Hypershift components from the total count
  const allCAPIComponents = hasPreviewComponents
    ? capiComponentsArray
    : [...capiComponentsArray, ...hypershiftComponentsArray];

  // Debug logging
  console.log('📊 ConfigurationSection: mceFeatures:', mceFeatures);
  console.log('📊 ConfigurationSection: capiComponentsArray:', capiComponentsArray);
  console.log('📊 ConfigurationSection: hasPreviewComponents:', hasPreviewComponents);
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

    // Extract cluster identifier from API URL (e.g., "cqu-2151-zup" from "api.cqu-2151-zup.dev09.red-chesterfield.com")
    const apiUrl = ocpStatus?.api_url || '';
    const clusterMatch = apiUrl.match(/api[.-]([^.]+)/);
    const clusterIdentifier = clusterMatch ? clusterMatch[1] : 'unknown';

    // Create timestamp in YYYY-MM-DD-HH-MM-SS format
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

    const fileName = `mce-environment-report-${clusterIdentifier}-${timestamp}.html`;

    try {
      console.log('📊 ConfigurationSection: Create status report clicked');

      // Set loading state to disable button
      setIsGeneratingReport(true);

      // Add to recent operations
      addToRecent({
        id: reportId,
        title: 'Export Environment Report',
        color: 'bg-cyan-600',
        status: '⏳ Exporting report...',
        environment: 'mce',
        output: `Exporting HTML environment report...\nGathering component data...\nFormatting resources...`,
      });

      // Use existing data from state for resources - fetch clusters, jobs, and template in parallel
      console.log('📊 Using existing resources, fetching clusters and jobs in parallel...');

      // Use data already loaded in the component
      const freshResources = mceResources; // Already in state

      // Fetch ROSA clusters, jobs, and template in parallel (quick operations)
      const [rosaClustersData, jobsData, templateText] = await Promise.all([
        fetch(buildApiUrl('/api/rosa/clusters')).then(r => r.json()),
        fetch(buildApiUrl('/api/jobs')).then(r => r.json()),
        fetch('/templates/test-status-report-template.html').then(r => {
          if (!r.ok) throw new Error('Failed to load report template');
          return r.text();
        })
      ]);

      const rosaClusters = rosaClustersData.success ? rosaClustersData.clusters : [];
      const allJobs = jobsData.success ? jobsData.jobs : [];
      const recentJobs = allJobs.slice(0, 10);
      let htmlTemplate = templateText; // Create mutable copy for replacements

      console.log(`📊 Report data ready: ${freshResources.length} resources, ${rosaClusters.length} clusters, ${recentJobs.length} tasks`);

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

      // Check if using preview components (legacy/old MCE build) - do this FIRST
      const hasPreviewComponentsInReport = mceFeatures.some(
        (c) => c.name?.includes('-preview') && c.enabled
      );

      // Component configuration details (code-block format) - use context features
      // For preview builds, exclude Hypershift components (just like the UI does)
      // IMPORTANT: Define this BEFORE generateAssessment so we can use fresh data
      const freshCAPIComponents = mceFeatures
        .filter((f) => {
          // Always include cluster-api components
          if (f.name?.startsWith('cluster-api')) return true;
          // Only include Hypershift if NOT a preview build
          if (f.name?.startsWith('hypershift')) return !hasPreviewComponentsInReport;
          return false;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // AI Assessment - analyze environment state (using freshly filtered components)
      const generateAssessment = () => {
        // Check if using preview components (legacy/old MCE build)
        const isPreviewBuild = hasPreviewComponentsInReport;

        // Step 1: Check if CAPI/CAPA are enabled (using FRESH filtered components)
        // Check for both stable and preview component names
        const capiEnabled = freshCAPIComponents.some(
          (f) => (f.name === 'cluster-api' || f.name === 'cluster-api-preview') && f.enabled
        );
        const capaEnabled = freshCAPIComponents.some(
          (f) =>
            (f.name === 'cluster-api-provider-aws' ||
              f.name === 'cluster-api-provider-aws-preview') &&
            f.enabled
        );

        console.log('🤖 CAPI enabled:', capiEnabled);
        console.log('🤖 CAPA enabled:', capaEnabled);
        console.log('🤖 Preview build:', isPreviewBuild);

        // If CAPI/CAPA not enabled, it's a fresh environment
        if (!capiEnabled && !capaEnabled) {
          const previewWarning = isPreviewBuild ? ' ⚠️ Preview build detected.' : '';
          return `This MCE environment is not configured for CAPI/CAPA.${previewWarning}`;
        }

        // Step 2: Check for ROSA HCP clusters (exclude uninstalling/deleting)
        const activeClusters = rosaClusters.filter(
          (c) => c.status !== 'uninstalling' && c.status !== 'deleting'
        );
        const totalClusters = activeClusters.length;

        console.log('🤖 Total active ROSA HCP clusters:', totalClusters);

        // If there are ROSA HCP clusters
        if (totalClusters > 0) {
          const previewWarning = isPreviewBuild ? ' ⚠️ Preview build.' : '';
          return `This CAPI/CAPA configured environment has ${totalClusters} active ROSA HCP Cluster${totalClusters > 1 ? 's' : ''}.${previewWarning}`;
        }

        // Step 3: Check if ROSA HCP namespace exists (from fetched resources)
        const rosaNamespaceExists = freshResources.some((r) => r.namespace === 'ns-rosa-hcp');

        console.log('🤖 ROSA namespace exists:', rosaNamespaceExists);

        // If no clusters but namespace exists (has been provisioned before)
        if (rosaNamespaceExists) {
          const previewWarning = isPreviewBuild ? ' ⚠️ Preview build.' : '';
          return `This CAPI/CAPA configured environment has provisioning resources but no active ROSA HCP clusters.${previewWarning}`;
        }

        // If no clusters and no namespace (partially configured)
        const previewWarning = isPreviewBuild ? ' ⚠️ Preview build.' : '';
        return `This MCE environment has a partial CAPI/CAPA configuration.${previewWarning}`;
      };

      const environmentAssessment = generateAssessment();

      // Group resources by namespace (exclude capa-system and multicluster-engine)
      const namespacesToExclude = ['capa-system', 'multicluster-engine'];
      const filteredResources = freshResources.filter(
        (resource) => !namespacesToExclude.includes(resource.namespace)
      );

      // Get active ROSA clusters count (exclude uninstalling/deleting)
      const activeClusters = rosaClusters.filter(
        (c) => c.status !== 'uninstalling' && c.status !== 'deleting'
      );

      // Dashboard Summary - generate stat cards (must be after freshCAPIComponents and filteredResources)
      const dashboardSummary = `<div class="dashboard">
    <div class="stat-card stat-success">
        <div class="stat-number">${activeClusters.length}</div>
        <div class="stat-label">Active Clusters</div>
    </div>
    <div class="stat-card stat-info">
        <div class="stat-number">${filteredResources.length}</div>
        <div class="stat-label">Resources</div>
    </div>
    <div class="stat-card stat-success">
        <div class="stat-number">${freshCAPIComponents.filter((c) => c.enabled).length}</div>
        <div class="stat-label">Components</div>
    </div>
    <div class="stat-card ${ocpStatus?.connected ? 'stat-success' : 'stat-warning'}">
        <div class="stat-number">${ocpStatus?.connected ? '✓' : '⚠'}</div>
        <div class="stat-label">Environment</div>
    </div>
</div>`;

      // Cluster configuration details (code-block format)
      const clusterConfigDetails = `Cluster:      ${mceInfo?.name || 'multiclusterengine'}
Version:      ${mceInfo?.version || '2.10.0'}${hasPreviewComponentsInReport ? ' ⚠️ CAPI/CAPA Preview Build' : ''}
API Server:   ${ocpStatus?.api_url || 'Not configured'}
Status:       ${ocpStatus?.connected ? 'Connected' : 'Not Connected'}
Last Verified: ${lastVerifiedDate}`;

      // Generate simple component list using data we already have
      const componentConfigDetails = `Configured Components:
${freshCAPIComponents
  .filter((c) => c.enabled)
  .map((c) => `  • ${c.name}${c.version ? ` (${c.version})` : ''}`)
  .join('\n')}`;
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

      // ROSA HCP Clusters formatting - activeClusters already defined above

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

      // Format Recent Tasks - beautiful timeline view
      const recentTasksDetails =
        recentJobs.length > 0
          ? `<div class="timeline">${recentJobs
              .map((job) => {
                const statusClass =
                  job.status === 'completed' ? '' : job.status === 'failed' ? 'failed' : 'pending';
                const statusIcon =
                  job.status === 'completed' ? '✓' : job.status === 'failed' ? '✕' : '⏳';
                const taskName = job.title || job.description || 'Task';
                const taskTime = job.created_at
                  ? new Date(job.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '';
                return `<div class="timeline-item ${statusClass}">
    <div class="timeline-marker">${statusIcon}</div>
    <div class="timeline-content">
        <div class="timeline-title">${taskName}</div>
        ${taskTime ? `<div class="timeline-time">${taskTime}</div>` : ''}
    </div>
</div>`;
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
        .replace(/\{\{DASHBOARD_SUMMARY\}\}/g, dashboardSummary)
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
        `✅ Report exported at ${completionTime}`,
        `MCE Environment Report Exported\n\n✅ File: ${fileName}\n✅ Downloaded successfully\n✅ ${freshCAPIComponents.filter((c) => c.enabled).length} configured components with versions\n✅ ${activeClusters.length} active ROSA HCP cluster(s)\n✅ ${filteredResources.length} resources with status\n✅ ${recentJobs.length} recent tasks\n\nReport exported at ${completionTime}`
      );
    } catch (error) {
      console.error('❌ ConfigurationSection: Create status report failed:', error);

      updateRecentOperationStatus(
        reportId,
        `❌ Failed to create report`,
        `Error: ${error.message}`
      );
    } finally {
      // Always clear loading state when done (success or error)
      setIsGeneratingReport(false);
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
          {/* Workflow Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCredentialsModal();
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium hover:scale-105 active:scale-100"
            title="Authenticate (Ctrl+1)"
          >
            <KeyIcon className="h-4 w-4" />
            <span>Authenticate</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
            disabled={!ocpStatus?.connected}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium ${
              ocpStatus?.connected
                ? 'bg-white/20 hover:bg-white/30 text-white hover:scale-105 active:scale-100'
                : 'bg-white/10 text-white/50 cursor-not-allowed'
            }`}
            title={
              ocpStatus?.connected
                ? 'Configure Components (Ctrl+2)'
                : 'Configure credentials and verify first'
            }
          >
            <Cog6ToothIcon className="h-4 w-4" />
            <span>Configure</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerifyEnvironment();
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium hover:scale-105 active:scale-100"
            title="Verify Environment (Ctrl+3)"
          >
            <CheckCircleIcon className="h-4 w-4" />
            <span>Verify</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProvision();
            }}
            disabled={!ocpStatus?.connected}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium ${
              ocpStatus?.connected
                ? 'bg-white/20 hover:bg-white/30 text-white hover:scale-105 active:scale-100'
                : 'bg-white/10 text-white/50 cursor-not-allowed'
            }`}
            title={
              ocpStatus?.connected
                ? 'Provision ROSA HCP Cluster (Ctrl+P)'
                : 'Verify environment first'
            }
          >
            <RocketLaunchIcon className="h-4 w-4" />
            <span>Provision</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/30 mx-1"></div>

          {/* Utility Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateStatusReport();
            }}
            disabled={!ocpStatus?.connected || isGeneratingReport}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium ${
              ocpStatus?.connected && !isGeneratingReport
                ? 'bg-white/20 hover:bg-white/30 text-white hover:scale-105 active:scale-100'
                : 'bg-white/10 text-white/50 cursor-not-allowed'
            }`}
            title={
              !ocpStatus?.connected
                ? 'Verify environment first to create report'
                : isGeneratingReport
                  ? 'Report generation in progress...'
                  : 'Export Environment Report (Ctrl+S)'
            }
          >
            <DocumentChartBarIcon className="h-4 w-4" />
            <span>{isGeneratingReport ? 'Exporting...' : 'Export Report'}</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/30 mx-1"></div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenNotifications();
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
            title="Notification Settings (Ctrl+N)"
          >
            <BellIcon className="h-4 w-4" />
            <span>Notifications</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/30 mx-1"></div>

          {/* View Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCompactMode(!isCompactMode);
            }}
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-100"
            title={isCompactMode ? 'Expanded View (Ctrl+V)' : 'Compact View (Ctrl+V)'}
          >
            {isCompactMode ? (
              <ViewColumnsIcon className="h-5 w-5" />
            ) : (
              <Squares2X2Icon className="h-5 w-5" />
            )}
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
          {/* Compact Dashboard View */}
          {isCompactMode ? (
            <div className="space-y-4">
              {/* Summary Stats Dashboard */}
              <div className="grid grid-cols-4 gap-4">
                {/* MCE Status */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border-2 border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${ocpStatus?.connected ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-400 shadow-sm shadow-red-400/50'}`}
                    ></div>
                    <h4 className="text-sm font-semibold text-cyan-900">MCE Environment</h4>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {mceInfo?.name || 'multiclusterengine'}
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    {mceInfo?.version || '2.10.0'}
                  </div>
                  {ocpStatus?.connected && getLastVerifiedText() && (
                    <div className="text-[10px] text-gray-500 mt-2 border-t border-cyan-200 pt-2">
                      Last verified: {getLastVerifiedText()}
                    </div>
                  )}
                </div>

                {/* Components */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Cog6ToothIcon className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-blue-900">Components</h4>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-700">
                      {allCAPIComponents.filter((c) => c.enabled).length}
                    </span>
                    <span className="text-xs text-gray-500">
                      / {allCAPIComponents.length} enabled
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-2 border-t border-blue-200 pt-2">
                    CAPI: {capiComponentsArray.filter((c) => c.enabled).length} • Hypershift:{' '}
                    {hypershiftComponentsArray.filter((c) => c.enabled).length}
                  </div>
                </div>

                {/* Resources */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <RocketLaunchIcon className="h-4 w-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-900">Resources</h4>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-700">{mceResources.length}</span>
                    <span className="text-xs text-gray-500">total</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-2 border-t border-green-200 pt-2">
                    {Object.keys(groupedResources).length} namespaces
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowPathIcon className="h-4 w-4 text-purple-600" />
                    <h4 className="text-sm font-semibold text-purple-900">Quick Actions</h4>
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={onRefresh}
                      className="w-full text-xs bg-white/60 hover:bg-white text-purple-700 hover:text-purple-900 px-2 py-1.5 rounded transition-all duration-200 font-medium"
                    >
                      🔄 Refresh All
                    </button>
                    <button
                      onClick={handleCreateStatusReport}
                      disabled={!ocpStatus?.connected || isGeneratingReport}
                      className={`w-full text-xs px-2 py-1.5 rounded transition-all duration-200 font-medium ${
                        ocpStatus?.connected && !isGeneratingReport
                          ? 'bg-white/60 hover:bg-white text-purple-700 hover:text-purple-900'
                          : 'bg-white/30 text-purple-400 cursor-not-allowed'
                      }`}
                    >
                      📊 {isGeneratingReport ? 'Exporting...' : 'Export Report'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Expanded View - Three Column Grid Layout */
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
                    {hasPreviewComponents && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300">
                        <span className="mr-1">⚠️</span>
                        CAPI/CAPA Preview Build
                      </span>
                    )}
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
                actions={[]}
              >
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-cyan-100">
                    <h5 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                      <span
                        className="cursor-pointer hover:text-cyan-700 transition-colors"
                        onClick={() => handleResourceClick({
                          name: mceInfo?.name || 'multiclusterengine',
                          type: 'MultiClusterEngine',
                          namespace: 'multicluster-engine'
                        })}
                        title="Click to view YAML"
                      >
                        {mceInfo?.name || 'multiclusterengine'}
                      </span>
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

                  {/* Quick Stats Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-100">
                      <div className="text-xs text-gray-600 mb-1">Components</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-cyan-700">
                          {allCAPIComponents.filter((c) => c.enabled).length}
                        </span>
                        <span className="text-xs text-gray-500">
                          / {allCAPIComponents.length} enabled
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                      <div className="text-xs text-gray-600 mb-1">Resources</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-700">
                          {mceResources.length}
                        </span>
                        <span className="text-xs text-gray-500">total</span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Actions Toolbar */}
                  <div className="border-t border-gray-200 pt-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Quick Actions
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={onRefresh}
                          className="group p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Refresh Status"
                        >
                          <ArrowPathIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 group-hover:rotate-180 transition-all duration-300" />
                        </button>
                      </div>
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
                    {hasPreviewComponents && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300">
                        <span className="mr-1">⚠️</span>
                        Preview Build
                      </span>
                    )}
                  </div>
                }
                icon={<Cog6ToothIcon className="h-5 w-5" />}
                actions={[]}
              >
                <div className="space-y-3">
                  {/* Two-Column Grid Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* CAPI Components - Already filtered for cluster-api* */}
                    <div className="bg-gradient-to-br from-gray-50 to-cyan-50/30 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <span>🔌</span>
                        <span>CAPI Providers</span>
                      </div>
                      <div className="space-y-1.5">
                        {capiComponentsArray.map((feature, index) => {
                          // Map component names to their actual deployment names
                          // In MCE environment, all CAPI controllers are in multicluster-engine namespace
                          const getDeploymentInfo = (componentName) => {
                            switch (componentName) {
                              case 'cluster-api':
                                return {
                                  name: 'capi-controller-manager',
                                  namespace: 'multicluster-engine',
                                };
                              case 'cluster-api-provider-aws':
                                return {
                                  name: 'capa-controller-manager',
                                  namespace: 'multicluster-engine',
                                };
                              case 'cluster-api-provider-metal3':
                                return {
                                  name: 'capm3-controller-manager',
                                  namespace: 'multicluster-engine',
                                };
                              case 'cluster-api-provider-openshift-assisted':
                                return {
                                  name: 'capi-provider-controller-manager',
                                  namespace: 'multicluster-engine',
                                };
                              default:
                                return { name: componentName, namespace: 'default' };
                            }
                          };

                          const deploymentInfo = getDeploymentInfo(feature.name);

                          return (
                            <div
                              key={index}
                              className={`flex items-start justify-between text-xs ${
                                feature.enabled
                                  ? 'cursor-pointer hover:bg-white/60 hover:border-cyan-200'
                                  : 'cursor-not-allowed opacity-60'
                              } bg-white/40 rounded px-2.5 py-2 transition-all gap-2 border border-transparent`}
                              onClick={() =>
                                feature.enabled &&
                                handleResourceClick({
                                  name: deploymentInfo.name,
                                  type: 'Deployment',
                                  namespace: deploymentInfo.namespace,
                                })
                              }
                              title={
                                feature.enabled ? 'Click to view YAML' : 'Component not enabled'
                              }
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${feature.enabled ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-400 shadow-sm shadow-red-400/50'}`}
                                ></div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span
                                    className={`truncate font-medium ${feature.enabled ? 'text-gray-800 hover:text-cyan-700' : 'text-gray-500'}`}
                                  >
                                    {feature.name}
                                  </span>
                                  {feature.version && (
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {feature.version}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hypershift Components - Only show on newer builds (not preview) */}
                    {!hasPreviewComponents && (
                      <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <span>⚙️</span>
                          <span>Hypershift</span>
                        </div>
                        <div className="space-y-1.5">
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
                                className="flex items-start justify-between text-xs cursor-pointer hover:bg-white/60 bg-white/40 rounded px-2.5 py-2 transition-all gap-2 border border-transparent hover:border-blue-200"
                                onClick={() =>
                                  feature.enabled &&
                                  handleResourceClick({
                                    name: deploymentInfo.name,
                                    type: 'Deployment',
                                    namespace: deploymentInfo.namespace,
                                  })
                                }
                                title={
                                  feature.enabled ? 'Click to view YAML' : 'Component not enabled'
                                }
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${feature.enabled ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-400 shadow-sm shadow-red-400/50'}`}
                                  ></div>
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span
                                      className={`truncate font-medium ${feature.enabled ? 'text-gray-800 hover:text-cyan-700' : 'text-gray-500'}`}
                                    >
                                      {feature.name}
                                    </span>
                                    {feature.version && (
                                      <span className="text-[10px] text-gray-500 font-mono">
                                        {feature.version}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Secondary Actions Toolbar */}
                  <div className="border-t border-gray-200 pt-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Quick Actions
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleComponentRefresh}
                          className="group p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Refresh Components"
                        >
                          <ArrowPathIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 group-hover:rotate-180 transition-all duration-300" />
                        </button>
                        {capiComponentsArray.some((c) => c.name === 'cluster-api' && c.enabled) && (
                          <button
                            onClick={onDisableCapi}
                            className="group p-2 rounded-lg hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Disable CAPI"
                          >
                            <NoSymbolIcon className="h-4 w-4 text-gray-600 group-hover:text-red-600 group-hover:rotate-12 transition-all duration-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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
                icon={<RocketLaunchIcon className="h-5 w-5" />}
                actions={[]}
              >
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
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <div
                              className={`flex items-center justify-between cursor-pointer py-2.5 px-3 transition-all ${
                                isExpanded
                                  ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200'
                                  : 'bg-gray-50 hover:bg-cyan-50'
                              }`}
                              onClick={() => toggleNamespace(namespace)}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-cyan-600' : 'text-gray-400'}`}
                                >
                                  ▶
                                </span>
                                <h4
                                  className={`font-semibold text-sm ${isExpanded ? 'text-cyan-900' : 'text-gray-800'}`}
                                >
                                  {namespace}
                                </h4>
                              </div>
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  isExpanded
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
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

                {/* Secondary Actions Toolbar */}
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Quick Actions
                    </span>
                    <div className="flex items-center gap-1">
                      {mceResources.length > 0 && (
                        <button
                          onClick={() => {
                            if (expandedNamespaces.size === Object.keys(groupedResources).length) {
                              setExpandedNamespaces(new Set());
                            } else {
                              setExpandedNamespaces(new Set(Object.keys(groupedResources)));
                            }
                          }}
                          className="group p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200 hover:scale-110 active:scale-95"
                          title={
                            expandedNamespaces.size === Object.keys(groupedResources).length
                              ? 'Collapse All'
                              : 'Expand All'
                          }
                        >
                          {expandedNamespaces.size === Object.keys(groupedResources).length ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 transition-colors duration-200" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 transition-colors duration-200" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={handleResourceRefresh}
                        className="group p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200 hover:scale-110 active:scale-95"
                        title="Refresh Resources"
                      >
                        <ArrowPathIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 group-hover:rotate-180 transition-all duration-300" />
                      </button>
                      <button
                        onClick={onExport}
                        className="group p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200 hover:scale-110 active:scale-95"
                        title="Export Resources"
                      >
                        <ArrowUpTrayIcon className="h-4 w-4 text-gray-600 group-hover:text-cyan-600 group-hover:-translate-y-0.5 transition-all duration-200" />
                      </button>
                    </div>
                  </div>
                </div>
              </StatusCard>
            </div>
          )}
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
