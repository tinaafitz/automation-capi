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
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-blue-900">Test Automation</h2>
        <p className="text-gray-600 mt-2">
          ✅ Run automated playbooks to configure and test CAPI/CAPA functionality.
        </p>
      </div>

      {/* Test Suites List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading playbooks...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {suites.map((suite) => {
              const running = isPlaybookRunning(suite.id);
              return (
                <div
                  key={suite.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left side - Suite info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {suite.config.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {suite.config.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {suite.config.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {suite.config.playbooks?.[0]?.test_case_id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            {suite.config.playbooks[0].test_case_id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side - Action button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleSuiteClick(suite)}
                        disabled={running}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                          running
                            ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                            : 'text-white hover:bg-[#0065FF]'
                        }`}
                        style={!running ? { backgroundColor: '#2684FF' } : {}}
                        onMouseEnter={(e) => !running && (e.currentTarget.style.backgroundColor = '#0065FF')}
                        onMouseLeave={(e) => !running && (e.currentTarget.style.backgroundColor = '#2684FF')}
                      >
                        {running ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <PlayIcon className="w-4 h-4" />
                            Run Playbook
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
