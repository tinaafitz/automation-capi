import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const CapiInstallMethodModal = ({ isOpen, onClose, onMethodSelected, currentMethod, isReconfiguration = false }) => {
  const [selectedMethod, setSelectedMethod] = useState(currentMethod || 'clusterctl');
  const [rememberChoice, setRememberChoice] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(isReconfiguration); // Auto-enable for reconfiguration
  const [customImageRepo, setCustomImageRepo] = useState('');
  const [customImageTag, setCustomImageTag] = useState('');
  const [crdLocation, setCrdLocation] = useState('');

  useEffect(() => {
    if (currentMethod) {
      setSelectedMethod(currentMethod);
    }
  }, [currentMethod]);

  useEffect(() => {
    if (isReconfiguration) {
      setUseCustomImage(true); // Auto-check the custom image box for reconfiguration
    }
  }, [isReconfiguration]);

  const handleContinue = () => {
    const customImageConfig = useCustomImage && selectedMethod === 'clusterctl'
      ? {
          repository: customImageRepo,
          tag: customImageTag,
          crdLocation: crdLocation
        }
      : null;

    onMethodSelected(selectedMethod, rememberChoice, customImageConfig);
    onClose();
  };

  if (!isOpen) return null;

  // Debug logging
  console.log('CapiInstallMethodModal - selectedMethod:', selectedMethod);
  console.log('CapiInstallMethodModal - isReconfiguration:', isReconfiguration);
  console.log('CapiInstallMethodModal - currentMethod:', currentMethod);

  const methods = [
    {
      id: 'clusterctl',
      name: 'Cluster API',
      icon: '⚡'
    },
    {
      id: 'helm',
      name: 'Helm Charts',
      icon: '📦'
    }
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold">
              {isReconfiguration ? 'Reconfigure CAPI/CAPA' : 'Choose Installation Method'}
            </h2>
            <p className="text-sm text-purple-100 mt-1">
              {isReconfiguration ? 'Update CAPI configuration with custom image' : 'Select how to install CAPI'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Only show method selection if not reconfiguring */}
          {!isReconfiguration && (
            <>
              {methods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedMethod === method.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{method.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900">{method.name}</h3>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckIcon className="h-6 w-6 text-purple-600" />
                    )}
                  </div>
                </div>
              ))}

              {/* Remember Choice */}
              <div className="pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberChoice}
                    onChange={(e) => setRememberChoice(e.target.checked)}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Remember my choice</span>
                </label>
              </div>
            </>
          )}

          {/* Show current method when reconfiguring */}
          {isReconfiguration && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selectedMethod === 'clusterctl' ? '⚡' : '📦'}</div>
                <div>
                  <p className="text-sm font-medium text-purple-900">Current Installation Method</p>
                  <p className="text-lg font-bold text-purple-700">
                    {selectedMethod === 'clusterctl' ? 'Cluster API (clusterctl)' : 'Helm Charts'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Custom CAPA Image Configuration - Only for clusterctl */}
          {selectedMethod === 'clusterctl' && (
            <div className={isReconfiguration ? "" : "pt-4 border-t border-gray-200"}>
              <label className="flex items-start gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={useCustomImage}
                  onChange={(e) => setUseCustomImage(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Use Custom CAPA Image</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Specify a custom CAPA controller image and CRD location for testing pre-release features. Updated CRDs will be applied before deployment.
                  </p>
                </div>
              </label>

              {useCustomImage && (
                <div className="space-y-2 pl-6 border-l-2 border-purple-200">
                  {/* Image Repository */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image Repository
                    </label>
                    <input
                      type="text"
                      value={customImageRepo}
                      onChange={(e) => setCustomImageRepo(e.target.value)}
                      placeholder="quay.io/username/cluster-api-aws-controller"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Full path to the custom CAPA controller image repository
                    </p>
                  </div>

                  {/* Image Tag */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image Tag
                    </label>
                    <input
                      type="text"
                      value={customImageTag}
                      onChange={(e) => setCustomImageTag(e.target.value)}
                      placeholder="pr-5786"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Image tag (e.g., pr-5786, latest, v2.10.0)
                    </p>
                  </div>

                  {/* CRD Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CRD Location (URL)
                    </label>
                    <input
                      type="text"
                      value={crdLocation}
                      onChange={(e) => setCrdLocation(e.target.value)}
                      placeholder="https://github.com/user/repo/tree/branch/api/v1beta2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      GitHub URL to v1beta2 CRDs directory (e.g., https://github.com/serngawy/cluster-api-provider-aws/tree/logforward/api/v1beta2)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

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
              type="button"
              onClick={handleContinue}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-md hover:from-purple-700 hover:to-violet-700 transition-all font-medium shadow-sm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

CapiInstallMethodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMethodSelected: PropTypes.func.isRequired,
  currentMethod: PropTypes.string,
  isReconfiguration: PropTypes.bool,
};

export default CapiInstallMethodModal;
