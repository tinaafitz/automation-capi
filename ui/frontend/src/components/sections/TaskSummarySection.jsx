import React from 'react';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';

const TaskSummarySection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const recentOps = useRecentOperationsContext();

  const {
    recentOperations,
    clearRecentOperations
  } = recentOps;

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          text: 'text-purple-900',
          accent: 'purple'
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          text: 'text-cyan-900',
          accent: 'cyan'
        };
    }
  };

  const colors = getThemeColors();

  // Filter operations by environment if specified
  const filteredOperations = environment 
    ? recentOperations.filter(op => op.environment === environment)
    : recentOperations;

  const toggleSection = () => {
    const sectionId = environment ? `${environment}-task-summary` : 'task-summary';
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: sectionId });
  };

  const getSectionCollapsedState = () => {
    const sectionId = environment ? `${environment}-task-summary` : 'task-summary';
    return app.collapsedSections?.has(sectionId) || false;
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${colors.border} overflow-hidden`}>
      <div
        className={`bg-gradient-to-r ${colors.headerGradient} px-6 py-4 cursor-pointer ${colors.hoverGradient} transition-all`}
        onClick={toggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Task Summary</h3>
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
                className="bg-red-500/30 hover:bg-red-500/50 text-white px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm font-medium"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
            <div className="p-0.5">
              {getSectionCollapsedState() ? (
                <ChevronDownIcon className="h-5 w-5 text-white" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {!getSectionCollapsedState() && (
        <div className="p-6">
          {filteredOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Recent Operations</p>
              <p className="text-sm">Operations will appear here as you use the system.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOperations.map((operation, idx) => (
                <div
                  key={operation.id || idx}
                  className={`flex items-center justify-between p-4 bg-gradient-to-r from-${colors.accent}-50 to-${colors.accent === 'purple' ? 'violet' : 'teal'}-50 rounded-lg border border-${colors.accent}-200 transition-all duration-200`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        operation.status?.includes('✅') ||
                        operation.status?.toLowerCase().includes('success')
                          ? 'bg-green-500'
                          : operation.status?.includes('❌') ||
                              operation.status?.toLowerCase().includes('failed')
                            ? 'bg-red-500'
                            : 'bg-blue-500 animate-pulse'
                      }`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${colors.text} truncate`}>
                        {operation.title}
                      </div>
                      <div className={`text-sm text-${colors.accent}-700 mt-1`}>
                        {operation.status}
                      </div>
                      {operation.playbook && (
                        <div className="text-xs text-gray-600 mt-1">
                          📋 {operation.playbook}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs text-${colors.accent}-600 ml-4 flex-shrink-0`}>
                    {formatTimestamp(operation.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskSummarySection;