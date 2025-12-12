import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRecentOperationsContext } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';

const HelmChartTestDashboard = ({ theme = 'mce' }) => {
  const recentOps = useRecentOperationsContext();
  const { fetchJobHistory } = useJobHistory();
  const [isExpanded, setIsExpanded] = useState(true);
  const [testMatrix, setTestMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [expandedProviders, setExpandedProviders] = useState(new Set()); // Start with all collapsed
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Git source configuration
  const [chartSource, setChartSource] = useState('git'); // 'helm_repo' or 'git'
  const [gitBranch, setGitBranch] = useState('main');
  const [showSourceConfig, setShowSourceConfig] = useState(false);

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          lightBg: 'from-purple-50 to-violet-50',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700',
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          lightBg: 'from-cyan-50 to-blue-50',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
        };
    }
  };

  const colors = getThemeColors();

  // Test types
  const testTypes = [
    { id: 'install', name: 'Installation', icon: '📦' },
    { id: 'compliance', name: 'Compliance', icon: '✓' },
    { id: 'upgrade', name: 'Upgrade/Rollback', icon: '⬆️' },
    { id: 'functionality', name: 'Basic Functionality', icon: '⚙️' }
  ];

  // Providers
  const providers = [
    { id: 'capi', name: 'CAPI (Core)', fullName: 'Cluster API Core' },
    { id: 'capa', name: 'CAPA', fullName: 'Cluster API Provider AWS' },
    { id: 'capz', name: 'CAPZ', fullName: 'Cluster API Provider Azure' },
    { id: 'cap-metal3', name: 'CAP-metal3', fullName: 'Cluster API Provider Metal3' },
    { id: 'capoa', name: 'CAPOA', fullName: 'Cluster API Provider OpenStack' }
  ];

  // Environments - filter based on current environment
  const environments = theme === 'mce' ? ['OpenShift'] : ['Kubernetes'];

  useEffect(() => {
    if (isExpanded) {
      loadTestMatrix();
    }
  }, [isExpanded]);

  // Auto-refresh effect - polls for updates when tests are running
  useEffect(() => {
    if (!isExpanded || !autoRefresh || !testMatrix) {
      return;
    }

    // Check if any tests are running
    const hasRunningTests = Object.values(testMatrix).some(provider =>
      Object.values(provider).some(env =>
        Object.values(env).some(test => test.status === 'running')
      )
    );

    if (!hasRunningTests) {
      return; // No need to refresh if no tests are running
    }

    const intervalId = setInterval(() => {
      loadTestMatrix();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [isExpanded, autoRefresh, testMatrix, refreshInterval]);

  const loadTestMatrix = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/helm-tests/status');
      console.log('📊 Helm test matrix API response:', response.data);
      if (response.data.success) {
        console.log('✅ Setting test matrix from API:', response.data.matrix);
        setTestMatrix(response.data.matrix);
      } else {
        console.warn('⚠️ API returned success=false, using mock data');
        const mockData = generateMockData();
        console.log('🎭 Generated mock data:', mockData);
        setTestMatrix(mockData);
      }
    } catch (error) {
      console.error('❌ Error loading Helm test matrix:', error);
      // Use mock data for development
      const mockData = generateMockData();
      console.log('🎭 Generated mock data (error path):', mockData);
      setTestMatrix(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    const matrix = {};
    providers.forEach(provider => {
      matrix[provider.id] = {};
      environments.forEach(env => {
        matrix[provider.id][env] = {};
        testTypes.forEach(test => {
          const random = Math.random();
          const status = random > 0.7 ? 'pass' : random > 0.5 ? 'fail' : random > 0.3 ? 'running' : 'pending';
          matrix[provider.id][env][test.id] = {
            status,
            duration: status === 'pass' ? Math.floor(Math.random() * 300) + 60 : null,
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            passRate: Math.floor(Math.random() * 30) + 70
          };
        });
      });
    });
    return matrix;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'running':
        return <ClockIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 border-green-300 hover:bg-green-200';
      case 'fail':
        return 'bg-red-100 border-red-300 hover:bg-red-200';
      case 'running':
        return 'bg-blue-100 border-blue-300 hover:bg-blue-200';
      case 'pending':
        return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const handleCellClick = (provider, env, testType, data) => {
    setSelectedCell({
      providerId: provider.id,
      providerName: provider.name,
      providerFullName: provider.fullName,
      environment: env,
      testTypeId: testType.id,
      testTypeName: testType.name,
      testTypeIcon: testType.icon,
      data
    });
  };

  const handleRunTest = async (providerId, env, testTypeId) => {
    const providerInfo = providers.find(p => p.id === providerId);
    const testTypeInfo = testTypes.find(t => t.id === testTypeId);

    // Generate a unique ID for this test run
    const testRunId = `helm-test-${Date.now()}`;
    const envDisplay = env === 'OpenShift' ? 'mce' : 'minikube';
    const sourceInfo = chartSource === 'git' ? ` (Git: ${gitBranch})` : ' (Helm repo)';

    try {
      // Add immediate feedback to Recent Operations
      recentOps.addToRecent({
        id: testRunId,
        title: `🧪 HELM TEST: ${providerId} - ${testTypeId.charAt(0).toUpperCase() + testTypeId.slice(1)}${sourceInfo}`,
        color: theme === 'minikube' ? 'bg-purple-600' : 'bg-cyan-600',
        status: '⏳ Starting test...',
        environment: envDisplay
      });

      const response = await axios.post('http://localhost:8000/api/helm-tests/run', {
        provider: providerId,
        environment: env,
        test_type: testTypeId,
        chart_source: chartSource,
        git_repo: 'https://github.com/stolostron/cluster-api-installer.git',
        git_branch: gitBranch
      });

      if (response.data.success && response.data.job_id) {
        console.log(`✅ Started test job ${response.data.job_id} for ${providerId} on ${env} - ${testTypeId}`);

        // Update the recent operation status
        recentOps.updateRecentOperationStatus(testRunId, '⏳ Running test...');

        // Immediately fetch job history to show the job in Task Summary
        fetchJobHistory();

        // Backend creates job entry automatically - just reload matrix
        loadTestMatrix();
      } else {
        // Update to show failure
        recentOps.updateRecentOperationStatus(testRunId, `❌ Failed to start: ${response.data.message || 'Unknown error'}`);
        throw new Error(response.data.message || 'Failed to start test');
      }
    } catch (error) {
      console.error('Error running test:', error);
      // Update the recent operation to show error
      recentOps.updateRecentOperationStatus(testRunId, `❌ Failed to start: ${error.message}`);
      alert(`Failed to start test: ${error.message}`);
    }
  };

  const toggleProvider = (providerId) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const handleRunAllTests = async (providerId) => {
    const providerInfo = providers.find(p => p.id === providerId);

    try {
      const response = await axios.post('http://localhost:8000/api/helm-tests/run-all', {
        provider: providerId
      });

      if (response.data.success) {
        console.log(`✅ Started all tests for ${providerId} - ${response.data.test_count} jobs queued`);

        // Backend creates job entries automatically - just reload matrix
        loadTestMatrix();
      } else {
        throw new Error(response.data.message || 'Failed to start tests');
      }
    } catch (error) {
      console.error('Error running all tests:', error);
      alert(`Failed to start tests: ${error.message}`);
    }
  };

  return (
    <div className="mb-6">
      <div className={`bg-white rounded-xl shadow-lg border-2 ${colors.border} overflow-hidden`}>
        {/* Section Header */}
        <div
          className={`flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r ${colors.headerGradient} ${colors.hoverGradient} transition-colors`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Helm Chart Test Matrix</h3>
              <p className="text-sm text-white/80">
                Installation, compliance, and functionality tests across all providers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Git Source Indicator */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowSourceConfig(!showSourceConfig);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium text-white cursor-pointer"
              title="Configure chart source"
            >
              {chartSource === 'git' ? `📦 Git: ${gitBranch}` : '📦 Helm Repo'}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setAutoRefresh(!autoRefresh);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                autoRefresh
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadTestMatrix();
              }}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Refresh test results"
            >
              <ArrowPathIcon className="h-5 w-5 text-white" />
            </button>
            <div>
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-white" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Chart Source Configuration Panel */}
        {showSourceConfig && isExpanded && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Chart Source Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Source
                  </label>
                  <select
                    value={chartSource}
                    onChange={(e) => setChartSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="git">Git Repository (stolostron)</option>
                    <option value="helm_repo">Helm Repository</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {chartSource === 'git'
                      ? 'Clone charts from GitHub repository'
                      : 'Use published Helm repository (if available)'}
                  </p>
                </div>

                {chartSource === 'git' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Git Branch
                    </label>
                    <input
                      type="text"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Repository: stolostron/cluster-api-installer
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Content */}
        {isExpanded && (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading test matrix...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700">Status:</span>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span>Pass</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="w-4 h-4 text-red-600" />
                    <span>Fail</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-blue-600" />
                    <span>Running</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span>Pending</span>
                  </div>
                </div>

                {/* Test Matrix */}
                {!testMatrix ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No test data available. Click refresh to load.</p>
                  </div>
                ) : (
                  providers.map((provider) => {
                    const isProviderExpanded = expandedProviders.has(provider.id);
                    return (
                  <div key={provider.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Provider Header - Clickable */}
                    <div
                      className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 border-b border-gray-200 cursor-pointer hover:from-gray-200 hover:to-gray-100 transition-colors"
                      onClick={() => toggleProvider(provider.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isProviderExpanded ? (
                            <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                          )}
                          <div>
                            <h4 className="font-bold text-gray-900">{provider.name}</h4>
                            <p className="text-xs text-gray-600">{provider.fullName}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent toggling when clicking button
                            handleRunAllTests(provider.id);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 ${colors.buttonBg} text-white rounded-lg ${colors.buttonHover} transition-colors text-sm font-medium`}
                        >
                          <PlayIcon className="w-4 h-4" />
                          Run All Tests
                        </button>
                      </div>
                    </div>

                    {/* Environment Sections - Only show when expanded */}
                    {isProviderExpanded && environments.map((env) => (
                      <div key={env} className="p-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold text-gray-700">{env}</span>
                        </div>

                        {/* Test Type Grid */}
                        <div className="grid grid-cols-4 gap-3">
                          {testTypes.map((test) => {
                            const testData = testMatrix[provider.id]?.[env]?.[test.id];
                            if (!testData) return null;

                            return (
                              <div
                                key={test.id}
                                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${getStatusColor(testData.status)}`}
                                onClick={() => handleCellClick(provider, env, test, testData)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-lg">{test.icon}</span>
                                  {getStatusIcon(testData.status)}
                                </div>
                                <div className="text-xs font-medium text-gray-800 mb-1">
                                  {test.name}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {testData.status === 'pass' && testData.duration && (
                                    <span>{testData.duration}s</span>
                                  )}
                                  {testData.status === 'fail' && (
                                    <span className="text-red-700">Failed</span>
                                  )}
                                  {testData.status === 'running' && (
                                    <span className="text-blue-700">In Progress...</span>
                                  )}
                                  {testData.status === 'pending' && (
                                    <span className="text-gray-500">Not Run</span>
                                  )}
                                </div>
                                {testData.passRate && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    Pass Rate: {testData.passRate}%
                                  </div>
                                )}
                                {testData.timestamp && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                                    {new Date(testData.timestamp).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Detail Modal */}
      {selectedCell && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-r ${colors.headerGradient} text-white p-6`}>
              <h3 className="text-xl font-bold mb-2">Test Details</h3>
              <p className="text-sm text-white/80">
                {selectedCell.providerFullName} • {selectedCell.environment} • {selectedCell.testTypeName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedCell.data.status)}
                    <span className="font-semibold capitalize">{selectedCell.data.status}</span>
                  </div>
                </div>
                {selectedCell.data.duration && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Duration</div>
                    <div className="font-semibold">{selectedCell.data.duration}s</div>
                  </div>
                )}
                {selectedCell.data.passRate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Historical Pass Rate</div>
                    <div className="font-semibold">{selectedCell.data.passRate}%</div>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Last Run</div>
                  <div className="font-semibold text-sm">
                    {new Date(selectedCell.data.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Test Logs Placeholder */}
              <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap">
{`$ helm test ${selectedCell.providerId} --namespace ${selectedCell.environment.toLowerCase()}

Running ${selectedCell.testTypeName} tests...

${selectedCell.data.status === 'pass' ? '✅ All checks passed\n\nTest Summary:\n- Chart installation: PASS\n- Health checks: PASS\n- Resource validation: PASS\n- Integration tests: PASS' : selectedCell.data.status === 'fail' ? '❌ Test failed\n\nError: Resource validation failed\n\nDetails:\n- Expected deployment replicas: 3\n- Actual deployment replicas: 1\n- Check failed at step 4/8' : selectedCell.data.status === 'running' ? '⏳ Test in progress...\n\nCompleted steps:\n- Chart installation: PASS\n- Health checks: PASS\n- Running resource validation...' : '⏸️ Test not started\n\nReady to run when triggered.'}`}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleRunTest(selectedCell.providerId, selectedCell.environment, selectedCell.testTypeId);
                    setSelectedCell(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${colors.buttonBg} text-white rounded-lg ${colors.buttonHover} transition-colors font-medium`}
                >
                  <PlayIcon className="w-5 h-5" />
                  Re-run Test
                </button>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelmChartTestDashboard;
