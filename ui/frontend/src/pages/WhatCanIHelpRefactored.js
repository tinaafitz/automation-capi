import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import MinikubeEnvironment from '../components/environments/MinikubeEnvironment';
import MCEEnvironment from '../components/environments/MCEEnvironment';
import MinikubeSetupSection from '../components/sections/MinikubeSetupSection';
import RecentOperationsSection from '../components/sections/RecentOperationsSection';
import TaskSummarySection from '../components/sections/TaskSummarySection';
import TaskDetailSection from '../components/sections/TaskDetailSection';
import { AppProvider, useApp, useAppDispatch, useMinikubeContext } from '../store/AppContext';
import { AppActionTypes } from '../store/AppContext';

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
  const minikube = useMinikubeContext();

  // For Minikube, check if we have verified cluster info
  const shouldShowMinikube = app.selectedEnvironment === 'minikube' && minikube.verifiedMinikubeClusterInfo;
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

// Main component
const WhatCanIHelpRefactored = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <EnvironmentSelector />
          <EnvironmentContent />
        </div>
      </div>
    </AppProvider>
  );
};

export default WhatCanIHelpRefactored;