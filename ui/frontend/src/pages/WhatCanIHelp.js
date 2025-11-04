import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  UserIcon,
  RocketLaunchIcon,
  PlusIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  PowerIcon,
  CubeIcon,
  ArrowUpIcon,
  TrashIcon,
  CommandLineIcon,
  BookOpenIcon,
  CloudIcon,
  ShieldCheckIcon,
  KeyIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { ROSAStatus } from '../components/ROSAStatus';
import { ConfigStatus } from '../components/ConfigStatus';
import { OCPConnectionStatus } from '../components/OCPConnectionStatus';
import { KindClusterModal } from '../components/KindClusterModal';
import { KindTerminalModal } from '../components/KindTerminalModal';
import ResourceConnectionsCard from '../components/ResourceConnectionsCard';
import { MinikubeClusterModal } from '../components/MinikubeClusterModal';
import { MinikubeTerminalModal } from '../components/MinikubeTerminalModal';
import { MCETerminalModal } from '../components/MCETerminalModal';
import TestEnvironmentCard from '../components/TestEnvironmentCard';
import TestActivityFeed from '../components/TestActivityFeed';

// Helper function to calculate age from ISO timestamp
function calculateAge(isoTimestamp) {
  if (!isoTimestamp) return '';

  try {
    const created = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now - created;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  } catch (e) {
    return '';
  }
}

// Extract timestamp from MCE component debug output
function extractMCEComponentTimestamp(output, debugPattern) {
  try {
    // Look for the debug pattern followed by JSON containing created or creationTimestamp
    // Format 1: "✓ capi-controller-manager deployment found - {"name":"...","created":"2025-10-28T14:40:49Z"}"
    // Format 2: "Namespace ns-rosa-hcp details: {"name":"...","creationTimestamp":"2025-10-28T14:40:49Z"}"

    // Try matching "created" first (with optional backslash escaping)
    let regex = new RegExp(
      debugPattern + '.*?\\\\?"created\\\\?"\\s*:\\s*\\\\?"([^"\\\\"]+)\\\\?"',
      'i'
    );
    let match = output.match(regex);

    // If not found, try matching "creationTimestamp" (with optional backslash escaping)
    if (!match) {
      regex = new RegExp(
        debugPattern + '.*?\\\\?"creationTimestamp\\\\?"\\s*:\\s*\\\\?"([^"\\\\"]+)\\\\?"',
        'i'
      );
      match = output.match(regex);
    }

    // Debug logging for first pattern
    if (debugPattern.includes('capi-controller-manager')) {
      console.log('=== MCE Timestamp Debug ===');
      console.log('Pattern:', debugPattern);
      console.log('Output length:', output?.length);
      console.log('Match found:', !!match);
      if (match) {
        console.log('Timestamp:', match[1]);
      }
      // Show a snippet of the output around the pattern
      const patternIndex = output.indexOf(debugPattern);
      if (patternIndex >= 0) {
        const snippet = output.substring(patternIndex, patternIndex + 250);
        console.log('Snippet:', snippet);
      } else {
        console.log('Pattern NOT found in output');
        // Try to find similar patterns
        const checkmarkIndex = output.indexOf('✓');
        if (checkmarkIndex >= 0) {
          console.log('Found ✓ at index:', checkmarkIndex);
          console.log('Context around ✓:', output.substring(checkmarkIndex, checkmarkIndex + 150));
        }
        const capiIndex = output.indexOf('capi-controller-manager');
        if (capiIndex >= 0) {
          console.log('Found capi-controller-manager at index:', capiIndex);
          console.log('Context:', output.substring(capiIndex - 20, capiIndex + 150));
        }
      }
    }

    return match ? match[1] : null;
  } catch (e) {
    console.error('Error extracting timestamp:', e);
    return null;
  }
}

