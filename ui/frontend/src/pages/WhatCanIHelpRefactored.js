import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import MinikubeEnvironment from '../components/environments/MinikubeEnvironment';
import MinikubeSetupSection from '../components/sections/MinikubeSetupSection';
import MinikubeTerminalSection from '../components/sections/MinikubeTerminalSection';
import ConfigurationSection from '../components/sections/ConfigurationSection';
import RosaHcpClustersSection from '../components/sections/RosaHcpClustersSection';
import MCETerminalSection from '../components/sections/MCETerminalSection';
import TaskSummarySection from '../components/sections/TaskSummarySection';
import TestSuiteDashboard from '../components/sections/TestSuiteDashboard';
import TestSuiteSection from '../components/sections/TestSuiteSection';
import HelmChartTestDashboard from '../components/sections/HelmChartTestDashboard';
import DraggableSection from '../components/sections/DraggableSection';
import FilingCabinet from '../components/sections/FilingCabinet';
import NotificationSettingsModal from '../components/modals/NotificationSettingsModal';
import { RosaProvisionModal } from '../components/RosaProvisionModal';
import { YamlEditorModal } from '../components/YamlEditorModal';
import { AIAssistantChat } from '../components/chat/AIAssistantChat';
import CredentialsModal from '../components/modals/CredentialsModal';
import {
  AppProvider,
  useApp,
  useAppDispatch,
  useMinikubeContext,
  useMCEContext,
  useRecentOperationsContext,
  useApiStatusContext,
} from '../store/AppContext';
import { AppActionTypes } from '../store/AppContext';
import {
  buildApiUrl,
  API_ENDPOINTS,
  validateApiResponse,
  extractSafeErrorMessage,
} from '../config/api';
import { useJobHistory } from '../hooks/useJobHistory';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Environment selector dropdown component
const EnvironmentSelector = ({ onResetLayout }) => {
  const app = useApp();
  const dispatch = useAppDispatch();

  const environments = [
    {
      id: 'mce',
      name: 'MCE',
      icon: '🎯',
      description: 'Downstream environment with full MCE features',
    },
    {
      id: 'minikube',
      name: 'Minikube',
      icon: '⚡',
      description: 'Upstream environment for development and testing',
    },
  ];

  const selectedEnv = environments.find((e) => e.id === app.selectedEnvironment);

  // Get theme colors for header
  const getHeaderTheme = () => {
    return app.selectedEnvironment === 'minikube'
      ? {
          gradient: 'from-purple-600 to-violet-600',
          textGradient: 'from-purple-600 to-violet-600',
        }
      : {
          gradient: 'from-cyan-600 to-blue-600',
          textGradient: 'from-cyan-600 to-blue-600',
        };
  };

  const theme = getHeaderTheme();

  return (
    <div className="sticky top-0 z-30 bg-white border-b-2 border-gray-200 shadow-sm mb-6 -mx-6 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1
          className={`text-3xl font-bold bg-gradient-to-r ${theme.textGradient} bg-clip-text text-transparent`}
        >
          {app.selectedEnvironment === 'mce'
            ? 'MCE Test Environment (Downstream)'
            : 'Minikube Test Environment (Upstream)'}
        </h1>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          {/* Reset Layout Button */}
          <button
            onClick={onResetLayout}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium text-gray-700"
            title="Reset section order to default"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Reset Layout</span>
          </button>

          {/* Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => dispatch({ type: AppActionTypes.TOGGLE_ENVIRONMENT_DROPDOWN })}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-lg">{selectedEnv?.icon}</span>
              <span className="font-semibold text-gray-900">{selectedEnv?.name}</span>
              <ChevronDownIcon
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                  app.showEnvironmentDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {app.showEnvironmentDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-purple-200 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                    Select Environment
                  </div>
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => {
                        dispatch({
                          type: AppActionTypes.SET_SELECTED_ENVIRONMENT,
                          payload: env.id,
                        });
                        dispatch({ type: AppActionTypes.TOGGLE_ENVIRONMENT_DROPDOWN });
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors duration-150 hover:bg-purple-50 ${
                        app.selectedEnvironment === env.id
                          ? 'bg-purple-100 text-purple-900'
                          : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{env.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{env.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{env.description}</div>
                        </div>
                        {app.selectedEnvironment === env.id && (
                          <span className="text-purple-600">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

EnvironmentSelector.propTypes = {
  onResetLayout: PropTypes.func.isRequired,
};

// Main environment content
const EnvironmentContent = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  const recentOps = useRecentOperationsContext();
  const mce = useMCEContext();
  const apiStatus = useApiStatusContext();

  // Ensure FilingCabinet starts collapsed
  useEffect(() => {
    if (app.showFilingCabinet) {
      dispatch({ type: AppActionTypes.TOGGLE_FILING_CABINET });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // For Minikube, show if environment is selected (MinikubeEnvironment handles its own display logic)
  const shouldShowMinikube = app.selectedEnvironment === 'minikube';
  const shouldShowMCE = app.selectedEnvironment === 'mce';
  const shouldShowSections = shouldShowMCE || shouldShowMinikube;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    // Check if dragged to filing cabinet
    if (over.id === 'filing-cabinet-dropzone') {
      dispatch({ type: AppActionTypes.HIDE_SECTION, payload: active.id });
      return;
    }

    // Regular reordering
    if (active.id !== over.id) {
      const oldIndex = app.sectionOrder.indexOf(active.id);
      const newIndex = app.sectionOrder.indexOf(over.id);

      const newOrder = [...app.sectionOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);

      dispatch({ type: AppActionTypes.SET_SECTION_ORDER, payload: newOrder });
    }
  };

  // Reset section order to default
  const resetSectionOrder = () => {
    const defaultOrder =
      app.selectedEnvironment === 'minikube'
        ? [
            'minikube-environment',
            'task-summary',
            'rosa-hcp-clusters',
            'test-suite-dashboard',
            'test-suite-runner',
            'minikube-terminal',
            'helm-chart-tests',
          ]
        : [
            'mce-configuration',
            'task-summary',
            'rosa-hcp-clusters',
            'test-suite-dashboard',
            'test-suite-runner',
            'mce-terminal',
          ];
    dispatch({ type: AppActionTypes.SET_SECTION_ORDER, payload: defaultOrder });
  };

  // State for modals
  const [showNotificationSettings, setShowNotificationSettings] = React.useState(false);

  // Handlers for MCE sections
  const handleVerifyEnvironment = async () => {
    const { addToRecent, updateRecentOperationStatus } = recentOps;
    const verifyId = `verify-mce-${Date.now()}`;

    try {
      // IMMEDIATELY show "Starting..." in Task Summary for instant feedback (before any async calls!)
      addToRecent({
        id: verifyId,
        title: '🔍 MCE Environment Verification',
        color: 'bg-cyan-600',
        status: '🚀 Starting verification...',
        environment: 'mce',
        playbook: 'tasks/validate-capa-environment.yml',
        output: `Initializing MCE environment verification...\nConnecting to OpenShift cluster...\nValidating MCE components...`,
      });

      // Fetch credentials from backend to get the actual API URL and update the UI FIRST
      try {
        const credsResponse = await fetch(buildApiUrl(API_ENDPOINTS.CREDENTIALS_GET));
        if (credsResponse.ok) {
          const credsData = await credsResponse.json();
          if (credsData.success && credsData.credentials?.OCP_HUB_API_URL) {
            // Immediately refresh API status to show the API URL in Configuration section
            await apiStatus.refreshAllStatus();
          }
        }
      } catch (err) {
        console.error('Failed to fetch credentials:', err);
      }

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_file: 'tasks/validate-capa-environment.yml',
          description: 'Verify MCE Environment',
          cluster_type: 'mce',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start verification: ${response.statusText}`);
      }

      const result = await response.json();

      // Task started successfully - job runs in background
      if (result.success && result.job_id) {
        console.log(`✅ MCE verification started! Job ID: ${result.job_id}`);

        // Remove the frontend entry - backend job will show instead
        recentOps.removeRecentOperation(verifyId);

        // The job history system will track completion automatically
      } else if (result.success) {
        // Old path for backwards compatibility - remove the entry
        recentOps.removeRecentOperation(verifyId);

        // Poll status in background - don't block the UI
        setTimeout(async () => {
          await apiStatus.refreshAllStatus();
          // Check again after another 5 seconds
          setTimeout(async () => {
            await apiStatus.refreshAllStatus();
          }, 5000);
        }, 3000);
      } else {
        updateRecentOperationStatus(
          verifyId,
          `❌ Verification failed`,
          result.error || result.message || 'Failed to start verification'
        );
      }
    } catch (error) {
      updateRecentOperationStatus(
        verifyId,
        `❌ Verification failed`,
        `Failed to start verification: ${error.message}`
      );
    }
  };

  const handleOpenNotifications = () => {
    setShowNotificationSettings(true);
  };

  const handleConfigure = async () => {
    const { addToRecent, updateRecentOperationStatus } = recentOps;
    const configureId = `configure-${Date.now()}`;

    try {
      // Show immediate feedback
      addToRecent({
        id: configureId,
        title: 'Configure MCE CAPI/CAPA Environment',
        color: 'bg-cyan-600',
        status: '⏳ Configuring...',
        environment: 'mce',
        playbook: 'configure_capi_environment.yaml',
        output: 'Configuring MCE CAPI/CAPA environment...',
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playbook_file: 'configure_capi_environment.yaml',
          description: 'Configure MCE CAPI/CAPA Environment',
          cluster_type: 'mce',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start configuration: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Remove the temporary frontend entry - backend job will show instead
        recentOps.removeRecentOperation(configureId);

        // Poll status in background - don't block the UI
        // MCE reconciliation can take 10-15 seconds
        setTimeout(async () => {
          await apiStatus.refreshAllStatus();
          // Check again after another 5 seconds
          setTimeout(async () => {
            await apiStatus.refreshAllStatus();
          }, 5000);
        }, 5000);
      } else {
        updateRecentOperationStatus(
          configureId,
          `❌ Configuration failed`,
          result.error || 'Unknown error'
        );
      }
    } catch (error) {
      updateRecentOperationStatus(configureId, `❌ Configuration failed`, error.message);
    }
  };

  const handleRefresh = () => {
    // Refresh in background - don't block UI
    apiStatus.refreshAllStatus();
  };

  const handleProvision = () => {
    dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: true });
  };

  const handleDisableCapi = async () => {
    const { addToRecent, updateRecentOperationStatus } = recentOps;
    const disableId = `disable-capi-${Date.now()}`;

    try {
      // Show immediate feedback
      addToRecent({
        id: disableId,
        title: 'Disable CAPI Components',
        color: 'bg-red-600',
        status: '⏳ Disabling CAPI...',
        environment: 'mce',
        playbook: 'tasks/disable_capi.yml',
        output: 'Disabling CAPI and enabling Hypershift...',
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANSIBLE_RUN_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_file: 'tasks/disable_capi.yml',
          description: 'Disable CAPI Components',
          cluster_type: 'mce',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to disable CAPI: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Remove the temporary frontend entry - backend job will show instead
        recentOps.removeRecentOperation(disableId);

        // Poll status in background - don't block the UI
        // MCE reconciliation can take 10-15 seconds
        setTimeout(async () => {
          await apiStatus.refreshAllStatus();
          // Check again after another 5 seconds
          setTimeout(async () => {
            await apiStatus.refreshAllStatus();
          }, 5000);
        }, 5000);
      } else {
        updateRecentOperationStatus(
          disableId,
          `❌ Disable CAPI failed`,
          result.error || 'Unknown error'
        );
      }
    } catch (error) {
      updateRecentOperationStatus(disableId, `❌ Disable CAPI failed`, error.message);
    }
  };

  const handleExport = () => {
    const { addToRecent, updateRecentOperationStatus } = recentOps;
    const mceResources = mce.mceActiveResources || [];

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
      output: `Exporting ${mceResources.length} resources to ${fileName}...`,
    });

    // Create export data
    const exportData = {
      exported_at: new Date().toISOString(),
      total_resources: mceResources.length,
      resources: mceResources.map((resource) => ({
        name: resource.name,
        type: resource.type,
        namespace: resource.namespace,
        status: resource.status,
      })),
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
      `MCE Resources Export Complete\n\n✅ Exported ${mceResources.length} resources\n✅ File: ${fileName}\n✅ Downloaded successfully\n\nExport completed at ${completionTime}`
    );
  };

  // Map section IDs to their components
  const getSectionComponent = (sectionId) => {
    switch (sectionId) {
      case 'mce-configuration':
        return shouldShowMCE ? (
          <ConfigurationSection
            key="mce-configuration"
            onVerifyEnvironment={handleVerifyEnvironment}
            onOpenNotifications={handleOpenNotifications}
            onConfigure={handleConfigure}
            onRefresh={handleRefresh}
            onProvision={handleProvision}
            onExport={handleExport}
            onDisableCapi={handleDisableCapi}
          />
        ) : null;

      case 'rosa-hcp-clusters':
        return shouldShowSections ? (
          <RosaHcpClustersSection key="rosa-hcp-clusters" theme={app.selectedEnvironment} />
        ) : null;

      case 'mce-terminal':
        return shouldShowMCE ? (
          <MCETerminalSection key="mce-terminal" theme={app.selectedEnvironment} />
        ) : null;

      case 'minikube-terminal':
        return shouldShowMinikube ? <MinikubeTerminalSection key="minikube-terminal" /> : null;

      case 'test-suite-dashboard':
        return shouldShowSections ? (
          <TestSuiteDashboard
            key="test-suite-dashboard"
            theme={app.selectedEnvironment}
            onSelectTestSuite={(testSuite) => {
              console.log('Selected test suite:', testSuite);
              dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: true });
            }}
          />
        ) : null;

      case 'test-suite-runner':
        return shouldShowSections ? (
          <TestSuiteSection key="test-suite-runner" theme={app.selectedEnvironment} />
        ) : null;

      case 'helm-chart-tests':
        return shouldShowSections ? (
          <HelmChartTestDashboard key="helm-chart-tests" theme={app.selectedEnvironment} />
        ) : null;

      case 'minikube-environment':
        return shouldShowMinikube ? <MinikubeEnvironment key="minikube-environment" /> : null;

      case 'task-summary':
        return shouldShowSections ? (
          <TaskSummarySection
            key="task-summary"
            theme={app.selectedEnvironment}
            environment={app.selectedEnvironment}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Environment Selector with Reset Layout */}
      <EnvironmentSelector onResetLayout={resetSectionOrder} />

      {/* Show Minikube setup section when Minikube is selected BUT not yet verified */}
      {app.selectedEnvironment === 'minikube' && !minikube.verifiedMinikubeClusterInfo && (
        <MinikubeSetupSection />
      )}

      {/* Show connection message for MCE if not connected */}
      {app.selectedEnvironment === 'mce' && !shouldShowMCE && (
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
              <div className="text-sm text-gray-500">
                Configure your credentials and connection settings above.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draggable sections when environment is properly configured */}
      {shouldShowSections && (
        <div className="relative">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* Main Sections Area */}
            <SortableContext items={app.sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {app.sectionOrder.map((sectionId) => {
                  const component = getSectionComponent(sectionId);
                  return component ? (
                    <DraggableSection key={sectionId} id={sectionId}>
                      {component}
                    </DraggableSection>
                  ) : null;
                })}
              </div>
            </SortableContext>

            {/* Filing Cabinet Widget - Fixed Bottom Right (next to AI assistant) - INSIDE DndContext */}
            <div className="fixed bottom-6 right-24 z-30 w-64">
              <FilingCabinet
                hiddenSections={app.hiddenSections}
                onRestoreSection={(sectionId) => {
                  dispatch({ type: AppActionTypes.RESTORE_SECTION, payload: sectionId });
                }}
                onClearAll={() => {
                  dispatch({ type: AppActionTypes.RESTORE_ALL_SECTIONS });
                }}
                theme={app.selectedEnvironment}
                isExpanded={app.showFilingCabinet}
                onToggle={() => {
                  dispatch({ type: AppActionTypes.TOGGLE_FILING_CABINET });
                }}
                isMinimized={app.filingCabinetMinimized}
                onMinimize={() => {
                  dispatch({ type: AppActionTypes.TOGGLE_FILING_CABINET_MINIMIZE });
                }}
              />
            </div>
          </DndContext>
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};

const WhatCanIHelpRefactored = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="pl-16 pr-12 py-8">
          <EnvironmentContent />
        </div>
        <ModalProvider />
        <AIAssistantChat />
      </div>
    </AppProvider>
  );
};

// Modal provider component to handle global modals
const ModalProvider = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const apiStatus = useApiStatusContext();
  const { fetchJobHistory } = useJobHistory();
  const recentOps = useRecentOperationsContext();
  const { addToRecent, updateRecentOperationStatus } = recentOps;

  // Handle credentials save tracking
  const handleCredentialsSave = () => {
    const credId = `credentials-update-${Date.now()}`;

    addToRecent({
      id: credId,
      title: 'Update Credentials',
      color: 'bg-cyan-600',
      status: '⏳ Saving...',
      environment: app.selectedEnvironment,
      output: 'Saving credentials to vars/user_vars.yml...',
    });

    // Update as complete
    const completionTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    updateRecentOperationStatus(
      credId,
      `✅ Credentials saved at ${completionTime}`,
      `Credentials Update Complete

✅ Credentials saved successfully
✅ File: vars/user_vars.yml
✅ Changes applied

Update completed at ${completionTime}`
    );
  };

  return (
    <>
      {/* ROSA Provision Modal */}
      <RosaProvisionModal
        isOpen={app.showProvisionModal}
        onClose={() => dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: false })}
        mceInfo={apiStatus.mceInfo}
        onSubmit={async (config) => {
          try {
            // Call generate-yaml API to get YAML preview
            const generateResponse = await fetch(
              buildApiUrl(API_ENDPOINTS.PROVISIONING_GENERATE_YAML),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ config }),
              }
            );

            const generateData = await generateResponse.json();
            const validatedData = validateApiResponse(generateData, ['success']);

            if (!validatedData.success) {
              throw new Error(validatedData.message || 'Failed to generate YAML');
            }

            // Close the provision modal AFTER we get the YAML
            dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: false });

            // Open YAML editor modal with generated YAML
            dispatch({
              type: AppActionTypes.SET_YAML_EDITOR_DATA,
              payload: {
                yaml_content: validatedData.yaml_content,
                cluster_name: validatedData.cluster_name,
                feature_type: validatedData.feature_type,
                file_paths: validatedData.file_paths,
                config: config, // Store original config for later use
              },
            });
            dispatch({ type: AppActionTypes.SHOW_YAML_EDITOR_MODAL, payload: true });
          } catch (error) {
            const safeErrorMessage = extractSafeErrorMessage(error);
            // Keep the provision modal open on error
            alert(`Failed to generate YAML preview: ${safeErrorMessage}`);
          }
        }}
        testSuite={null}
      />

      {/* YAML Editor Modal */}
      <YamlEditorModal
        isOpen={app.showYamlEditorModal}
        onClose={() => dispatch({ type: AppActionTypes.SHOW_YAML_EDITOR_MODAL, payload: false })}
        yamlData={app.yamlEditorData}
        readOnly={false}
        onProvision={async (editedYaml) => {
          // Define variables outside try block so they're accessible in catch block
          const provisionId = `provision-rosa-hcp-${Date.now()}`;
          const clusterName = app.yamlEditorData?.cluster_name || 'cluster';

          try {
            // Add immediate feedback to Recent Operations BEFORE calling API
            // Use the currently selected environment (mce or minikube)
            const currentEnvironment = app.selectedEnvironment || 'mce';
            const envColor = currentEnvironment === 'minikube' ? 'bg-purple-600' : 'bg-cyan-600';

            addToRecent({
              id: provisionId,
              title: `Provision ROSA HCP Cluster: ${clusterName}`,
              status: '⏳ Starting provisioning...',
              color: envColor,
              environment: currentEnvironment,
              timestamp: new Date().toISOString(),
              output: `Starting provisioning for cluster "${clusterName}"...\n\nSubmitting YAML configuration to backend...\n\nThis will appear in the Task Summary and Task Detail sections.`,
            });

            // Close YAML editor modal first
            dispatch({ type: AppActionTypes.SHOW_YAML_EDITOR_MODAL, payload: false });

            // Call apply-yaml API to start the provisioning job
            const applyResponse = await fetch(buildApiUrl(API_ENDPOINTS.PROVISIONING_APPLY_YAML), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                yaml_content: editedYaml,
                cluster_name: app.yamlEditorData?.cluster_name,
                feature_type: app.yamlEditorData?.feature_type,
              }),
            });

            const applyData = await applyResponse.json();
            const validatedData = validateApiResponse(applyData, ['job_id']);

            if (!validatedData.job_id) {
              throw new Error(validatedData.message || 'No job_id returned from server');
            }

            // Update the recent operation to show job was submitted successfully
            updateRecentOperationStatus(
              provisionId,
              `✅ Job submitted successfully (ID: ${validatedData.job_id})`,
              `Provisioning job for cluster "${clusterName}" has been submitted to the backend.\n\nJob ID: ${validatedData.job_id}\n\nThe job is now running and will be tracked in the job history system.\n\nYou can monitor progress in the CAPI-Managed ROSA HCP Clusters section below.`
            );

            // Immediately refresh job history to show the new job
            console.log('🚀 [Provision] Job submitted, refreshing job history immediately');
            fetchJobHistory();

            // Expand CAPI-Managed ROSA HCP Clusters section on successful completion to monitor progress
            setTimeout(() => {
              // Expand the cluster section
              const sectionId = 'capi-rosa-hcp-clusters';
              dispatch({ type: AppActionTypes.EXPAND_SECTION, payload: sectionId });

              // Scroll to the cluster section after a small delay to allow for expansion
              setTimeout(() => {
                const element = document.querySelector(
                  '[data-section-id="capi-rosa-hcp-clusters"]'
                );
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 500);
            }, 1500); // Small delay to show success message first

            // The job will now be tracked by the job history system and will show up
            // in the Task Summary and Task Detail sections automatically
          } catch (error) {
            const safeErrorMessage = extractSafeErrorMessage(error);

            // Update the recent operation to show the error
            updateRecentOperationStatus(
              provisionId,
              `❌ Provisioning failed: ${safeErrorMessage}`,
              `Failed to submit provisioning job for cluster "${clusterName}".\n\nError: ${safeErrorMessage}\n\nPlease check your cluster configuration and try again.`
            );

            alert(`Failed to start provisioning: ${safeErrorMessage}`);
          }
        }}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={app.showCredentialsModal}
        onClose={() => dispatch({ type: AppActionTypes.SHOW_CREDENTIALS_MODAL, payload: false })}
        theme={app.selectedEnvironment}
        onSave={handleCredentialsSave}
      />
    </>
  );
};

export default WhatCanIHelpRefactored;
