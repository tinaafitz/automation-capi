import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function RosaProvisionModal({ isOpen, onClose, onSubmit }) {
  const [config, setConfig] = useState({
    clusterName: '',
    openShiftVersion: '4.19.10',
    createRosaNetwork: true,
    createRosaRoleConfig: true,
    vpcCidrBlock: '10.0.0.0/16',
    availabilityZoneCount: 1,
    rolePrefix: '',
  });

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
            <h2 className="text-xl font-bold">Provision ROSA HCP Cluster</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    onChange={(e) => handleChange('availabilityZoneCount', parseInt(e.target.value))}
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
                  Cluster: <span className="font-mono font-semibold">{config.clusterName || 'test-420-network-roles-test'}</span>
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
                  <span className="text-gray-700">Will create RosaRoleConfig with AWS IAM roles</span>
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
              Provision Cluster
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
