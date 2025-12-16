import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const CapiInstallMethodModal = ({ isOpen, onClose, onMethodSelected, currentMethod }) => {
  const [selectedMethod, setSelectedMethod] = useState(currentMethod || 'clusterctl');
  const [rememberChoice, setRememberChoice] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [customImageRepo, setCustomImageRepo] = useState('');
  const [customImageTag, setCustomImageTag] = useState('');
  const [capaSourcePath, setCapaSourcePath] = useState('');

  useEffect(() => {
    if (currentMethod) {
      setSelectedMethod(currentMethod);
    }
  }, [currentMethod]);

  const handleContinue = () => {
    const customImageConfig = useCustomImage && selectedMethod === 'clusterctl'
      ? {
          repository: customImageRepo,
          tag: customImageTag,
          sourcePath: capaSourcePath
        }
      : null;

    onMethodSelected(selectedMethod, rememberChoice, customImageConfig);
    onClose();
  };

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Choose Installation Method</h2>
            <p className="text-sm text-purple-100">Select how to install CAPI</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
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

          {/* Custom CAPA Image Configuration - Only for clusterctl */}
          {selectedMethod === 'clusterctl' && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-start gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={useCustomImage}
                  onChange={(e) => setUseCustomImage(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Use Custom CAPA Image</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Specify a custom CAPA controller image and source directory for testing pre-release features. CRDs will be applied before deployment.
                  </p>
                </div>
              </label>

              {useCustomImage && (
                <div className="space-y-3 pl-6 border-l-2 border-purple-200">
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

                  {/* CAPA Source Path */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAPA Source Directory
                    </label>
                    <input
                      type="text"
                      value={capaSourcePath}
                      onChange={(e) => setCapaSourcePath(e.target.value)}
                      placeholder="/path/to/cluster-api-provider-aws"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Path to CAPA source directory containing config/default/ (for applying updated CRDs)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-all font-medium shadow-md hover:shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

CapiInstallMethodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMethodSelected: PropTypes.func.isRequired,
  currentMethod: PropTypes.string,
};

export default CapiInstallMethodModal;
