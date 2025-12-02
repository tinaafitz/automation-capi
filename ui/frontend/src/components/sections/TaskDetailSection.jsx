import React from 'react';
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useRecentOperationsContext, useApp, useAppDispatch } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';

const TaskDetailSection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const recentOps = useRecentOperationsContext();

  const {
    recentOperations
  } = recentOps;

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-300',
          accent: 'purple'
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-300',
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
    const sectionId = environment ? `${environment}-task-detail` : 'task-detail';
    dispatch({ type: AppActionTypes.TOGGLE_SECTION, payload: sectionId });
  };

  const getSectionCollapsedState = () => {
    const sectionId = environment ? `${environment}-task-detail` : 'task-detail';
    return app.collapsedSections?.has(sectionId) || false;
  };

  const copyToClipboard = (e) => {
    e.stopPropagation();
    const outputText = filteredOperations
      .map((op) => {
        const lines = [op.title];
        if (op.playbook) lines.push(`📋 ${op.playbook}`);
        lines.push(op.status);
        lines.push(
          typeof op.timestamp === 'number'
            ? new Date(op.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })
            : op.timestamp
        );
        if (op.output) lines.push(op.output);
        return lines.join('\n');
      })
      .join('\n\n');
    
    navigator.clipboard.writeText(outputText).then(() => {
      // Could add notification here
      console.log('Output copied to clipboard');
    });
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 ${colors.border} overflow-hidden`}>
      <div
        className={`bg-gradient-to-r ${colors.headerGradient} px-6 py-4 flex items-center justify-between cursor-pointer ${colors.hoverGradient} transition-all`}
        onClick={toggleSection}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-full p-2">
            <DocumentTextIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Task Detail</h3>
            <div className="flex items-center space-x-2">
              <span className="text-white/80 text-sm">Command outputs and logs</span>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-md border border-green-500/30">
                {environment?.toUpperCase() || 'SYSTEM'} CAPI/CAPA
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {filteredOperations.length > 0 && (
            <button
              onClick={copyToClipboard}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              <span>Copy</span>
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

      {!getSectionCollapsedState() && (
        <div className="p-6 bg-gray-900">
          <div className="bg-black rounded-lg border border-gray-700 overflow-hidden">
            {/* Terminal Header */}
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-green-400 text-sm font-mono">Terminal Output</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            
            {/* Terminal Content */}
            <div className="p-4 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
              {filteredOperations.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No operations output yet
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOperations.map((op, idx) => (
                    <div key={op.id || idx} className="pb-4 border-b border-gray-700 last:border-0">
                      <div className="text-cyan-400 font-semibold mb-1">
                        [{formatTimestamp(op.timestamp)}] {op.title}
                      </div>
                      {op.playbook && (
                        <div className="text-yellow-400 ml-4 text-xs mb-1">
                          📋 {op.playbook}
                        </div>
                      )}
                      <div className="text-green-300 ml-4">{op.status}</div>
                      {op.output && (
                        <div className="text-gray-400 ml-4 mt-2 text-xs whitespace-pre-wrap">
                          {op.output}
                        </div>
                      )}
                      {op.error && (
                        <div className="text-red-400 ml-4 mt-2 text-xs whitespace-pre-wrap">
                          Error: {op.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailSection;