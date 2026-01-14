import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CloudIcon, CogIcon, GlobeAltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export function CreateCluster() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    name: '',
    version: '4.20.0',
    region: 'us-west-2',
    instance_type: 'm5.xlarge',
    min_replicas: 2,
    max_replicas: 3,
    network_automation: true,
    role_automation: false,
    availability_zones: ['us-west-2a', 'us-west-2b'],
    cidr_block: '10.0.0.0/16',
    tags: {},
    s3_log_forwarding_enabled: false,
    s3_bucket_name: '',
    s3_bucket_prefix: '',
    s3_log_applications: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      // Validate configuration first
      const validateResponse = await axios.post('http://localhost:8000/api/validate', config);

      if (!validateResponse.data.valid) {
        setErrors(validateResponse.data.errors);
        setWarnings(validateResponse.data.warnings);
        setLoading(false);
        return;
      }

      setWarnings(validateResponse.data.warnings);

      // Create cluster
      const response = await axios.post('http://localhost:8000/api/clusters', config);

      // Navigate to cluster details
      navigate(`/clusters/${response.data.cluster_id}`);
    } catch (error) {
      setErrors([error.response?.data?.detail || 'Failed to create cluster']);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CloudIcon className="h-6 w-6 mr-2 text-red-600" />
            Create ROSA HCP Cluster
          </h2>
          <p className="mt-1 text-gray-600">
            Create a new Red Hat OpenShift Service on AWS (ROSA) cluster with automated provisioning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CogIcon className="h-5 w-5 mr-2" />
              Basic Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cluster Name *</label>
                <input
                  type="text"
                  required
                  value={config.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="my-rosa-cluster"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">OpenShift Version</label>
                <select
                  value={config.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                >
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

              <div>
                <label className="block text-sm font-medium text-gray-700">AWS Region</label>
                <select
                  value={config.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                >
                  <option value="us-west-2">us-west-2</option>
                  <option value="us-east-1">us-east-1</option>
                  <option value="eu-west-1">eu-west-1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Instance Type</label>
                <select
                  value={config.instance_type}
                  onChange={(e) => handleInputChange('instance_type', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                >
                  <option value="m5.xlarge">m5.xlarge</option>
                  <option value="m5.2xlarge">m5.2xlarge</option>
                  <option value="m5.4xlarge">m5.4xlarge</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scaling Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Node Scaling</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Replicas</label>
                <input
                  type="number"
                  min="1"
                  value={config.min_replicas}
                  onChange={(e) => handleInputChange('min_replicas', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Replicas</label>
                <input
                  type="number"
                  min="1"
                  value={config.max_replicas}
                  onChange={(e) => handleInputChange('max_replicas', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Automation Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Automation Features</h3>

            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={config.network_automation}
                    onChange={(e) => handleInputChange('network_automation', e.target.checked)}
                    className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label className="font-medium text-gray-700 flex items-center">
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    ROSANetwork Automation (ACM-21174)
                  </label>
                  <p className="text-gray-500">
                    Automatically create VPC and subnets using CloudFormation templates
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={config.role_automation}
                    onChange={(e) => handleInputChange('role_automation', e.target.checked)}
                    className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label className="font-medium text-gray-700 flex items-center">
                    <ShieldCheckIcon className="h-4 w-4 mr-1" />
                    ROSARoleConfig Automation (ACM-21162)
                  </label>
                  <p className="text-gray-500">
                    Automatically create AWS IAM roles and OIDC providers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          {config.network_automation && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Network Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">VPC CIDR Block</label>
                <input
                  type="text"
                  value={config.cidr_block}
                  onChange={(e) => handleInputChange('cidr_block', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="10.0.0.0/16"
                />
              </div>
            </div>
          )}

          {/* S3 Log Forwarding Configuration */}
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={config.s3_log_forwarding_enabled}
                  onChange={(e) => handleInputChange('s3_log_forwarding_enabled', e.target.checked)}
                  className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label className="font-medium text-gray-700">S3 Log Forwarding</label>
                <p className="text-sm text-gray-500">
                  Forward cluster logs to AWS S3 bucket
                </p>
              </div>
            </div>

            {config.s3_log_forwarding_enabled && (
              <div className="ml-7 space-y-4 border-l-2 border-gray-200 pl-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">S3 Bucket Name *</label>
                  <input
                    type="text"
                    required={config.s3_log_forwarding_enabled}
                    value={config.s3_bucket_name}
                    onChange={(e) => handleInputChange('s3_bucket_name', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                    placeholder="rosa-logs-test-471112697682"
                  />
                  <p className="mt-1 text-xs text-gray-500">Name of the S3 bucket for log storage</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">S3 Bucket Prefix (Optional)</label>
                  <input
                    type="text"
                    value={config.s3_bucket_prefix}
                    onChange={(e) => handleInputChange('s3_bucket_prefix', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                    placeholder="logs/rosa-clusters"
                  />
                  <p className="mt-1 text-xs text-gray-500">Prefix for objects stored in the S3 bucket</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Log Applications *</label>
                  <div className="space-y-2">
                    {[
                      { value: 'audit-webhook', label: 'Audit Logs', description: 'Kubernetes audit events' },
                      { value: 'kube-apiserver', label: 'Kubernetes API Logs', description: 'Kube API server logs' },
                      { value: 'openshift-apiserver', label: 'OpenShift API & OAuth Logs', description: 'OpenShift API and authentication logs' },
                    ].map((app) => (
                      <div key={app.value} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={config.s3_log_applications.includes(app.value)}
                            onChange={(e) => {
                              const apps = e.target.checked
                                ? [...config.s3_log_applications, app.value]
                                : config.s3_log_applications.filter((a) => a !== app.value);
                              handleInputChange('s3_log_applications', apps);
                            }}
                            className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700">{app.label}</label>
                          <p className="text-gray-500">{app.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {config.s3_log_forwarding_enabled && config.s3_log_applications.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">Select at least one application</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">
                <h4 className="font-medium">Please fix the following errors:</h4>
                <ul className="mt-2 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Warning Display */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="text-sm text-yellow-800">
                <h4 className="font-medium">Warnings:</h4>
                <ul className="mt-2 list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Cluster...' : 'Create Cluster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
