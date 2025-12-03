import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import MinikubeEnvironment from '../components/environments/MinikubeEnvironment';
import MCEEnvironment from '../components/environments/MCEEnvironment';
import MinikubeSetupSection from '../components/sections/MinikubeSetupSection';
import TaskSummarySection from '../components/sections/TaskSummarySection';
import TaskDetailSection from '../components/sections/TaskDetailSection';
import { RosaProvisionModal } from '../components/RosaProvisionModal';
import { YamlEditorModal } from '../components/YamlEditorModal';
import { AppProvider, useApp, useAppDispatch, useMinikubeContext } from '../store/AppContext';
import { AppActionTypes } from '../store/AppContext';
import { buildApiUrl, API_ENDPOINTS, validateApiResponse, extractSafeErrorMessage } from '../config/api';

// Environment selector dropdown component
const EnvironmentSelector = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  
  const environments = [
    { 
      id: 'mce', 
      name: 'MCE', 
      icon: '🎯',
      description: 'Downstream environment with full MCE features'
    },
    { 
      id: 'minikube', 
      name: 'Minikube', 
      icon: '⚡',
      description: 'Upstream environment for development and testing'
    }
  ];

  const selectedEnv = environments.find(e => e.id === app.selectedEnvironment);

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-gray-900">
        {app.selectedEnvironment === 'mce'
          ? 'MCE Test Environment (Downstream)'
          : 'Minikube Test Environment (Upstream)'}
      </h2>
      
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
                    dispatch({ type: AppActionTypes.SET_SELECTED_ENVIRONMENT, payload: env.id });
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
                      <div className="text-xs text-gray-500 mt-1">
                        {env.description}
                      </div>
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
  );
};

// Main environment content
const EnvironmentContent = () => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const minikube = useMinikubeContext();
  
  // For Minikube, show if environment is selected (MinikubeEnvironment handles its own display logic)
  const shouldShowMinikube = app.selectedEnvironment === 'minikube';
  const shouldShowMCE = app.selectedEnvironment === 'mce';

  return (
    <div>
      {/* Show Minikube setup section when Minikube is selected BUT not yet verified */}
      {app.selectedEnvironment === 'minikube' && !minikube.verifiedMinikubeClusterInfo && <MinikubeSetupSection />}
      
      {/* Show environment content when properly configured */}
      {shouldShowMCE && <MCEEnvironment />}
      {shouldShowMinikube && <MinikubeEnvironment />}

      {/* Show Task Summary and Task Detail only when environment is properly configured */}
      {(shouldShowMCE || shouldShowMinikube) && (
        <div className="grid grid-cols-1 gap-6 mt-6">
          <TaskSummarySection 
            theme={app.selectedEnvironment} 
            environment={app.selectedEnvironment}
          />
          <TaskDetailSection 
            theme={app.selectedEnvironment} 
            environment={app.selectedEnvironment}
          />
        </div>
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
    </div>
  );
};

const WhatCanIHelpRefactored = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <EnvironmentSelector />
          <EnvironmentContent />
        </div>
        <ModalProvider />
      </div>
    </AppProvider>
  );
};

// Modal provider component to handle global modals
const ModalProvider = () => {
  const app = useApp();
  const dispatch = useAppDispatch();

  return (
    <>
      {/* ROSA Provision Modal */}
      <RosaProvisionModal
        isOpen={app.showProvisionModal}
        onClose={() => dispatch({ type: AppActionTypes.SHOW_PROVISION_MODAL, payload: false })}
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
              }
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
          
          try {
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
            
            // Expand CAPI-Managed ROSA HCP Clusters section on successful completion to monitor progress
            setTimeout(() => {
              // Expand the cluster section
              const sectionId = 'capi-rosa-hcp-clusters';
              dispatch({ type: AppActionTypes.EXPAND_SECTION, payload: sectionId });
              
              // Scroll to the cluster section after a small delay to allow for expansion
              setTimeout(() => {
                const element = document.querySelector('[data-section-id="capi-rosa-hcp-clusters"]');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 500);
            }, 1500); // Small delay to show success message first
            
            // The job will now be tracked by the job history system and will show up 
            // in the Task Summary and Task Detail sections automatically
            
          } catch (error) {
            const safeErrorMessage = extractSafeErrorMessage(error);
            alert(`Failed to start provisioning: ${safeErrorMessage}`);
          }
        }}
      />
    </>
  );
};

export default WhatCanIHelpRefactored;