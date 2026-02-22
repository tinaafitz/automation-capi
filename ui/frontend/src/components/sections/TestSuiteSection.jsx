import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRecentOperationsContext } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';
import { RosaProvisionModal } from '../RosaProvisionModal';

const TestSuiteSection = () => {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [playbookResults, setPlaybookResults] = useState(null);
  const [isRunningPlaybook, setIsRunningPlaybook] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const recentOps = useRecentOperationsContext();
  const { jobHistory } = useJobHistory();

  // Check if a playbook is currently running
  const isPlaybookRunning = (suiteName) => {
    return jobHistory.some((job) => job.yaml_file === suiteName && job.status === 'running');
  };

  // Categorize playbook based on name and tags
  const categorizePlaybook = (suite) => {
    const name = suite.config.name.toLowerCase();
    const tags = suite.config.tags || [];

    if (name.includes('verify') || name.includes('validation')) {
      return 'validation';
    } else if (name.includes('configure') || name.includes('setup') || name.includes('enable') || name.includes('disable')) {
      return 'configuration';
    } else if (name.includes('provision') || name.includes('create')) {
      return 'provisioning';
    } else if (name.includes('delete') || name.includes('cleanup') || name.includes('remove')) {
      return 'cleanup';
    }
    return 'other';
  };

  // Get category label
  const getCategoryLabel = (category) => {
    switch (category) {
      case 'validation':
        return 'Validation';
      case 'configuration':
        return 'Configuration';
      case 'provisioning':
        return 'Provisioning';
      case 'cleanup':
        return 'Cleanup';
      default:
        return 'Other';
    }
  };

  // Group suites by category
  const groupedSuites = suites.reduce((acc, suite) => {
    const category = categorizePlaybook(suite);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(suite);
    return acc;
  }, {});

  // Define category order
  const categoryOrder = ['validation', 'configuration', 'provisioning', 'cleanup', 'other'];

  // Check if suite needs provisioning options
  const needsProvisioningOptions = (suite) => {
    return (
      suite.config.tags?.includes('provisioning') ||
      suite.config.tags?.includes('rosa-provisioning') ||
      suite.id.includes('provision')
    );
  };


  useEffect(() => {
    loadSuites();
    checkForRunningPlaybooks();
  }, []);

  // Check for running playbook jobs and restore/clear state
  const checkForRunningPlaybooks = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/jobs');
      if (response.data.success && response.data.jobs) {
        // Find any running test-suite jobs
        const runningTestSuiteJob = response.data.jobs.find(
          (job) => job.status === 'running' && job.type === 'test-suite'
        );

        if (runningTestSuiteJob) {
          console.log('📦 Found running playbook job:', runningTestSuiteJob.id);

          // Fetch current logs
          const logsResponse = await axios.get(`http://localhost:8000/api/jobs/${runningTestSuiteJob.id}/logs`);
          const currentOutput = logsResponse.data.logs ? logsResponse.data.logs.join('\n') : '';

          // Set playbook results to show the running job
          setPlaybookResults({
            success: true,
            timestamp: new Date().toISOString(),
            suiteName: runningTestSuiteJob.suite_title || runningTestSuiteJob.description || 'Unknown Playbook',
            output: currentOutput || 'Playbook is running...',
          });
          setIsRunningPlaybook(true);

          // Continue polling this job
          pollPlaybookJob(runningTestSuiteJob.id, runningTestSuiteJob.suite_title || runningTestSuiteJob.description || 'Unknown Playbook');
        } else {
          // No running jobs - clear any stale state
          console.log('✅ No running playbook jobs found, clearing stale state');
          setPlaybookResults(null);
          setIsRunningPlaybook(false);
        }
      }
    } catch (error) {
      console.error('Error checking for running playbook jobs:', error);
      // On error, clear state to be safe
      setPlaybookResults(null);
      setIsRunningPlaybook(false);
    }
  };

  // Separate polling function that can be called independently
  // recentOpId is optional - only provided when called from runSuite (for new jobs)
  const pollPlaybookJob = async (jobId, suiteTitle, recentOpId = null) => {
    const maxAttempts = 1800; // 30 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const jobResponse = await axios.get(`http://localhost:8000/api/jobs/${jobId}`);
        const jobData = jobResponse.data;

        // Fetch logs
        const logsResponse = await axios.get(`http://localhost:8000/api/jobs/${jobId}/logs`);
        const logsData = logsResponse.data;
        const currentOutput = logsData.logs ? logsData.logs.join('\n') : '';

        if (jobData.status === 'completed') {
          // Success - update with final logs
          const output = currentOutput || 'Playbook completed successfully';

          // Update recent operations if we have the ID
          if (recentOpId) {
            recentOps.updateRecentOperationStatus(recentOpId, '✅ Playbook completed successfully!', output);
          }

          setPlaybookResults({
            success: true,
            timestamp: new Date().toISOString(),
            suiteName: suiteTitle,
            output,
          });
          setIsRunningPlaybook(false);
          return;
        } else if (jobData.status === 'failed') {
          // Failure - update with error logs
          const output = currentOutput || 'Playbook failed';

          // Update recent operations if we have the ID
          if (recentOpId) {
            recentOps.updateRecentOperationStatus(recentOpId, '❌ Playbook failed', output);
          }

          setPlaybookResults({
            success: false,
            timestamp: new Date().toISOString(),
            suiteName: suiteTitle,
            output,
          });
          setIsRunningPlaybook(false);
          return;
        }

        // Still running - update with current logs every 5 seconds
        if (attempts % 5 === 0 && currentOutput) {
          // Update recent operations if we have the ID
          if (recentOpId) {
            recentOps.updateRecentOperationStatus(recentOpId, '🧪 Running playbook...', currentOutput);
          }

          setPlaybookResults({
            success: true,
            timestamp: new Date().toISOString(),
            suiteName: suiteTitle,
            output: currentOutput,
          });
        }

        // Wait and poll again
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      } catch (error) {
        console.error('Error polling playbook job:', error);
        setIsRunningPlaybook(false);
        return;
      }
    }

    // Timeout
    console.error('Playbook polling timed out after 30 minutes');
    setPlaybookResults({
      success: false,
      timestamp: new Date().toISOString(),
      suiteName: suiteTitle,
      output: 'Playbook timed out after 30 minutes',
    });
    setIsRunningPlaybook(false);
  };

  const loadSuites = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/test-suites/list');
      if (response.data.success) {
        setSuites(response.data.suites);
      }
    } catch (error) {
      console.error('Error loading test suites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuiteClick = (suite) => {
    // Prevent running if already running
    if (isPlaybookRunning(suite.id)) {
      console.log(`⚠️ ${suite.config.name} is already running, ignoring request`);
      return;
    }

    // Check if suite needs provisioning options
    if (needsProvisioningOptions(suite)) {
      setSelectedSuite(suite);
      setShowProvisionModal(true);
    } else {
      runSuite(suite.id, suite.config.name);
    }
  };

  const runSuite = async (suiteName, suiteTitle, extraVars = {}) => {
    const playbookId = `playbook-${Date.now()}`;

    try {
      // Clear previous results and set loading state
      setPlaybookResults(null);
      setIsRunningPlaybook(true);

      // Immediately show "Starting..." state
      setPlaybookResults({
        success: true,
        timestamp: new Date().toISOString(),
        suiteName: suiteTitle,
        output: `🚀 Starting playbook: ${suiteTitle}...\n\nInitializing automated playbook execution...\nPlaybook: ${suiteName}\n\nConnecting to backend...`,
      });

      // Immediately show "Starting..." in Task Summary for instant feedback
      recentOps.addToRecent({
        id: playbookId,
        title: `⚡ PLAYBOOK TESTING: ${suiteTitle}`,
        status: `🧪 Starting automated playbook...`,
        environment: 'mce',
        timestamp: Date.now(),
        playbook: suiteName,
      });

      // Start the test suite (async execution on backend)
      const response = await axios.post('http://localhost:8000/api/test-suites/run', {
        suite_name: suiteName,
        extra_vars: extraVars,
      });

      if (response.data.success && response.data.job_id) {
        const jobId = response.data.job_id;
        console.log(`✅ ${suiteTitle} playbook started! Job ID: ${jobId}`);

        // Poll for job completion using shared polling function
        await pollPlaybookJob(jobId, suiteTitle, playbookId);
      }
    } catch (error) {
      console.error('❌ Error running playbook:', error);
      const errorMsg = error.message || 'Failed to run playbook';

      // Update the operation to show error
      recentOps.addToRecent({
        id: playbookId,
        title: suiteTitle,
        status: `❌ Failed to start: ${errorMsg}`,
        environment: 'mce',
        timestamp: Date.now(),
        playbook: suiteName,
      });

      setPlaybookResults({
        success: false,
        timestamp: new Date().toISOString(),
        suiteName: suiteTitle,
        output: errorMsg,
      });
      setIsRunningPlaybook(false);
    }
  };

  // Copy handler for playbook output
  const handleCopyOutput = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Only show search bar and playbook list when there are NO results (not running, not completed) */}
      {!playbookResults && (
        <>
          {/* Search and Actions Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search playbooks..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadSuites}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Playbooks List */}
          {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Loading playbooks...</p>
          </div>
        </div>
      ) : suites.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="text-center text-gray-500">
            <p className="text-sm">No playbooks found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((category) => {
            const categorySuites = groupedSuites[category];
            if (!categorySuites || categorySuites.length === 0) return null;

            return (
              <div key={category}>
                {/* Category Header */}
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {getCategoryLabel(category)} ({categorySuites.length})
                </h3>

                {/* Category Playbooks */}
                <div className="space-y-3">
                  {categorySuites.map((suite) => {
                    const running = isPlaybookRunning(suite.id);
                    const polarionTags = suite.config.tags.filter((tag) => tag.match(/^RHACM4K-\d+$/));

                    return (
                      <div
                        key={suite.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Playbook Name */}
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-blue-600 font-medium hover:underline cursor-pointer">
                                {suite.config.name}
                              </h3>
                              {running && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                                  Running
                                </span>
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-start gap-2">
                                <span className="text-gray-400">•</span>
                                <span>Description: {suite.config.description}</span>
                              </div>
                              {polarionTags.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400">•</span>
                                  <span>
                                    Jira: {polarionTags.map((tag, idx) => (
                                      <span key={idx}>
                                        {tag}
                                        {idx < polarionTags.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleSuiteClick(suite)}
                            disabled={running}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              running
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            {running ? (
                              <>
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                Running
                              </>
                            ) : (
                              <>
                                <PlayIcon className="w-4 h-4" />
                                Run
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Playbook Results Display - Inline Output */}
      {playbookResults && (
        <div className="space-y-4">
          {/* Playbook Header - Show which playbook is running */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {playbookResults.success && !isRunningPlaybook ? (
                <span className="text-2xl">✅</span>
              ) : playbookResults.success ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-xl">❌</span>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {playbookResults.suiteName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isRunningPlaybook ? '🚀 Running playbook...' : playbookResults.success ? '✅ Completed successfully' : '❌ Failed'}
                </p>
              </div>
              {/* Back button - only show when playbook is NOT running */}
              {!isRunningPlaybook && (
                <button
                  onClick={() => {
                    setPlaybookResults(null);
                    setIsRunningPlaybook(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Back to Playbooks
                </button>
              )}
            </div>
          </div>

          {/* Playbook Output */}
          <div className={`rounded-lg border-2 p-6 ${playbookResults.success && !isRunningPlaybook ? 'bg-green-50 border-green-300' : playbookResults.success ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>

          {/* Output Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Playbook Output:</h4>
              <button
                onClick={() => handleCopyOutput(playbookResults.output || 'No output available')}
                className="px-3 py-1 text-white rounded text-xs font-medium transition-colors"
                style={{ backgroundColor: '#2684FF' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0065FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2684FF')}
              >
                {copySuccess || '📋 Copy'}
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto min-h-[100px]">
              <pre className="whitespace-pre-wrap">
                {playbookResults.output || 'No output available'}
              </pre>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ROSA Provisioning Modal */}
      <RosaProvisionModal
        isOpen={showProvisionModal}
        onClose={() => {
          setShowProvisionModal(false);
          setSelectedSuite(null);
        }}
        testSuite={
          selectedSuite
            ? {
                id: selectedSuite.id,
                name: selectedSuite.config.name,
                category: selectedSuite.config.tags?.[0] || 'provisioning',
                components: selectedSuite.config.tags || [],
                jira: [],
              }
            : null
        }
        onSubmit={async (config) => {
          console.log('🚀 [PROVISION] Provisioning with config:', config);

          // Map config to extra_vars for ansible playbook
          const extraVars = {
            cluster_name: config.clusterName,
            domain_prefix: config.domainPrefix,
            openshift_version: config.openShiftVersion,
            create_rosa_network: config.createRosaNetwork,
            create_rosa_role_config: config.createRosaRoleConfig,
            vpc_cidr_block: config.vpcCidrBlock,
            availability_zone_count: config.availabilityZoneCount,
            role_prefix: config.rolePrefix,
            aws_region: config.awsRegion,
            channel_group: config.channelGroup,
            private_network: config.privateNetwork,
            additional_tags: config.additionalTags,
          };

          // Close modal
          setShowProvisionModal(false);

          // Run suite with extra vars
          if (selectedSuite) {
            await runSuite(selectedSuite.id, selectedSuite.config.name, extraVars);
          }

          // Clear selection
          setSelectedSuite(null);
        }}
      />
    </div>
  );
};

export default TestSuiteSection;