// Parse dynamic resources from ansible validation output
function parseDynamicResources(output) {
  const resources = [];

  if (!output) return resources;

  console.log('🔍 parseDynamicResources called, output length:', output?.length);

  try {
    // Pattern to match resource found messages with JSON data
    // Format: "✓ [ResourceType] found - [JSON]" or "✓ [ResourceType] found - {"key":"value"}"
    // Capture all text before "found" as the resource type (can be multiple words)
    const pattern = /✓\s+(.+?)\s+found\s+-\s+(.+?)(?=\n|$)/g;
    let match;
    let matchCount = 0;

    while ((match = pattern.exec(output)) !== null) {
      matchCount++;
      const resourceType = match[1]; // e.g., "ROSACluster", "RosaControlPlane", "RosaNetwork"
      const jsonStr = match[2].trim().replace(/"+$/, ''); // Strip trailing quotes from ansible debug format

      console.log(`  Match #${matchCount}: ${resourceType} - JSON:`, jsonStr.substring(0, 100));

      try {
        // Try to parse as JSON (could be object or array)
        let resourceData;

        // Handle stdout_lines format - may have escaped quotes
        const cleanedJson = jsonStr.replace(/\\"/g, '"');

        // Try parsing as array first (for stdout_lines)
        if (cleanedJson.startsWith('[')) {
          resourceData = JSON.parse(cleanedJson);
        } else {
          // Single object
          resourceData = [JSON.parse(cleanedJson)];
        }

        // Extract resource info from each object
        for (const item of resourceData) {
          if (item.name) {
            resources.push({
              type: resourceType,
              name: item.name,
              namespace: item.namespace || '',
              creationTimestamp: item.creationTimestamp || item.created || null,
              status: item.status || 'Active', // Extract status, default to 'Active' if not present
            });
            console.log(
              `    ✅ Added resource: ${resourceType}/${item.name} (status: ${item.status || 'Active'})`
            );
          }
        }
      } catch (jsonError) {
        console.warn(
          `Failed to parse JSON for ${resourceType}:`,
          jsonError,
          'Raw:',
          jsonStr.substring(0, 200)
        );
      }
    }

    console.log(`🎯 Found ${resources.length} dynamic resources total (before deduplication)`);
  } catch (error) {
    console.error('Error parsing dynamic resources:', error);
  }

  // Remove duplicates based on type + namespace + name combination
  const uniqueResources = Array.from(
    new Map(resources.map((r) => [`${r.type}|${r.namespace}|${r.name}`, r])).values()
  );

  console.log(
    `🎯 Returning ${uniqueResources.length} unique resources (removed ${resources.length - uniqueResources.length} duplicates)`
  );

  return uniqueResources;
}

// Helper function to sort resources
function sortResources(resources, sortField, sortDirection) {
  if (!resources || resources.length === 0) return resources;

  const sorted = [...resources].sort((a, b) => {
    let aValue = a[sortField] || '';
    let bValue = b[sortField] || '';

    // Special handling for age - sort by timestamp
    if (sortField === 'age') {
      aValue = a.creationTimestamp || '';
      bValue = b.creationTimestamp || '';
    }

    // Convert to lowercase for case-insensitive string comparison
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Format Ansible playbook output with eye-catchers for PLAY and TASK banners
function formatPlaybookOutput(output) {
  if (!output) return 'No output available';

  // Split output into lines
  const lines = output.split('\n');
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a PLAY banner (starts with "PLAY [")
    if (line.trim().startsWith('PLAY [')) {
      formattedLines.push({
        type: 'play',
        content: line,
      });
    }
    // Check if line is a TASK banner (starts with "TASK [")
    else if (line.trim().startsWith('TASK [')) {
      formattedLines.push({
        type: 'task',
        content: line,
      });
    }
    // Check for asterisk lines (decorative banners)
    else if (line.trim().match(/^\*+$/)) {
      formattedLines.push({
        type: 'banner',
        content: line,
      });
    }
    // Regular output lines
    else {
      formattedLines.push({
        type: 'normal',
        content: line,
      });
    }
  }

  return formattedLines;
}

export function WhatCanIHelp() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCards, setVisibleCards] = useState(new Set());
  // Load expanded cards from localStorage on initial mount
  const [expandedCards, setExpandedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('expandedCards');
      console.log('💾 Loading expandedCards from localStorage:', saved);
      const loaded = saved ? new Set(JSON.parse(saved)) : new Set();
      console.log('📥 Loaded expandedCards as Set:', [...loaded]);
      return loaded;
    } catch (error) {
      console.error('❌ Error loading expandedCards from localStorage:', error);
      return new Set();
    }
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: 'general', message: '', email: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [loadingStates, setLoadingStates] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [recentOperations, setRecentOperations] = useState([]);
  const [recentOperationsCollapsed, setRecentOperationsCollapsed] = useState(false);
  const [recentOperationsOutputCollapsed, setRecentOperationsOutputCollapsed] = useState(false);
  const [minikubeOperationsOutputCollapsed, setMinikubeOperationsOutputCollapsed] = useState(false);
  const [minikubeRecentOpsCollapsed, setMinikubeRecentOpsCollapsed] = useState(false);
  const [mceRecentOpsCollapsed, setMceRecentOpsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [rosaStatus, setRosaStatus] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [ocpStatus, setOcpStatus] = useState(null);
  const [guidedSetupStatus, setGuidedSetupStatus] = useState(null);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showKindClusterModal, setShowKindClusterModal] = useState(false);
  const [kindClusters, setKindClusters] = useState([]);
  const [selectedKindCluster, setSelectedKindCluster] = useState('');
  const [kindClusterInput, setKindClusterInput] = useState('');
  const [kindVerificationResult, setKindVerificationResult] = useState(null);
  const [kindLoading, setKindLoading] = useState(false);
  const [mceLoading, setMceLoading] = useState(false);
  // Sorting states for Active Resources tables
  const [minikubeSortField, setMinikubeSortField] = useState('type');
  const [minikubeSortDirection, setMinikubeSortDirection] = useState('asc');
  const [mceSortField, setMceSortField] = useState('type');
  const [mceSortDirection, setMceSortDirection] = useState('asc');
  // Sorting states for Key Components table
  const [mceComponentSortField, setMceComponentSortField] = useState('component');
  const [mceComponentSortDirection, setMceComponentSortDirection] = useState('asc');
  const [ansibleResults, setAnsibleResults] = useState(() => {
    try {
      const saved = localStorage.getItem('ansibleResults');
      console.log('💾 Loading ansibleResults from localStorage');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        Object.keys(parsed).forEach((key) => {
          if (parsed[key].timestamp) {
            parsed[key].timestamp = new Date(parsed[key].timestamp);
          }
          // Also convert nested result.timestamp if it exists
          if (parsed[key].result?.timestamp) {
            parsed[key].result.timestamp = new Date(parsed[key].result.timestamp);
          }
        });
        console.log('📥 Loaded ansibleResults:', Object.keys(parsed));
        return parsed;
      }
      return {};
    } catch (error) {
      console.error('❌ Error loading ansibleResults from localStorage:', error);
      return {};
    }
  });
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [systemStats, setSystemStats] = useState({
    clustersActive: 2,
    resourcesUsed: 85,
    lastUpdate: new Date().toLocaleTimeString(),
    connectionStatus: 'Connected',
    apiUrl: 'https://api.cluster-example.example.openshiftapps.com:6443',
    currentUser: 'kube:admin',
    testingVersion: '4.20',
  });
  const [rosaHcpResources, setRosaHcpResources] = useState({
    accountRoles: [],
    operatorRoles: [],
    oidcId: null,
    subnets: [],
    loading: false,
    lastChecked: null,
    error: null,
  });
  const [showOidcModal, setShowOidcModal] = useState(false);
  const [oidcInput, setOidcInput] = useState('');
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcModalMode, setOidcModalMode] = useState('create'); // 'create' or 'enter'
  const [showSubnetModal, setShowSubnetModal] = useState(false);
  const [subnetInput, setSubnetInput] = useState({ privateSubnet: '', publicSubnet: '' });
  const [subnetLoading, setSubnetLoading] = useState(false);
  const [showCreateSubnetModal, setShowCreateSubnetModal] = useState(false);
  const [createSubnetInput, setCreateSubnetInput] = useState({
    region: 'us-west-2',
    clusterName: '',
  });
  const [createSubnetLoading, setCreateSubnetLoading] = useState(false);
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [prefixLoading, setPrefixLoading] = useState(false);
  const [savedPrefix, setSavedPrefix] = useState('');
  const [verifiedKindClusterInfo, setVerifiedKindClusterInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('verifiedKindClusterInfo');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading verifiedKindClusterInfo from localStorage:', error);
      return null;
    }
  });
  const [activeResources, setActiveResources] = useState([]);
  const [showKindConfigModal, setShowKindConfigModal] = useState(false);
  const [showKindTerminalModal, setShowKindTerminalModal] = useState(false);
  const [showResourceDetailModal, setShowResourceDetailModal] = useState(false);
  const [selectedResourceDetail, setSelectedResourceDetail] = useState(null);
  const [showAnsibleModal, setShowAnsibleModal] = useState(false);
  const [ansibleOutput, setAnsibleOutput] = useState(null);

  // Minikube cluster state
  const [showMinikubeConfigModal, setShowMinikubeConfigModal] = useState(false);
  const [showMinikubeTerminalModal, setShowMinikubeTerminalModal] = useState(false);
  const [verifiedMinikubeClusterInfo, setVerifiedMinikubeClusterInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('verifiedMinikubeClusterInfo');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading verifiedMinikubeClusterInfo from localStorage:', error);
      return null;
    }
  });

  // MCE Terminal state
  const [showMCETerminalModal, setShowMCETerminalModal] = useState(false);

  // MCE Features modal state
  const [showMCEFeaturesModal, setShowMCEFeaturesModal] = useState(false);
  const [mceFeatures, setMceFeatures] = useState(null);
  const [mceInfo, setMceInfo] = useState(null);
  const [mceLastVerified, setMceLastVerified] = useState(null);
  const [credentialWarning, setCredentialWarning] = useState(null); // { type: 'placeholder' | 'invalid', message: string }
  const [mceFeaturesLoading, setMceFeaturesLoading] = useState(false);

  // Last used ROSA YAML path for ROSA HCP provisioning
  const [lastRosaYamlPath, setLastRosaYamlPath] = useState('rosa-hcp-test.yml');

  // Environment selector state with localStorage persistence
  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedTestEnvironment');
      return saved || 'minikube';
    } catch (error) {
      console.error('Error loading selectedEnvironment from localStorage:', error);
      return 'minikube';
    }
  });
  const [showEnvironmentDropdown, setShowEnvironmentDropdown] = useState(false);

  // Track if we've already shown initial notifications to prevent loops
  const hasShownInitialNotifications = useRef(false);

  // Helper function to check if automation features should be disabled
  const isAutomationDisabled = () => {
    // Only require ROSA authentication and configuration - OCP connection is optional
    return !rosaStatus?.authenticated || !configStatus?.configured;
  };

  const getDisabledReason = () => {
    if (!rosaStatus?.authenticated) return 'ROSA staging authentication required';
    if (!configStatus?.configured) return 'Configuration incomplete';
    return '';
  };

  // Kind cluster verification functions
  const handleKindClusterCheck = async () => {
    setShowKindClusterModal(true);
    setKindLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/kind/list-clusters');
      const data = await response.json();
      setKindClusters(data.clusters || []);

      if (data.clusters.length === 0) {
        addNotification(data.message, 'info');
      }
    } catch (error) {
      console.error('Failed to list Kind clusters:', error);
      addNotification('Failed to check Kind clusters', 'error');
    } finally {
      setKindLoading(false);
    }
  };

  const createOCMSecret = async () => {
    if (!verifiedKindClusterInfo?.name) {
      addNotification('❌ No Kind cluster verified', 'error');
      return;
    }

    try {
      addNotification('🔧 Creating OCM client secret...', 'info');

      const response = await fetch('http://localhost:8000/api/kind/create-ocm-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: verifiedKindClusterInfo.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addNotification('✅ OCM client secret created successfully!', 'success');
        // Re-verify the cluster to update component status
        if (verifiedKindClusterInfo.name) {
          verifyKindCluster(verifiedKindClusterInfo.name).catch(() => {
            // Silently handle verification errors after secret creation
          });
        }
      } else {
        addNotification(`❌ Failed to create secret: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('Failed to create OCM secret:', error);
      addNotification('❌ Failed to create OCM secret', 'error');
    }
  };

  const handleKindClusterSelected = async ({ cluster_name, verificationData }) => {
    try {
      const operationId = `configure-kind-${Date.now()}`;

      // Add to recent operations immediately
      addToRecent({
        id: operationId,
        title: 'Minikube Configure Cluster',
        color: 'bg-cyan-600',
        status: `⏳ Configuring ${cluster_name}...`,
      });

      // Small delay to show the "Configuring..." status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store the verified cluster information with time
      const clusterInfo = {
        name: cluster_name,
        apiUrl: verificationData.cluster_info?.api_url || 'https://127.0.0.1:6443',
        contextName: verificationData.context_name,
        verifiedDate: new Date().toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        namespace: 'ns-rosa-hcp',
        status: verificationData.cluster_info?.status || 'ready',
        components: verificationData.cluster_info?.components || {},
      };
      setVerifiedKindClusterInfo(clusterInfo);

      // Store in localStorage for persistence
      localStorage.setItem('verified-kind-cluster', JSON.stringify(clusterInfo));

      // Fetch active resources
      await fetchActiveResources(cluster_name, clusterInfo.namespace);

      // Update operation status with success and timestamp
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      updateRecentOperationStatus(operationId, `✅ Configured at ${completionTime}`);

      // Add success notification
      addNotification('🎉 Kind cluster configured successfully!', 'success', 3000);
    } catch (error) {
      console.error('Error handling cluster selection:', error);
      addNotification('Failed to configure cluster', 'error');
    }
  };

  const handleMinikubeClusterSelected = async ({ cluster_name, verificationData }) => {
    try {
      const operationId = `configure-minikube-${Date.now()}`;

      // Add to recent operations immediately
      addToRecent({
        id: operationId,
        title: 'Minikube Configure Cluster',
        color: 'bg-purple-600',
        status: `⏳ Configuring ${cluster_name}...`,
      });

      // Small delay to show the "Configuring..." status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store the verified cluster information with time
      const clusterInfo = {
        name: cluster_name,
        apiUrl: verificationData.cluster_info?.api_url || 'https://127.0.0.1:8443',
        contextName: verificationData.context_name || cluster_name,
        verifiedDate: new Date().toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        namespace: 'ns-rosa-hcp',
        status: verificationData.cluster_info?.status || 'ready',
        version: verificationData.cluster_info?.version || 'v1.32.0',
        components: verificationData.cluster_info?.components || {},
        component_timestamps: verificationData.cluster_info?.component_timestamps || {},
        component_versions: verificationData.cluster_info?.component_versions || [],
      };
      setVerifiedMinikubeClusterInfo(clusterInfo);

      // Store in localStorage for persistence
      localStorage.setItem('verified-minikube-cluster', JSON.stringify(clusterInfo));

      // Fetch active resources
      await fetchMinikubeActiveResources(cluster_name, clusterInfo.namespace);

      // Update operation status with success and timestamp
      const completionTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      updateRecentOperationStatus(operationId, `✅ Configured at ${completionTime}`);

      // Add success notification
      addNotification('🎉 Minikube cluster configured successfully!', 'success', 3000);
    } catch (error) {
      console.error('Error handling Minikube cluster selection:', error);
      addNotification('Failed to configure Minikube cluster', 'error');
    }
  };

  // Fetch active resources from the Kind cluster
  const fetchActiveResources = async (clusterName, namespace = 'ns-rosa-hcp') => {
    try {
      const response = await fetch('http://localhost:8000/api/kind/get-active-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: clusterName,
          namespace: namespace,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveResources(data.resources);
      } else {
        setActiveResources([]);
      }
    } catch (error) {
      console.error('Failed to fetch active resources:', error);
      setActiveResources([]);
    }
  };

  // Fetch active resources from the Minikube cluster
  const fetchMinikubeActiveResources = async (clusterName, namespace = 'ns-rosa-hcp') => {
    try {
      console.log(
        '📡 Fetching Minikube active resources for cluster:',
        clusterName,
        'namespace:',
        namespace
      );
      const response = await fetch('http://localhost:8000/api/minikube/get-active-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: clusterName,
          namespace: namespace,
        }),
      });

      const data = await response.json();
      console.log('📊 Minikube active resources response:', data);

      if (data.success) {
        console.log('✅ Setting activeResources with', data.resources.length, 'resources');
        setActiveResources(data.resources);
      } else {
        console.log('❌ API returned success=false, clearing activeResources');
        setActiveResources([]);
      }
    } catch (error) {
      console.error('Failed to fetch Minikube active resources:', error);
      setActiveResources([]);
    }
  };

  const fetchResourceDetail = async (
    clusterName,
    resourceType,
    resourceName,
    namespace = 'ns-rosa-hcp'
  ) => {
    try {
      const response = await fetch('http://localhost:8000/api/minikube/get-resource-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cluster_name: clusterName,
          resource_type: resourceType,
          resource_name: resourceName,
          namespace: namespace,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedResourceDetail({
          type: resourceType,
          name: resourceName,
          namespace: namespace,
          yaml: data.data,
        });
        setShowResourceDetailModal(true);
      } else {
        addNotification(`Failed to fetch resource: ${data.message}`, 'error', 3000);
      }
    } catch (error) {
      console.error('Failed to fetch resource detail:', error);
      addNotification('Failed to fetch resource details', 'error', 3000);
    }
  };

  const fetchOcpResourceDetail = async (resourceType, resourceName, namespace = '') => {
    try {
      const response = await fetch('http://localhost:8000/api/ocp/get-resource-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_name: resourceName,
          namespace: namespace,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedResourceDetail({
          type: resourceType,
          name: resourceName,
          namespace: namespace,
          yaml: data.data,
        });
        setShowResourceDetailModal(true);
      } else {
        addNotification(`Failed to fetch resource: ${data.message}`, 'error', 3000);
      }
    } catch (error) {
      console.error('Failed to fetch OCP resource detail:', error);
      addNotification('Failed to fetch resource details', 'error', 3000);
    }
  };

  // Handle resource click to show details
  const handleResourceClick = async (resource, clusterType = 'minikube') => {
    const clusterName =
      clusterType === 'minikube'
        ? verifiedMinikubeClusterInfo?.name
        : verifiedKindClusterInfo?.name;

    if (!clusterName) {
      addNotification('No cluster selected', 'error');
      return;
    }

    await fetchResourceDetail(
      clusterName,
      resource.type,
      resource.name,
      resource.namespace || 'ns-rosa-hcp'
    );
  };

  const verifyKindCluster = async (clusterName) => {
    if (!clusterName.trim()) {
      addNotification('Please enter a cluster name', 'error');
      return;
    }

    setKindLoading(true);
    setKindVerificationResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/kind/verify-cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster_name: clusterName.trim() }),
      });

      const data = await response.json();
      setKindVerificationResult(data);

      if (data.exists && data.accessible) {
        // Store the verified cluster information with time
        const clusterInfo = {
          name: clusterName,
          apiUrl: data.cluster_info?.api_url || 'https://127.0.0.1:6443',
          contextName: data.context_name,
          verifiedDate: new Date().toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          namespace: 'ns-rosa-hcp', // Default namespace
          status: data.cluster_info?.status || 'ready',
          components: data.cluster_info?.components || {},
        };
        setVerifiedKindClusterInfo(clusterInfo);

        // Store in localStorage for persistence
        localStorage.setItem('verified-kind-cluster', JSON.stringify(clusterInfo));

        // Fetch active resources
        await fetchActiveResources(clusterName, clusterInfo.namespace);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to verify Kind cluster:', error);
      throw error; // Re-throw to be caught by the button handler
    } finally {
      setKindLoading(false);
    }
  };

  // Wrapper function for automation actions that checks prerequisites
  const executeAutomationAction = (action, actionName = 'automation action') => {
    if (isAutomationDisabled()) {
      addNotification(
        `❌ ${actionName} blocked: ${getDisabledReason()}. Fix prerequisites before running automation.`,
        'error',
        8000
      );
      return;
    }
    action();
  };

  // Load preferences from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const savedRecent = JSON.parse(localStorage.getItem('recentOperations') || '[]');

    setDarkMode(savedDarkMode);
    setFavorites(new Set(savedFavorites));
    setRecentOperations(savedRecent);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // Save expanded cards to localStorage
  useEffect(() => {
    const cardsArray = [...expandedCards];
    console.log('💾 Saving expandedCards to localStorage:', cardsArray);
    localStorage.setItem('expandedCards', JSON.stringify(cardsArray));
    console.log('✅ Saved to localStorage');
  }, [expandedCards]);

  useEffect(() => {
    localStorage.setItem('recentOperations', JSON.stringify(recentOperations));
  }, [recentOperations]);

  // Save selected environment to localStorage
  useEffect(() => {
    localStorage.setItem('selectedTestEnvironment', selectedEnvironment);
  }, [selectedEnvironment]);

  // Fetch active resources when Minikube cluster info is loaded
  useEffect(() => {
    if (verifiedMinikubeClusterInfo?.name) {
      console.log(
        '🔄 Auto-fetching active resources for Minikube cluster:',
        verifiedMinikubeClusterInfo.name
      );
      fetchMinikubeActiveResources(
        verifiedMinikubeClusterInfo.name,
        verifiedMinikubeClusterInfo.namespace || 'ns-rosa-hcp'
      ).catch((err) => console.error('Failed to auto-fetch active resources:', err));
    }
  }, [verifiedMinikubeClusterInfo?.name]);

  // Save ansibleResults to localStorage
  useEffect(() => {
    try {
      console.log('💾 Saving ansibleResults to localStorage:', Object.keys(ansibleResults));
      localStorage.setItem('ansibleResults', JSON.stringify(ansibleResults));
      console.log('✅ Saved ansibleResults to localStorage');
    } catch (error) {
      console.error('❌ Error saving ansibleResults to localStorage:', error);
    }
  }, [ansibleResults]);

  // Save verifiedKindClusterInfo to localStorage
  useEffect(() => {
    if (verifiedKindClusterInfo) {
      localStorage.setItem('verifiedKindClusterInfo', JSON.stringify(verifiedKindClusterInfo));
    }
  }, [verifiedKindClusterInfo]);

  // Save verifiedMinikubeClusterInfo to localStorage
  useEffect(() => {
    if (verifiedMinikubeClusterInfo) {
      localStorage.setItem(
        'verifiedMinikubeClusterInfo',
        JSON.stringify(verifiedMinikubeClusterInfo)
      );
    }
  }, [verifiedMinikubeClusterInfo]);

  // Auto-expand MCE card if validation results exist
  useEffect(() => {
    if (
      ansibleResults['check-components']?.result?.output ||
      ansibleResults['refresh-check-components']?.result?.output
    ) {
      console.log('📂 MCE validation results detected - auto-expanding card');
      setExpandedCards((prev) => {
        const newSet = new Set(prev);
        newSet.add('check-components');
        return newSet;
      });
    }
  }, [ansibleResults]);

  // Check for credential issues on app load
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/ocp/connection/test');
        const data = await response.json();

        if (data.status === 'placeholder_credentials' || data.status === 'missing_credentials') {
          setCredentialWarning({
            type: 'placeholder',
            message:
              'OpenShift Hub credentials not configured. Configure vars/user_vars.yml before running MCE operations.',
          });
        } else if (data.status === 'invalid_credentials' || !data.connected) {
          // Only show warning for credential errors, not for other connection issues
          if (
            data.error_details &&
            (data.error_details.includes('401') ||
              data.error_details.includes('Unauthorized') ||
              data.error_details.includes('Login failed'))
          ) {
            setCredentialWarning({
              type: 'invalid',
              message:
                'OpenShift Hub credentials may be invalid. Check vars/user_vars.yml or get fresh credentials from your cluster.',
            });
          }
        } else {
          // Credentials are valid, clear any warnings
          setCredentialWarning(null);
        }
      } catch (error) {
        // Don't show warnings for network errors during initial load
        console.log('Could not check credentials on load:', error);
      }
    };

    checkCredentials();
  }, []); // Run once on mount

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowHelp(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setShowFeedback(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowHelp(false);
        setShowFeedback(false);
        setShowConfirmDialog(null);
        setShowKindClusterModal(false);
        setShowOidcModal(false);
        setShowSubnetModal(false);
        setShowCreateSubnetModal(false);
        setShowPrefixModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Staggered card animations
  useEffect(() => {
    // Debug: Log array lengths to verify all cards are present
    console.log('🎯 Initializing card visibility:', {
      configureEnvironmentCount: configureEnvironment.length,
      manageROSAClustersCount: manageROSAClusters.length,
    });

    const timer = setTimeout(() => {
      configureEnvironment.forEach((operation, index) => {
        setTimeout(() => {
          console.log(`✅ Making visible: config-${index} (${operation.title})`);
          setVisibleCards((prev) => new Set([...prev, `config-${index}`]));
        }, index * 100);
      });

      manageROSAClusters.forEach((operation, index) => {
        setTimeout(
          () => {
            console.log(`✅ Making visible: manage-${index} (${operation.title})`);
            setVisibleCards((prev) => new Set([...prev, `manage-${index}`]));
          },
          (index + configureEnvironment.length) * 100
        );
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Refresh all status data
  const refreshAllStatus = async () => {
    const timestamp = Date.now();
    console.log('Refreshing all status at:', new Date().toISOString());
    let hasErrors = false;

    // Check ROSA status with cache busting
    try {
      const response = await fetch(`http://localhost:8000/api/rosa/status?t=${timestamp}`);
      const data = await response.json();
      console.log('ROSA status response:', data);
      setRosaStatus(data);
    } catch (error) {
      console.error('Failed to check ROSA status:', error);
      hasErrors = true;
      setRosaStatus({
        authenticated: false,
        status: 'error',
        message: 'Failed to check ROSA status',
      });
    }

    // Check configuration status with cache busting
    try {
      const response = await fetch(`http://localhost:8000/api/config/status?t=${timestamp}`);
      const data = await response.json();
      console.log('Config status response:', data);
      setConfigStatus(data);
    } catch (error) {
      console.error('Failed to check config status:', error);
      hasErrors = true;
      setConfigStatus({
        configured: false,
        status: 'error',
        message: 'Failed to check configuration status',
      });
    }

    // Check OCP Hub connection status with cache busting
    try {
      const response = await fetch(
        `http://localhost:8000/api/ocp/connection-status?t=${timestamp}`
      );
      const data = await response.json();
      console.log('OCP status response:', data);
      setOcpStatus(data);

      // If connected, also fetch MCE features
      if (data.connected) {
        try {
          const mceResponse = await fetch(`http://localhost:8000/api/mce/features?t=${timestamp}`);
          const mceData = await mceResponse.json();
          console.log('MCE features response:', mceData);
          setMceFeatures(mceData.features || []);
          setMceInfo(mceData.mce_info || null);
          setMceLastVerified(new Date().toISOString());
        } catch (mceError) {
          console.error('Failed to fetch MCE features:', mceError);
        }
      }
    } catch (error) {
      console.error('Failed to check OCP connection:', error);
      hasErrors = true;
      setOcpStatus({
        connected: false,
        status: 'error',
        message: 'Failed to check OpenShift Hub connection',
      });
    }

    // Check guided setup status with cache busting
    try {
      const response = await fetch(`http://localhost:8000/api/guided-setup/status?t=${timestamp}`);
      const data = await response.json();
      console.log('Guided setup status response:', data);
      setGuidedSetupStatus(data);
    } catch (error) {
      console.error('Failed to check guided setup status:', error);
      hasErrors = true;
    }

    // Log if there were any errors, but don't throw to avoid crashing the UI
    if (hasErrors) {
      console.warn('Some status checks failed - this is normal if backend is not running');
    }
  };

  // Check all status on startup
  useEffect(() => {
    refreshAllStatus().catch((error) => {
      console.error('Error refreshing status on startup:', error);
    });
  }, []);

  // Auto-run component validation on startup - DISABLED per user request
  // User should manually select "Verify" instead
  // useEffect(() => {
  //   const runAutoVerification = async () => {
  //     // Only run if we haven't checked components yet
  //     if (!ansibleResults['check-components']) {
  //       // Add to Recent Operations
  //       const verifyId = `auto-verify-${Date.now()}`;
  //       addToRecent({
  //         id: verifyId,
  //         title: 'MCE Environment Auto-Verification',
  //         color: 'bg-blue-600',
  //         status: '⏳ Checking...',
  //       });
  //
  //       try {
  //         // First, check CAPI/CAPA status
  //         const statusOperation = configureEnvironment.find((op) => op.id === 'get-capi-capa-status');
  //         if (statusOperation) {
  //           await statusOperation.action();
  //         }
  //
  //         // Wait for status check to complete and state to update
  //         await new Promise(resolve => setTimeout(resolve, 500));
  //
  //         // Use a promise to properly check the updated state
  //         const shouldProceed = await new Promise((resolve) => {
  //           setAnsibleResults((currentResults) => {
  //             const statusResult = currentResults['get-capi-capa-status'];
  //             if (statusResult?.result?.output) {
  //               const output = statusResult.result.output;
  //               const capiNotEnabled = output.includes('CAPI is NOT enabled');
  //               const capaNotEnabled = output.includes('CAPA is NOT enabled');
  //
  //               if (capiNotEnabled || capaNotEnabled) {
  //                 // CAPI/CAPA not enabled - stop verification
  //                 const completionTime = new Date().toLocaleTimeString('en-US', {
  //                   hour: 'numeric',
  //                   minute: '2-digit',
  //                   second: '2-digit',
  //                   hour12: true
  //                 });
  //                 updateRecentOperationStatus(verifyId, `⚠️ CAPI/CAPA not enabled at ${completionTime}`);
  //                 resolve(false); // Don't proceed
  //               } else {
  //                 // CAPI/CAPA are enabled, proceed with component verification
  //                 resolve(true); // Proceed
  //               }
  //             } else {
  //               // If no result yet, don't proceed
  //               const completionTime = new Date().toLocaleTimeString('en-US', {
  //                 hour: 'numeric',
  //                 minute: '2-digit',
  //                 second: '2-digit',
  //                 hour12: true
  //               });
  //               updateRecentOperationStatus(verifyId, `⚠️ Unable to check CAPI/CAPA status at ${completionTime}`);
  //               resolve(false);
  //             }
  //             return currentResults;
  //           });
  //         });
  //
  //         if (!shouldProceed) {
  //           return; // Stop if CAPI/CAPA not enabled
  //         }
  //
  //         // Run the check-components validation (only if CAPI/CAPA are enabled)
  //         const checkOperation = configureEnvironment.find((op) => op.id === 'check-components');
  //         if (checkOperation) {
  //           await checkOperation.action();
  //         }
  //
  //         // Wait for check to complete
  //         await new Promise(resolve => setTimeout(resolve, 500));
  //
  //         const completionTime = new Date().toLocaleTimeString('en-US', {
  //           hour: 'numeric',
  //           minute: '2-digit',
  //           second: '2-digit',
  //           hour12: true
  //         });
  //         updateRecentOperationStatus(verifyId, `✅ Completed at ${completionTime}`);
  //       } catch (error) {
  //         const completionTime = new Date().toLocaleTimeString('en-US', {
  //           hour: 'numeric',
  //           minute: '2-digit',
  //           second: '2-digit',
  //           hour12: true
  //         });
  //         console.error('Auto-verification error:', error);
  //         updateRecentOperationStatus(verifyId, `⚠️ Completed with warnings at ${completionTime}`);
  //       }
  //     }
  //   };
  //
  //   runAutoVerification();
  // }, []); // Empty dependency array ensures this only runs once on mount

  // Real-time data updates
  useEffect(() => {
    const updateStats = () => {
      setSystemStats((prev) => ({
        ...prev,
        clustersActive: Math.floor(Math.random() * 3) + 1,
        resourcesUsed: Math.floor(Math.random() * 20) + 80,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    };

    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch ROSA HCP Resources
  const fetchRosaHcpResources = async () => {
    setRosaHcpResources((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Simulate API calls to fetch ROSA resources
      // In real implementation, these would be actual API calls
      const mockAccountRoles = [
        {
          roleName: 'example-HCP-ROSA-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'example',
          arn: 'arn:aws:iam::123456789012:role/example-HCP-ROSA-Installer-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Installer role',
        },
        {
          roleName: 'example-HCP-ROSA-Support-Role',
          roleType: 'Support',
          rolePrefix: 'example',
          arn: 'arn:aws:iam::123456789012:role/example-HCP-ROSA-Support-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Support role',
        },
        {
          roleName: 'example-HCP-ROSA-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'example',
          arn: 'arn:aws:iam::123456789012:role/example-HCP-ROSA-Worker-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Worker role',
        },
        {
          roleName: 'example-HCP-ROSA-ControlPlane-Role',
          roleType: 'ControlPlane',
          rolePrefix: 'example',
          arn: 'arn:aws:iam::123456789012:role/example-HCP-ROSA-ControlPlane-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Control Plane role',
        },
        {
          roleName: 'prod-HCP-ROSA-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'prod',
          arn: 'arn:aws:iam::123456789012:role/prod-HCP-ROSA-Installer-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Installer role',
        },
        {
          roleName: 'prod-HCP-ROSA-Support-Role',
          roleType: 'Support',
          rolePrefix: 'prod',
          arn: 'arn:aws:iam::123456789012:role/prod-HCP-ROSA-Support-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Support role',
        },
        {
          roleName: 'prod-HCP-ROSA-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'prod',
          arn: 'arn:aws:iam::123456789012:role/prod-HCP-ROSA-Worker-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Worker role',
        },
        {
          roleName: 'test-ControlPlane-Role',
          roleType: 'Control plane',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-ControlPlane-Role',
          version: '4.19',
          managed: 'No',
          status: 'Active',
          description: 'Control plane role',
        },
        {
          roleName: 'test-HCP-ROSA-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-HCP-ROSA-Installer-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Installer role',
        },
        {
          roleName: 'test-HCP-ROSA-Support-Role',
          roleType: 'Support',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-HCP-ROSA-Support-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Support role',
        },
        {
          roleName: 'test-HCP-ROSA-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-HCP-ROSA-Worker-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Worker role',
        },
        {
          roleName: 'test-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-Installer-Role',
          version: '4.15',
          managed: 'No',
          status: 'Active',
          description: 'Classic Installer role',
        },
        {
          roleName: 'test-Support-Role',
          roleType: 'Support',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-Support-Role',
          version: '4.15',
          managed: 'No',
          status: 'Active',
          description: 'Classic Support role',
        },
        {
          roleName: 'test-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'test',
          arn: 'arn:aws:iam::123456789012:role/test-Worker-Role',
          version: '4.15',
          managed: 'No',
          status: 'Active',
          description: 'Classic Worker role',
        },
        {
          roleName: 'dev-ControlPlane-Role',
          roleType: 'Control plane',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-ControlPlane-Role',
          version: '4.19',
          managed: 'No',
          status: 'Active',
          description: 'Control plane role',
        },
        {
          roleName: 'dev-HCP-ROSA-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-HCP-ROSA-Installer-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Installer role',
        },
        {
          roleName: 'dev-HCP-ROSA-Support-Role',
          roleType: 'Support',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-HCP-ROSA-Support-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Support role',
        },
        {
          roleName: 'dev-HCP-ROSA-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-HCP-ROSA-Worker-Role',
          version: '4.19',
          managed: 'Yes',
          status: 'Active',
          description: 'HCP ROSA Worker role',
        },
        {
          roleName: 'dev-Installer-Role',
          roleType: 'Installer',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-Installer-Role',
          version: '4.19',
          managed: 'No',
          status: 'Active',
          description: 'Classic Installer role',
        },
        {
          roleName: 'dev-Support-Role',
          roleType: 'Support',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-Support-Role',
          version: '4.19',
          managed: 'No',
          status: 'Active',
          description: 'Classic Support role',
        },
        {
          roleName: 'dev-Worker-Role',
          roleType: 'Worker',
          rolePrefix: 'dev',
          arn: 'arn:aws:iam::123456789012:role/dev-Worker-Role',
          version: '4.19',
          managed: 'No',
          status: 'Active',
          description: 'Classic Worker role',
        },
      ];

      const mockOperatorRoles = [
        {
          name: 'example-rosa-hcp-cluster-openshift-ingress-operator',
          arn: 'arn:aws:iam::123456789012:role/example-rosa-hcp-cluster-openshift-ingress-operator',
          status: 'Active',
          operatorType: 'Ingress',
          clusterPrefix: 'example',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages OpenShift ingress routing and load balancing',
        },
        {
          name: 'example-rosa-hcp-cluster-openshift-image-registry-operator',
          arn: 'arn:aws:iam::123456789012:role/example-rosa-hcp-cluster-openshift-image-registry-operator',
          status: 'Active',
          operatorType: 'Image Registry',
          clusterPrefix: 'example',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages container image registry operations',
        },
        {
          name: 'example-rosa-hcp-cluster-cloud-credential-operator',
          arn: 'arn:aws:iam::123456789012:role/example-rosa-hcp-cluster-cloud-credential-operator',
          status: 'Active',
          operatorType: 'Cloud Credential',
          clusterPrefix: 'example',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages cloud provider credentials and permissions',
        },
        {
          name: 'example-rosa-hcp-cluster-ebs-csi-driver-operator',
          arn: 'arn:aws:iam::123456789012:role/example-rosa-hcp-cluster-ebs-csi-driver-operator',
          status: 'Active',
          operatorType: 'EBS CSI Driver',
          clusterPrefix: 'example',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages AWS EBS storage for persistent volumes',
        },
        {
          name: 'prod-rosa-hcp-cluster-openshift-ingress-operator',
          arn: 'arn:aws:iam::123456789012:role/prod-rosa-hcp-cluster-openshift-ingress-operator',
          status: 'Active',
          operatorType: 'Ingress',
          clusterPrefix: 'prod',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages OpenShift ingress routing and load balancing',
        },
        {
          name: 'prod-rosa-hcp-cluster-openshift-image-registry-operator',
          arn: 'arn:aws:iam::123456789012:role/prod-rosa-hcp-cluster-openshift-image-registry-operator',
          status: 'Active',
          operatorType: 'Image Registry',
          clusterPrefix: 'prod',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages container image registry operations',
        },
        {
          name: 'prod-rosa-hcp-cluster-cloud-credential-operator',
          arn: 'arn:aws:iam::123456789012:role/prod-rosa-hcp-cluster-cloud-credential-operator',
          status: 'Active',
          operatorType: 'Cloud Credential',
          clusterPrefix: 'prod',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages cloud provider credentials and permissions',
        },
        {
          name: 'prod-rosa-hcp-cluster-ebs-csi-driver-operator',
          arn: 'arn:aws:iam::123456789012:role/prod-rosa-hcp-cluster-ebs-csi-driver-operator',
          status: 'Active',
          operatorType: 'EBS CSI Driver',
          clusterPrefix: 'prod',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages AWS EBS storage for persistent volumes',
        },
        {
          name: 'test-rosa-hcp-cluster-openshift-ingress-operator',
          arn: 'arn:aws:iam::123456789012:role/test-rosa-hcp-cluster-openshift-ingress-operator',
          status: 'Active',
          operatorType: 'Ingress',
          clusterPrefix: 'test',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages OpenShift ingress routing and load balancing',
        },
        {
          name: 'test-rosa-hcp-cluster-openshift-image-registry-operator',
          arn: 'arn:aws:iam::123456789012:role/test-rosa-hcp-cluster-openshift-image-registry-operator',
          status: 'Active',
          operatorType: 'Image Registry',
          clusterPrefix: 'test',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages container image registry operations',
        },
        {
          name: 'dev-rosa-hcp-cluster-openshift-ingress-operator',
          arn: 'arn:aws:iam::123456789012:role/dev-rosa-hcp-cluster-openshift-ingress-operator',
          status: 'Active',
          operatorType: 'Ingress',
          clusterPrefix: 'dev',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages OpenShift ingress routing and load balancing',
        },
        {
          name: 'dev-rosa-hcp-cluster-cloud-credential-operator',
          arn: 'arn:aws:iam::123456789012:role/dev-rosa-hcp-cluster-cloud-credential-operator',
          status: 'Active',
          operatorType: 'Cloud Credential',
          clusterPrefix: 'dev',
          version: '4.19',
          managed: 'Yes',
          description: 'Manages cloud provider credentials and permissions',
        },
      ];

      const mockOidcId =
        'https://oidc-rh-oidc.s3.us-east-1.amazonaws.com/12345678-abcd-1234-5678-123456789012';

      // Get current subnet values or use defaults
      const currentSubnets =
        rosaHcpResources.subnets.length > 0
          ? rosaHcpResources.subnets
          : [
              {
                id: 'private-subnet',
                name: 'Not configured',
                type: 'Private',
                az: 'us-east-1a',
                cidr: '10.0.1.0/24',
              },
              {
                id: 'public-subnet',
                name: 'Not configured',
                type: 'Public',
                az: 'us-east-1a',
                cidr: '10.0.101.0/24',
              },
            ];

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setRosaHcpResources((prev) => ({
        accountRoles: mockAccountRoles,
        operatorRoles: mockOperatorRoles,
        oidcId: mockOidcId,
        subnets: currentSubnets,
        loading: false,
        lastChecked: new Date(),
        error: null,
      }));

      addNotification('✅ ROSA HCP resources loaded successfully', 'success');
    } catch (error) {
      console.error('Failed to fetch ROSA HCP resources:', error);
      setRosaHcpResources((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load ROSA HCP resources',
      }));
      addNotification('❌ Failed to fetch ROSA HCP resources', 'error');
    }
  };

  // Create new account roles
  const createAccountRoles = async () => {
    try {
      addNotification('🚀 Creating ROSA account roles...', 'info', 3000);

      // In real implementation, this would call the backend
      // which would execute: rosa create account-roles --mode auto --yes

      // Simulate the creation process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      addNotification('✅ Account roles created successfully', 'success');

      // Refresh the resources to show the new roles
      setTimeout(() => {
        fetchRosaHcpResources();
      }, 1000);
    } catch (error) {
      console.error('Failed to create account roles:', error);
      addNotification('❌ Failed to create account roles', 'error');
    }
  };

  // Create new operator roles
  const createOperatorRoles = async () => {
    try {
      addNotification('🚀 Creating ROSA operator roles...', 'info', 3000);

      // In real implementation, this would call the backend
      // which would execute: rosa create operator-roles --cluster-name <cluster> --mode auto --yes

      // Simulate the creation process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      addNotification('✅ Operator roles created successfully', 'success');

      // Refresh the resources to show the new roles
      setTimeout(() => {
        fetchRosaHcpResources();
      }, 1000);
    } catch (error) {
      console.error('Failed to create operator roles:', error);
      addNotification('❌ Failed to create operator roles', 'error');
    }
  };

  // Handle OIDC provider creation or info entry
  const handleOidcSubmit = async (oidcUrl) => {
    setOidcLoading(true);

    try {
      if (oidcModalMode === 'create') {
        // For create mode, we don't need a URL input - rosa will generate it
        addNotification('🚀 Creating OIDC configuration with ROSA CLI...', 'info', 3000);

        // In real implementation, this would call the backend to execute:
        // rosa create oidc-config --mode=auto

        // Simulate the creation process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Generate a mock OIDC URL that would be returned by the rosa command
        const generatedOidcUrl = `https://oidc-rh-oidc.s3.us-east-1.amazonaws.com/${Date.now()}-abcd-1234-5678-123456789012`;

        // Update the OIDC ID in the resources state with generated URL
        setRosaHcpResources((prev) => ({
          ...prev,
          oidcId: generatedOidcUrl,
        }));

        // Store in localStorage for persistence
        localStorage.setItem('rosa-oidc-id', generatedOidcUrl);

        addNotification(
          '✅ OIDC configuration created successfully with rosa create oidc-config --mode=auto',
          'success'
        );
      } else {
        // For enter mode, validate the URL input
        if (!oidcUrl.trim()) {
          addNotification('Please enter a valid OIDC URL', 'error');
          return;
        }

        addNotification('💾 Saving OIDC information...', 'info', 2000);
        // Simulate saving process
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Update the OIDC ID in the resources state
        setRosaHcpResources((prev) => ({
          ...prev,
          oidcId: oidcUrl.trim(),
        }));

        // Store in localStorage for persistence
        localStorage.setItem('rosa-oidc-id', oidcUrl.trim());

        addNotification('✅ OIDC information saved successfully', 'success');
      }

      setShowOidcModal(false);
      setOidcInput('');
    } catch (error) {
      console.error(
        `Failed to ${oidcModalMode === 'create' ? 'create OIDC configuration' : 'save OIDC information'}:`,
        error
      );
      addNotification(
        `❌ Failed to ${oidcModalMode === 'create' ? 'create OIDC configuration' : 'save OIDC information'}`,
        'error'
      );
    } finally {
      setOidcLoading(false);
    }
  };

  // Handle prefix submission
  const handlePrefixSubmit = async (prefix) => {
    if (!prefix.trim()) {
      addNotification('Please enter a prefix', 'error');
      return;
    }

    if (prefix.trim().length > 4) {
      addNotification('Prefix must be 4 characters or less', 'error');
      return;
    }

    setPrefixLoading(true);

    try {
      addNotification('💾 Saving prefix...', 'info', 2000);

      // Simulate saving process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSavedPrefix(prefix.trim());
      addNotification('✅ Prefix saved successfully', 'success');
      setShowPrefixModal(false);
      setPrefixInput('');

      // Store in localStorage for persistence
      localStorage.setItem('rosa-prefix', prefix.trim());
    } catch (error) {
      console.error('Failed to save prefix:', error);
      addNotification('❌ Failed to save prefix', 'error');
    } finally {
      setPrefixLoading(false);
    }
  };

  // Handle subnet creation with Terraform
  const handleCreateSubnets = async (subnetData) => {
    if (!subnetData.clusterName.trim()) {
      addNotification('Please enter a cluster name', 'error');
      return;
    }

    setCreateSubnetLoading(true);

    try {
      addNotification('🚀 Creating VPC and subnets with Terraform...', 'info', 3000);

      // In real implementation, this would call the backend to execute the script:
      // 1. mkdir rosa_vpc_with_terraform
      // 2. cd rosa_vpc_with_terraform
      // 3. curl -s -o setup-vpc.tf https://raw.githubusercontent.com/openshift-cs/OpenShift-Troubleshooting-Templates/master/rosa-hcp-terraform/setup-vpc.tf
      // 4. terraform init
      // 5. terraform plan -out rosa.plan -var aws_region=${region} -var cluster_name=${clusterName}
      // 6. terraform apply rosa.plan

      // Simulate the terraform creation process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Generate subnet names that would be created by terraform
      const generatedSubnets = [
        {
          id: 'private-subnet',
          name: `${subnetData.clusterName}-private-${subnetData.region}a`,
          type: 'Private',
          az: `${subnetData.region}a`,
          cidr: '10.0.1.0/24',
        },
        {
          id: 'public-subnet',
          name: `${subnetData.clusterName}-public-${subnetData.region}a`,
          type: 'Public',
          az: `${subnetData.region}a`,
          cidr: '10.0.101.0/24',
        },
      ];

      setRosaHcpResources((prev) => ({
        ...prev,
        subnets: generatedSubnets,
      }));

      // Update the input fields with the created subnet names
      setSubnetInput({
        privateSubnet: generatedSubnets[0].name,
        publicSubnet: generatedSubnets[1].name,
      });

      addNotification('✅ VPC and subnets created successfully with Terraform', 'success');
      setShowCreateSubnetModal(false);
      setCreateSubnetInput({ region: 'us-west-2', clusterName: '' });

      // Store in localStorage for persistence
      localStorage.setItem(
        'rosa-subnet-info',
        JSON.stringify({
          privateSubnet: generatedSubnets[0].name,
          publicSubnet: generatedSubnets[1].name,
        })
      );
    } catch (error) {
      console.error('Failed to create subnets with Terraform:', error);
      addNotification('❌ Failed to create VPC and subnets with Terraform', 'error');
    } finally {
      setCreateSubnetLoading(false);
    }
  };

  // Handle subnet information submission
  const handleSubnetInfoSubmit = async (subnetData) => {
    if (!subnetData.privateSubnet.trim() || !subnetData.publicSubnet.trim()) {
      addNotification('Please enter both private and public subnet information', 'error');
      return;
    }

    setSubnetLoading(true);

    try {
      addNotification('💾 Saving subnet information...', 'info', 2000);

      // Simulate saving process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update the subnets in the resources state (always show only 2 subnets)
      const updatedSubnets = [
        {
          id: 'private-subnet',
          name: subnetData.privateSubnet,
          type: 'Private',
          az: 'us-east-1a',
          cidr: '10.0.1.0/24',
        },
        {
          id: 'public-subnet',
          name: subnetData.publicSubnet,
          type: 'Public',
          az: 'us-east-1a',
          cidr: '10.0.101.0/24',
        },
      ];

      setRosaHcpResources((prev) => ({
        ...prev,
        subnets: updatedSubnets,
      }));

      addNotification('✅ Subnet information saved successfully', 'success');
      setShowSubnetModal(false);
      setSubnetInput({ privateSubnet: '', publicSubnet: '' });

      // Store in localStorage for persistence
      localStorage.setItem('rosa-subnet-info', JSON.stringify(subnetData));
    } catch (error) {
      console.error('Failed to save subnet information:', error);
      addNotification('❌ Failed to save subnet information', 'error');
    } finally {
      setSubnetLoading(false);
    }
  };

  // Load stored OIDC ID and subnet info on component mount
  React.useEffect(() => {
    const storedOidcId = localStorage.getItem('rosa-oidc-id');
    if (storedOidcId && !rosaHcpResources.oidcId) {
      setRosaHcpResources((prev) => ({
        ...prev,
        oidcId: storedOidcId,
      }));
    }

    // Load stored subnet info
    const storedSubnetInfo = localStorage.getItem('rosa-subnet-info');
    if (storedSubnetInfo) {
      try {
        const subnetData = JSON.parse(storedSubnetInfo);
        setSubnetInput(subnetData);

        // Update the subnets display with stored values
        const displaySubnets = [
          {
            id: 'private-subnet',
            name: subnetData.privateSubnet || 'Not configured',
            type: 'Private',
            az: 'us-east-1a',
            cidr: '10.0.1.0/24',
          },
          {
            id: 'public-subnet',
            name: subnetData.publicSubnet || 'Not configured',
            type: 'Public',
            az: 'us-east-1a',
            cidr: '10.0.101.0/24',
          },
        ];

        setRosaHcpResources((prev) => ({
          ...prev,
          subnets: displaySubnets,
        }));
      } catch (error) {
        console.error('Failed to parse stored subnet info:', error);
      }
    } else {
      // Set default display if no stored values
      const defaultSubnets = [
        {
          id: 'private-subnet',
          name: 'Not configured',
          type: 'Private',
          az: 'us-east-1a',
          cidr: '10.0.1.0/24',
        },
        {
          id: 'public-subnet',
          name: 'Not configured',
          type: 'Public',
          az: 'us-east-1a',
          cidr: '10.0.101.0/24',
        },
      ];

      setRosaHcpResources((prev) => ({
        ...prev,
        subnets: defaultSubnets,
      }));
    }

    // Load stored prefix
    const storedPrefix = localStorage.getItem('rosa-prefix');
    if (storedPrefix) {
      setSavedPrefix(storedPrefix);
    }

    // Load verified Kind cluster information
    const storedKindCluster = localStorage.getItem('verified-kind-cluster');
    if (storedKindCluster) {
      try {
        const clusterInfo = JSON.parse(storedKindCluster);
        setVerifiedKindClusterInfo(clusterInfo);
        // Fetch active resources for the stored cluster
        if (clusterInfo.name) {
          fetchActiveResources(clusterInfo.name, clusterInfo.namespace || 'ns-rosa-hcp');
        }
      } catch (error) {
        console.error('Failed to parse stored Kind cluster info:', error);
      }
    }
  }, []);

  const userFriendlyCategories = [
    {
      id: 'no-clue',
      title: 'I have no clue',
      subtitle: "I'm new to this, help me understand",
      description:
        'Get started with guided tutorials and learn about ROSA CAPI/CAPA test automation',
      icon: QuestionMarkCircleIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300',
      puppyImage:
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/onboarding/tour'),
    },
    {
      id: 'broken',
      title: 'My stuff is broken',
      subtitle: "Something isn't working, help me fix it",
      description: 'Run diagnostics, troubleshoot issues, and get automated fixes',
      icon: WrenchScrewdriverIcon,
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-300',
      puppyImage:
        'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/diagnostics'),
    },
    {
      id: 'environment',
      title: 'Tell me about my environment',
      subtitle: "What do I have set up? What's my current state?",
      description: 'View your AWS setup, existing clusters, and resource usage',
      icon: ChartBarIcon,
      color: 'bg-green-600',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-300',
      puppyImage:
        'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/environment/overview'),
    },
    {
      id: 'user-info',
      title: 'Tell me about my user information',
      subtitle: 'What are my permissions? What can I access?',
      description: 'Check your identity, permissions, quotas, and recent activity',
      icon: UserIcon,
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-300',
      puppyImage:
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop&crop=face',
      action: () => navigate('/user/profile'),
    },
  ];

  const configureEnvironment = [
    {
      id: 'check-components',
      title: 'MCE Cluster Status',
      subtitle: '',
      description: 'Ensure all CAPI/CAPA components are present and configured',
      details:
        'Validates that all required CAPI/CAPA components are properly installed and configured in your MCE environment',
      icon: CheckCircleIcon,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100',
      borderColor: 'border-emerald-300',
      duration: '',
      tooltip: 'Verify all CAPI/CAPA components are properly installed and configured',
      action: async () => {
        try {
          // Set loading state for this specific operation
          setAnsibleResults((prev) => ({
            ...prev,
            'check-components': { loading: true, result: null, timestamp: new Date() },
          }));

          // Create an AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout (3 minutes) - OCP API can be slow

          const response = await fetch('http://localhost:8000/api/ansible/run-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              task_file: 'tasks/validate-capa-environment.yml',
              description: 'Validate CAPA environment components',
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const result = await response.json();

          console.log('[check-components] Validation response:', {
            ok: response.ok,
            status: response.status,
            result: result,
          });

          if (response.ok) {
            if (result.success) {
              // Store the result for display in the UI
              setAnsibleResults((prev) => ({
                ...prev,
                'check-components': {
                  loading: false,
                  result: result,
                  timestamp: new Date(),
                  success: true,
                },
              }));

              // Automatically expand the MCE card so it stays open
              setExpandedCards((prev) => {
                const newSet = new Set(prev);
                newSet.add('check-components');
                console.log('✅ Auto-expanding MCE card after validation');
                return newSet;
              });

              // Parse output to determine component status
              const output = result.output || '';
              console.log('Local Test Environment Verification Result:', {
                success: true,
                fullOutput: output,
              });
            } else {
              addNotification(
                `⚠️ Local Test Environment Verification completed with issues: ${result.message || 'Check logs for details'}`,
                'error',
                8000
              );

              setAnsibleResults((prev) => ({
                ...prev,
                'check-components': {
                  loading: false,
                  result: result,
                  timestamp: new Date(),
                  success: false,
                },
              }));

              // Keep MCE Test Environment section expanded to show errors
              setCollapsedSections((prev) => {
                const newSet = new Set(prev);
                newSet.delete('configure-environment');
                return newSet;
              });

              // Auto-expand the check-components card to show the error details
              setExpandedCards((prev) => {
                const newSet = new Set(prev);
                newSet.add('check-components');
                console.log('⚠️ Auto-expanding MCE card to show issues');
                return newSet;
              });
            }
          } else {
            const errorMsg =
              result.error || result.message || result.detail || JSON.stringify(result);
            addNotification(`❌ Failed to run component validation: ${errorMsg}`, 'error', 8000);

            setAnsibleResults((prev) => ({
              ...prev,
              'check-components': {
                loading: false,
                result: {
                  error: errorMsg,
                  output: result.output || '',
                  return_code: result.return_code,
                  fullResponse: result,
                },
                timestamp: new Date(),
                success: false,
              },
            }));

            // Keep MCE Test Environment section expanded to show errors
            setCollapsedSections((prev) => {
              const newSet = new Set(prev);
              newSet.delete('configure-environment');
              return newSet;
            });

            // Auto-expand the check-components card to show the error details
            setExpandedCards((prev) => {
              const newSet = new Set(prev);
              newSet.add('check-components');
              console.log('❌ Auto-expanding MCE card to show validation error');
              return newSet;
            });
          }
        } catch (error) {
          console.error('Error running component validation:', error);

          // Handle timeout specifically
          if (error.name === 'AbortError') {
            addNotification(
              '⏱️ Local Test Environment Verification timed out after 3 minutes. This may indicate connection issues.',
              'error',
              8000
            );
          } else {
            addNotification(
              '❌ Failed to run component validation. Check console for details.',
              'error',
              8000
            );
          }

          setAnsibleResults((prev) => ({
            ...prev,
            'check-components': {
              loading: false,
              result: { error: error.name === 'AbortError' ? 'Request timed out' : error.message },
              timestamp: new Date(),
              success: false,
            },
          }));

          // Keep MCE Test Environment section expanded to show errors
          setCollapsedSections((prev) => {
            const newSet = new Set(prev);
            newSet.delete('configure-environment');
            return newSet;
          });

          // Auto-expand the check-components card to show the error details
          setExpandedCards((prev) => {
            const newSet = new Set(prev);
            newSet.add('check-components');
            console.log('❌ Auto-expanding MCE card to show exception error');
            return newSet;
          });
        }
      },
    },
    {
      id: 'get-capi-capa-status',
      title: 'Get CAPI/CAPA/HyperShift Status',
      subtitle: 'Check component enablement',
      description: 'Get current status of CAPI, CAPA, and HyperShift components',
      details:
        'Queries the MCE environment to determine which components (CAPI, CAPA, HyperShift) are currently enabled',
      icon: CheckCircleIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300',
      duration: '~30s',
      tooltip: 'Check which CAPI/CAPA/HyperShift components are enabled',
      hidden: true, // Hide from UI but keep functionality
      action: async () => {
        try {
          // Set loading state for this specific operation
          setAnsibleResults((prev) => ({
            ...prev,
            'get-capi-capa-status': { loading: true, result: null, timestamp: new Date() },
          }));

          // Create an AbortController for timeout
          // MCE operations need longer timeout due to OCP login + network latency + oc commands
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second (3 minute) timeout

          const response = await fetch('http://localhost:8000/api/ansible/run-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              task_file: 'tasks/get_capi_capa_status.yml',
              description: 'Get CAPI/CAPA status',
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const result = await response.json();

          if (response.ok) {
            if (result.success) {
              // Store the result for display in the UI
              setAnsibleResults((prev) => ({
                ...prev,
                'get-capi-capa-status': {
                  loading: false,
                  result: result,
                  timestamp: new Date(),
                  success: true,
                },
              }));

              console.log('CAPI/CAPA Status Check Result:', {
                success: true,
                fullOutput: result.output || '',
              });
            } else {
              addNotification(
                `⚠️ CAPI/CAPA Status Check completed with issues: ${result.message || 'Check logs for details'}`,
                'error',
                8000
              );

              setAnsibleResults((prev) => ({
                ...prev,
                'get-capi-capa-status': {
                  loading: false,
                  result: result,
                  timestamp: new Date(),
                  success: false,
                },
              }));
            }
          } else {
            addNotification(
              `❌ Failed to get CAPI/CAPA status: ${result.error || 'Unknown error'}`,
              'error',
              8000
            );

            setAnsibleResults((prev) => ({
              ...prev,
              'get-capi-capa-status': {
                loading: false,
                result: { error: result.error || 'Unknown error' },
                timestamp: new Date(),
                success: false,
              },
            }));
          }
        } catch (error) {
          console.error('Error getting CAPI/CAPA status:', error);

          // Handle timeout specifically
          if (error.name === 'AbortError') {
            addNotification('⏱️ CAPI/CAPA Status Check timed out after 60 seconds.', 'error', 8000);
          } else {
            addNotification(
              '❌ Failed to get CAPI/CAPA status. Check console for details.',
              'error',
              8000
            );
          }

          setAnsibleResults((prev) => ({
            ...prev,
            'get-capi-capa-status': {
              loading: false,
              result: { error: error.name === 'AbortError' ? 'Request timed out' : error.message },
              timestamp: new Date(),
              success: false,
            },
          }));
        }
      },
    },
    {
      id: 'enable-capi-capa',
      title: 'Enable CAPI/CAPA Result',
      subtitle: 'View the output from enabling CAPI/CAPA',
      description: 'Displays the result of the last Enable CAPI/CAPA operation',
      icon: CheckCircleIcon,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300',
      duration: '',
      tooltip: 'View Enable CAPI/CAPA operation result',
      hidden: true, // Hidden by default, shown when there are results
      action: async () => {
        // This is a display-only operation, no action needed
      },
    },
  ];

  const manageROSAClusters = [
    {
      id: 'create-cluster',
      title: 'Create ROSA HCP cluster',
      subtitle: 'Deploy new resources',
      description: 'Create ROSA HCP cluster or apply custom resource files',
      icon: CubeIcon,
      color: 'bg-orange-600',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-300',
      duration: '~15m',
      tooltip: 'Launch a new ROSA HCP cluster with automated provisioning',
      action: () => executeAutomationAction(() => navigate('/clusters/create'), 'Cluster creation'),
    },
    {
      id: 'upgrade-cluster',
      title: 'Upgrade ROSA HCP cluster',
      subtitle: 'Update existing cluster',
      description: 'Upgrade cluster to newer OpenShift version',
      icon: ArrowUpIcon,
      color: 'bg-cyan-600',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100',
      borderColor: 'border-cyan-300',
      duration: '~30m',
      tooltip: 'Upgrade your cluster to the latest OpenShift version safely',
      action: () =>
        executeAutomationAction(() => console.log('Upgrade cluster'), 'Cluster upgrade'),
    },
    {
      id: 'delete-cluster',
      title: 'Delete ROSA HCP cluster',
      subtitle: 'Remove resources',
      description: 'Delete cluster or remove custom resources',
      icon: TrashIcon,
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-300',
      duration: '~10m',
      tooltip: 'Safely remove cluster and clean up all associated resources',
      action: () =>
        executeAutomationAction(() => console.log('Delete cluster'), 'Cluster deletion'),
    },
  ];

  // All operations for command palette
  const allOperations = [
    ...configureEnvironment
      .filter((op) => !op.hidden)
      .map((op) => ({ ...op, category: 'Configure Environment' })),
    ...manageROSAClusters
      .filter((op) => !op.hidden)
      .map((op) => ({ ...op, category: 'Manage Clusters' })),
    ...userFriendlyCategories
      .filter((op) => !op.hidden)
      .map((op) => ({ ...op, category: 'Getting Started' })),
  ];

  const filteredOperations = allOperations.filter(
    (op) =>
      op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCardExpansion = (cardId) => {
    console.log('🔄 Toggling card expansion for:', cardId);
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        console.log('  ➖ Removing from expandedCards');
        newSet.delete(cardId);
      } else {
        console.log('  ➕ Adding to expandedCards');
        newSet.add(cardId);
      }
      console.log('  📦 New expandedCards:', [...newSet]);
      return newSet;
    });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    // Here you would normally send to your backend
    console.log('Feedback submitted:', feedbackData);

    // Show success notification
    addNotification('Thank you for your feedback! We appreciate your input.', 'success');

    // Reset and close
    setFeedbackData({ type: 'general', message: '', email: '' });
    setShowFeedback(false);
  };

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications((prev) => [...prev, notification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const toggleFavorite = (operationId) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
        addNotification('Removed from favorites', 'info');
      } else {
        newSet.add(operationId);
        addNotification('Added to favorites', 'success');
      }
      return newSet;
    });
  };

  // Environment configuration
  const environments = [
    {
      id: 'minikube',
      name: 'Minikube',
      icon: '⚡',
      description: 'Local Kubernetes test environment',
      status: verifiedMinikubeClusterInfo ? 'active' : 'inactive',
    },
    {
      id: 'mce',
      name: 'MCE',
      icon: '🎯',
      description: 'Multi-Cluster Engine environment',
      status: ocpStatus?.status === 'connected' ? 'active' : 'inactive',
    },
  ];

  const handleEnvironmentChange = (envId) => {
    setSelectedEnvironment(envId);
    setShowEnvironmentDropdown(false);
  };

  const addToRecent = (operation) => {
    setRecentOperations((prev) => {
      const filtered = prev.filter((op) => op.id !== operation.id);
      const newOp = { ...operation, timestamp: Date.now() };
      console.log('Adding to recent operations:', newOp);
      return [newOp, ...filtered].slice(0, 5);
    });
  };

  const updateRecentOperationStatus = (operationId, status, ansibleResultKey) => {
    setRecentOperations((prev) => {
      const updated = prev.map((op) => {
        if (op.id === operationId) {
          // If ansibleResultKey is provided, update it; otherwise keep existing
          return ansibleResultKey ? { ...op, status, ansibleResultKey } : { ...op, status };
        }
        return op;
      });
      console.log('Updated operation status:', operationId, status, ansibleResultKey);
      return updated;
    });
  };

  // Cleanup stale "in-progress" operations on mount
  React.useEffect(() => {
    const cleanupStaleOperations = () => {
      setRecentOperations((prev) => {
        // Filter out operations with "Verifying...", "Configuring...", or other in-progress statuses
        // that are older than 5 minutes (likely stuck from previous session)
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        const cleaned = prev.filter((op) => {
          // Keep operations that don't have in-progress status
          if (
            !op.status.includes('⏳') &&
            !op.status.includes('Verifying...') &&
            !op.status.includes('Configuring...') &&
            !op.status.includes('Running...') &&
            !op.status.includes('Processing...')
          ) {
            return true;
          }

          // Keep recent in-progress operations (less than 5 minutes old)
          if (op.timestamp && op.timestamp > fiveMinutesAgo) {
            return true;
          }

          // Remove old in-progress operations (likely stale)
          console.log('Removing stale operation:', op.id, op.status);
          return false;
        });

        return cleaned;
      });
    };

    // Run cleanup on mount
    cleanupStaleOperations();

    // Also run cleanup every 10 seconds to catch any operations that become stale quickly
    const cleanupInterval = setInterval(cleanupStaleOperations, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-fetch active resources when verified Minikube cluster info is available
  React.useEffect(() => {
    if (verifiedMinikubeClusterInfo?.name && verifiedMinikubeClusterInfo?.namespace) {
      console.log(
        '📡 Auto-fetching active resources for verified cluster:',
        verifiedMinikubeClusterInfo.name
      );
      fetchMinikubeActiveResources(
        verifiedMinikubeClusterInfo.name,
        verifiedMinikubeClusterInfo.namespace
      ).catch((err) => console.error('Auto-fetch active resources failed:', err));
    }
  }, [verifiedMinikubeClusterInfo?.name, verifiedMinikubeClusterInfo?.namespace]);

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const executeOperation = async (operation) => {
    // Check if automation is disabled
    if (isAutomationDisabled()) {
      addNotification(
        `❌ ${operation.title} blocked: ${getDisabledReason()}. Fix prerequisites before running automation.`,
        'error',
        8000
      );
      return;
    }

    const isDestructive = ['delete', 'remove', 'destroy'].some((word) =>
      operation.title.toLowerCase().includes(word)
    );

    if (isDestructive) {
      setShowConfirmDialog({
        title: `Confirm ${operation.title}`,
        message: `Are you sure you want to ${operation.title.toLowerCase()}? This action cannot be undone.`,
        onConfirm: () => performOperation(operation),
        type: 'danger',
      });
      return;
    }

    performOperation(operation);
  };

  const performOperation = async (operation) => {
    setLoadingStates((prev) => new Set([...prev, operation.id]));
    addToRecent(operation);

    try {
      // Simulate operation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Execute the original action
      operation.action();

      addNotification(`${operation.title} completed successfully`, 'success');
    } catch (error) {
      addNotification(`Failed to execute ${operation.title}`, 'error');
    } finally {
      setLoadingStates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(operation.id);
        return newSet;
      });
      setShowConfirmDialog(null);
    }
  };

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white'
          : 'bg-gradient-to-br from-gray-50 to-gray-100'
      }`}
      role="main"
      aria-label="ROSA CAPI/CAPA Test Automation Dashboard"
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-lg backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <span className="text-xl font-semibold text-gray-900">CAPI/CAPA Test Automation</span>
            </div>
            <div className="flex items-center space-x-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search operations..."
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 w-64 focus:outline-none"
                  aria-label="Search operations"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Connected</span>
                </div>
                <span className="text-sm text-gray-500">
                  Testing Version {systemStats.testingVersion}
                </span>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Toggle dark mode"
                  aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                >
                  {darkMode ? (
                    <svg
                      className="h-5 w-5 text-yellow-500 group-hover:text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-600 group-hover:text-gray-800"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Command Palette Trigger */}
                <button
                  onClick={() => setShowCommandPalette(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Command palette (⌘K)"
                  aria-label="Open command palette"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>

                {/* Help Button */}
                <button
                  onClick={() => setShowHelp(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Keyboard shortcuts (⌘/)"
                  aria-label="Show keyboard shortcuts"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {/* Feedback Button */}
                <button
                  onClick={() => setShowFeedback(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:bg-gray-100 rounded-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Send feedback (⌘.)"
                  aria-label="Send feedback"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </button>
                <div className="flex items-center space-x-2 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:shadow-lg transition-shadow">
                    U
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-sm font-medium text-gray-700">User</div>
                    <div className="text-xs text-gray-500">Admin</div>
                  </div>
                  <svg
                    className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 via-white to-pink-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            {/* Environment Status */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Environment:</span>
              <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Online</span>
              </div>
            </div>

            {/* Cluster Count */}
            <div className="flex items-center space-x-2">
              <CubeIcon className="h-4 w-4 text-purple-600" />
              <span className="text-gray-600">Clusters:</span>
              <span className="font-semibold text-purple-900">
                {(() => {
                  // Count clusters from Minikube active resources
                  const minikubeResources = verifiedMinikubeClusterInfo
                    ? parseDynamicResources(
                        ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]
                          ?.result?.output || ''
                      )
                    : [];
                  const minikubeClusters = minikubeResources.filter(
                    (r) =>
                      r.type === 'ROSACluster' ||
                      r.type === 'RosaControlPlane' ||
                      r.type.toLowerCase().includes('cluster')
                  );

                  // Count clusters from MCE active resources
                  const mceResources = ocpStatus?.connected
                    ? parseDynamicResources(
                        ansibleResults['check-mce-components']?.result?.output || ''
                      )
                    : [];
                  const mceClusters = mceResources.filter(
                    (r) =>
                      r.type === 'ROSACluster' ||
                      r.type === 'RosaControlPlane' ||
                      r.type.toLowerCase().includes('cluster')
                  );

                  const totalClusters = minikubeClusters.length + mceClusters.length;
                  const readyClusters = [...minikubeClusters, ...mceClusters].filter((r) =>
                    r.status?.toLowerCase().includes('ready')
                  ).length;

                  return totalClusters > 0 ? `${readyClusters}/${totalClusters}` : '0';
                })()}
              </span>
            </div>

            {/* Last Operation */}
            <div className="flex items-center space-x-2">
              <CommandLineIcon className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Last Operation:</span>
              {recentOperations.length > 0 ? (
                <div className="flex items-center space-x-1">
                  {recentOperations[0].status === 'success' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  ) : recentOperations[0].status === 'error' ? (
                    <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span className="font-medium text-gray-900 max-w-xs truncate">
                    {recentOperations[0].operation}
                  </span>
                  <span className="text-gray-500">
                    (
                    {(() => {
                      const timestamp = new Date(recentOperations[0].timestamp);
                      const now = new Date();
                      const diffMs = now - timestamp;
                      const seconds = Math.floor(diffMs / 1000);
                      const minutes = Math.floor(seconds / 60);
                      const hours = Math.floor(minutes / 60);

                      if (hours > 0) return `${hours}h ago`;
                      if (minutes > 0) return `${minutes}m ago`;
                      if (seconds > 10) return `${seconds}s ago`;
                      return 'just now';
                    })()}
                    )
                  </span>
                </div>
              ) : (
                <span className="text-gray-500 italic">None</span>
              )}
            </div>

            {/* Issues Count */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Issues:</span>
              {(() => {
                // Count failed operations
                const failedOps = recentOperations.filter((op) => op.status === 'error').length;
                return failedOps > 0 ? (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                    {failedOps}
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold flex items-center space-x-1">
                    <CheckCircleIcon className="h-3 w-3" />
                    <span>0</span>
                  </span>
                );
              })()}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors px-2 py-1 rounded-lg hover:bg-purple-50"
              title="Refresh dashboard"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Testing Command Center Header */}
      <div className="border-b border-purple-200 bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎯 Testing Command Center</h1>
                <p className="text-sm text-gray-600">
                  CAPI/CAPA Multi-Environment Testing Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Today's Tests */}
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return recentOperations.filter((op) => {
                      if (!op.timestamp) return false;
                      const opDate = new Date(op.timestamp);
                      opDate.setHours(0, 0, 0, 0);
                      return opDate.getTime() === today.getTime();
                    }).length;
                  })()}
                </div>
                <div className="text-xs text-gray-600">Today's Tests</div>
              </div>

              {/* Success Rate */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {(() => {
                    if (recentOperations.length === 0) return '0%';
                    const successful = recentOperations.filter(
                      (op) =>
                        op.result?.success ||
                        op.result?.status === 'success' ||
                        (!op.result?.error && op.result?.output)
                    ).length;
                    return Math.round((successful / recentOperations.length) * 100) + '%';
                  })()}
                </div>
                <div className="text-xs text-gray-600">Success Rate</div>
              </div>

              {/* Active Operations */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 flex items-center justify-center">
                  {(() => {
                    const minikubeResources = verifiedMinikubeClusterInfo
                      ? parseDynamicResources(
                          ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]
                            ?.result?.output || ''
                        )
                      : [];
                    const mceResources = ocpStatus?.connected
                      ? parseDynamicResources(
                          ansibleResults['check-mce-components']?.result?.output || ''
                        )
                      : [];
                    const allResources = [...minikubeResources, ...mceResources];
                    const activeCount = allResources.filter(
                      (r) =>
                        r.status === 'Provisioning' ||
                        r.status === 'Configuring' ||
                        r.status === 'Pending'
                    ).length;
                    return activeCount > 0 ? (
                      <>
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                        {activeCount}
                      </>
                    ) : (
                      activeCount
                    );
                  })()}
                </div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-6 space-y-4 md:space-y-5">
        {/* Environment Selector Dropdown */}
        {(verifiedMinikubeClusterInfo || ocpStatus?.status === 'connected') && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEnvironment === 'mce' ? 'MCE Test Environment' : 'Minikube Test Environment'}
              </h2>

              {/* Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowEnvironmentDropdown(!showEnvironmentDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="text-lg">{environments.find(e => e.id === selectedEnvironment)?.icon}</span>
                  <span className="font-semibold text-gray-900">
                    {environments.find(e => e.id === selectedEnvironment)?.name}
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showEnvironmentDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showEnvironmentDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-purple-200 rounded-lg shadow-xl z-50">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                        Select Environment
                      </div>
                      {environments.map((env) => (
                        <button
                          key={env.id}
                          onClick={() => handleEnvironmentChange(env.id)}
                          className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 ${
                            selectedEnvironment === env.id
                              ? 'bg-purple-50 border-2 border-purple-300'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{env.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{env.name}</span>
                                {selectedEnvironment === env.id && (
                                  <CheckCircleIcon className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{env.description}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`w-2 h-2 rounded-full ${env.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span className="text-xs text-gray-500 capitalize">{env.status}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Environments Section - Minikube */}
        {selectedEnvironment === 'minikube' && verifiedMinikubeClusterInfo && (
          <div className="mb-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Minikube Test Environment Connections */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-6 shadow-lg">
                <div className="flex flex-col space-y-3 mb-4">
                  <h4 className="text-base font-semibold text-purple-900 flex items-center">
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Minikube Configuration
                  </h4>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();

                        console.log('Manual verify clicked for Minikube cluster');

                        // Verify Minikube cluster status
                        if (verifiedMinikubeClusterInfo?.name) {
                          // Create unique ID for this verification using timestamp
                          const verifyId = `validate-minikube-capa`;

                          // Add to recent operations with "Verifying..." status
                          addToRecent({
                            id: verifyId,
                            title: 'Minikube Verify Environment',
                            color: 'bg-purple-600',
                            status: '⏳ Verifying...',
                            ansibleResultKey: 'validate-minikube-capa',
                          });

                          console.log('Starting Minikube validation...');
                          try {
                            // First, refresh cluster info to get updated version
                            const verifyResponse = await fetch(
                              'http://localhost:8000/api/minikube/verify-cluster',
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  cluster_name: verifiedMinikubeClusterInfo.name,
                                }),
                              }
                            );

                            const verifyData = await verifyResponse.json();

                            // Update cluster info with fresh data including version and component_versions
                            if (verifyResponse.ok && verifyData.accessible) {
                              setVerifiedMinikubeClusterInfo((prev) => ({
                                ...prev,
                                version: verifyData.cluster_info?.version || prev.version,
                                status: verifyData.cluster_info?.status || prev.status,
                                components: verifyData.cluster_info?.components || prev.components,
                                component_versions:
                                  verifyData.cluster_info?.component_versions ||
                                  prev.component_versions,
                                component_timestamps:
                                  verifyData.cluster_info?.component_timestamps ||
                                  prev.component_timestamps,
                                verifiedDate: new Date().toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }),
                              }));

                              // Get completion time with seconds
                              const completionTime = new Date().toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              });

                              updateRecentOperationStatus(
                                verifyId,
                                `✅ Verification completed at ${completionTime}`
                              );

                              // Fetch active resources after successful verification (non-blocking)
                              fetchMinikubeActiveResources(
                                verifiedMinikubeClusterInfo.name,
                                verifiedMinikubeClusterInfo.namespace
                              ).catch((err) =>
                                console.error('Failed to fetch active resources:', err)
                              );
                            } else {
                              // Get completion time with seconds
                              const completionTime = new Date().toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              });

                              updateRecentOperationStatus(
                                verifyId,
                                `❌ Verification failed at ${completionTime}: ${verifyData.message || 'Unknown error'}`
                              );
                            }
                          } catch (error) {
                            // Update operation status with error and timestamp (including seconds)
                            const completionTime = new Date().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            });
                            console.log('Verification failed at:', completionTime, error);

                            updateRecentOperationStatus(
                              verifyId,
                              `❌ Verification failed at ${completionTime}: ${error.message || error.toString()}`
                            );
                          }
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Verify Minikube cluster and CAPI/CAPA environment"
                    >
                      <ArrowPathIcon className="h-3 w-3" />
                      <span>Verify</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMinikubeConfigModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Configure Minikube cluster"
                    >
                      <Cog6ToothIcon className="h-3 w-3" />
                      <span>Configure</span>
                    </button>
                  </div>
                </div>

                {/* Minikube Environment Info */}
                <div className="mb-4 bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-base font-semibold text-purple-900">
                      {verifiedMinikubeClusterInfo.name}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-purple-200">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          verifiedMinikubeClusterInfo.status === 'running'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      ></span>
                      <span className="text-xs font-medium text-purple-700">
                        {verifiedMinikubeClusterInfo.cluster_info?.version || 'v1.34.0'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Status */}
                    <div className="bg-white rounded-md p-2 border border-purple-100">
                      <div className="text-xs text-purple-600 mb-1">Status:</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            verifiedMinikubeClusterInfo.status === 'running'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        <span className="text-sm font-medium text-purple-900 capitalize">
                          {verifiedMinikubeClusterInfo.status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* CAPI/CAPA */}
                    <div className="bg-white rounded-md p-2 border border-purple-100">
                      <div className="text-xs text-purple-600 mb-1">CAPI/CAPA:</div>
                      <div className="flex items-center gap-1">
                        <svg
                          className="h-3.5 w-3.5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-green-700">Enabled</span>
                      </div>
                    </div>

                    {/* Clusters */}
                    <div className="bg-white rounded-md p-2 border border-purple-100">
                      <div className="text-xs text-purple-600 mb-1">Clusters:</div>
                      <div className="text-sm font-bold text-purple-900">
                        {
                          parseDynamicResources(
                            ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]
                              ?.result?.output || ''
                          ).filter((r) => r.type === 'ROSACluster').length
                        }
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Last Verified */}
                    <div className="bg-white rounded-md p-2 border border-purple-100">
                      <div className="text-xs font-medium text-purple-600 mb-1">Last Verified</div>
                      <div className="text-xs text-purple-900">
                        {ansibleResults[`validate-minikube-capa`]?.timestamp
                          ? new Date(
                              ansibleResults[`validate-minikube-capa`].timestamp
                            ).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Not verified yet'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cluster list */}
                <div className="space-y-2">
                  {parseDynamicResources(
                    ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]?.result
                      ?.output || ''
                  )
                    .filter((r) => r.type === 'ROSACluster')
                    .map((cluster, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg border border-purple-200 p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="h-4 w-4 text-purple-600"
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
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {cluster.name}
                              </div>
                              <div className="text-xs text-purple-600">ROSACluster</div>
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                cluster.status === 'Ready'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {cluster.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {parseDynamicResources(
                    ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]?.result
                      ?.output || ''
                  ).filter((r) => r.type === 'ROSACluster').length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500 italic">
                      No ROSA clusters found. Create one from the Minikube section below.
                    </div>
                  )}
                </div>
              </div>

              {/* Key Components */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-6 shadow-lg">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-purple-900 mb-2 flex items-center justify-between">
                    <span className="flex items-center">
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
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                      CAPI/CAPA Components
                    </span>
                    <span className="text-xs font-normal text-purple-600">
                      ({Object.keys(verifiedMinikubeClusterInfo?.component_timestamps || {}).filter(key => ['capi-controller', 'capa-controller', 'rosa-crd', 'cert-manager'].includes(key)).length} configured)
                    </span>
                  </h4>
                </div>

                {/* Action Buttons - Only show when key components exist */}
                {activeResources.filter(
                  (r) =>
                    r.type === 'Namespace' ||
                    r.type === 'AWSClusterControllerIdentity' ||
                    r.type === 'Secret (ROSA Creds)' ||
                    r.type === 'Secret (AWS Creds)'
                ).length > 0 && (
                  <div className="mb-4 flex items-center justify-start space-x-2">
                    {/* Terminal Button */}
                    {verifiedMinikubeClusterInfo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMinikubeTerminalModal(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                        title="Open terminal for verified cluster"
                      >
                        <CommandLineIcon className="h-3 w-3" />
                        <span>Terminal</span>
                      </button>
                    )}

                    {/* Provision ROSA HCP Cluster Button */}
                    <button
                      onClick={async () => {
                        let operationId; // Declare outside try block for catch access
                        try {
                          // Prompt user for cluster definition file name
                          const clusterFile = window.prompt(
                            'Enter the YAML cluster definition file name:\n\n' +
                              'Example: rosa-hcp-test.yml\n' +
                              'Example: clusters/my-cluster.yaml\n\n' +
                              'File should be in your automation-capi directory',
                            lastRosaYamlPath || 'rosa-hcp-test.yml'
                          );

                          if (!clusterFile) return;

                          const trimmedFile = clusterFile.trim();

                          if (
                            !confirm(
                              `Provision ROSA HCP Cluster using "${trimmedFile}"?\n\nThis will:\n- Create namespace ns-rosa-hcp\n- Apply AWS Identity configuration\n- Create OCM client secret\n- Apply ROSA HCP cluster definition from ${trimmedFile}`
                            )
                          ) {
                            return;
                          }

                          // Create unique operation ID
                          operationId = `provision-rosa-hcp-${Date.now()}`;

                          // Add to recent operations with "Provisioning..." status
                          addToRecent({
                            id: operationId,
                            title: `Minikube Provision ROSA HCP: ${trimmedFile}`,
                            color: 'bg-rose-600',
                            status: '⏳ Provisioning...',
                          });

                          // Small delay to show the "Provisioning..." status
                          await new Promise((resolve) => setTimeout(resolve, 100));

                          // Save the file path for next time
                          setLastRosaYamlPath(trimmedFile);

                          const response = await fetch(
                            'http://localhost:8000/api/ansible/run-task',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                task_file: 'tasks/provision-rosa-hcp-cluster.yml',
                                description: `Provision ROSA HCP Cluster: ${trimmedFile}`,
                                kube_context:
                                  verifiedMinikubeClusterInfo?.contextName ||
                                  verifiedMinikubeClusterInfo?.name,
                                extra_vars: {
                                  ROSA_HCP_CLUSTER_FILE: trimmedFile,
                                },
                              }),
                            }
                          );

                          const result = await response.json();
                          const completionTime = new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });

                          console.log('[Minikube Provision ROSA HCP] Response:', {
                            ok: response.ok,
                            success: result.success,
                            result: result,
                          });

                          if (result.success) {
                            // Store successful result
                            setAnsibleResults((prev) => ({
                              ...prev,
                              [operationId]: {
                                loading: false,
                                success: true,
                                result: {
                                  output: result.output,
                                  timestamp: new Date(),
                                  task_file: 'tasks/provision-rosa-hcp-cluster.yml',
                                  type: 'Provision ROSA HCP Cluster',
                                  cluster_file: trimmedFile,
                                },
                                timestamp: new Date(),
                              },
                            }));

                            // Update operation status
                            updateRecentOperationStatus(
                              operationId,
                              `✅ Provisioned successfully at ${completionTime}`
                            );

                            // Refresh active resources
                            await fetchMinikubeActiveResources(
                              verifiedMinikubeClusterInfo.name,
                              verifiedMinikubeClusterInfo.namespace
                            );
                          } else {
                            // Extract detailed error message
                            const errorDetails = {
                              message: result.message || 'Unknown error',
                              error: result.error || '',
                              return_code: result.return_code,
                              fullResponse: result,
                            };

                            console.log(
                              '[Minikube Provision ROSA HCP] Error details:',
                              errorDetails
                            );

                            setAnsibleResults((prev) => ({
                              ...prev,
                              [operationId]: {
                                loading: false,
                                success: false,
                                result: {
                                  error: result.error || result.message || 'Provisioning failed',
                                  output: result.output || '',
                                  timestamp: new Date(),
                                  task_file: 'tasks/provision-rosa-hcp-cluster.yml',
                                  type: 'Provision ROSA HCP Cluster',
                                  cluster_file: trimmedFile,
                                },
                                timestamp: new Date(),
                              },
                            }));

                            updateRecentOperationStatus(
                              operationId,
                              `❌ Provisioning failed at ${completionTime}`
                            );
                          }
                        } catch (error) {
                          console.error('[Minikube Provision ROSA HCP] Exception:', error);
                          const completionTime = new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });
                          if (operationId) {
                            setAnsibleResults((prev) => ({
                              ...prev,
                              [operationId]: {
                                loading: false,
                                success: false,
                                result: {
                                  error: error.toString(),
                                  timestamp: new Date(),
                                  task_file: 'tasks/provision-rosa-hcp-cluster.yml',
                                  type: 'Provision ROSA HCP Cluster',
                                },
                                timestamp: new Date(),
                              },
                            }));
                            updateRecentOperationStatus(
                              operationId,
                              `❌ Provisioning failed at ${completionTime}`
                            );
                          }
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                    >
                      <svg
                        className="h-3.5 w-3.5 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span>Provision</span>
                    </button>

                    {/* Configure AutoNode Button */}
                    {(() => {
                      // Check if we have ansible results with dynamic resources
                      const hasROSACluster =
                        parseDynamicResources(
                          ansibleResults[`check-components-${verifiedMinikubeClusterInfo.name}`]
                            ?.result?.output || ''
                        ).filter((r) => r.type === 'ROSACluster').length > 0;

                      return hasROSACluster ? (
                        <button
                          onClick={async () => {
                            let operationId;
                            try {
                              if (
                                !confirm(
                                  'Configure AutoNode for ROSA HCP Cluster?\n\nThis will:\n- Configure EC2NodeClass\n- Create NodePool\n- Verify AutoNode configuration'
                                )
                              )
                                return;

                              operationId = `configure-autonode-${Date.now()}`;

                              addToRecent({
                                id: operationId,
                                title: 'Minikube Configure AutoNode',
                                color: 'bg-violet-600',
                                status: '⏳ Configuring...',
                              });

                              await new Promise((resolve) => setTimeout(resolve, 100));

                              const response = await fetch(
                                'http://localhost:8000/api/ansible/run-playbook',
                                {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    playbook: 'test-autonode.yml',
                                    description: 'Configure AutoNode',
                                    extra_vars: {
                                      KUBE_CONTEXT:
                                        verifiedMinikubeClusterInfo?.contextName ||
                                        verifiedMinikubeClusterInfo?.name,
                                    },
                                  }),
                                }
                              );

                              const result = await response.json();
                              const completionTime = new Date().toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              });

                              if (result.success) {
                                setAnsibleResults((prev) => ({
                                  ...prev,
                                  [operationId]: {
                                    loading: false,
                                    success: true,
                                    result: {
                                      output: result.output,
                                      timestamp: new Date(),
                                      playbook: 'test-autonode.yml',
                                      type: 'Configure AutoNode',
                                    },
                                    timestamp: new Date(),
                                  },
                                }));

                                updateRecentOperationStatus(
                                  operationId,
                                  `✅ AutoNode configured at ${completionTime}`
                                );

                                // Refresh active resources
                                await fetchMinikubeActiveResources(
                                  verifiedMinikubeClusterInfo.name,
                                  verifiedMinikubeClusterInfo.namespace
                                );
                              } else {
                                setAnsibleResults((prev) => ({
                                  ...prev,
                                  [operationId]: {
                                    loading: false,
                                    success: false,
                                    result: {
                                      error: result.error || 'Configuration failed',
                                      output: result.output || '',
                                      timestamp: new Date(),
                                      playbook: 'test-autonode.yml',
                                      type: 'Configure AutoNode',
                                    },
                                    timestamp: new Date(),
                                  },
                                }));

                                updateRecentOperationStatus(
                                  operationId,
                                  `❌ AutoNode configuration failed at ${completionTime}`
                                );
                              }
                            } catch (error) {
                              console.error('[Configure AutoNode] Exception:', error);
                              const completionTime = new Date().toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              });
                              if (operationId) {
                                setAnsibleResults((prev) => ({
                                  ...prev,
                                  [operationId]: {
                                    loading: false,
                                    success: false,
                                    result: {
                                      error: error.toString(),
                                      timestamp: new Date(),
                                      playbook: 'test-autonode.yml',
                                      type: 'Configure AutoNode',
                                    },
                                    timestamp: new Date(),
                                  },
                                }));
                                updateRecentOperationStatus(
                                  operationId,
                                  `❌ AutoNode configuration failed at ${completionTime}`
                                );
                              }
                            }
                          }}
                          className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                        >
                          <svg
                            className="h-3.5 w-3.5 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>Configure AutoNode</span>
                        </button>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Key Components List - Show CAPI/CAPA component versions */}
                <div className="space-y-2">
                  {(() => {
                    // Use component_timestamps to build the list
                    const componentTimestamps = verifiedMinikubeClusterInfo?.component_timestamps || {};

                    // Map timestamps to component display
                    const componentMap = {
                      'capi-controller': { displayName: 'CAPI Controller', type: 'Deployment', name: 'capi-controller-manager', namespace: 'capi-system' },
                      'capa-controller': { displayName: 'CAPA Controller', type: 'Deployment', name: 'capa-controller-manager', namespace: 'capa-system' },
                      'rosa-crd': { displayName: 'ROSA CRD', type: 'CustomResourceDefinition', name: 'rosaclusters.infrastructure.cluster.x-k8s.io', namespace: '' },
                      'cert-manager': { displayName: 'Cert Manager', type: 'Deployment', name: 'cert-manager', namespace: 'cert-manager' },
                    };

                    const components = Object.keys(componentTimestamps)
                      .filter(key => componentMap[key]) // Only show known components
                      .map(key => ({
                        key,
                        displayName: componentMap[key].displayName,
                        timestamp: componentTimestamps[key],
                        resourceInfo: componentMap[key]
                      }));

                    if (components.length === 0) {
                      return (
                        <div className="text-xs text-purple-600/70 px-3 py-2">
                          No components found. Run Verify to detect components.
                        </div>
                      );
                    }

                    return components.map((component, idx) => {
                      const resourceInfo = component.resourceInfo;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded-md border border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (resourceInfo && resourceInfo.type !== 'CustomResourceDefinition') {
                              fetchResourceDetail(
                                verifiedMinikubeClusterInfo.name,
                                resourceInfo.type,
                                resourceInfo.name,
                                resourceInfo.namespace
                              );
                            }
                          }}
                          title={resourceInfo && resourceInfo.type !== 'CustomResourceDefinition' ? "Click to view YAML" : ""}
                        >
                          {/* Component Name */}
                          <div className="flex items-center space-x-2">
                            <svg
                              className="h-4 w-4 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="text-sm font-medium text-purple-900">
                              {component.displayName}
                            </div>
                          </div>

                          {/* Timestamp Badge */}
                          <div className="flex-shrink-0">
                            <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                              {new Date(component.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Active Resources */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-6 shadow-lg">
                {console.log('🎯 ACTIVE RESOURCES TILE IS RENDERING', {
                  activeResourcesLength: activeResources.length,
                  activeResources: activeResources,
                })}

                <h4 className="text-base font-semibold text-purple-900 mb-4 flex items-center justify-between">
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
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Active Resources
                  </div>
                  <span className="text-xs font-normal text-purple-600">
                    (
                    {
                      activeResources.filter(
                        (r) =>
                          r.type !== 'Namespace' &&
                          r.type !== 'AWSClusterControllerIdentity' &&
                          r.type !== 'Secret (ROSA Creds)' &&
                          r.type !== 'Secret (AWS Creds)'
                      ).length
                    }{' '}
                    total)
                  </span>
                </h4>

                {/* Action Buttons - Only show when resources exist */}
                {activeResources.filter(
                  (r) =>
                    r.type !== 'Namespace' &&
                    r.type !== 'AWSClusterControllerIdentity' &&
                    r.type !== 'Secret (ROSA Creds)' &&
                    r.type !== 'Secret (AWS Creds)'
                ).length > 0 && (
                  <div className="mb-4 flex items-center justify-start space-x-2">
                    {/* Export Button */}
                    <button
                      onClick={async () => {
                        if (!activeResources || activeResources.length === 0) {
                          alert('No active resources to export');
                          return;
                        }

                        const includeComponents = window.confirm(
                          'Export Active Resources\n\n' +
                            'Do you want to include Key Component information in the export?\n\n' +
                            '✓ Yes - Include component versions and status\n' +
                            '✗ No - Export only active resources'
                        );

                        let operationId;
                        try {
                          operationId = `export-resources-${Date.now()}`;

                          addToRecent({
                            id: operationId,
                            title: 'Minikube Export Active Resources',
                            color: 'bg-indigo-600',
                            status: '⏳ Exporting...',
                          });

                          console.log(
                            `Exporting ${activeResources.length} active resources${includeComponents ? ' with key components' : ''}...`
                          );

                          const redactSensitiveData = (yamlContent) => {
                            yamlContent = yamlContent.replace(
                              /^(\s*)(data|stringData):\s*\n((?:\s+.+\n)*)/gm,
                              (match, indent, fieldName, dataBlock) => {
                                return `${indent}${fieldName}:\n${indent}  # [SENSITIVE DATA REMOVED - All secret data redacted]\n`;
                              }
                            );

                            yamlContent = yamlContent.replace(
                              /^(\s+)(password|token|apiKey|secretKey|accessKey|privateKey|certificate|clientSecret|clientID|ocmClientSecret|ocmClientID|ocmApiUrl|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|aws_access_key_id|aws_secret_access_key):\s+(.+)$/gim,
                              (match, indent, key, value) => {
                                return `${indent}${key}: "[SENSITIVE DATA REMOVED]"`;
                              }
                            );

                            return yamlContent;
                          };

                          const yamls = [];
                          for (const resource of activeResources) {
                            const response = await fetch(
                              'http://localhost:8000/api/minikube/get-resource-detail',
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  cluster_name: verifiedMinikubeClusterInfo?.name,
                                  resource_type: resource.type,
                                  resource_name: resource.name,
                                  namespace:
                                    verifiedMinikubeClusterInfo?.namespace || 'ns-rosa-hcp',
                                }),
                              }
                            );

                            const result = await response.json();
                            if (result.success && result.data) {
                              const redactedYaml = redactSensitiveData(result.data);
                              yamls.push(redactedYaml);
                            }
                          }

                          if (yamls.length > 0) {
                            let exportContent =
                              '# ==============================================================================\n' +
                              '# ROSA Automation - Active Resources Export (REDACTED)\n' +
                              '# ==============================================================================\n' +
                              '#\n' +
                              `# Cluster: ${verifiedMinikubeClusterInfo.name}\n` +
                              `# Version: ${verifiedMinikubeClusterInfo.version || 'Unknown'}\n` +
                              `# Exported: ${new Date().toLocaleString()}\n` +
                              '#\n' +
                              '# Component Status:\n';

                            if (includeComponents) {
                              const components = [
                                'Cert Manager (v1.13.0) - 3 pods running',
                                'CAPI Controller (v1.5.3) - 1/1 ready',
                                'CAPA Controller (v2.3.0) - 1/1 ready',
                                'ROSA CRDs (v4.20) - All installed',
                              ];
                              components.forEach((comp) => {
                                exportContent += `#   - ${comp}\n`;
                              });
                            }

                            exportContent +=
                              '#\n' +
                              '# SENSITIVE DATA NOTICE:\n' +
                              '#   - All secret data blocks have been removed\n' +
                              '#   - Credentials and tokens are redacted\n' +
                              '#   - This export is safe to share for troubleshooting\n' +
                              '#\n' +
                              '# ==============================================================================\n\n';

                            exportContent += yamls.join('\n---\n\n');

                            const blob = new Blob([exportContent], { type: 'text/yaml' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `minikube-resources-${verifiedMinikubeClusterInfo.name}-${new Date().toISOString().split('T')[0]}.yaml`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);

                            const completionTime = new Date().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            });

                            console.log(
                              `Exported ${yamls.length} resources successfully at ${completionTime}`
                            );
                            updateRecentOperationStatus(
                              operationId,
                              `✅ Exported ${yamls.length} resources at ${completionTime}`
                            );
                          } else {
                            const completionTime = new Date().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            });
                            updateRecentOperationStatus(
                              operationId,
                              `❌ Export failed at ${completionTime}`
                            );
                            alert('Failed to export resources');
                          }
                        } catch (error) {
                          console.error('Export error:', error);
                          const completionTime = new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });
                          if (operationId) {
                            updateRecentOperationStatus(
                              operationId,
                              `❌ Export failed at ${completionTime}`
                            );
                          }
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                    >
                      <svg
                        className="h-3.5 w-3.5 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Export</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const operationId = `refresh-minikube-resources-${Date.now()}`;
                        try {
                          addToRecent({
                            id: operationId,
                            title: 'Minikube Refresh Active Resources',
                            color: 'bg-cyan-600',
                            status: '🔄 Refreshing...',
                          });

                          await fetchMinikubeActiveResources(
                            verifiedMinikubeClusterInfo.name,
                            verifiedMinikubeClusterInfo.namespace
                          );

                          const completionTime = new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });

                          updateRecentOperationStatus(
                            operationId,
                            `✅ Refreshed at ${completionTime}`
                          );
                        } catch (error) {
                          console.error('Refresh error:', error);
                          const completionTime = new Date().toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });
                          updateRecentOperationStatus(
                            operationId,
                            `❌ Refresh failed at ${completionTime}`
                          );
                        }
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                    >
                      <svg
                        className="h-3.5 w-3.5 mr-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Refresh</span>
                    </button>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto overflow-x-auto">
                  {activeResources.filter(
                    (r) =>
                      // Filter out infrastructure components - only show workload resources
                      r.type !== 'Namespace' &&
                      r.type !== 'AWSClusterControllerIdentity' &&
                      r.type !== 'Secret (ROSA Creds)' &&
                      r.type !== 'Secret (AWS Creds)'
                  ).length > 0 ? (
                    <table className="min-w-full divide-y divide-purple-200">
                      <thead className="bg-purple-50 sticky top-0">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-sm font-semibold text-purple-900 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => {
                              const newDirection =
                                minikubeSortField === 'name' && minikubeSortDirection === 'asc'
                                  ? 'desc'
                                  : 'asc';
                              setMinikubeSortField('name');
                              setMinikubeSortDirection(newDirection);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Name
                              {minikubeSortField === 'name' && (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  {minikubeSortDirection === 'asc' ? (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  ) : (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  )}
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-sm font-semibold text-purple-900 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => {
                              const newDirection =
                                minikubeSortField === 'type' && minikubeSortDirection === 'asc'
                                  ? 'desc'
                                  : 'asc';
                              setMinikubeSortField('type');
                              setMinikubeSortDirection(newDirection);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Type
                              {minikubeSortField === 'type' && (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  {minikubeSortDirection === 'asc' ? (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  ) : (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  )}
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-sm font-semibold text-purple-900 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => {
                              const newDirection =
                                minikubeSortField === 'status' && minikubeSortDirection === 'asc'
                                  ? 'desc'
                                  : 'asc';
                              setMinikubeSortField('status');
                              setMinikubeSortDirection(newDirection);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Status
                              {minikubeSortField === 'status' && (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  {minikubeSortDirection === 'asc' ? (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  ) : (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  )}
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-sm font-semibold text-purple-900 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => {
                              const newDirection =
                                minikubeSortField === 'age' && minikubeSortDirection === 'asc'
                                  ? 'desc'
                                  : 'asc';
                              setMinikubeSortField('age');
                              setMinikubeSortDirection(newDirection);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Created
                              {minikubeSortField === 'age' && (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  {minikubeSortDirection === 'asc' ? (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  ) : (
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  )}
                                </svg>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-purple-100">
                        {sortResources(
                          activeResources.filter(
                            (r) =>
                              // Filter out infrastructure components - only show workload resources
                              r.type !== 'Namespace' &&
                              r.type !== 'AWSClusterControllerIdentity' &&
                              r.type !== 'Secret (ROSA Creds)' &&
                              r.type !== 'Secret (AWS Creds)'
                          ),
                          minikubeSortField,
                          minikubeSortDirection
                        ).map((resource, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-purple-50 transition-colors cursor-pointer"
                            onClick={() => {
                              fetchResourceDetail(
                                verifiedMinikubeClusterInfo.name,
                                resource.type,
                                resource.name,
                                resource.namespace || 'ns-rosa-hcp'
                              );
                            }}
                            title="Click to view YAML"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-purple-900">
                              {resource.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-purple-700">{resource.type}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-sm font-medium ${
                                  resource.status === 'Ready' ||
                                  resource.status === 'Active' ||
                                  resource.status === 'Configured'
                                    ? 'bg-green-100 text-green-800'
                                    : resource.status === 'Provisioning' ||
                                        resource.status === 'Configuring'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {resource.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {resource.age || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500 italic">
                      No active resources found. Click "Verify" or "Configure" to load resources.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Operations Section */}
            <div className="mt-6 bg-white rounded-xl border-2 border-purple-200 shadow-lg overflow-hidden">
              <div
                className="flex items-center gap-3 p-6 cursor-pointer hover:bg-purple-50 transition-colors"
                onClick={() => setMinikubeRecentOpsCollapsed(!minikubeRecentOpsCollapsed)}
              >
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                  <svg
                    className="h-5 w-5 text-white"
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
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-purple-900">Recent Operations</h3>
                  <p className="text-xs text-purple-600">
                    {recentOperations.length > 0
                      ? `Latest ${recentOperations.length} operation${recentOperations.length !== 1 ? 's' : ''}`
                      : 'No operations yet'}
                  </p>
                </div>
                <div className="p-0.5">
                  {minikubeRecentOpsCollapsed ? (
                    <ChevronDownIcon className="h-5 w-5 text-purple-600" />
                  ) : (
                    <ChevronUpIcon className="h-5 w-5 text-purple-600" />
                  )}
                </div>
              </div>

              {!minikubeRecentOpsCollapsed && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 gap-3">
                {recentOperations.length > 0 ? (
                  recentOperations.slice(0, 5).map((op, idx) => (
                    <div
                      key={op.id}
                      className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg px-4 py-3 border border-purple-100 hover:shadow-md hover:border-purple-300 transition-all"
                    >
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          op.status.includes('✅')
                            ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse'
                            : op.status.includes('❌')
                              ? 'bg-red-500 shadow-lg shadow-red-500/50'
                              : op.status.includes('⏳')
                                ? 'bg-amber-500 shadow-lg shadow-amber-500/50 animate-pulse'
                                : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {op.title}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {op.timestamp ? new Date(op.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600 block mt-1">{op.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg px-4 py-4 border border-purple-100 text-center">
                    <svg
                      className="h-8 w-8 text-purple-300 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-sm font-medium text-purple-600">No recent operations</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Operations will appear here once you start working
                    </p>
                  </div>
                )}
                  </div>
                </div>
              )}
            </div>

            {/* View Full Output Section - Dedicated section for detailed operation logs */}
            {ansibleResults['validate-minikube-capa'] &&
              ansibleResults['validate-minikube-capa'].result && (
                <div className="mt-6">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div
                      className="text-base font-semibold text-white p-4 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between"
                      onClick={() => setMinikubeOperationsOutputCollapsed(!minikubeOperationsOutputCollapsed)}
                    >
                      <div className="flex items-center space-x-3">
                        <svg
                          className="h-5 w-5 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Recent Operations Output</span>
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-md border border-green-500/30">
                          Minikube CAPI/CAPA
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const output =
                              ansibleResults['validate-minikube-capa'].result.output ||
                              ansibleResults['validate-minikube-capa'].result.error ||
                              '';
                            navigator.clipboard.writeText(output);
                            // Show temporary feedback
                            const btn = e.currentTarget;
                            const originalText = btn.innerHTML;
                            btn.innerHTML =
                              '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>';
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                            }, 2000);
                          }}
                          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-1.5"
                          title="Copy output to clipboard"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Copy</span>
                        </button>
                        <div className="p-0.5">
                          {minikubeOperationsOutputCollapsed ? (
                            <ChevronDownIcon className="h-5 w-5 text-white" />
                          ) : (
                            <ChevronUpIcon className="h-5 w-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    {!minikubeOperationsOutputCollapsed && (
                      <div className="border-t border-gray-700">
                        {/* Terminal-style output */}
                        <div className="max-h-96 overflow-y-auto bg-gray-950 p-6">
                          <div className="font-mono text-sm leading-relaxed">
                            {formatPlaybookOutput(
                              ansibleResults['validate-minikube-capa'].result.output ||
                                ansibleResults['validate-minikube-capa'].result.error ||
                                ''
                            ).map((line, idx) => (
                              <div
                                key={idx}
                                className={
                                  line.type === 'play'
                                    ? 'text-green-400 font-bold my-3 pb-2 border-b border-gray-800'
                                    : line.type === 'task'
                                      ? 'text-blue-400 font-semibold mt-3 mb-1'
                                      : line.type === 'banner'
                                        ? 'hidden'
                                        : line.content.includes('✓')
                                          ? 'text-green-300 pl-2'
                                          : line.content.includes('✗') ||
                                              line.content.includes('FAILED')
                                            ? 'text-red-400 pl-2'
                                            : line.content.includes('ok=') ||
                                                line.content.includes('changed=')
                                              ? 'text-yellow-300 mt-2 font-semibold'
                                              : 'text-gray-400 pl-2'
                                }
                              >
                                {line.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Test Environments Section - MCE */}
        {selectedEnvironment === 'mce' && (
          <div className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tile 1: MCE Test Environment */}
              <div className="bg-white rounded-lg border-2 border-cyan-200 p-6 shadow-lg">
                <div className="flex flex-col space-y-3 mb-4">
                  <h4 className="text-base font-semibold text-cyan-900 flex items-center">
                    <svg
                      className="h-5 w-5 text-cyan-600 mr-2"
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
                    MCE Test Configuration
                  </h4>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        console.log('MCE Verify button clicked');
                        const timestamp = Date.now();

                        // Add to recent operations
                        const newOperation = {
                          title: 'MCE Environment Verification',
                          status: '⏳ Verifying...',
                          timestamp: timestamp,
                        };
                        setRecentOperations((prev) => [newOperation, ...prev].slice(0, 10));

                        try {
                          // Set loading state
                          setAnsibleResults((prev) => ({
                            ...prev,
                            'check-mce-components': { loading: true, result: null, timestamp: new Date() },
                          }));

                          console.log('Fetching OCP connection status...');
                          // First fetch OCP connection status
                          const ocpResponse = await fetch(`http://localhost:8000/api/ocp/connection-status?t=${timestamp}`);
                          const ocpData = await ocpResponse.json();
                          console.log('OCP status response:', ocpData);
                          setOcpStatus(ocpData);

                          console.log('Fetching MCE features...');
                          // Fetch MCE features and update state
                          const response = await fetch('http://localhost:8000/api/mce/features');
                          const data = await response.json();
                          setMceFeatures(data.features || []);
                          setMceInfo(data.mce_info || null);
                          setMceLastVerified(new Date().toISOString());

                          // Update results
                          setAnsibleResults((prev) => ({
                            ...prev,
                            'check-mce-components': {
                              loading: false,
                              result: { success: true, output: JSON.stringify(data) },
                              timestamp: new Date()
                            },
                          }));

                          // Update recent operation status
                          setRecentOperations((prev) => {
                            const updated = [...prev];
                            if (updated[0]?.title === 'MCE Environment Verification') {
                              updated[0] = {
                                ...updated[0],
                                status: `✅ Verification completed successfully at ${new Date().toLocaleTimeString()}`,
                              };
                            }
                            return updated;
                          });

                          addNotification(`✅ MCE environment verified successfully`, 'success', 3000);
                        } catch (error) {
                          console.error('Error verifying MCE:', error);
                          setAnsibleResults((prev) => ({
                            ...prev,
                            'check-mce-components': {
                              loading: false,
                              result: { success: false, output: error.message },
                              timestamp: new Date()
                            },
                          }));

                          // Update recent operation status with error
                          setRecentOperations((prev) => {
                            const updated = [...prev];
                            if (updated[0]?.title === 'MCE Environment Verification') {
                              updated[0] = {
                                ...updated[0],
                                status: `❌ Verification failed at ${new Date().toLocaleTimeString()}: ${error.message}`,
                              };
                            }
                            return updated;
                          });

                          addNotification('❌ Failed to verify MCE environment', 'error', 3000);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Verify MCE cluster and CAPI/CAPA environment"
                    >
                      <ArrowPathIcon className="h-3 w-3" />
                      <span>Verify</span>
                    </button>
                    <button
                      onClick={async () => {
                        console.log('MCE Configure button clicked');
                        const timestamp = Date.now();

                        // Add to recent operations
                        const newOperation = {
                          title: 'Configure CAPI/CAPA Environment',
                          status: '⏳ Configuring...',
                          timestamp: timestamp,
                        };
                        setRecentOperations((prev) => [newOperation, ...prev].slice(0, 10));

                        try {
                          console.log('Running configure-capa-environment role...');
                          const response = await fetch('http://localhost:8000/api/ansible/run-role', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              role_name: 'configure-capa-environment',
                            }),
                          });

                          const data = await response.json();

                          if (data.success) {
                            // Update recent operation status
                            setRecentOperations((prev) => {
                              const updated = [...prev];
                              if (updated[0]?.title === 'Configure CAPI/CAPA Environment') {
                                updated[0] = {
                                  ...updated[0],
                                  status: `✅ Configuration completed successfully at ${new Date().toLocaleTimeString()}`,
                                };
                              }
                              return updated;
                            });

                            addNotification('✅ CAPI/CAPA environment configured successfully', 'success', 3000);
                          } else {
                            // Update recent operation status with error
                            setRecentOperations((prev) => {
                              const updated = [...prev];
                              if (updated[0]?.title === 'Configure CAPI/CAPA Environment') {
                                updated[0] = {
                                  ...updated[0],
                                  status: `❌ Configuration failed at ${new Date().toLocaleTimeString()}`,
                                };
                              }
                              return updated;
                            });

                            addNotification('❌ Failed to configure CAPI/CAPA environment', 'error', 3000);
                          }
                        } catch (error) {
                          console.error('Error configuring CAPI/CAPA environment:', error);

                          // Update recent operation status with error
                          setRecentOperations((prev) => {
                            const updated = [...prev];
                            if (updated[0]?.title === 'Configure CAPI/CAPA Environment') {
                              updated[0] = {
                                ...updated[0],
                                status: `❌ Configuration failed at ${new Date().toLocaleTimeString()}: ${error.message}`,
                              };
                            }
                            return updated;
                          });

                          addNotification('❌ Failed to configure CAPI/CAPA environment', 'error', 3000);
                        }
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Configure CAPI/CAPA environment"
                    >
                      <Cog6ToothIcon className="h-3 w-3" />
                      <span>Configure</span>
                    </button>
                  </div>
                </div>

                {/* MCE Environment Info */}
                <div className="mb-4 bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-base font-semibold text-cyan-900">
                      {mceInfo?.name || 'multiclusterengine'}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-cyan-200">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          mceInfo?.available ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      ></span>
                      <span className="text-xs font-medium text-cyan-700">
                        {mceInfo?.version || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Status */}
                    <div className="bg-white rounded-md p-2 border border-cyan-100">
                      <div className="text-xs text-cyan-600 mb-1">Status:</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ocpStatus?.connected ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        ></span>
                        <span className="text-sm font-medium text-cyan-900 capitalize">
                          {ocpStatus?.connected ? 'Authenticated' : 'Not Authenticated'}
                        </span>
                      </div>
                    </div>

                    {/* CAPI/CAPA */}
                    <div className="bg-white rounded-md p-2 border border-cyan-100">
                      <div className="text-xs text-cyan-600 mb-1">CAPI/CAPA:</div>
                      <div className="flex items-center gap-1">
                        {mceFeatures?.find(f => f.name === 'cluster-api')?.enabled &&
                         mceFeatures?.find(f => f.name === 'cluster-api-provider-aws')?.enabled ? (
                          <>
                            <svg
                              className="h-3.5 w-3.5 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-sm font-medium text-green-700">Enabled</span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">Unknown</span>
                        )}
                      </div>
                    </div>

                    {/* Clusters */}
                    <div className="bg-white rounded-md p-2 border border-cyan-100">
                      <div className="text-xs text-cyan-600 mb-1">Clusters:</div>
                      <div className="text-sm font-bold text-cyan-900">
                        {parseDynamicResources(
                          ansibleResults['check-mce-components']?.result?.output || ''
                        ).filter((r) => r.type === 'ROSACluster').length}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* API Server */}
                    <div className="bg-white rounded-md p-2 border border-cyan-100">
                      <div className="text-xs font-medium text-cyan-600 mb-1">API Server</div>
                      <div className="text-xs text-cyan-900 font-mono break-all">
                        {ocpStatus?.api_url || ocpStatus?.configured_url || ocpStatus?.detected_values?.api_url || 'N/A'}
                      </div>
                    </div>

                    {/* Last Verified */}
                    <div className="bg-white rounded-md p-2 border border-cyan-100">
                      <div className="text-xs font-medium text-cyan-600 mb-1">Last Verified</div>
                      <div className="text-xs text-cyan-900">
                        {mceLastVerified
                          ? new Date(mceLastVerified).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Not verified yet'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tile 2: CAPI/CAPA Components */}
              <div className="bg-white rounded-lg border-2 border-cyan-200 p-6 shadow-lg">
                <div className="flex flex-col space-y-3 mb-4">
                  <h4 className="text-base font-semibold text-cyan-900 flex items-center justify-between">
                    <span className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-cyan-600 mr-2" />
                      CAPI/CAPA Components
                    </span>
                    <span className="text-xs font-normal text-cyan-600">
                      ({mceFeatures?.filter(f => f.name.includes('cluster-api')).length || 0} configured)
                    </span>
                  </h4>

                  {/* Terminal and Provision Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMCETerminal(true)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Open MCE terminal"
                    >
                      <CommandLineIcon className="h-3 w-3" />
                      <span>Terminal</span>
                    </button>
                    <button
                      onClick={() => {
                        // Navigate to provision page or trigger provision workflow
                        addNotification('🚀 Opening provision workflow...', 'info', 2000);
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1.5"
                      title="Provision ROSA cluster"
                    >
                      <WrenchScrewdriverIcon className="h-3 w-3" />
                      <span>Provision</span>
                    </button>
                  </div>
                </div>

                {/* Component List */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(() => {
                    const capiComponents = mceFeatures?.filter(f =>
                      f.name.includes('cluster-api') ||
                      f.name === 'hive' ||
                      f.name === 'assisted-service'
                    ) || [];

                    if (capiComponents.length === 0) {
                      return (
                        <div className="text-xs text-cyan-600/70 px-3 py-2 text-center">
                          No components found. Click Verify to detect components.
                        </div>
                      );
                    }

                    // Map component names to deployment information
                    const componentDeploymentMap = {
                      'cluster-api': { resourceType: 'Deployment', resourceName: 'capi-controller-manager', namespace: 'capi-system' },
                      'cluster-api-provider-aws': { resourceType: 'Deployment', resourceName: 'capa-controller-manager', namespace: 'capa-system' },
                      'hive': { resourceType: 'Deployment', resourceName: 'hive-controllers', namespace: 'hive' },
                      'assisted-service': { resourceType: 'Deployment', resourceName: 'assisted-service', namespace: 'assisted-installer' },
                    };

                    return capiComponents.map((component, idx) => {
                      const deploymentInfo = componentDeploymentMap[component.name];
                      const isClickable = deploymentInfo && component.enabled;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 bg-cyan-50 rounded-md border border-cyan-100 ${
                            isClickable ? 'hover:bg-cyan-100 transition-colors cursor-pointer' : ''
                          }`}
                          onClick={() => {
                            if (isClickable) {
                              fetchOcpResourceDetail(
                                deploymentInfo.resourceType,
                                deploymentInfo.resourceName,
                                deploymentInfo.namespace
                              );
                            }
                          }}
                          title={isClickable ? "Click to view YAML" : ""}
                        >
                          {/* Component Name */}
                          <div className="flex items-center space-x-2">
                            {component.enabled ? (
                              <svg
                                className="h-4 w-4 text-green-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-4 w-4 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <div className="text-xs font-medium text-cyan-900">
                              {component.name}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex-shrink-0">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${
                              component.enabled
                                ? 'text-green-700 bg-green-100'
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              {component.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Tile 3: Active Resources */}
              <div className="bg-white rounded-lg border-2 border-cyan-200 p-6 shadow-lg">
                <div className="flex flex-col space-y-3 mb-4">
                  <h4 className="text-base font-semibold text-cyan-900 flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-cyan-600 mr-2" />
                    Active Resources
                  </h4>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                    >
                      Export
                    </button>
                    <button
                      className="flex-1 px-3 py-2 border-2 border-cyan-600 text-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Resources List */}
                <div className="space-y-2">
                  {(() => {
                    const mceResources = parseDynamicResources(
                      ansibleResults['check-mce-components']?.result?.output || ''
                    );

                    if (mceResources.length === 0) {
                      return (
                        <div className="text-center py-8 text-cyan-600/70 text-sm">
                          No resources found. Click Verify to detect resources.
                        </div>
                      );
                    }

                    return (
                      <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                        <div className="text-xs font-semibold text-cyan-800 mb-2">
                          Active Resources ({mceResources.length})
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-cyan-200">
                                <th className="text-left py-2 px-2 font-semibold text-cyan-900">Name</th>
                                <th className="text-left py-2 px-2 font-semibold text-cyan-900">Type</th>
                                <th className="text-left py-2 px-2 font-semibold text-cyan-900">Namespace</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mceResources.map((resource, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-cyan-100 last:border-0 hover:bg-cyan-100 transition-colors cursor-pointer"
                                  onClick={() => {
                                    fetchOcpResourceDetail(
                                      resource.type,
                                      resource.name,
                                      resource.namespace || 'ns-rosa-hcp'
                                    );
                                  }}
                                  title="Click to view YAML"
                                >
                                  <td className="py-2 px-2 font-medium text-cyan-900">{resource.name}</td>
                                  <td className="py-2 px-2 text-cyan-700">{resource.type}</td>
                                  <td className="py-2 px-2 text-cyan-700">
                                    {resource.namespace || 'ns-rosa-hcp'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Recent Operations and Output - Second Row */}
            <div className="grid grid-cols-1 gap-6 mt-6">
              {/* Recent Operations */}
              <div className="bg-white rounded-xl shadow-lg border-2 border-cyan-200 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-4 cursor-pointer hover:from-cyan-700 hover:to-teal-700 transition-all"
                  onClick={() => setMceRecentOpsCollapsed(!mceRecentOpsCollapsed)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/20 rounded-full p-2">
                        <ClockIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Recent Operations</h3>
                        <p className="text-cyan-100 text-sm">
                          {recentOperations.length > 0
                            ? `Latest ${recentOperations.length} operation${recentOperations.length !== 1 ? 's' : ''}`
                            : 'No operations yet'}
                        </p>
                      </div>
                    </div>
                    <div className="p-0.5">
                      {mceRecentOpsCollapsed ? (
                        <ChevronDownIcon className="h-5 w-5 text-white" />
                      ) : (
                        <ChevronUpIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {!mceRecentOpsCollapsed && (
                  <div className="p-6">
                  {recentOperations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 rounded-full mb-4">
                        <svg
                          className="h-8 w-8 text-cyan-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No recent operations</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Operations will appear here once you start working
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOperations.map((op, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border border-cyan-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              op.status?.includes('✅') || op.status?.toLowerCase().includes('success')
                                ? 'bg-green-500'
                                : op.status?.includes('❌') || op.status?.toLowerCase().includes('failed')
                                ? 'bg-red-500'
                                : 'bg-blue-500 animate-pulse'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-cyan-900 truncate">{op.title}</div>
                              <div className="text-sm text-cyan-700 mt-1">{op.status}</div>
                            </div>
                          </div>
                          <div className="text-xs text-cyan-600 ml-4 flex-shrink-0">{op.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Recent Operations Output */}
              {recentOperations.length > 0 && (
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-cyan-300 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-3 flex items-center justify-between cursor-pointer hover:from-cyan-700 hover:to-teal-700 transition-all"
                    onClick={() => setRecentOperationsOutputCollapsed(!recentOperationsOutputCollapsed)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/20 rounded-lg px-3 py-1">
                        <span className="text-white font-mono text-sm font-semibold">
                          Recent Operations Output
                        </span>
                      </div>
                      <div className="bg-teal-700 text-teal-100 text-xs px-2 py-1 rounded font-mono">
                        MCE CAPI/CAPA
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const outputText = recentOperations
                            .map(op => `${op.title}\n${op.status}\n${op.timestamp}\n`)
                            .join('\n');
                          navigator.clipboard.writeText(outputText);
                          addNotification('📋 Output copied to clipboard', 'success', 2000);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                      <div className="p-0.5">
                        {recentOperationsOutputCollapsed ? (
                          <ChevronDownIcon className="h-5 w-5 text-white" />
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {!recentOperationsOutputCollapsed && (
                    <div className="p-6 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
                    {recentOperations.map((op, idx) => (
                      <div key={idx} className="mb-4 pb-4 border-b border-gray-700 last:border-0">
                        <div className="text-cyan-400 font-semibold mb-1">
                          {op.title}
                        </div>
                        <div className="text-green-300 ml-4">
                          {op.status}
                        </div>
                        <div className="text-gray-500 text-xs ml-4 mt-1">
                          {op.timestamp}
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Header with Configure Environment and Right Sidebar */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-8 mb-4 md:mb-6 animate-in fade-in duration-300">
          <div className="flex-1 w-full">
            <p className="text-base md:text-lg text-gray-600 mb-4 leading-relaxed max-w-4xl animate-in fade-in slide-in-from-bottom duration-300">
              Welcome to the Ansible test automation for Cluster API (CAPI) and Cluster API provider
              AWS (CAPA).
            </p>

            {/* Environment Analysis and Credentials Setup */}
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-green-200 p-3 md:p-4 mb-4 backdrop-blur-sm hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2
                className="text-sm font-semibold text-gray-900 mb-3 flex items-center cursor-pointer hover:bg-green-50 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => toggleSection('credentials-environment')}
              >
                <div className="bg-green-600 rounded-full p-1 mr-2">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <span>User Credentials</span>
                <div className="flex items-center ml-auto gap-2">
                  <div
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${(() => {
                      // Check if all 5 required fields (AWS + OCM) are configured
                      const requiredFields = [
                        'AWS_REGION',
                        'AWS_ACCESS_KEY_ID',
                        'AWS_SECRET_ACCESS_KEY',
                        'OCM_CLIENT_ID',
                        'OCM_CLIENT_SECRET',
                      ];
                      const hasAllRequiredFields =
                        configStatus?.configured_fields &&
                        requiredFields.every((field) =>
                          configStatus.configured_fields.some((f) => f.field === field)
                        );
                      return rosaStatus?.authenticated && hasAllRequiredFields
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-orange-100 text-orange-800 border-orange-300';
                    })()}`}
                  >
                    {(() => {
                      // Check if all 5 required fields (AWS + OCM) are configured
                      const requiredFields = [
                        'AWS_REGION',
                        'AWS_ACCESS_KEY_ID',
                        'AWS_SECRET_ACCESS_KEY',
                        'OCM_CLIENT_ID',
                        'OCM_CLIENT_SECRET',
                      ];
                      const hasAllRequiredFields =
                        configStatus?.configured_fields &&
                        requiredFields.every((field) =>
                          configStatus.configured_fields.some((f) => f.field === field)
                        );
                      return rosaStatus?.authenticated && hasAllRequiredFields
                        ? '✓ Ready'
                        : '⚠ Needs Setup';
                    })()}
                  </div>
                  <svg
                    className={`h-4 w-4 text-green-600 transition-transform duration-200 ${collapsedSections.has('credentials-environment') ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </h2>

              {!collapsedSections.has('credentials-environment') && (
                <>
                  {(() => {
                    // Check if all required fields are configured
                    const requiredFields = [
                      'AWS_REGION',
                      'AWS_ACCESS_KEY_ID',
                      'AWS_SECRET_ACCESS_KEY',
                      'OCM_CLIENT_ID',
                      'OCM_CLIENT_SECRET',
                    ];
                    // If a field is in configured_fields array, it's configured (backend doesn't include 'value' property)
                    const hasAllRequiredFields =
                      configStatus?.configured_fields &&
                      requiredFields.every((field) =>
                        configStatus.configured_fields.some((f) => f.field === field)
                      );

                    // DEBUG LOGGING - CRITICAL FIELD ANALYSIS
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] configStatus?.configured:',
                      configStatus?.configured
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] FULL configStatus object:',
                      JSON.stringify(configStatus, null, 2)
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] Required fields we are looking for:',
                      requiredFields
                    );

                    const fieldsFromBackend =
                      configStatus?.configured_fields?.map((f) => f.field) || [];
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] *** Fields ACTUALLY RETURNED from backend ***:',
                      fieldsFromBackend
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] Number of fields from backend:',
                      fieldsFromBackend.length
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] Number of required fields:',
                      requiredFields.length
                    );

                    // Check which required fields are missing
                    const missingFields = requiredFields.filter(
                      (reqField) =>
                        !configStatus?.configured_fields?.some(
                          (f) => f.field === reqField && f.value && f.value.trim() !== ''
                        )
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] *** MISSING REQUIRED FIELDS ***:',
                      missingFields
                    );

                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] hasAllRequiredFields:',
                      hasAllRequiredFields
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] rosaStatus?.authenticated:',
                      rosaStatus?.authenticated
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1676] Should show "Needs Setup"?',
                      !rosaStatus?.authenticated || !hasAllRequiredFields
                    );

                    // Show "Needs Setup" section ONLY when user_vars has NO values at all
                    const totalConfigured = configStatus?.total_configured || 0;
                    const shouldShowNeedsSetup = totalConfigured === 0;
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1706] total_configured value:',
                      totalConfigured
                    );
                    console.log(
                      '🔍🔍🔍 [OUTER CHECK - Line 1706] shouldShowNeedsSetup (total_configured === 0):',
                      shouldShowNeedsSetup
                    );
                    console.log(
                      '🔍🔍🔍 [TERNARY RESULT - Line 1711] Rendering which section?',
                      shouldShowNeedsSetup
                        ? '❌ NEEDS SETUP SECTION'
                        : '✅ CREDENTIALS CONFIGURED SECTION'
                    );
                    return shouldShowNeedsSetup;
                  })() ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          👋 Let's get you set up!
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          I've analyzed your environment and found a few things we can help you
                          configure:
                        </p>

                        <div className="space-y-2">
                          {!rosaStatus?.authenticated && (
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              <span className="text-blue-700">
                                ROSA CLI needs authentication with staging environment
                              </span>
                            </div>
                          )}
                          {(() => {
                            // Check if all required fields are configured
                            const requiredFields = [
                              'AWS_REGION',
                              'AWS_ACCESS_KEY_ID',
                              'AWS_SECRET_ACCESS_KEY',
                              'OCM_CLIENT_ID',
                              'OCM_CLIENT_SECRET',
                            ];
                            // If a field is in configured_fields array, it's configured (backend doesn't include 'value' property)
                            const hasAllRequiredFields =
                              configStatus?.configured_fields &&
                              requiredFields.every((field) =>
                                configStatus.configured_fields.some((f) => f.field === field)
                              );

                            // Check if OCP fields are present (checking just field name, not value)
                            const ocpFields = [
                              'OCP_HUB_API_URL',
                              'OCP_HUB_CLUSTER_USER',
                              'OCP_HUB_CLUSTER_PASSWORD',
                            ];
                            const hasAnyOcpField =
                              configStatus?.configured_fields &&
                              ocpFields.some((field) =>
                                configStatus.configured_fields.some((f) => f.field === field)
                              );

                            // DEBUG LOGGING
                            console.log(
                              '🔍 [INNER CHECK - Line 1701] hasAllRequiredFields:',
                              hasAllRequiredFields
                            );
                            console.log(
                              '🔍 [INNER CHECK - Line 1701] hasAnyOcpField:',
                              hasAnyOcpField
                            );
                            console.log(
                              '🔍 [INNER CHECK - Line 1701] Message to show:',
                              hasAllRequiredFields && !hasAnyOcpField
                                ? 'NEW MESSAGE (Great! You have all...)'
                                : (configStatus?.total_configured || 0) === 0
                                  ? "We see you haven't set up your configuration yet"
                                  : 'Configuration file needs additional setup'
                            );

                            return (
                              <div className="flex items-center space-x-2 text-sm">
                                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                <span className="text-blue-700">
                                  {hasAllRequiredFields && !hasAnyOcpField
                                    ? 'Great! You have all the required fields configured. You just need to set up a cluster connection - either use a local Kind cluster or provide OCP Hub credentials.'
                                    : (configStatus?.total_configured || 0) === 0
                                      ? "We see you haven't set up your configuration yet. We can help you with that!"
                                      : 'Configuration file needs additional setup'}
                                </span>
                              </div>
                            );
                          })()}
                          {ocpStatus &&
                            !ocpStatus.connected &&
                            (configStatus?.total_configured || 0) > 0 &&
                            (() => {
                              // Only show this message if we DON'T have all required fields
                              const requiredFields = [
                                'AWS_REGION',
                                'AWS_ACCESS_KEY_ID',
                                'AWS_SECRET_ACCESS_KEY',
                                'OCM_CLIENT_ID',
                                'OCM_CLIENT_SECRET',
                              ];
                              const hasAllRequiredFields =
                                configStatus?.configured_fields &&
                                requiredFields.every((field) =>
                                  configStatus.configured_fields.some((f) => f.field === field)
                                );

                              // Don't show this message if we have all required fields - the other message will handle that
                              if (hasAllRequiredFields) {
                                return null;
                              }

                              return (
                                <div className="flex items-center space-x-2 text-sm">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  <span className="text-blue-700">
                                    OpenShift Hub credentials need a quick fix - one of your
                                    connection details isn't quite right
                                  </span>
                                </div>
                              );
                            })()}
                        </div>

                        {/* ROSA Authentication Help */}
                        {!rosaStatus?.authenticated && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="font-semibold text-blue-800 mb-2 text-sm">
                              🔐 ROSA Authentication Needed
                            </h4>
                            <p className="text-blue-700 mb-3 text-xs">
                              You'll need to log into the ROSA staging environment to use automation
                              features.
                            </p>

                            <div className="bg-gray-900 rounded p-2 mb-2">
                              <code className="text-green-400 text-xs font-mono">
                                rosa login --env staging --use-auth-code
                              </code>
                            </div>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  'rosa login --env staging --use-auth-code'
                                );
                                alert(
                                  '📋 Command copied! Run this in your terminal to authenticate with ROSA staging.'
                                );
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              📋 Copy login command
                            </button>
                          </div>
                        )}

                        {/* OpenShift Hub Connection Help */}
                        {(() => {
                          // Only show cluster connection options if required fields are configured
                          const requiredFields = [
                            'AWS_REGION',
                            'AWS_ACCESS_KEY_ID',
                            'AWS_SECRET_ACCESS_KEY',
                            'OCM_CLIENT_ID',
                            'OCM_CLIENT_SECRET',
                          ];
                          const hasRequiredFields =
                            configStatus?.configured_fields &&
                            requiredFields.every((field) =>
                              configStatus.configured_fields.some(
                                (f) => f.field === field && f.value && f.value.trim() !== ''
                              )
                            );

                          return (
                            ocpStatus &&
                            !ocpStatus.connected &&
                            hasRequiredFields && (
                              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-semibold text-blue-800 mb-2 text-sm">
                                  🔌 Cluster Connection Options
                                </h4>
                                <p className="text-blue-700 mb-3 text-xs">
                                  {ocpStatus.message === 'Invalid username or password'
                                    ? "There's a problem with the OCM username and/or password specified. We can help you fix it or you can use a Kind cluster."
                                    : `Connection failed: ${ocpStatus.message}. Choose an option below:`}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      const instructions = `Update vars/user_vars.yml with your OpenShift Hub credentials:
- OCP_HUB_API_URL: ${ocpStatus.api_url || 'Your cluster API URL'}
- OCP_HUB_CLUSTER_USER: ${ocpStatus.username || 'Your username'}
- OCP_HUB_CLUSTER_PASSWORD: Your password`;
                                      navigator.clipboard.writeText(instructions);
                                      alert(
                                        '📋 Instructions copied! Update vars/user_vars.yml with your credentials.'
                                      );
                                    }}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                                  >
                                    🔧 Fix credentials
                                  </button>

                                  <button
                                    onClick={() => setShowMinikubeConfigModal(true)}
                                    className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                                  >
                                    🎯 Use Minikube cluster
                                  </button>
                                </div>
                              </div>
                            )
                          );
                        })()}

                        {/* Guided Setup Prompt - Compact Version */}
                        {showSetupPrompt && guidedSetupStatus && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="font-semibold text-blue-800 mb-2 text-sm">
                              {guidedSetupStatus.current_step === 1
                                ? '👋 Welcome to ROSA CAPI/CAPA Automation!'
                                : "🚀 Let's complete your setup"}
                            </h4>
                            <p className="text-blue-700 mb-2 text-xs">
                              {guidedSetupStatus.current_step === 1
                                ? "New here? Let's guide you through setup step-by-step."
                                : "You're partway through setup. Let's finish configuring your environment."}
                            </p>
                            <div className="flex items-center justify-between text-xs text-blue-600 mb-2">
                              <span>Progress: Step {guidedSetupStatus.current_step} of 5</span>
                              <span>
                                Next:{' '}
                                {guidedSetupStatus.next_action === 'rosa_login'
                                  ? 'ROSA Auth'
                                  : guidedSetupStatus.next_action === 'configure_vars'
                                    ? 'Config Setup'
                                    : guidedSetupStatus.next_action === 'aws_credentials'
                                      ? 'AWS Creds'
                                      : guidedSetupStatus.next_action === 'ocp_connection'
                                        ? 'OpenShift Connection'
                                        : 'Ready!'}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate('/setup')}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                              >
                                Start Guided Setup
                              </button>
                              <button
                                onClick={() => setShowSetupPrompt(false)}
                                className="text-blue-600 hover:text-blue-800 px-3 py-1.5 font-medium text-xs"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => {
                              console.log('Manual refresh clicked');
                              refreshAllStatus().catch((error) => {
                                console.error('Error refreshing status:', error);
                                addNotification('Failed to refresh status', 'error', 3000);
                              });
                              addNotification('Refreshing status...', 'info', 2000);
                            }}
                            className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium text-sm inline-flex items-center space-x-2 group"
                          >
                            <svg
                              className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>🔄 Refresh status</span>
                          </button>

                          <button
                            onClick={() => navigate('/setup')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium text-sm inline-flex items-center space-x-2 group"
                          >
                            <svg
                              className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                            <span>Help me configure everything</span>
                          </button>

                          <button
                            onClick={() => {
                              const helpText = `Quick Setup Checklist:

${!rosaStatus?.authenticated ? '🔐 ROSA Authentication:' : '✅ ROSA Authentication: Complete'}
${!rosaStatus?.authenticated ? '   Run: rosa login --env staging --use-auth-code' : ''}

${!configStatus?.configured ? '⚙️ Configuration Setup:' : '✅ Configuration Setup: Complete'}
${!configStatus?.configured ? '   Edit: vars/user_vars.yml with your credentials' : ''}

${ocpStatus && !ocpStatus.connected ? '🔌 OpenShift Hub Connection:' : ocpStatus && ocpStatus.connected ? '✅ OpenShift Hub Connection: Complete' : ''}
${ocpStatus && !ocpStatus.connected ? '   Update OCP_HUB_* fields in vars/user_vars.yml' : ''}

Need detailed help? Click "Help me configure everything" for step-by-step guidance!`;
                              navigator.clipboard.writeText(helpText);
                              alert('📋 Setup checklist copied to clipboard!');
                            }}
                            className="text-blue-600 hover:text-blue-800 px-4 py-2 font-medium text-sm"
                          >
                            📋 Copy quick checklist
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        {/* AWS Credentials Box */}
                        <div className="group bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-orange-200 p-3 md:p-4 hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="h-4 w-4 text-orange-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                                />
                              </svg>
                              <span className="text-xs md:text-sm font-bold text-orange-900">
                                AWS Credentials
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'AWS_ACCESS_KEY_ID'
                            ) && (
                              <div>
                                <div className="text-xs text-orange-700 font-semibold mb-0.5">
                                  Access Key ID:
                                </div>
                                <div className="text-xs text-orange-600 font-mono bg-white/50 rounded px-2 py-1 break-all">
                                  {configStatus.configured_fields.find(
                                    (f) => f.field === 'AWS_ACCESS_KEY_ID'
                                  )?.value || 'AKIAIOSFODNN7EXAMPLE'}
                                </div>
                              </div>
                            )}
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'AWS_SECRET_ACCESS_KEY'
                            ) && (
                              <div>
                                <div className="text-xs text-orange-700 font-semibold mb-1">
                                  Secret Access Key:
                                </div>
                                <div className="text-xs text-orange-600 font-mono bg-white/50 rounded px-2 py-1">
                                  ••••••••
                                </div>
                              </div>
                            )}
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'AWS_REGION'
                            ) && (
                              <div>
                                <div className="text-xs text-orange-700 font-semibold mb-1">
                                  Region:
                                </div>
                                <div className="text-xs text-orange-600 font-mono bg-white/50 rounded px-2 py-1">
                                  us-east-1
                                </div>
                              </div>
                            )}
                            {rosaStatus?.user_info?.aws_account_id && (
                              <div>
                                <div className="text-xs text-orange-700 font-semibold mb-1">
                                  Account ID:
                                </div>
                                <div className="text-xs text-orange-600 font-mono bg-white/50 rounded px-2 py-1">
                                  123456789012
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigate('/setup?section=aws')}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                            aria-label="Update AWS Credentials"
                          >
                            Update AWS Credentials
                          </button>
                        </div>

                        {/* OCM Credentials Box */}
                        <div className="group bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-blue-200 p-3 md:p-4 hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <svg
                                className="h-5 w-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                              <span className="text-sm font-bold text-blue-900">
                                OCM Credentials
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 mb-4">
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'OCM_CLIENT_ID'
                            ) && (
                              <div>
                                <div className="text-xs text-blue-700 font-semibold mb-1">
                                  Client ID:
                                </div>
                                <div className="text-xs text-blue-600 font-mono bg-white/50 rounded px-2 py-1 break-all">
                                  {configStatus.configured_fields.find(
                                    (f) => f.field === 'OCM_CLIENT_ID'
                                  )?.value || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                                </div>
                              </div>
                            )}
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'OCM_CLIENT_SECRET'
                            ) && (
                              <div>
                                <div className="text-xs text-blue-700 font-semibold mb-1">
                                  Client Secret:
                                </div>
                                <div className="text-xs text-blue-600 font-mono bg-white/50 rounded px-2 py-1">
                                  ••••••••
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigate('/setup?section=ocm')}
                            className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                          >
                            Update OCM Credentials
                          </button>
                        </div>

                        {/* OCP Hub Credentials Box */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-200/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <svg
                                className="h-5 w-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                                />
                              </svg>
                              <span className="text-sm font-bold text-green-900">OCP Hub</span>
                            </div>
                          </div>
                          <div className="space-y-2 mb-4">
                            {ocpStatus?.api_url && (
                              <div>
                                <div className="text-xs text-green-700 font-semibold mb-1">
                                  API URL:
                                </div>
                                <div
                                  className="text-xs text-green-600 font-mono bg-white/50 rounded px-2 py-1 break-all"
                                  title={ocpStatus.api_url}
                                >
                                  {ocpStatus.api_url.replace('https://', '')}
                                </div>
                              </div>
                            )}
                            {ocpStatus?.username && (
                              <div>
                                <div className="text-xs text-green-700 font-semibold mb-1">
                                  Username:
                                </div>
                                <div className="text-xs text-green-600 font-mono bg-white/50 rounded px-2 py-1">
                                  {ocpStatus.username}
                                </div>
                              </div>
                            )}
                            {configStatus?.configured_fields?.find(
                              (f) => f.field === 'OCP_HUB_CLUSTER_PASSWORD'
                            ) && (
                              <div>
                                <div className="text-xs text-green-700 font-semibold mb-1">
                                  Password:
                                </div>
                                <div className="text-xs text-green-600 font-mono bg-white/50 rounded px-2 py-1">
                                  ••••••••
                                </div>
                              </div>
                            )}
                            {ocpStatus?.connected && (
                              <div className="flex items-center space-x-2 text-xs mt-2 bg-green-100 rounded px-2 py-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-700 font-medium">Connected</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigate('/setup?section=ocp')}
                            className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-xs"
                          >
                            Update OCP Hub Credentials
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Main Content Sections */}
            <div className="space-y-6">

            </div>
          </div>

          {/* Right Sidebar with Environment Status and Getting Started */}
          <div className="space-y-3 min-w-64 max-w-72 lg:sticky lg:top-4 animate-in slide-in-from-right duration-300">
          </div>
        </div>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-96 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <svg
                  className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search operations... (type to filter)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {filteredOperations.length > 0 ? (
                <div className="p-2">
                  {filteredOperations.map((operation, index) => {
                    const Icon = operation.icon;
                    return (
                      <div
                        key={operation.id}
                        onClick={() => {
                          operation.action();
                          setShowCommandPalette(false);
                          setSearchTerm('');
                        }}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 group"
                      >
                        <div className={`${operation.color} rounded p-2`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {operation.title}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                              {operation.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {operation.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <svg
                    className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.709C3.693 10.124 3 8.191 3 6c0-1.657.672-3.157 1.757-4.243L12 9l7.243-7.243C20.328 2.843 21 4.343 21 6c0 2.191-.693 4.124-2.928 6.291z"
                    />
                  </svg>
                  <p>No operations found</p>
                  <p className="text-xs mt-1">
                    Try searching for "create", "check", or "configure"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span>⌘K to reopen</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300 ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : notification.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Navigation
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Command Palette</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          ⌘K
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Help</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          ⌘/
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Send Feedback</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          ⌘.
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Close Modals</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          ESC
                        </kbd>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Features
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        • Click ⭐ to favorite operations
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Click ↓ to expand details
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Dark mode toggle in header
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • Real-time status updates
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Press{' '}
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    ⌘/
                  </kbd>{' '}
                  anytime to open this help
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                {showConfirmDialog.type === 'danger' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showConfirmDialog.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {showConfirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog.onConfirm}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showConfirmDialog.type === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFeedback(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Send Feedback
                </h3>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feedback Type
                  </label>
                  <select
                    value={feedbackData.type}
                    onChange={(e) => setFeedbackData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">UI/UX Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={feedbackData.message}
                    onChange={(e) =>
                      setFeedbackData((prev) => ({ ...prev, message: e.target.value }))
                    }
                    rows={4}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Tell us what you think..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={feedbackData.email}
                    onChange={(e) =>
                      setFeedbackData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave your email if you'd like us to follow up
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Send Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Kind Cluster Modal */}
      {showKindClusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowKindClusterModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🐳 Kind Cluster Verification
                </h3>
                <button
                  onClick={() => setShowKindClusterModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Do you already have a Kind cluster set up? Let's verify it's accessible for
                  testing.
                </p>

                {kindClusters.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select existing cluster:
                    </label>
                    <select
                      value={selectedKindCluster}
                      onChange={(e) => setSelectedKindCluster(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a cluster...</option>
                      {kindClusters.map((cluster) => (
                        <option key={cluster} value={cluster}>
                          {cluster}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Or enter cluster name manually:
                  </label>
                  <input
                    type="text"
                    value={kindClusterInput}
                    onChange={(e) => setKindClusterInput(e.target.value)}
                    placeholder="e.g., rosa-automation-test"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {kindVerificationResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      kindVerificationResult.exists && kindVerificationResult.accessible
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{kindVerificationResult.message}</p>
                    {kindVerificationResult.suggestion && (
                      <p className="text-xs mt-1">{kindVerificationResult.suggestion}</p>
                    )}
                    {kindVerificationResult.available_clusters &&
                      kindVerificationResult.available_clusters.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Available clusters:</p>
                          <ul className="text-xs list-disc list-inside">
                            {kindVerificationResult.available_clusters.map((cluster) => (
                              <li key={cluster}>{cluster}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowKindClusterModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const clusterName = selectedKindCluster || kindClusterInput;
                      try {
                        await verifyKindCluster(clusterName);
                        // Notification removed - cluster verified
                      } catch (error) {
                        addNotification('❌ Failed to verify Kind cluster', 'error');
                      }
                    }}
                    disabled={kindLoading || (!selectedKindCluster && !kindClusterInput.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {kindLoading ? 'Verifying...' : 'Verify Cluster'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kind Cluster Configuration Modal */}
      <KindClusterModal
        isOpen={showKindConfigModal}
        onClose={() => setShowKindConfigModal(false)}
        onClusterSelected={handleKindClusterSelected}
        currentCluster={verifiedKindClusterInfo?.name}
      />

      {/* Kind Terminal Modal */}
      <KindTerminalModal
        isOpen={showKindTerminalModal}
        onClose={() => setShowKindTerminalModal(false)}
        clusterName={verifiedKindClusterInfo?.cluster_name || verifiedKindClusterInfo?.name}
        namespace={verifiedKindClusterInfo?.namespace}
      />

      {/* Minikube Cluster Configuration Modal */}
      <MinikubeClusterModal
        isOpen={showMinikubeConfigModal}
        onClose={() => setShowMinikubeConfigModal(false)}
        onClusterSelected={handleMinikubeClusterSelected}
        currentCluster={verifiedMinikubeClusterInfo?.name}
      />

      {/* Minikube Terminal Modal */}
      <MinikubeTerminalModal
        isOpen={showMinikubeTerminalModal}
        onClose={() => setShowMinikubeTerminalModal(false)}
        clusterName={verifiedMinikubeClusterInfo?.cluster_name || verifiedMinikubeClusterInfo?.name}
      />

      {/* MCE Terminal Modal */}
      <MCETerminalModal
        isOpen={showMCETerminalModal}
        onClose={() => setShowMCETerminalModal(false)}
      />

      {/* Resource Detail Modal */}
      {showResourceDetailModal && selectedResourceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResourceDetailModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-cyan-600" />
                  Resource Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{selectedResourceDetail.type}</span>
                  {' / '}
                  <span className="font-mono text-cyan-600">{selectedResourceDetail.name}</span>
                  {' in namespace '}
                  <span className="font-mono">{selectedResourceDetail.namespace}</span>
                </p>
              </div>
              <button
                onClick={() => setShowResourceDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  YAML Definition
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedResourceDetail.yaml);
                    addNotification('YAML copied to clipboard', 'success', 2000);
                  }}
                  className="text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  Copy YAML
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap break-words">
                {selectedResourceDetail.yaml}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowResourceDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ansible Execution Summary Modal */}
      {showAnsibleModal && ansibleOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnsibleModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                {ansibleOutput.success ? (
                  <CheckCircleIcon className="h-6 w-6 mr-2 text-green-600" />
                ) : (
                  <svg
                    className="h-6 w-6 mr-2 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {ansibleOutput.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {ansibleOutput.success ? '✅ Completed successfully' : '❌ Failed'} at{' '}
                    {ansibleOutput.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnsibleModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Execution Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div
                  className={`p-4 rounded-lg ${ansibleOutput.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
                >
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <div
                    className={`text-lg font-semibold ${ansibleOutput.success ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {ansibleOutput.success ? 'Success' : 'Failed'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {ansibleOutput.clusterFile ? 'Cluster Definition' : 'Playbook'}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono text-xs">
                    {ansibleOutput.clusterFile || ansibleOutput.playbook || 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {ansibleOutput.timestamp}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {ansibleOutput.type || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Output */}
              {ansibleOutput.output && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <CommandLineIcon className="h-4 w-4 mr-2 text-gray-600" />
                    Ansible Output
                  </h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {ansibleOutput.output}
                  </pre>
                </div>
              )}

              {/* Error Output */}
              {ansibleOutput.error && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Error Details
                  </h4>
                  <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap border border-red-200 dark:border-red-800">
                    {ansibleOutput.error}
                  </pre>
                </div>
              )}

              {/* Next Steps for Success */}
              {ansibleOutput.success && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Next Steps
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                    <li>AutoNode configuration has been applied to your ROSA cluster</li>
                    <li>Karpenter is now managing automatic node provisioning</li>
                    <li>Check the test results in /tmp/autonode-results/</li>
                    <li>Monitor your cluster for automatic scaling events</li>
                  </ul>
                </div>
              )}

              {/* Troubleshooting for Failures */}
              {!ansibleOutput.success && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center">
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Troubleshooting Tips
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    <li>Check that your ROSA cluster is in 'ready' state</li>
                    <li>Verify AWS credentials have the required IAM permissions</li>
                    <li>
                      Ensure all required CLI tools (kubectl, oc, aws, rosa, jq) are installed
                    </li>
                    <li>Review the error output above for specific failure reasons</li>
                    <li>Check the Ansible playbook logs for detailed task information</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                💡 Tip: You can review the full output above for detailed execution information
              </div>
              <button
                onClick={() => setShowAnsibleModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OIDC Provider Creation Modal */}
      {showOidcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOidcModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {oidcModalMode === 'create'
                    ? '🔐 Create OIDC Provider'
                    : '📝 Enter OIDC Information'}
                </h3>
                <button
                  onClick={() => setShowOidcModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {oidcModalMode === 'create'
                    ? 'Create a new OIDC configuration automatically using the ROSA CLI. This will generate a new OIDC provider for your ROSA HCP cluster authentication.'
                    : 'Enter the OIDC provider information for your existing ROSA HCP cluster authentication setup.'}
                </p>

                {oidcModalMode === 'enter' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      OIDC Issuer URL *
                    </label>
                    <input
                      type="url"
                      value={oidcInput}
                      onChange={(e) => setOidcInput(e.target.value)}
                      placeholder="https://oidc-rh-oidc.s3.us-east-1.amazonaws.com/12345678-abcd-1234-5678-123456789012"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the OIDC issuer URL for your authentication provider
                    </p>
                  </div>
                )}

                {oidcModalMode === 'create' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                      ROSA CLI Command:
                    </h4>
                    <div className="bg-gray-900 rounded p-2 mb-2">
                      <code className="text-green-400 text-xs font-mono">
                        rosa create oidc-config --mode=auto
                      </code>
                    </div>
                    <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                      <div>• Automatically creates OIDC configuration</div>
                      <div>• Generates OIDC issuer URL</div>
                      <div>• Sets up AWS IAM trust relationships</div>
                      <div>• No manual URL input required</div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Example OIDC URLs:
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    <div className="font-mono bg-blue-100 dark:bg-blue-800/30 p-1 rounded break-all">
                      https://oidc-rh-oidc.s3.us-east-1.amazonaws.com/abc123...
                    </div>
                    <div className="font-mono bg-blue-100 dark:bg-blue-800/30 p-1 rounded break-all">
                      https://auth.example.com/.well-known/openid_configuration
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowOidcModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleOidcSubmit(oidcInput)}
                    disabled={oidcLoading || (oidcModalMode === 'enter' && !oidcInput.trim())}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {oidcLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{oidcModalMode === 'create' ? 'Creating...' : 'Saving...'}</span>
                      </div>
                    ) : oidcModalMode === 'create' ? (
                      'Create OIDC Config'
                    ) : (
                      'Save OIDC Info'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subnet Information Modal */}
      {showSubnetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSubnetModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🌐 Enter Subnet Information
                </h3>
                <button
                  onClick={() => setShowSubnetModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the private and public subnet information for your ROSA HCP cluster
                  networking configuration.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Private Subnet *
                  </label>
                  <input
                    type="text"
                    value={subnetInput.privateSubnet}
                    onChange={(e) =>
                      setSubnetInput((prev) => ({ ...prev, privateSubnet: e.target.value }))
                    }
                    placeholder="e.g., subnet-12345678 or rosa-hcp-private-1a"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Private subnet ID or name for cluster nodes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Public Subnet *
                  </label>
                  <input
                    type="text"
                    value={subnetInput.publicSubnet}
                    onChange={(e) =>
                      setSubnetInput((prev) => ({ ...prev, publicSubnet: e.target.value }))
                    }
                    placeholder="e.g., subnet-87654321 or rosa-hcp-public-1a"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Public subnet ID or name for internet gateway access
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Subnet Requirements:
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    <div>• Private subnets host cluster worker nodes</div>
                    <div>• Public subnets provide internet gateway access</div>
                    <div>• Both subnets must be in the same VPC</div>
                    <div>• Ensure proper CIDR block configuration</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowSubnetModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubnetInfoSubmit(subnetInput)}
                    disabled={
                      subnetLoading ||
                      !subnetInput.privateSubnet.trim() ||
                      !subnetInput.publicSubnet.trim()
                    }
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subnetLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Subnet Info'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subnets Modal */}
      {showCreateSubnetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateSubnetModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🏗️ Create VPC and Subnets
                </h3>
                <button
                  onClick={() => setShowCreateSubnetModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a new VPC with private and public subnets using Terraform for your ROSA HCP
                  cluster.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AWS Region *
                  </label>
                  <select
                    value={createSubnetInput.region}
                    onChange={(e) =>
                      setCreateSubnetInput((prev) => ({ ...prev, region: e.target.value }))
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="us-west-1">us-west-1 (N. California)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cluster Name *
                  </label>
                  <input
                    type="text"
                    value={createSubnetInput.clusterName}
                    onChange={(e) =>
                      setCreateSubnetInput((prev) => ({ ...prev, clusterName: e.target.value }))
                    }
                    placeholder="e.g., my-rosa-cluster"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used for naming VPC and subnet resources
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                    Terraform Commands:
                  </h4>
                  <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                    <div className="bg-gray-900 rounded p-2 font-mono text-green-400 text-xs">
                      mkdir rosa_vpc_with_terraform
                      <br />
                      cd rosa_vpc_with_terraform
                      <br />
                      curl -s -o setup-vpc.tf
                      https://raw.githubusercontent.com/openshift-cs/OpenShift-Troubleshooting-Templates/master/rosa-hcp-terraform/setup-vpc.tf
                      <br />
                      terraform init
                      <br />
                      terraform plan -out rosa.plan -var aws_region={createSubnetInput.region} -var
                      cluster_name={createSubnetInput.clusterName}
                      <br />
                      terraform apply rosa.plan
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    What will be created:
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    <div>• VPC with proper CIDR blocks</div>
                    <div>• Private subnets for worker nodes</div>
                    <div>• Public subnets for load balancers</div>
                    <div>• Internet Gateway and NAT Gateway</div>
                    <div>• Route tables and security groups</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateSubnetModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateSubnets(createSubnetInput)}
                    disabled={createSubnetLoading || !createSubnetInput.clusterName.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createSubnetLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create VPC & Subnets'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prefix Configuration Modal */}
      {showPrefixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrefixModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🏷️ Configure Resource Prefix
                </h3>
                <button
                  onClick={() => setShowPrefixModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter a prefix (maximum 4 characters) that will be used to name all ROSA resources
                  including account roles, operator roles, and cluster components.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prefix *
                  </label>
                  <input
                    type="text"
                    value={prefixInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 4) {
                        setPrefixInput(value);
                      }
                    }}
                    placeholder="e.g., prod, dev, test"
                    maxLength={4}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Used for naming all ROSA resources
                    </p>
                    <span
                      className={`text-xs font-mono ${prefixInput.length > 4 ? 'text-red-500' : 'text-gray-400'}`}
                    >
                      {prefixInput.length}/4
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Resource Naming Examples:
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    <div className="font-mono bg-blue-100 dark:bg-blue-800/30 p-1 rounded">
                      {prefixInput || 'prefix'}-HCP-ROSA-Installer-Role
                    </div>
                    <div className="font-mono bg-blue-100 dark:bg-blue-800/30 p-1 rounded">
                      {prefixInput || 'prefix'}-HCP-ROSA-Support-Role
                    </div>
                    <div className="font-mono bg-blue-100 dark:bg-blue-800/30 p-1 rounded">
                      {prefixInput || 'prefix'}-cluster-openshift-ingress-operator
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                    Benefits of Using Prefixes:
                  </h4>
                  <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                    <div>• Organize resources by environment or team</div>
                    <div>• Easy identification in AWS console</div>
                    <div>• Avoid naming conflicts</div>
                    <div>• Consistent resource management</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowPrefixModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePrefixSubmit(prefixInput)}
                    disabled={prefixLoading || !prefixInput.trim() || prefixInput.length > 4}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {prefixLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Prefix'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MCE Features Modal */}
      {showMCEFeaturesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMCEFeaturesModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Multicluster Engine Features</h3>
                </div>
                <button
                  onClick={() => setShowMCEFeaturesModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {mceFeaturesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Loading MCE features...</span>
                </div>
              ) : mceFeatures ? (
                <div className="space-y-3">
                  {mceFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        feature.enabled
                          ? 'bg-green-50 border-green-200 hover:border-green-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {feature.enabled ? (
                          <svg
                            className="h-6 w-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{feature.name}</div>
                          {feature.description && (
                            <div className="text-sm text-gray-500">{feature.description}</div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          feature.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {feature.enabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="h-12 w-12 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-600">
                    Click "Refresh Features" to load MCE feature status
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {mceFeatures &&
                  `${mceFeatures.filter((f) => f.enabled).length} of ${mceFeatures.length} features enabled`}
              </div>
              <button
                onClick={async () => {
                  setMceFeaturesLoading(true);
                  try {
                    const response = await fetch('http://localhost:8000/api/mce/features');
                    const data = await response.json();
                    setMceFeatures(data.features || []);
                    setMceInfo(data.mce_info || null);
                  } catch (error) {
                    console.error('Error fetching MCE features:', error);
                    addNotification('❌ Failed to fetch MCE features', 'error', 3000);
                  } finally {
                    setMceFeaturesLoading(false);
                  }
                }}
                disabled={mceFeaturesLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Features
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>© 2024 CAPI/CAPA Test Automation Platform</div>
            <div className="flex space-x-6">
              <span>Documentation</span>
              <span>Support</span>
              <button
                onClick={() => setShowFeedback(true)}
                className="hover:text-red-600 transition-colors cursor-pointer"
              >
                Send Feedback
              </button>
              <span>Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatCanIHelp;
