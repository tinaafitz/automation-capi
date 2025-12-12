import React, { useState } from 'react';
import { BeakerIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const TestSuiteDashboard = ({ theme = 'mce', onSelectTestSuite }) => {
  const [testSuiteCollapsed, setTestSuiteCollapsed] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState('4.21');
  const [expandedItems, setExpandedItems] = useState({});
  const [testItems, setTestItems] = useState([
    {
      id: 1,
      name: 'Comprehensive Cluster Configuration',
      category: 'Infrastructure',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-20464', 'ACM-20465', 'ACM-20467', 'ACM-20473', 'ACM-20480', 'ACM-20475'],
      description: 'Private + BYON + STS + Long Name + Availability Zones + Additional Tags',
      components: ['Private Network', 'BYON', 'STS', 'Long Cluster Name', 'Availability Zones', 'Additional Tags']
    },
    {
      id: 2,
      name: 'Security & Authentication Suite',
      category: 'Security',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-20481', 'ACM-20707'],
      description: 'Identity Provider + External OIDC + Security Groups + KMS',
      components: ['Identity Provider', 'External OIDC', 'Additional Security Groups', 'ETCD KMS Key']
    },
    {
      id: 3,
      name: 'Machine Pool & Auto-Scaling Suite',
      category: 'Scaling',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-20468', 'ACM-21076', 'ACM-21203'],
      description: 'All auto-scaling features + parallel upgrades',
      components: ['Default Machinepool Auto Scaling', 'Machine Pool Auto Scaling', 'Parallel Node Upgrade', 'Cluster Autoscaler Expanders']
    },
    {
      id: 4,
      name: 'Network & Connectivity Suite',
      category: 'Networking',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-20474'],
      description: 'CNI + Proxy + Audit logging configuration',
      components: ['No CNI Plugin', 'Proxy Enabled', 'Audit Log Forwarding']
    },
    {
      id: 5,
      name: 'Storage & Registry Configuration',
      category: 'Storage',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-21204', 'ACM-21207'],
      description: 'Image registry + disk volume configuration',
      components: ['Image Registry Config', 'Machinepool Disk Volume Size']
    },
    {
      id: 6,
      name: 'Domain & User Agent Configuration',
      category: 'Configuration',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: ['ACM-21075', 'ACM-21202'],
      description: 'Domain prefix + ROSA CAPA user agent',
      components: ['Domain Prefix', 'User Agent for ROSA CAPA']
    },
    {
      id: 7,
      name: 'Day2 Operations Suite',
      category: 'Operations',
      priority: 'P1',
      phase: 'Day2',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: [],
      description: 'Comprehensive Day2 operations testing',
      components: ['Cluster Management', 'Node Operations', 'Application Deployment', 'Monitoring']
    },
    {
      id: 8,
      name: 'Audit Log Forwarding',
      category: 'Logging',
      priority: 'P1',
      phase: 'Day1',
      selected: false,
      status: 'pending',
      duration: null,
      lastRun: null,
      jira: [],
      description: 'CloudWatch and S3 audit log forwarding (PR #5786)',
      components: ['CloudWatch Log Groups', 'S3 Bucket', 'IAM Role', 'Log Forwarding Config'],
      requiresSetup: true,
      setupTask: 'setup-rosa-log-forwarding'
    }
  ]);

  const themeColors = theme === 'mce' ? {
    headerGradient: 'from-cyan-600 to-blue-600',
    hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    badge: 'bg-cyan-100 text-cyan-800',
    accent: 'cyan'
  } : {
    headerGradient: 'from-purple-600 to-violet-600',
    hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800',
    accent: 'purple'
  };

  const handleProvisionSelected = async () => {
    const selectedTests = testItems.filter(item => item.selected);
    if (selectedTests.length === 0) {
      alert('Please select at least one test suite');
      return;
    }
    if (selectedTests.length > 1) {
      alert('Please select only one test suite at a time');
      return;
    }

    const selectedTest = selectedTests[0];

    // Check if test requires AWS prerequisite setup
    if (selectedTest.requiresSetup && selectedTest.setupTask) {
      const setupConfirm = window.confirm(
        `This test requires AWS prerequisites to be configured:\n\n` +
        `• CloudWatch Log Group\n` +
        `• IAM Role with appropriate permissions\n` +
        `• IAM Policy for log forwarding\n\n` +
        `Would you like to set up these prerequisites now?\n\n` +
        `This will run the "${selectedTest.setupTask}" task.`
      );

      if (setupConfirm) {
        // Call backend to run setup task
        try {
          const response = await fetch('/api/ansible/run-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              task_file: `tasks/${selectedTest.setupTask}.yml`,
              description: `Setup prerequisites for ${selectedTest.name}`,
              extra_vars: {
                cluster_name: `test-logforward-${Date.now()}`,
                setup_only: true
              }
            }),
          });

          if (response.ok) {
            alert('Setup task started! Check the Task Summary section for progress.');
          } else {
            alert('Failed to start setup task. You may need to run it manually.');
          }
        } catch (error) {
          console.error('Error starting setup task:', error);
          alert('Error starting setup task. You can run it manually:\n\nansible-playbook tasks/setup-rosa-log-forwarding.yml');
        }
      }
    }

    // Proceed to provision modal
    onSelectTestSuite && onSelectTestSuite(selectedTest);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          </div>
        );
      case 'passed':
        return (
          <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${themeColors.border} overflow-hidden mb-6`}>
      <div
        className={`bg-gradient-to-r ${themeColors.headerGradient} px-6 py-4 cursor-pointer ${themeColors.hoverGradient} transition-all`}
        onClick={() => setTestSuiteCollapsed(!testSuiteCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <BeakerIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Test Suite Dashboard</h3>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right mr-4">
              <div className="text-white/70 text-xs uppercase tracking-wide">Version</div>
              <div className="text-white font-bold text-2xl tracking-tight">{selectedVersion}</div>
            </div>
            {testSuiteCollapsed ? (
              <ChevronDownIcon className="h-6 w-6 text-white" />
            ) : (
              <ChevronUpIcon className="h-6 w-6 text-white" />
            )}
          </div>
        </div>
      </div>

        {!testSuiteCollapsed && (
          <div className="p-6">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Version:</span>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="4.21">4.21</option>
                  <option value="4.20">4.20</option>
                  <option value="4.19">4.19</option>
                  <option value="4.18">4.18</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const allSelected = testItems.every(item => item.selected);
                    setTestItems(prev => prev.map(item => ({
                      ...item,
                      selected: !allSelected
                    })));
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  {testItems.every(item => item.selected) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProvisionSelected();
                  }}
                  disabled={testItems.filter(item => item.selected).length === 0}
                  className={`px-6 py-2 bg-gradient-to-r ${themeColors.headerGradient} ${themeColors.hoverGradient} text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md`}
                >
                  🚀 Provision & Test Selected
                </button>
              </div>
            </div>

            {/* Test Suite Grid - Compact Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testItems.map((item) => (
                <div
                  key={item.id}
                  className={`border-2 rounded-lg transition-all ${
                    item.selected
                      ? `${themeColors.border} ${themeColors.bg} shadow-md`
                      : 'border-gray-200'
                  }`}
                >
                  {/* Tile Header - Clickable for selection */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setTestItems(prev => prev.map(test =>
                        test.id === item.id ? { ...test, selected: !test.selected } : test
                      ));
                    }}
                    className="p-4 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {item.name}
                            </h4>
                            {item.requiresSetup && (
                              <span
                                className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium"
                                title="Requires AWS prerequisite setup"
                              >
                                Setup Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-2">
                        {getStatusIcon(item.status)}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  <div className="px-4 pb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedItems(prev => ({
                          ...prev,
                          [item.id]: !prev[item.id]
                        }));
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                      {expandedItems[item.id] ? (
                        <>
                          <ChevronUpIcon className="h-3 w-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="h-3 w-3" />
                          Show details
                        </>
                      )}
                    </button>

                    {expandedItems[item.id] && (
                      <div className="mt-3 pb-2 space-y-2">
                        <p className="text-xs text-gray-600">{item.description}</p>

                        <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                          {item.components.map((comp, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Component clicked:', comp);
                              }}
                              className="hover:text-blue-600 hover:underline transition-colors"
                            >
                              {comp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default TestSuiteDashboard;
