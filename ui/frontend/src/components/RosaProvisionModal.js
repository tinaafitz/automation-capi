import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function RosaProvisionModal({ isOpen, onClose, onSubmit, testSuite }) {
  const [config, setConfig] = useState({
    clusterName: '',
    clusterDescription: '',
    openShiftVersion: '4.19.10',
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
  });

  // Update config when testSuite changes
  useEffect(() => {
    if (testSuite) {
      setConfig({
        clusterName: testSuite.components?.includes('Long Cluster Name')
          ? 'comprehensive-test-really-long-cluster-name'
          : `test-${testSuite.category.toLowerCase()}-${testSuite.id}`,
        clusterDescription: testSuite.name || '',
        openShiftVersion: '4.19.10',
        createRosaNetwork: true,
        createRosaRoleConfig: true,
        vpcCidrBlock: '10.0.0.0/16',
        availabilityZoneCount: testSuite.components?.includes('Availability Zones') ? 3 : 1,
        rolePrefix: `test-${testSuite.category.toLowerCase()}`,
        domainPrefix: `test-${testSuite.id}`,
        channelGroup: 'stable',
        awsRegion: 'us-west-2',
        privateNetwork: testSuite.components?.includes('Private Network') || false,
        additionalTags: testSuite.components?.includes('Additional Tags') ? 'Environment=Test,Team=CAPI' : '',
      });
    }
  }, [testSuite]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
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
                    <strong>JIRA Tickets:</strong>{' '}
                    {testSuite.jira.join(', ')}
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
              placeholder="test-420-network-roles-test"
            />
            <p className="mt-1 text-xs text-gray-500">Name for your ROSA HCP cluster</p>
          </div>

          {/* Cluster Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
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
              <option value="4.20.0">4.20.0 (Latest)</option>
              <option value="4.19.10">4.19.10 (Recommended)</option>
              <option value="4.19.9">4.19.9</option>
              <option value="4.19.8">4.19.8</option>
              <option value="4.19.7">4.19.7</option>
              <option value="4.19.0">4.19.0</option>
              <option value="4.18.9">4.18.9</option>
              <option value="4.18.8">4.18.8</option>
              <option value="4.18.0">4.18.0</option>
              <option value="4.17.9">4.17.9</option>
              <option value="4.17.0">4.17.0</option>
              <option value="4.16.9">4.16.9</option>
              <option value="4.16.0">4.16.0</option>
              <option value="4.15.9">4.15.9</option>
              <option value="4.15.0">4.15.0</option>
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
                        Configure cluster to use private subnets and disable public API endpoint access
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
                    Comma-separated key=value pairs for AWS resource tagging (e.g., Environment=Test,Owner=TestTeam)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Automation Options */}
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

          {/* Provisioning Summary */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Provisioning Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">
                  Cluster:{' '}
                  <span className="font-mono font-semibold">
                    {config.clusterName || 'test-420-network-roles-test'}
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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 font-medium transition-colors shadow-md"
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
};
