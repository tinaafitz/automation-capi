import React, { useState, useEffect } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../config/api';
import PropTypes from 'prop-types';

const CredentialsModal = ({ isOpen, onClose, theme = 'mce', onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    ocpPassword: false,
    awsSecretKey: false,
    ocmSecret: false
  });

  const [credentials, setCredentials] = useState({
    OCP_HUB_API_URL: '',
    OCP_HUB_CLUSTER_USER: '',
    OCP_HUB_CLUSTER_PASSWORD: '',
    AWS_REGION: '',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    OCM_CLIENT_ID: '',
    OCM_CLIENT_SECRET: ''
  });

  // Fetch current credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/credentials'));
      if (response.ok) {
        const data = await response.json();
        if (data.credentials) {
          setCredentials(data.credentials);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(buildApiUrl('/api/credentials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials })
      });

      if (response.ok) {
        alert('Credentials saved successfully!');

        // Call onSave callback if provided
        if (onSave) {
          onSave();
        }

        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to save credentials: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to save credentials: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isOpen) return null;

  const themeColors = theme === 'mce'
    ? {
        gradient: 'from-cyan-600 to-blue-600',
        hoverGradient: 'hover:from-cyan-700 hover:to-blue-700',
        border: 'border-cyan-200',
        focusRing: 'focus:ring-cyan-500',
        button: 'bg-cyan-600 hover:bg-cyan-700'
      }
    : {
        gradient: 'from-purple-600 to-violet-600',
        hoverGradient: 'hover:from-purple-700 hover:to-violet-700',
        border: 'border-purple-200',
        focusRing: 'focus:ring-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700'
      };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${themeColors.gradient} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔑</span>
              <h2 className="text-xl font-bold text-white">Manage Credentials</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                <p className="mt-4 text-gray-600">Loading credentials...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* OpenShift Hub Cluster Credentials - Always shown for MCE */}
                {theme === 'mce' && (
                  <div className={`border-2 ${themeColors.border} rounded-lg p-4`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🎯</span>
                      OpenShift Hub Cluster
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API URL
                        </label>
                        <input
                          type="text"
                          value={credentials.OCP_HUB_API_URL}
                          onChange={(e) => handleInputChange('OCP_HUB_API_URL', e.target.value)}
                          placeholder="https://api.example.com:6443"
                          className={`w-full px-3 py-2 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                          </label>
                          <input
                            type="text"
                            value={credentials.OCP_HUB_CLUSTER_USER}
                            onChange={(e) => handleInputChange('OCP_HUB_CLUSTER_USER', e.target.value)}
                            placeholder="kubeadmin"
                            className={`w-full px-3 py-2 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing}`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.ocpPassword ? 'text' : 'password'}
                              value={credentials.OCP_HUB_CLUSTER_PASSWORD}
                              onChange={(e) => handleInputChange('OCP_HUB_CLUSTER_PASSWORD', e.target.value)}
                              placeholder="••••••••"
                              className={`w-full px-3 py-2 pr-10 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing}`}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('ocpPassword')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.ocpPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AWS Credentials Section - Hidden for MCE */}
                {theme !== 'mce' && (
                  <div className={`border-2 ${themeColors.border} rounded-lg p-4`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>☁️</span>
                      AWS Credentials
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AWS Region
                        </label>
                        <input
                          type="text"
                          value={credentials.AWS_REGION}
                          onChange={(e) => handleInputChange('AWS_REGION', e.target.value)}
                          placeholder="us-west-2"
                          className={`w-full px-3 py-2 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing}`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AWS Access Key ID
                        </label>
                        <input
                          type="text"
                          value={credentials.AWS_ACCESS_KEY_ID}
                          onChange={(e) => handleInputChange('AWS_ACCESS_KEY_ID', e.target.value)}
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          className={`w-full px-3 py-2 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} font-mono text-sm`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AWS Secret Access Key
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.awsSecretKey ? 'text' : 'password'}
                            value={credentials.AWS_SECRET_ACCESS_KEY}
                            onChange={(e) => handleInputChange('AWS_SECRET_ACCESS_KEY', e.target.value)}
                            placeholder="••••••••••••••••••••••••••••••••••••••••"
                            className={`w-full px-3 py-2 pr-10 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} font-mono text-sm`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('awsSecretKey')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords.awsSecretKey ? (
                              <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OCM Credentials Section - Hidden for MCE */}
                {theme !== 'mce' && (
                  <div className={`border-2 ${themeColors.border} rounded-lg p-4`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🔐</span>
                      OpenShift Cluster Manager (OCM)
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          OCM Client ID
                        </label>
                        <input
                          type="text"
                          value={credentials.OCM_CLIENT_ID}
                          onChange={(e) => handleInputChange('OCM_CLIENT_ID', e.target.value)}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className={`w-full px-3 py-2 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} font-mono text-sm`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          OCM Client Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.ocmSecret ? 'text' : 'password'}
                            value={credentials.OCM_CLIENT_SECRET}
                            onChange={(e) => handleInputChange('OCM_CLIENT_SECRET', e.target.value)}
                            placeholder="••••••••••••••••••••••••••••••••"
                            className={`w-full px-3 py-2 pr-10 border ${themeColors.border} rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} font-mono text-sm`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('ocmSecret')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords.ocmSecret ? (
                              <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info box - Always shown */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Credentials are stored in <code className="bg-blue-100 px-1 rounded">vars/user_vars.yml</code>.
                    Make sure this file is properly secured and not committed to version control.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={`px-4 py-2 ${themeColors.button} text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2`}
            >
              {saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                '💾 Save Credentials'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

CredentialsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.string,
  onSave: PropTypes.func
};

export default CredentialsModal;
