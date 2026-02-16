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
  onCredentialsClick,
  onTestClick,
  onTestSuiteDashboardClick,
  onTestAutomationClick,
  onHelmChartMatrixClick,
  onTerminalClick,
  onNotificationsClick,
  activeSection = 'environments'
}) => {
  const [isRecentTestsExpanded, setIsRecentTestsExpanded] = useState(true);
  const [isProvisionExpanded, setIsProvisionExpanded] = useState(false);
  const recentOps = useRecentOperationsContext();
  const apiStatus = useApiStatusContext();

  // Get recent test operations (last 5)
  const recentTests = recentOps.recentOperations
    ?.filter(op => op.environment === 'mce')
    .slice(0, 5) || [];

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

  // Navigation menu items with sections
  const menuSections = [
    {
      title: 'Setup & Configuration',
      items: [
        {
          id: 'credentials',
          label: 'Credentials',
          icon: <span className="text-lg">🔑</span>,
          onClick: onCredentialsClick
        },
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
      ]
    },
    {
      title: 'Cluster Management',
      items: [
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
      ]
    },
    {
      title: 'Testing',
      items: [
        {
          id: 'test-suite-dashboard',
          label: 'Test Suite Dashboard',
          icon: <ChartBarIcon className="h-5 w-5" />,
          onClick: onTestSuiteDashboardClick
        },
        {
          id: 'test-automation',
          label: 'Test Automation',
          icon: <ArrowPathIcon className="h-5 w-5" />,
          onClick: onTestAutomationClick
        },
        {
          id: 'helm-chart-matrix',
          label: 'Helm Chart Test Matrix',
          icon: <span className="text-lg">📊</span>,
          onClick: onHelmChartMatrixClick
        },
      ]
    },
    {
      title: 'Utilities',
      items: [
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
      ]
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
          {menuSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {/* Section Header */}
              <div className="px-4 pt-3 pb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              {section.items.map((item) => (
                <div key={item.id}>
                  {/* Menu Item */}
                  <button
                    onClick={() => {
                      if (item.id === 'provision') {
                        setIsProvisionExpanded(!isProvisionExpanded);
                        item.onClick();
                      } else {
                        item.onClick();
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                      transition-colors
                      ${activeSection === item.id ||
                        (item.id === 'provision' && activeSection === 'resources')
                        ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className={activeSection === item.id ||
                      (item.id === 'provision' && activeSection === 'resources')
                      ? 'text-blue-600' : 'text-gray-500'}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {/* Show chevron for Provision */}
                    {item.id === 'provision' && (
                      <span className="text-gray-500">
                        {isProvisionExpanded ? (
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
            </div>
          ))}

              {/* Section Divider - Add after each section except the last */}
              {sectionIndex < menuSections.length - 1 && (
                <div className="border-t border-gray-300 my-2"></div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Recent Tasks Section */}
      <div className="flex-1 overflow-y-auto border-t border-gray-300 mt-2">
        <div className="py-2">
          {/* Section Header */}
          <button
            onClick={() => setIsRecentTestsExpanded(!isRecentTestsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span>Recent Tasks</span>
            </div>
            {isRecentTestsExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Tasks List */}
          {isRecentTestsExpanded && (
            <div className="mt-1 space-y-1 px-2">
              {recentTests.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">
                  No recent tasks
                </div>
              ) : (
                recentTests.map((test, index) => (
                  <div
                    key={test.id || index}
                    className="px-3 py-2 text-xs bg-white border border-gray-200 rounded hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                    title={test.title}
                  >
                    {/* Test Title */}
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-base leading-none mt-0.5">
                        {getStatusIcon(test.status)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {test.title}
                        </div>
                      </div>
                    </div>
                    {/* Test Status */}
                    <div className="ml-6 text-gray-600 truncate">
                      {typeof test.status === 'object' ? test.status?.status || 'Unknown' : test.status}
                    </div>
                    {/* Test Timestamp */}
                    {test.timestamp && (
                      <div className="ml-6 text-gray-400 mt-1">
                        {formatTime(test.timestamp)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="flex-shrink-0 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 text-xs text-blue-700 font-medium">
        <div>MCE Environment</div>
      </div>
    </div>
  );
};

export default JenkinsSidebar;
