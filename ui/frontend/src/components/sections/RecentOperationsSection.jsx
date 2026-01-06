import React from 'react';
import PropTypes from 'prop-types';
import {
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';

const RecentOperationsSection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const recentOps = useRecentOperationsContext();

  const {
    recentOperations,
    recentOperationsCollapsed,
    recentOperationsOutputCollapsed,
    clearRecentOperations,
  } = recentOps;

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          gradient: 'from-purple-500 to-indigo-600',
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          text: 'text-purple-900',
          lightText: 'text-purple-600',
        };
      case 'mce':
      default:
        return {
          gradient: 'from-cyan-500 to-blue-600',
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          text: 'text-cyan-900',
          lightText: 'text-cyan-600',
        };
    }
  };

  const colors = getThemeColors();

  // Filter operations by environment if specified
  const filteredOperations = environment
    ? recentOperations.filter((op) => op.environment === environment)
    : recentOperations;

  const toggleOperationsSection = () => {
    if (environment === 'minikube') {
      // Handle Minikube specific collapse state
      dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'minikube-recent-ops' });
    } else {
      // Handle MCE or general collapse state
      dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'mce-recent-ops' });
    }
  };

  const toggleOutputSection = () => {
    if (environment === 'minikube') {
      dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'minikube-operations-output' });
    } else {
      dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: 'recent-operations-output' });
    }
  };

  const getSectionCollapsedState = (sectionId) => {
    return app.collapsedSections?.has(sectionId) || false;
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getStatusIcon = (status) => {
    if (status?.includes('✅')) return '✅';
    if (status?.includes('❌')) return '❌';
    if (status?.includes('⏳')) return '⏳';
    return '📄';
  };

  return (
    <div className="space-y-6">
      {/* Recent Operations Section */}
      <div className={`bg-white rounded-xl shadow-lg border-2 ${colors.border} overflow-hidden`}>
        <div
          className={`bg-gradient-to-r ${colors.headerGradient} px-6 py-4 cursor-pointer ${colors.hoverGradient} transition-all`}
          onClick={toggleOperationsSection}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recent Operations</h3>
                <p className="text-white/80 text-sm">
                  {filteredOperations.length > 0
                    ? `Latest ${filteredOperations.length} operation${filteredOperations.length !== 1 ? 's' : ''}`
                    : 'No operations yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {filteredOperations.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentOperations();
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Clear all operations"
                >
                  <TrashIcon className="h-4 w-4 text-white" />
                </button>
              )}
              {getSectionCollapsedState(`${environment || 'mce'}-recent-ops`) ? (
                <ChevronDownIcon className="h-5 w-5 text-white" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {!getSectionCollapsedState(`${environment || 'mce'}-recent-ops`) && (
          <div className="p-6">
            {filteredOperations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Recent Operations</p>
                <p className="text-sm">Operations will appear here as you use the system.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOperations.slice(0, 10).map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-lg">{getStatusIcon(operation.status)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{operation.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{operation.status}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(operation.timestamp)}
                        </p>
                      </div>
                    </div>
                    {operation.color && (
                      <div
                        className={`w-3 h-3 rounded-full ${operation.color} flex-shrink-0 mt-1`}
                      ></div>
                    )}
                  </div>
                ))}

                {filteredOperations.length > 10 && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    +{filteredOperations.length - 10} more operations
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Operations Output Section */}
      {filteredOperations.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-gray-600 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${colors.headerGradient} px-6 py-4 flex items-center justify-between cursor-pointer ${colors.hoverGradient} transition-all`}
            onClick={toggleOutputSection}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recent Operations Output</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-white/80 text-sm">Command outputs and logs</span>
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-md border border-green-500/30">
                    {environment?.toUpperCase() || 'SYSTEM'} CAPI/CAPA
                  </span>
                </div>
              </div>
            </div>
            {getSectionCollapsedState(`${environment || 'recent'}-operations-output`) ? (
              <ChevronDownIcon className="h-5 w-5 text-white" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 text-white" />
            )}
          </div>

          {!getSectionCollapsedState(`${environment || 'recent'}-operations-output`) && (
            <div className="p-6 bg-gray-900">
              <div className="bg-black rounded-lg border border-gray-700 overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-green-400 text-sm font-mono">Terminal Output</span>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="p-4 h-64 overflow-y-auto bg-black text-green-400 font-mono text-sm">
                  {filteredOperations.length === 0 ? (
                    <div className="text-gray-500">No output available</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredOperations.slice(0, 5).map((operation, index) => (
                        <div key={operation.id}>
                          <div className="text-cyan-400">
                            [{formatTimestamp(operation.timestamp)}] {operation.title}
                          </div>
                          <div className="text-green-400 pl-4">{operation.status}</div>
                          {index < 4 && <div className="border-b border-gray-800 my-2"></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

RecentOperationsSection.propTypes = {
  theme: PropTypes.string,
  environment: PropTypes.string,
};

export default RecentOperationsSection;
