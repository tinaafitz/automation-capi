/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import {
  ChartBarIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  BellIcon,
  PlusCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useRecentOperationsContext, useApiStatusContext } from '../../store/AppContext';

/**
 * JenkinsSidebar - Jenkins-style navigation sidebar for MCE environment
 *
 * Features:
 * - Navigation menu with icons
 * - Tasks section (expandable)
 * - Clean gray background matching Jenkins UI
 * - Active state highlighting
 */
const JenkinsSidebar = ({
  onComponentsClick,
  onConfigureClick,
  onReconfigureClick,
  onProvisionClick,
  onRosaHcpClustersClick,
  onResourcesClick,
  onEnvironmentsClick,
  onCredentialsClick,
  onTestClick,
  onTestSuiteDashboardClick,
  onTestAutomationClick,
  onHelmChartMatrixClick,
  onTerminalClick,
  onNotificationsClick,
  onRecentTasksClick,
  activeSection = 'environments',
  environment = 'mce' // 'mce' or 'minikube'
}) => {
  const [isRecentTasksExpanded, setIsRecentTasksExpanded] = useState(true);
  const recentOps = useRecentOperationsContext();
  const apiStatus = useApiStatusContext();

  // Get all recent operations for display in sidebar
  const recentTests = recentOps.recentOperations || [];

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon based on operation status
  const getStatusIcon = (status) => {
    if (!status) return '⏳';
    // Handle object status (with {status, output} structure)
    const statusStr = typeof status === 'object' ? (status.status || '') : String(status);
    if (statusStr.includes('✅') || statusStr.toLowerCase().includes('success') || statusStr.toLowerCase().includes('verified')) return '✅';
    if (statusStr.includes('❌') || (statusStr.toLowerCase().includes('fail') && !statusStr.toLowerCase().includes('configuration'))) return '❌';
    if (statusStr.includes('⚠️') || statusStr.toLowerCase().includes('warn')) return '⚠️';
    // Configuration Required is not a failure or running state - it's complete but needs action
    if (statusStr.includes('🆕') || statusStr.toLowerCase().includes('configuration required')) return '🆕';
    // Only show hourglass for things that are actually in progress
    if (statusStr.includes('⏳') || statusStr.toLowerCase().includes('running') || statusStr.toLowerCase().includes('verifying')) return '⏳';
    // Default for completed tasks without explicit status
    return '📄';
  };

  // Navigation menu items
  const allMenuItems = [
    {
      id: 'environments',
      label: 'Environments',
      icon: <span className="text-lg">🌍</span>,
      onClick: onEnvironmentsClick
    },
    {
      id: 'credentials',
      label: 'Credentials',
      icon: <span className="text-lg">🔑</span>,
      onClick: onCredentialsClick,
      showInEnvironments: ['mce'] // Only show in MCE, not minikube
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: <Cog6ToothIcon className="h-5 w-5" />,
      onClick: onConfigureClick
    },
    {
      id: 'reconfigure',
      label: 'Set Custom CAPA Image',
      icon: <ArrowPathIcon className="h-5 w-5" />,
      onClick: onReconfigureClick
    },
    {
      id: 'provision',
      label: 'Start New Provision',
      icon: <span className="text-lg">🚀</span>,
      onClick: onProvisionClick
    },
    {
      id: 'resources',
      label: 'Provision Resources',
      icon: <span className="text-lg">📄</span>,
      onClick: onResourcesClick
    },
    {
      id: 'rosa-hcp-clusters',
      label: 'ROSA HCP Clusters',
      icon: <span className="text-lg">☁️</span>,
      onClick: onRosaHcpClustersClick
    },
    {
      id: 'test-automation',
      label: 'Playbooks',
      icon: <ArrowPathIcon className="h-5 w-5" />,
      onClick: onTestAutomationClick
    },
    {
      id: 'helm-chart-matrix',
      label: 'Helm Chart Test Matrix',
      icon: <span className="text-lg">📊</span>,
      onClick: onHelmChartMatrixClick
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: <span className="text-lg">💻</span>,
      onClick: onTerminalClick
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon className="h-5 w-5" />,
      onClick: onNotificationsClick
    },
    {
      id: 'recent-tasks',
      label: 'Task Summary',
      icon: <ClockIcon className="h-5 w-5" />,
      onClick: onRecentTasksClick
    },
  ];

  // Filter menu items based on environment
  const menuItems = allMenuItems.filter(item => {
    // If item doesn't specify environments, show it in all environments
    if (!item.showInEnvironments) return true;
    // Otherwise, only show if current environment is in the list
    return item.showInEnvironments.includes(environment);
  });

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 flex flex-col h-full">
      {/* Sidebar Title */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-4 border-b border-blue-400 flex items-center h-[72px]">
        <h1 className="text-2xl font-bold text-white leading-tight">CAPA Automation</h1>
      </div>

      {/* Navigation Menu */}
      <div className="flex-shrink-0 border-b border-gray-300">
        <nav className="py-2">
          {menuItems.map((item) => (
            <div key={item.id}>
              {/* Menu Item */}
              <button
                onClick={() => {
                  if (typeof item.onClick === 'function') item.onClick();
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                  transition-colors
                  ${activeSection === item.id
                    ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className={activeSection === item.id
                  ? 'text-blue-600' : 'text-gray-500'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Recent Task Section */}
      {recentTests.length > 0 && (
        <div className="flex-1 border-t border-gray-300 bg-gray-100 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 text-sm text-gray-700 font-medium flex-shrink-0">
            Recent Tasks ({recentTests.length})
          </div>
          <div className="px-4 pb-3 space-y-2 flex-1 overflow-y-auto">
            {recentTests.map((task, index) => {
              const status = typeof task.status === 'object' ? task.status.status : task.status;
              const statusIcon = getStatusIcon(task.status);
              // Remove emoji from status text since we show it as an icon
              const statusText = String(status).replace(/✅|❌|⚠️|⏳/g, '').trim();

              return (
                <div
                  key={task.id || index}
                  onClick={onRecentTasksClick}
                  className="bg-white rounded border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {statusText}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-sm">{statusIcon}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sidebar Footer */}
      <div className="flex-shrink-0 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 text-xs text-blue-700 font-medium">
        <div>{environment === 'minikube' ? 'Minikube Environment' : 'MCE Environment'}</div>
      </div>
    </div>
  );
};

export default JenkinsSidebar;
