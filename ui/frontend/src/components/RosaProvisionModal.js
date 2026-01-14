import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

export function RosaProvisionModal({ isOpen, onClose, onSubmit, testSuite, mceInfo }) {
  // Capture initial MCE info when modal opens to prevent mid-form changes
  const initialMceInfoRef = useRef(null);
  const hasSetInitialMceInfo = useRef(false);

  // Set the ref ONCE when modal opens, don't update it again
  useEffect(() => {
    if (isOpen && !hasSetInitialMceInfo.current) {
      initialMceInfoRef.current = mceInfo;
      hasSetInitialMceInfo.current = true;
    } else if (!isOpen) {
      // Reset when modal closes
      hasSetInitialMceInfo.current = false;
    }
  }, [isOpen, mceInfo]);

  const [config, setConfig] = useState({
    clusterName: '',
    clusterDescription: '',
    openShiftVersion: '4.20.8',
    createRosaNetwork: true,
    createRosaRoleConfig: true,
    vpcCidrBlock: '10.0.0.0/16',
    availabilityZoneCount: 1,
    rolePrefix: '',
    domainPrefix: '',
    channelGroup: 'stable',
    awsRegion: 'us-west-2',
    privateNetwork: false,
    additionalTags: '',
    nodePoolName: '',
    // Manual network configuration (for older MCE versions without automation)
    manualPublicSubnet: '',
    manualPrivateSubnet: '',
    manualVpcId: '',
    // Manual role configuration (for older MCE versions without automation)
    manualInstallerRoleArn: '',
    manualSupportRoleArn: '',
    manualWorkerRoleArn: '',
    manualControlPlaneOperatorRoleArn: '',
    manualKmsProviderRoleArn: '',
    manualIngressOperatorRoleArn: '',
    manualImageRegistryOperatorRoleArn: '',
    manualStorageOperatorRoleArn: '',
    manualNetworkOperatorRoleArn: '',
    manualOidcConfigId: '',
    // Log forwarding configuration
    enableLogForwarding: false,
    logForwardApplications: ['audit-webhook', 'kube-apiserver'],
    logForwardCloudWatchRoleArn: '',
    logForwardCloudWatchLogGroup: '',
    logForwardS3Bucket: '',
    logForwardS3Prefix: '',
  });

  const [logForwardingConfigAvailable, setLogForwardingConfigAvailable] = useState(null);
  const [loadingLogForwardingConfig, setLoadingLogForwardingConfig] = useState(false);

  // Check for log forwarding config when cluster name changes
  useEffect(() => {
    const checkLogForwardingConfig = async () => {
      if (!config.clusterName || config.clusterName.length < 3) {
        setLogForwardingConfigAvailable(null);
        return;
      }

      try {
        setLoadingLogForwardingConfig(true);
        const response = await fetch(
          buildApiUrl(`${API_ENDPOINTS.PROVISIONING_LOG_FORWARDING_CONFIG}/${config.clusterName}`)
        );
        const data = await response.json();

        if (data.found) {
          setLogForwardingConfigAvailable(data);
        } else {
          setLogForwardingConfigAvailable(null);
        }
      } catch (error) {
        console.error('Error checking log forwarding config:', error);
        setLogForwardingConfigAvailable(null);
      } finally {
        setLoadingLogForwardingConfig(false);
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkLogForwardingConfig, 500);
    return () => clearTimeout(timeoutId);
  }, [config.clusterName]);

  // Load log forwarding config into form
  const loadLogForwardingConfig = () => {
    if (!logForwardingConfigAvailable) return;

    setConfig((prev) => ({
      ...prev,
      enableLogForwarding: true,
      logForwardCloudWatchRoleArn: logForwardingConfigAvailable.cloudwatch_log_role_arn || '',
      logForwardCloudWatchLogGroup: logForwardingConfigAvailable.cloudwatch_log_group_name || '',
      logForwardS3Bucket: logForwardingConfigAvailable.s3_log_bucket_name || '',
      logForwardS3Prefix: logForwardingConfigAvailable.s3_log_bucket_prefix || '',
    }));
  };

  // Update config when testSuite changes
  useEffect(() => {
    if (testSuite) {
      setConfig({
        clusterName: testSuite.components?.includes('Long Cluster Name')
          ? 'comprehensive-test-really-long-cluster-name'
          : `test-${testSuite.category.toLowerCase()}-${testSuite.id}`,
        clusterDescription: testSuite.name || '',
        openShiftVersion: '4.20.8',
        createRosaNetwork: true,
        createRosaRoleConfig: true,
        vpcCidrBlock: '10.0.0.0/16',
        availabilityZoneCount: testSuite.components?.includes('Availability Zones') ? 3 : 1,
        rolePrefix: `test-${testSuite.category.toLowerCase()}`,
        domainPrefix: `test-${testSuite.id}`,
        channelGroup: 'stable',
        awsRegion: 'us-west-2',
        privateNetwork: testSuite.components?.includes('Private Network') || false,
        additionalTags: testSuite.components?.includes('Additional Tags')
          ? 'Environment=Test,Team=CAPI'
          : '',
      });
    }
  }, [testSuite]);

  // Auto-generate nodePoolName when clusterName changes
  useEffect(() => {
    if (config.clusterName && !config.nodePoolName) {
      // Generate nodepool name: max 15 chars total
      const maxLength = 6; // Leave 9 chars for '-nodepool'
      const truncatedName = config.clusterName.slice(0, maxLength);
      setConfig((prev) => ({
        ...prev,
        nodePoolName: `${truncatedName}-np`,
      }));
    }
  }, [config.clusterName]);

  // Reset feature flags and default OpenShift version when modal opens
  // Use initialMceInfoRef to prevent changes mid-form
  useEffect(() => {
    if (!isOpen) return;

    const currentMceInfo = initialMceInfoRef.current;

    const isMceVersionAtLeast = (current, target) => {
      if (!current) return false;
      const parseVersion = (ver) => {
        const parts = ver.split('-')[0].split('.').map((p) => parseInt(p, 10));
        return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
      };
      const curr = parseVersion(current);
      const targ = parseVersion(target);
      if (curr.major !== targ.major) return curr.major > targ.major;
      if (curr.minor !== targ.minor) return curr.minor > targ.minor;
      return curr.patch >= targ.patch;
    };

    // For Minikube (no MCE), support all latest features
    const isMinikube = !currentMceInfo || !currentMceInfo.version || currentMceInfo.version === 'N/A';
    const supportsNetworkRole = isMinikube || isMceVersionAtLeast(currentMceInfo.version, '2.9.0');
    const supportsLogFwd = isMinikube || isMceVersionAtLeast(currentMceInfo.version, '2.10.0');

    // Set default OpenShift version based on MCE version
    let defaultOcpVersion = '4.20.8';
    if (supportsLogFwd) {
      // MCE 2.10+ defaults to 4.20.8 (supports 4.19-4.20)
      defaultOcpVersion = '4.20.8';
    } else if (supportsNetworkRole) {
      // MCE 2.9 defaults to 4.19.10 (supports 4.18-4.19)
      defaultOcpVersion = '4.19.10';
    } else {
      // MCE < 2.9 defaults to 4.18.9 (supports 4.15-4.18)
      defaultOcpVersion = '4.18.9';
    }

    // Disable features if MCE version doesn't support them
    setConfig((prev) => {
      const updates = { openShiftVersion: defaultOcpVersion };

      if (!supportsNetworkRole && (prev.createRosaNetwork || prev.createRosaRoleConfig)) {
        updates.createRosaNetwork = false;
        updates.createRosaRoleConfig = false;
      }

      if (!supportsLogFwd && prev.enableLogForwarding) {
        updates.enableLogForwarding = false;
      }

      return { ...prev, ...updates };
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Helper function to parse MCE version and check if it's >= target version
  const isMceVersionAtLeast = (current, target) => {
    if (!current) return false; // No MCE version = old version

    // Parse MCE version format: "2.8.4-159" or "2.10.0"
    const parseVersion = (ver) => {
      const parts = ver.split('-')[0].split('.').map((p) => parseInt(p, 10));
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const curr = parseVersion(current);
    const targ = parseVersion(target);

    if (curr.major !== targ.major) return curr.major > targ.major;
    if (curr.minor !== targ.minor) return curr.minor > targ.minor;
    return curr.patch >= targ.patch;
  };

  // Feature availability based on MCE version
  // MCE 2.9+ supports ROSANetwork and RosaRoleConfig
  // MCE 2.10+ supports Log Forwarding
  // For Minikube (no MCE), support all latest features
  // Use initialMceInfoRef to prevent modal from changing mid-form
  const currentMceInfo = initialMceInfoRef.current;
  const isMinikube = !currentMceInfo || !currentMceInfo.version || currentMceInfo.version === 'N/A';
  const mceVersion = currentMceInfo?.version || '2.8.0';
  const supportsNetworkRoleConfig = isMinikube || isMceVersionAtLeast(mceVersion, '2.9.0');
  const supportsLogForwarding = isMinikube || isMceVersionAtLeast(mceVersion, '2.10.0');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-xl font-bold">Provision ROSA HCP Cluster</h2>
              {testSuite && (
                <div className="text-cyan-100 text-sm mt-1">
                  Test Suite: {testSuite.name} ({testSuite.category})
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Test Suite Information */}
          {testSuite && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Test Suite Details</h3>
              <div className="space-y-2">
                <div className="text-sm text-blue-800">
                  <strong>Components to Test:</strong>{' '}
                  {testSuite.components?.join(', ') || 'Standard components'}
                </div>
                {testSuite.jira && testSuite.jira.length > 0 && (
                  <div className="text-sm text-blue-800">
                    <strong>JIRA Tickets:</strong> {testSuite.jira.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Cluster Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cluster Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={config.clusterName}
              onChange={(e) => handleChange('clusterName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="test-418-rosa-hcp"
            />
            <p className="mt-1 text-xs text-gray-500">Name for your ROSA HCP cluster</p>
          </div>

          {/* Node Pool Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Pool Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={config.nodePoolName}
              onChange={(e) => handleChange('nodePoolName', e.target.value)}
              maxLength="15"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="lft-np"
            />
            <p className="mt-1 text-xs text-gray-500">
              Name for the default node pool (max 15 characters, auto-generated from cluster name)
            </p>
            {config.nodePoolName && config.nodePoolName.length > 15 && (
              <p className="mt-1 text-xs text-red-600">
                ⚠️ Node pool name must be 15 characters or less
              </p>
            )}
          </div>

          {/* Cluster Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={config.clusterDescription}
              onChange={(e) => handleChange('clusterDescription', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Description of this cluster (optional)&#10;Example:&#10;------- ACM 2.11.9 Fresh Install -------&#10;ACM: 2.11.9-DOWNSTREAM-2025-12-01&#10;MCE: 2.6.9-DOWNSTREAM-2025-11-30"
              rows="4"
              maxLength="500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional description for the cluster. Supports multi-line text (max 500 characters)
            </p>
          </div>

          {/* OpenShift Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenShift Version
            </label>
            <select
              value={config.openShiftVersion}
              onChange={(e) => handleChange('openShiftVersion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {/* MCE 2.10+ supports OpenShift 4.20+ */}
              {supportsLogForwarding && (
                <>
                  <option value="4.20.8">4.20.8 (Latest - Recommended)</option>
                  <option value="4.20.6">4.20.6</option>
                  <option value="4.20.5">4.20.5</option>
                  <option value="4.20.4">4.20.4</option>
                  <option value="4.20.3">4.20.3</option>
                  <option value="4.20.2">4.20.2</option>
                  <option value="4.20.1">4.20.1</option>
                  <option value="4.20.0">4.20.0</option>
                  <option value="4.19.21">4.19.21</option>
                  <option value="4.19.20">4.19.20</option>
                  <option value="4.19.10">4.19.10</option>
                  <option value="4.19.9">4.19.9</option>
                  <option value="4.19.8">4.19.8</option>
                  <option value="4.19.7">4.19.7</option>
                  <option value="4.19.0">4.19.0</option>
                </>
              )}

              {/* MCE 2.9+ supports OpenShift 4.18-4.19 */}
              {supportsNetworkRoleConfig && (
                <>
                  {!supportsLogForwarding && (
                    <>
                      <option value="4.19.10">4.19.10 (Recommended)</option>
                      <option value="4.19.9">4.19.9</option>
                      <option value="4.19.8">4.19.8</option>
                      <option value="4.19.7">4.19.7</option>
                      <option value="4.19.0">4.19.0</option>
                    </>
                  )}
                  <option value="4.18.9">4.18.9</option>
                  <option value="4.18.8">4.18.8</option>
                  <option value="4.18.0">4.18.0</option>
                </>
              )}

              {/* MCE < 2.9 supports OpenShift 4.15-4.18 */}
              {!supportsNetworkRoleConfig && (
                <>
                  <option value="4.18.9">4.18.9 (Recommended)</option>
                  <option value="4.18.8">4.18.8</option>
                  <option value="4.18.0">4.18.0</option>
                  <option value="4.17.9">4.17.9</option>
                  <option value="4.17.0">4.17.0</option>
                  <option value="4.16.9">4.16.9</option>
                  <option value="4.16.0">4.16.0</option>
                  <option value="4.15.9">4.15.9</option>
                  <option value="4.15.0">4.15.0</option>
                </>
              )}
            </select>
          </div>

          {/* Cluster Configuration Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cluster Configuration</h3>

            <div className="space-y-4">
              {/* Domain Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Prefix <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.domainPrefix}
                  onChange={(e) => handleChange('domainPrefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my-cluster"
                  maxLength={15}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique domain prefix for the cluster (max 15 characters). Will be used for the
                  cluster's API URL.
                </p>
              </div>

              {/* AWS Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AWS Region</label>
                <select
                  value={config.awsRegion}
                  onChange={(e) => handleChange('awsRegion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                  <option value="us-east-2">US East (Ohio) - us-east-2</option>
                  <option value="us-west-1">US West (N. California) - us-west-1</option>
                  <option value="us-west-2">US West (Oregon) - us-west-2</option>
                  <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                  <option value="eu-west-2">Europe (London) - eu-west-2</option>
                  <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                </select>
              </div>

              {/* Channel Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Group
                </label>
                <select
                  value={config.channelGroup}
                  onChange={(e) => handleChange('channelGroup', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="stable">Stable (Recommended)</option>
                  <option value="fast">Fast</option>
                  <option value="candidate">Candidate</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Update channel for OpenShift releases. Stable is recommended for production.
                </p>
              </div>

              {/* Private Network - Only show for Comprehensive test */}
              {testSuite?.components?.includes('Private Network') && (
                <div>
                  <label className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.privateNetwork}
                      onChange={(e) => handleChange('privateNetwork', e.target.checked)}
                      className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">Private Network</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Configure cluster to use private subnets and disable public API endpoint
                        access
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Additional Tags - Only show for Comprehensive test */}
              {testSuite?.components?.includes('Additional Tags') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Tags
                  </label>
                  <input
                    type="text"
                    value={config.additionalTags}
                    onChange={(e) => handleChange('additionalTags', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Environment=Test,Owner=TestTeam"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Comma-separated key=value pairs for AWS resource tagging (e.g.,
                    Environment=Test,Owner=TestTeam)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Automation Options - Only show for MCE 2.9+ */}
          {supportsNetworkRoleConfig && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Automation Options</h3>

            <div className="space-y-3">
              {/* Create ROSANetwork */}
              <label className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200 cursor-pointer hover:bg-cyan-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.createRosaNetwork}
                  onChange={(e) => handleChange('createRosaNetwork', e.target.checked)}
                  className="mt-1 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Create ROSANetwork</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Automatically create VPC, subnets, and network resources via CloudFormation
                  </p>
                </div>
              </label>

              {/* Create RosaRoleConfig */}
              <label className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                <input
                  type="checkbox"
                  checked={config.createRosaRoleConfig}
                  onChange={(e) => handleChange('createRosaRoleConfig', e.target.checked)}
                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Create RosaRoleConfig</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Automatically create AWS IAM roles and OIDC provider
                  </p>
                </div>
              </label>
            </div>
          </div>
          )}

          {/* Manual Network Configuration - Only show for older MCE versions (< 2.9) */}
          {!supportsNetworkRoleConfig && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Network Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VPC ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualVpcId}
                  onChange={(e) => handleChange('manualVpcId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="vpc-0123456789abcdef0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Existing VPC ID where the cluster will be deployed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Subnet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualPublicSubnet}
                  onChange={(e) => handleChange('manualPublicSubnet', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="subnet-abc123"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Public subnet ID for the cluster
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Subnet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualPrivateSubnet}
                  onChange={(e) => handleChange('manualPrivateSubnet', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="subnet-def456"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Private subnet ID for the cluster
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Manual Role Configuration - Only show for older MCE versions (< 2.9) */}
          {!supportsNetworkRoleConfig && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">IAM Role Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Installer Role ARN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualInstallerRoleArn}
                  onChange={(e) => handleChange('manualInstallerRoleArn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="arn:aws:iam::123456789012:role/ManagedOpenShift-Installer-Role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Role ARN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualSupportRoleArn}
                  onChange={(e) => handleChange('manualSupportRoleArn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="arn:aws:iam::123456789012:role/ManagedOpenShift-Support-Role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worker Role ARN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualWorkerRoleArn}
                  onChange={(e) => handleChange('manualWorkerRoleArn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="arn:aws:iam::123456789012:role/ManagedOpenShift-Worker-Role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OIDC Config ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.manualOidcConfigId}
                  onChange={(e) => handleChange('manualOidcConfigId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="12a3b4cd5e6f7890abcd1234ef567890"
                />
                <p className="mt-1 text-xs text-gray-500">
                  OIDC configuration ID from your ROSA account
                </p>
              </div>

              {/* Operator Role ARNs - Collapsible */}
              <details className="border border-gray-200 rounded-lg p-3">
                <summary className="cursor-pointer font-medium text-sm text-gray-700 hover:text-gray-900">
                  Operator Role ARNs (Optional - expand to configure)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Control Plane Operator Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualControlPlaneOperatorRoleArn}
                      onChange={(e) => handleChange('manualControlPlaneOperatorRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-openshift-cluster-csi-drivers-ebs-cloud-credentials"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ingress Operator Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualIngressOperatorRoleArn}
                      onChange={(e) => handleChange('manualIngressOperatorRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-openshift-ingress-operator-cloud-credentials"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Image Registry Operator Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualImageRegistryOperatorRoleArn}
                      onChange={(e) => handleChange('manualImageRegistryOperatorRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-openshift-image-registry-installer-cloud-credentials"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Storage Operator Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualStorageOperatorRoleArn}
                      onChange={(e) => handleChange('manualStorageOperatorRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-openshift-cluster-csi-drivers-ebs-cloud-credentials"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Network Operator Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualNetworkOperatorRoleArn}
                      onChange={(e) => handleChange('manualNetworkOperatorRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-openshift-cloud-network-config-controller-cloud-credentials"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      KMS Provider Role ARN
                    </label>
                    <input
                      type="text"
                      value={config.manualKmsProviderRoleArn}
                      onChange={(e) => handleChange('manualKmsProviderRoleArn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="arn:aws:iam::123456789012:role/prefix-kms-provider-role"
                    />
                  </div>
                </div>
              </details>
            </div>
          </div>
          )}

          {/* Network Configuration */}
          {config.createRosaNetwork && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Network Configuration</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VPC CIDR Block
                  </label>
                  <input
                    type="text"
                    value={config.vpcCidrBlock}
                    onChange={(e) => handleChange('vpcCidrBlock', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10.0.0.0/16"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability Zones
                  </label>
                  <select
                    value={config.availabilityZoneCount}
                    onChange={(e) =>
                      handleChange('availabilityZoneCount', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 Availability Zone</option>
                    <option value={2}>2 Availability Zones</option>
                    <option value={3}>3 Availability Zones</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Role Configuration */}
          {config.createRosaRoleConfig && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Prefix (optional)
                </label>
                <input
                  type="text"
                  value={config.rolePrefix}
                  onChange={(e) => handleChange('rolePrefix', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="auto"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Prefix for AWS IAM role names. Defaults to cluster name if not specified.
                </p>
              </div>
            </div>
          )}

          {/* Log Forwarding Configuration - Only show for 4.20+ */}
          {supportsLogForwarding && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Log Forwarding Configuration
            </h3>

            {/* Enable Log Forwarding Toggle */}
            <label className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors mb-4">
              <input
                type="checkbox"
                checked={config.enableLogForwarding}
                onChange={(e) => handleChange('enableLogForwarding', e.target.checked)}
                className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Enable Log Forwarding</span>
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                    NEW
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Forward cluster audit logs to AWS CloudWatch and optionally to S3
                </p>
              </div>
            </label>

            {/* Log Forwarding Config Available Notification */}
            {logForwardingConfigAvailable && !config.enableLogForwarding && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-sm">✓</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Log Forwarding Configuration Found!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Pre-configured log forwarding setup detected for this cluster name.
                    </p>
                    <button
                      type="button"
                      onClick={loadLogForwardingConfig}
                      className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors font-medium"
                    >
                      📋 Load Configuration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loadingLogForwardingConfig && (
              <div className="text-center py-2 mb-4">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Checking for log forwarding config...
                </span>
              </div>
            )}

            {/* Log Forwarding Fields - Only show when enabled */}
            {config.enableLogForwarding && (
              <div className="space-y-4 pl-4 border-l-2 border-yellow-200">
                {/* CloudWatch Log Role ARN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CloudWatch Log Role ARN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={config.enableLogForwarding}
                    value={config.logForwardCloudWatchRoleArn}
                    onChange={(e) => handleChange('logForwardCloudWatchRoleArn', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
                    placeholder="arn:aws:iam::123456789012:role/cluster-log-forward-role"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    IAM role ARN with permissions to write to CloudWatch Logs. Created by setup
                    task.
                  </p>
                </div>

                {/* Applications to Forward */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applications to Forward <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'audit-webhook', label: 'Audit Logs', description: 'Kubernetes audit events' },
                      { value: 'kube-apiserver', label: 'Kubernetes API Logs', description: 'Kube API server logs' },
                      { value: 'openshift-apiserver', label: 'OpenShift API & OAuth Logs', description: 'OpenShift API and authentication logs' },
                    ].map((app) => (
                      <label
                        key={app.value}
                        className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={config.logForwardApplications.includes(app.value)}
                          onChange={(e) => {
                            const newApps = e.target.checked
                              ? [...config.logForwardApplications, app.value]
                              : config.logForwardApplications.filter((a) => a !== app.value);
                            handleChange('logForwardApplications', newApps);
                          }}
                          className="mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">{app.label}</div>
                          <div className="text-xs text-gray-500">{app.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select which log types to forward to CloudWatch and S3 (at least one required)
                  </p>
                </div>

                {/* CloudWatch Log Group Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CloudWatch Log Group <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={config.enableLogForwarding}
                    value={config.logForwardCloudWatchLogGroup}
                    onChange={(e) => handleChange('logForwardCloudWatchLogGroup', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
                    placeholder="/aws/rosa/cluster-name/audit"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    CloudWatch log group name where audit logs will be sent
                  </p>
                </div>

                {/* S3 Bucket Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    S3 Bucket Name (optional)
                  </label>
                  <input
                    type="text"
                    value={config.logForwardS3Bucket}
                    onChange={(e) => handleChange('logForwardS3Bucket', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
                    placeholder="rosa-logs-test-471112697682"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional S3 bucket name for additional log storage
                  </p>
                </div>

                {/* S3 Bucket Prefix (Optional) */}
                {config.logForwardS3Bucket && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      S3 Bucket Prefix (optional)
                    </label>
                    <input
                      type="text"
                      value={config.logForwardS3Prefix}
                      onChange={(e) => handleChange('logForwardS3Prefix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
                      placeholder="logs/rosa-clusters"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional prefix for objects stored in the S3 bucket
                    </p>
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-sm">ℹ️</span>
                    <div className="flex-1">
                      <p className="text-xs text-blue-800 font-medium mb-1">Setup Prerequisites</p>
                      <p className="text-xs text-blue-700">
                        Run the log forwarding setup first to create the IAM role, CloudWatch log
                        group, and S3 bucket (if using S3):
                      </p>
                      <code className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded mt-1 block">
                        ansible-playbook test-rosa-log-forwarding.yml -e setup_only=true
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Provisioning Summary */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Provisioning Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">
                  Cluster:{' '}
                  <span className="font-mono font-semibold">
                    {config.clusterName || 'test-418-rosa-hcp'}
                  </span>
                </span>
              </div>
              {config.createRosaNetwork && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    Will create ROSANetwork with {config.availabilityZoneCount} AZ
                  </span>
                </div>
              )}
              {config.createRosaRoleConfig && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    Will create RosaRoleConfig with AWS IAM roles
                  </span>
                </div>
              )}
              {config.privateNetwork && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    Will configure private network (no public API access)
                  </span>
                </div>
              )}
              {config.additionalTags && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    Will apply additional tags: {config.additionalTags}
                  </span>
                </div>
              )}
              {config.enableLogForwarding && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    Log forwarding enabled to CloudWatch
                    {config.logForwardS3Bucket && ' and S3'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-md hover:from-purple-700 hover:to-violet-700 font-medium transition-colors shadow-md"
            >
              Preview & Provision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

RosaProvisionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  testSuite: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    category: PropTypes.string,
    components: PropTypes.arrayOf(PropTypes.string),
    jira: PropTypes.arrayOf(PropTypes.string),
  }),
  mceInfo: PropTypes.shape({
    name: PropTypes.string,
    version: PropTypes.string,
  }),
};
