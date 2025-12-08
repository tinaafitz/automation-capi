import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import StatusCard from '../cards/StatusCard';
import { YamlEditorModal } from '../YamlEditorModal';
import { useApiStatusContext, useApp, useAppDispatch, useMCEContext, useRecentOperationsContext } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { Cog6ToothIcon, BellIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cardStyles } from '../../styles/themes';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

const ConfigurationSection = ({ onVerifyEnvironment, onOpenNotifications, onConfigure, onRefresh, onProvision, onExport, onDisableCapi }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const recentOps = useRecentOperationsContext();
  const { ocpStatus, mceFeatures, mceInfo } = apiStatus;
  const { addToRecent, updateRecentOperationStatus } = recentOps;

  const [expandedNamespaces, setExpandedNamespaces] = useState(new Set());
  const [mceResources, setMceResources] = useState([]);
  const [mceResourcesLoading, setMceResourcesLoading] = useState(false);
  const [showYamlEditorModal, setShowYamlEditorModal] = useState(false);
  const [yamlEditorData, setYamlEditorData] = useState(null);

  // Filter mceFeatures to get CAPI and Hypershift components (using 'name' field not 'component')
  const capiComponentsArray = (mceFeatures?.filter((f) => f.name?.startsWith('cluster-api')) || [])
    .sort((a, b) => a.name.localeCompare(b.name));
  const hypershiftComponentsArray = (mceFeatures?.filter((f) => f.name?.startsWith('hypershift')) || [])
    .sort((a, b) => a.name.localeCompare(b.name));
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
        output: 'Refreshing MCE component status...'
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
        output: 'Refreshing MCE resources...'
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
            resource_type: resource.type
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
      const ocCommand = `oc get ${resource.type.toLowerCase()} ${resource.name} ${namespaceFlag} -o yaml`.trim();
      console.log('🔧 [OC-COMMAND]', ocCommand);

      const response = await fetch(buildApiUrl('/api/ocp/execute-command'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: ocCommand
        })
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
        resource_type: resource.type
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
            command: `oc get ${resource.name} -o yaml`
          })
        });

        if (altResponse.ok) {
          const altResult = await altResponse.json();
          if (altResult.success && altResult.output && !altResult.output.includes('error')) {
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
# Namespace: ${resource.namespace || 'cluster-scoped'}`,
        resource_name: resource.name,
        resource_type: resource.type
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
              title="MCE Environment"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              status={ocpStatus?.connected ? 'Connected' : 'Not Connected'}
              statusColor={ocpStatus?.connected ? 'green' : 'red'}
              actions={[
                {
                  label: 'Configure Credentials',
                  onClick: handleOpenCredentialsModal,
                  variant: 'secondary',
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
              actions={[
                {
                  label: 'Configure',
                  onClick: onConfigure,
                  variant: 'secondary',
                },
                {
                  label: 'Refresh',
                  onClick: handleComponentRefresh,
                  variant: 'secondary',
                },
              ]}
            >
              <div className="space-y-3">
                <h6 className="font-medium text-cyan-900 mb-3">Component Status</h6>

                {/* CAPI Components - Already filtered for cluster-api* */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CAPI Providers</div>
                  <div className="space-y-1">
                    {capiComponentsArray.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{feature.name}</span>
                        <span className={feature.enabled ? 'text-green-600' : 'text-red-600'}>
                          {feature.enabled ? '✓' : '✕'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hypershift Components - Already filtered for hypershift* */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hypershift</div>
                  <div className="space-y-1">
                    {hypershiftComponentsArray.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{feature.name}</span>
                        <span className={feature.enabled ? 'text-green-600' : 'text-red-600'}>
                          {feature.enabled ? '✓' : '✕'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disable CAPI Button - Only show when CAPI is enabled */}
                {capiComponentsArray.some(c => c.name === 'cluster-api' && c.enabled) && (
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
              title="Resources"
              icon="📦"
              status={`${mceResources.length} total`}
              actions={[
                {
                  label: 'Provision',
                  onClick: onProvision,
                  variant: 'secondary',
                },
                {
                  label: 'Export',
                  onClick: onExport,
                  variant: 'secondary',
                },
                {
                  label: 'Refresh',
                  onClick: handleResourceRefresh,
                  variant: 'secondary',
                },
              ]}
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
                    <p className="text-sm mt-1">Resources will appear here when environment is configured.</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {Object.entries(groupedResources).map(([namespace, resources]) => {
                      const isExpanded = expandedNamespaces.has(namespace);
                      return (
                        <div key={namespace} className="border-b border-gray-200 pb-2 last:border-b-0">
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
