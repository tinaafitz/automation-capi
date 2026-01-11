import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useApp, useAppDispatch, useRecentOperationsContext } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';

const TaskSummarySection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const { jobHistory, loading, error, fetchJobHistory } = useJobHistory();
  const recentOps = useRecentOperationsContext();
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  console.log(
    '🔍 [TaskSummarySection] jobHistory:',
    jobHistory.length,
    'jobs, recentOps:',
    recentOps.recentOperations.length,
    'environment:',
    environment
  );

  // Map jobs to look like recent operations for display
  const jobOperations = jobHistory.map((job) => ({
    id: job.id,
    title: job.suite_title || job.description || 'Job', // Use suite_title for test suites
    status:
      job.status === 'completed'
        ? `✅ ${job.message}`
        : job.status === 'running'
          ? `⏳ ${job.message}`
          : job.status === 'failed'
            ? `❌ ${job.message}`
            : job.message,
    timestamp: new Date(job.created_at || job.started_at).getTime(), // Handle both created_at and started_at
    environment:
      job.environment || // Use job.environment if set (test suites set this)
      (job.description?.toLowerCase().includes('rosa') ||
      job.description?.toLowerCase().includes('mce') ||
      job.description?.toLowerCase().includes('capi')
        ? 'mce'
        : 'minikube'),
    playbook: job.yaml_file,
    output: job.logs?.join('\n') || '',
    detailedOutput: job.playbook_results?.map((r) => r.output).join('\n\n---\n\n') || '', // Full ansible output
    type: job.type, // Include type so we can identify test suites
  }));

  // Convert recent operations to have consistent timestamp format
  const frontendOperations = recentOps.recentOperations.map((op) => ({
    ...op,
    timestamp: typeof op.timestamp === 'string' ? new Date(op.timestamp).getTime() : op.timestamp,
  }));

  // Combine both sources and sort by timestamp
  const recentOperations = [...jobOperations, ...frontendOperations].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const clearRecentOperations = async () => {
    try {
      // Clear backend job history
      const response = await fetch('http://localhost:8000/api/jobs', {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ [TaskSummarySection] Jobs cleared successfully');
        // Refresh to show empty list
        fetchJobHistory();
      } else {
        console.error('❌ [TaskSummarySection] Failed to clear jobs');
      }

      // Also clear frontend recent operations
      recentOps.clearRecentOperations();
    } catch (error) {
      console.error('❌ [TaskSummarySection] Error clearing jobs:', error);
    }
  };

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          text: 'text-purple-900',
          accent: 'purple',
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          text: 'text-cyan-900',
          accent: 'cyan',
        };
    }
  };

  const colors = getThemeColors();

  // Filter operations by environment if specified
  const filteredOperations = environment
    ? recentOperations.filter((op) => op.environment === environment)
    : recentOperations;

  console.log(
    '📊 [TaskSummarySection] Total operations:',
    recentOperations.length,
    'Filtered:',
    filteredOperations.length
  );

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
        return new Date(timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  const toggleTaskDetails = (taskId) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Get status icon and color
  const getStatusDisplay = (status) => {
    if (status?.includes('✅') || status?.toLowerCase().includes('success') || status?.toLowerCase().includes('completed')) {
      return {
        icon: <CheckCircleIcon className="h-5 w-5" />,
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        dotColor: 'bg-green-500',
      };
    }
    if (status?.includes('❌') || status?.toLowerCase().includes('failed') || status?.toLowerCase().includes('error')) {
      return {
        icon: <XCircleIcon className="h-5 w-5" />,
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        dotColor: 'bg-red-500',
      };
    }
    if (status?.includes('⏳') || status?.toLowerCase().includes('running') || status?.toLowerCase().includes('pending')) {
      return {
        icon: <ArrowPathIcon className="h-5 w-5 animate-spin" />,
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        dotColor: 'bg-blue-500 animate-pulse',
      };
    }
    return {
      icon: <ClockIcon className="h-5 w-5" />,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-500/30',
      dotColor: 'bg-gray-500',
    };
  };

  // Copy individual task output
  const copyTaskOutput = (e, operation) => {
    e.stopPropagation();
    const lines = [operation.title];
    if (operation.playbook) lines.push(`📋 ${operation.playbook}`);
    lines.push(operation.status);
    lines.push(formatTimestamp(operation.timestamp));
    if (operation.detailedOutput || operation.output) {
      lines.push('\n' + (operation.detailedOutput || operation.output));
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      console.log('Task output copied to clipboard');
    });
  };

  // Parse ANSI color codes and convert to HTML
  const parseAnsiColors = (text) => {
    if (!text) return '';

    // Remove ANSI escape codes and return plain text for now
    // In a production app, you'd want to use a library like ansi-to-html
    return text.replace(/\x1B\[[0-9;]*m/g, '');
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
              <p className="text-sm">No recent tasks</p>
              <p className="text-xs mt-2">
                Tasks will appear here when you submit provisioning jobs
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOperations.map((operation, idx) => {
                const taskId = operation.id || idx;
                const isExpanded = expandedTasks.has(taskId);
                const hasDetails = operation.output || operation.detailedOutput;
                const statusDisplay = getStatusDisplay(operation.status);

                return (
                  <div
                    key={taskId}
                    className={`bg-white rounded-lg border-2 ${statusDisplay.borderColor} overflow-hidden hover:border-opacity-60 transition-all shadow-sm`}
                  >
                    {/* Task Summary Row */}
                    <div className="p-4 space-y-3">
                      {/* Title and Timestamp */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${statusDisplay.dotColor} flex-shrink-0 mt-2`}></div>
                          <h4 className={`font-semibold text-base flex-1 ${colors.text}`}>
                            {operation.title}
                          </h4>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {formatTimestamp(operation.timestamp)}
                        </span>
                      </div>

                      {/* Playbook Info */}
                      {operation.playbook && (
                        <div className="flex items-center space-x-2 text-sm pl-5">
                          <span className="text-gray-400">📋</span>
                          <span className="text-gray-600 font-mono text-xs">{operation.playbook}</span>
                        </div>
                      )}

                      {/* Status Badge and Actions */}
                      <div className="flex items-center justify-between pl-5">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusDisplay.bgColor} ${statusDisplay.textColor} border ${statusDisplay.borderColor}`}
                        >
                          {statusDisplay.icon}
                          <span>{operation.status}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Copy Button */}
                          <button
                            onClick={(e) => copyTaskOutput(e, operation)}
                            className={`px-2 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center space-x-1 bg-${colors.accent}-100 text-${colors.accent}-700 hover:bg-${colors.accent}-200`}
                            title="Copy task output"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>

                          {/* View Details Button */}
                          {hasDetails && (
                            <button
                              onClick={() => toggleTaskDetails(taskId)}
                              className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center space-x-1 ${
                                isExpanded
                                  ? `bg-${colors.accent}-600 text-white hover:bg-${colors.accent}-700`
                                  : `bg-${colors.accent}-100 text-${colors.accent}-700 hover:bg-${colors.accent}-200`
                              }`}
                            >
                              <DocumentTextIcon className="h-4 w-4" />
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Details Section with Terminal Style */}
                    {isExpanded && hasDetails && (
                      <div className="border-t-2 border-gray-200 bg-gray-50">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700/50 flex items-center justify-between">
                          <span className="text-green-400 text-xs font-mono font-semibold">OUTPUT</span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                          </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto bg-gray-900">
                          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                            {parseAnsiColors(operation.detailedOutput || operation.output)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

TaskSummarySection.propTypes = {
  theme: PropTypes.string,
  environment: PropTypes.string,
};

export default TaskSummarySection;
