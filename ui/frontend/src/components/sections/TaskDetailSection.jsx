import React from 'react';
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useApp, useAppDispatch, useRecentOperationsContext } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';

const TaskDetailSection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const { jobHistory, loading, error } = useJobHistory();
  const recentOps = useRecentOperationsContext();

  // Map jobs to look like recent operations for display
  const jobOperations = jobHistory.map(job => ({
    id: job.id,
    title: job.description || 'Job',
    status: job.status === 'completed' ? `✅ ${job.message}` :
            job.status === 'running' ? `⏳ ${job.message}` :
            job.status === 'failed' ? `❌ ${job.message}` : job.message,
    timestamp: new Date(job.created_at || job.started_at).getTime(),
    environment: job.environment || (  // Use job.environment if set
                 job.description?.toLowerCase().includes('rosa') ||
                 job.description?.toLowerCase().includes('mce') ? 'mce' : 'minikube'),
    playbook: job.yaml_file,
    output: job.logs?.join('\n') || ''
  }));

  // Convert recent operations to have consistent timestamp format
  const frontendOperations = recentOps.recentOperations.map(op => ({
    ...op,
    timestamp: typeof op.timestamp === 'string' ? new Date(op.timestamp).getTime() : op.timestamp
  }));

  // Combine both sources and sort by timestamp
  const recentOperations = [...jobOperations, ...frontendOperations]
    .sort((a, b) => b.timestamp - a.timestamp);

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

      {/* Collapsible Content - Show operation details */}
      {!getSectionCollapsedState() && (
        <div className="p-6 space-y-4">
          {filteredOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No task details available</p>
              <p className="text-xs mt-2">Detailed logs will appear here when tasks are running</p>
            </div>
          ) : (
            // Show all tasks with full details
            filteredOperations.map((operation, idx) => (
            <div
              key={operation.id || idx}
              className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-3"
            >
              {/* Operation Title */}
              <div className="flex items-start justify-between">
                <h4 className="text-white font-semibold text-lg">
                  {operation.title}
                </h4>
                <span className="text-gray-400 text-sm whitespace-nowrap ml-4">
                  {formatTimestamp(operation.timestamp)}
                </span>
              </div>

              {/* Playbook Info */}
              {operation.playbook && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">📋</span>
                  <span className="text-gray-300 font-mono">{operation.playbook}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    operation.status?.includes('✅') ||
                    operation.status?.toLowerCase().includes('success')
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : operation.status?.includes('❌') ||
                          operation.status?.toLowerCase().includes('failed')
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {operation.status}
                </span>
              </div>

              {/* Output Details */}
              {operation.output && (
                <div className="mt-3">
                  <pre className="bg-gray-900/80 rounded-lg p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap border border-gray-700">
                    {operation.output}
                  </pre>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      )}

    </div>
  );
};

export default TaskDetailSection;