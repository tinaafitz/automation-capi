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
  onVerifyClick,
  onConfigureClick,
  onProvisionClick,
  onRosaHcpClustersClick,
  onResourcesClick,
  onEnvironmentsClick,
  onTestClick,
  onTestSuiteDashboardClick,
  onTestAutomationClick,
  onHelmChartMatrixClick,
  onTerminalClick,
  onNotificationsClick,
  onRecentTasksClick,
  activeSection = 'environments'
}) => {
  const [isRecentTasksExpanded, setIsRecentTasksExpanded] = useState(true);
  const [isProvisionExpanded, setIsProvisionExpanded] = useState(false);
  const [isTestExpanded, setIsTestExpanded] = useState(false);
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
    if (statusStr.includes('✅') || statusStr.toLowerCase().includes('success')) return '✅';
    if (statusStr.includes('❌') || statusStr.toLowerCase().includes('fail')) return '❌';
    if (statusStr.includes('⚠️') || statusStr.toLowerCase().includes('warn')) return '⚠️';
    return '⏳';
  };

  // Navigation menu items
  const menuItems = [
    {
      id: 'environments',
      label: 'Environments',
      icon: <span className="text-lg">🌍</span>,
      onClick: onEnvironmentsClick
    },
    {
      id: 'verify',
      label: 'Verify',
      icon: <CheckCircleIcon className="h-5 w-5" />,
      onClick: onVerifyClick
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: <Cog6ToothIcon className="h-5 w-5" />,
      onClick: onConfigureClick
    },
    {
      id: 'provision',
      label: 'Provision',
      icon: <PlusCircleIcon className="h-5 w-5" />,
      onClick: onProvisionClick
    },
    {
      id: 'rosa-hcp-clusters',
      label: 'ROSA HCP Clusters',
      icon: <span className="text-lg">☁️</span>,
      onClick: onRosaHcpClustersClick
    },
    {
      id: 'test',
      label: 'Test',
      icon: <span className="text-lg">🧪</span>,
      onClick: onTestClick
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
                  if (item.id === 'provision') {
                    setIsProvisionExpanded(!isProvisionExpanded);
                    item.onClick();
                  } else if (item.id === 'test') {
                    setIsTestExpanded(!isTestExpanded);
                    item.onClick();
                  } else {
                    item.onClick();
                  }
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                  transition-colors
                  ${activeSection === item.id ||
                    (item.id === 'provision' && activeSection === 'resources') ||
                    (item.id === 'test' && ['test-suite-dashboard', 'test-automation', 'helm-chart-matrix', 'test'].includes(activeSection))
                    ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className={activeSection === item.id ||
                  (item.id === 'provision' && activeSection === 'resources') ||
                  (item.id === 'test' && ['test-suite-dashboard', 'test-automation', 'helm-chart-matrix', 'test'].includes(activeSection))
                  ? 'text-blue-600' : 'text-gray-500'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {/* Show chevron for Provision and Test */}
                {(item.id === 'provision' || item.id === 'test') && (
                  <span className="text-gray-500">
                    {(item.id === 'provision' && isProvisionExpanded) ||
                     (item.id === 'test' && isTestExpanded) ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>

              {/* Provision Submenu */}
              {item.id === 'provision' && isProvisionExpanded && (
                <div className="bg-gray-50 border-y border-gray-200">
                  <div
                    onClick={onProvisionClick}
                    className={`px-8 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${
                      activeSection === 'provision' ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚀</span>
                      <span className="font-medium">Start New Provision</span>
                    </div>
                  </div>
                  <div
                    onClick={onResourcesClick}
                    className={`px-8 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${
                      activeSection === 'resources' ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📄</span>
                      <span className="font-medium">Provision Resources</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Submenu */}
              {item.id === 'test' && isTestExpanded && (
                <div className="bg-gray-50 border-y border-gray-200">
                  <div
                    onClick={onTestSuiteDashboardClick}
                    className={`px-8 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${
                      activeSection === 'test-suite-dashboard' ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4" />
                      <span className="font-medium">Test Suite Dashboard</span>
                    </div>
                  </div>
                  <div
                    onClick={onTestAutomationClick}
                    className={`px-8 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${
                      activeSection === 'test-automation' ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4" />
                      <span className="font-medium">Test Automation</span>
                    </div>
                  </div>
                  <div
                    onClick={onHelmChartMatrixClick}
                    className={`px-8 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 ${
                      activeSection === 'helm-chart-matrix' ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📊</span>
                      <span className="font-medium">Helm Chart Test Matrix</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="flex-shrink-0 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 text-xs text-blue-700 font-medium">
        <div>MCE Environment</div>
      </div>

      {/* Recent Task Section */}
      {recentTests.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-300 bg-gray-100">
          <div className="px-4 py-2.5 text-sm text-gray-700 font-medium">
            Recent Tasks
          </div>
          <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
            {recentTests.map((task, index) => {
              const status = typeof task.status === 'object' ? task.status.status : task.status;
              const statusIcon = getStatusIcon(task.status);
              // Remove emoji from status text since we show it as an icon
              const statusText = String(status).replace(/[✅❌⚠️⏳]/g, '').trim();

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
    </div>
  );
};

export default JenkinsSidebar;
