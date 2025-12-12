import React, { useState } from 'react';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useApp, useAppDispatch, useRecentOperationsContext } from '../../store/AppContext';
import { AppActionTypes } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';

const TaskSummarySection = ({ theme = 'mce', environment }) => {
  const app = useApp();
  const dispatch = useAppDispatch();
  const { jobHistory, loading, error, fetchJobHistory } = useJobHistory();
  const recentOps = useRecentOperationsContext();
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  console.log('🔍 [TaskSummarySection] jobHistory:', jobHistory.length, 'jobs, recentOps:', recentOps.recentOperations.length, 'environment:', environment);

  // Map jobs to look like recent operations for display
  const jobOperations = jobHistory.map(job => ({
    id: job.id,
    title: job.suite_title || job.description || 'Job',  // Use suite_title for test suites
    status: job.status === 'completed' ? `✅ ${job.message}` :
            job.status === 'running' ? `⏳ ${job.message}` :
            job.status === 'failed' ? `❌ ${job.message}` : job.message,
    timestamp: new Date(job.created_at || job.started_at).getTime(),  // Handle both created_at and started_at
    environment: job.environment || (  // Use job.environment if set (test suites set this)
                 job.description?.toLowerCase().includes('rosa') ||
                 job.description?.toLowerCase().includes('mce') ||
                 job.description?.toLowerCase().includes('capi') ? 'mce' : 'minikube'),
    playbook: job.yaml_file,
    output: job.logs?.join('\n') || '',
    detailedOutput: job.playbook_results?.map(r => r.output).join('\n\n---\n\n') || '',  // Full ansible output
    type: job.type  // Include type so we can identify test suites
  }));

  // Convert recent operations to have consistent timestamp format
  const frontendOperations = recentOps.recentOperations.map(op => ({
    ...op,
    timestamp: typeof op.timestamp === 'string' ? new Date(op.timestamp).getTime() : op.timestamp
  }));

  // Combine both sources and sort by timestamp
  const recentOperations = [...jobOperations, ...frontendOperations]
    .sort((a, b) => b.timestamp - a.timestamp);

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

  console.log('📊 [TaskSummarySection] Total operations:', recentOperations.length, 'Filtered:', filteredOperations.length);

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
          hour12: true
        });
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  const toggleTaskDetails = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
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
              <p className="text-xs mt-2">Tasks will appear here when you submit provisioning jobs</p>
            </div>
          ) : (
          <div className="space-y-3">
              {filteredOperations.map((operation, idx) => {
                const taskId = operation.id || idx;
                const isExpanded = expandedTasks.has(taskId);
                const hasDetails = operation.output || operation.detailedOutput;

                return (
                <div
                  key={taskId}
                  className={`bg-gradient-to-r from-${colors.accent}-50 to-${colors.accent === 'purple' ? 'violet' : 'teal'}-50 rounded-lg border border-${colors.accent}-200 transition-all duration-200`}
                >
                  {/* Task Summary Row */}
                  <div className="flex items-center justify-between p-4">
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
                    <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                      <div className={`text-xs text-${colors.accent}-600`}>
                        {formatTimestamp(operation.timestamp)}
                      </div>
                      {hasDetails && (
                        <button
                          onClick={() => toggleTaskDetails(taskId)}
                          className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center space-x-1 ${
                            isExpanded
                              ? `bg-${colors.accent}-600 text-white`
                              : `bg-${colors.accent}-100 text-${colors.accent}-700 hover:bg-${colors.accent}-200`
                          }`}
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Details Section */}
                  {isExpanded && hasDetails && (
                    <div className="border-t border-gray-200 bg-white/50 p-4">
                      <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto font-mono">
                        {operation.detailedOutput || operation.output}
                      </pre>
                    </div>
                  )}
                </div>
              )})}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskSummarySection;