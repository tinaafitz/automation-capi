import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BeakerIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRecentOperationsContext } from '../../store/AppContext';
import { useJobHistory } from '../../hooks/useJobHistory';
import { RosaProvisionModal } from '../RosaProvisionModal';

const TestSuiteSection = ({ theme = 'mce' }) => {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const recentOps = useRecentOperationsContext();
  const { jobHistory } = useJobHistory();

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'minikube':
        return {
          headerGradient: 'from-purple-600 to-violet-600',
          hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
          border: 'border-purple-200',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700',
          buttonGradient: 'from-purple-600 to-violet-600',
          buttonGradientHover: 'hover:from-purple-700 hover:to-violet-700',
        };
      case 'mce':
      default:
        return {
          headerGradient: 'from-cyan-600 to-blue-600',
          hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
          border: 'border-cyan-200',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          buttonGradient: 'from-purple-600 to-indigo-600',
          buttonGradientHover: 'hover:from-purple-700 hover:to-indigo-700',
        };
    }
  };

  const colors = getThemeColors();

  // Check if a playbook is currently running
  const isPlaybookRunning = (suiteName) => {
    return jobHistory.some((job) => job.yaml_file === suiteName && job.status === 'running');
  };

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
  }, []);

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
    try {
      // Immediately show "Starting..." in Task Summary for instant feedback
      recentOps.addToRecent({
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

      if (response.data.success) {
        console.log(`✅ ${suiteTitle} playbook started! Job ID: ${response.data.job_id}`);
      }
    } catch (error) {
      console.error('❌ Error running playbook:', error);
      // Update the operation to show error
      recentOps.addToRecent({
        title: suiteTitle,
        status: `❌ Failed to start: ${error.message}`,
        environment: 'mce',
        timestamp: Date.now(),
        playbook: suiteName,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading playbooks...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  🧪 Run automated playbooks to configure and test CAPI/CAPA functionality. Progress
                  and logs will appear in <strong>Task Summary</strong> and{' '}
                  <strong>Task Detail</strong> sections below.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suites.map((suite) => {
                    const running = isPlaybookRunning(suite.id);
                    return (
                      <div
                        key={suite.id}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-gradient-to-br from-white to-gray-50"
                      >
                        <h5 className="font-semibold text-sm mb-1">{suite.config.name}</h5>
                        <p className="text-xs text-gray-600 mb-2">{suite.config.description}</p>
                        <div className="text-xs text-gray-500 mb-3 space-y-1">
                          <div>📦 {suite.config.playbooks.length} playbooks</div>
                          <div>🏷️ {suite.config.tags.join(', ')}</div>
                        </div>
                        <button
                          onClick={() => handleSuiteClick(suite)}
                          disabled={running}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                            running
                              ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                              : needsProvisioningOptions(suite)
                                ? `bg-gradient-to-r ${colors.buttonGradient} text-white ${colors.buttonGradientHover}`
                                : `${colors.buttonBg} text-white ${colors.buttonHover}`
                          }`}
                        >
                          {running ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Running...
                            </>
                          ) : needsProvisioningOptions(suite) ? (
                            <>
                              <Cog6ToothIcon className="w-4 h-4" />
                              Configure & Provision
                            </>
                          ) : (
                            <>
                              <PlayIcon className="w-4 h-4" />
                              Run Playbook
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
      </div>

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

TestSuiteSection.propTypes = {
  theme: PropTypes.string,
};

export default TestSuiteSection;
